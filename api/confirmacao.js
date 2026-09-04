import { MongoClient } from "mongodb";

const slackBotToken = process.env.SLACK_BOT_TOKEN;
const defaultSlackChannelId = "C0BUTFJ35QA";
const slackChannelId =
  process.env.SLACK_BATIZADO_CHANNEL_ID ||
  process.env.SLACK_CHANNEL_ID ||
  process.env.SLACK_CONFIRMATION_CHANNEL_ID ||
  process.env.SLACK_VISITS_CHANNEL_ID ||
  defaultSlackChannelId;
const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

const mongodbUri =
  process.env.MONGODB_URI ||
  process.env.MONGODB_URL ||
  process.env.BATIZADO_MONGODB_URI;
const mongodbDbName =
  process.env.MONGODB_DB_NAME ||
  process.env.BATIZADO_MONGODB_DB_NAME ||
  "batizado";
const mongodbCollection =
  process.env.MONGODB_CONFIRMATION_COLLECTION ||
  process.env.BATIZADO_MONGODB_COLLECTION ||
  "batizado_confirmacoes";

const CHURCH_NAME = "SANTUÁRIO NOSSA SENHORA DE FÁTIMA";
const CHURCH_DATE = "19 de setembro de 2026";
const CHURCH_TIME = "12:00";
const CHURCH_ADDRESS =
  "Av. Alfredo Balthazar da Silveira, 900. Recreio dos Bandeirantes. (Próximo ao Barra World)";
const RESTAURANT_NAME = "Bistral Rio";
const RESTAURANT_TIME = "13:30";
const RESTAURANT_ADDRESS = "Av. Lúcio Costa, 16.756";
const MENU_FILE_URL =
  "https://drive.google.com/file/d/1l9G0b3zbysQJsCHgHEzj4yQbpirxSinN/view";

const VALID_MOMENTS = new Set(["igreja", "restaurante", "ambos"]);

const mongoCache = {
  client: null,
  db: null,
};

function parseBody(req) {
  if (!req) return {};
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

function sanitizeText(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, 500);
}

function normalizePersonName(value) {
  return sanitizeText(value).replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");
}

function normalizePersonKey(value) {
  return normalizePersonName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeMoment(rawMoment) {
  if (typeof rawMoment !== "string") {
    return "";
  }

  const normalized = rawMoment.trim().toLowerCase();
  if (VALID_MOMENTS.has(normalized)) {
    return normalized;
  }

  if (normalized.includes("igreja") && normalized.includes("rest")) {
    return "ambos";
  }

  if (normalized.includes("igreja")) {
    return "igreja";
  }

  if (normalized.includes("rest")) {
    return "restaurante";
  }

  return "";
}

function buildListForMoment(moment) {
  if (moment === "igreja") {
    return "Igreja";
  }
  if (moment === "restaurante") {
    return "Restaurante";
  }
  return "Igreja + Restaurante";
}

function formatPeopleCount(value) {
  return `${value} pessoa${value === 1 ? "" : "s"}`;
}

function getCompanionNames(value) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

function normalizeCompanions(value) {
  return getCompanionNames(value)
    .map(normalizePersonName)
    .filter(Boolean)
    .join(", ");
}

function chunkText(rawText, chunkLength = 2800) {
  if (!rawText) {
    return [];
  }

  const parts = [];
  const lines = rawText.split("\n");
  let current = "";

  for (const line of lines) {
    const lineToAdd = current ? `${current}\n${line}` : line;
    if (lineToAdd.length > chunkLength && current) {
      parts.push(current);
      current = line;
      continue;
    }

    if (lineToAdd.length > chunkLength && !current) {
      parts.push(line);
      current = "";
      continue;
    }

    current = lineToAdd;
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

function countNamedCompanions(value) {
  return getCompanionNames(value).length;
}

function normalizeAttendees(rawValue, companions) {
  const parsed = Number.parseInt(rawValue, 10);
  const storedPeople = !Number.isNaN(parsed) && parsed > 0 ? parsed : 1;
  const namedPeople = countNamedCompanions(companions) + 1;

  return Math.max(storedPeople, namedPeople);
}

function getEntryPeopleCount(entry) {
  return normalizeAttendees(entry.attendees, entry.companions);
}

function getEntryNames(entry) {
  return [entry.name, ...getCompanionNames(entry.companions)]
    .map(normalizePersonName)
    .filter(Boolean);
}

function findDuplicateNames(candidate, existingRows) {
  const existingKeys = new Set(
    existingRows.flatMap(getEntryNames).map(normalizePersonKey),
  );
  const submittedKeys = new Set();
  const duplicateKeys = new Set();
  const duplicates = [];

  getEntryNames(candidate).forEach((name) => {
    const key = normalizePersonKey(name);
    if ((existingKeys.has(key) || submittedKeys.has(key)) && !duplicateKeys.has(key)) {
      duplicates.push(name);
      duplicateKeys.add(key);
    }
    submittedKeys.add(key);
  });

  return duplicates;
}

function buildDuplicateError(duplicateNames) {
  return `Já existe uma confirmação para: ${duplicateNames.join(", ")}. Confira os nomes e tente novamente.`;
}

function parseWillAttend(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "sim" || normalized === "s" || normalized === "yes" || normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "nao" || normalized === "não" || normalized === "n" || normalized === "no" || normalized === "false" || normalized === "0") {
      return false;
    }
  }

  return Boolean(value);
}

function formatConfirmationLine(item) {
  const people = getEntryPeopleCount(item);
  const attendeesText = formatPeopleCount(people);
  const momentText = item.will_attend ? buildListForMoment(item.moment || "") : "-";
  const name = normalizePersonName(item.name);
  const companionNames = getCompanionNames(item.companions).map(normalizePersonName);
  const namesText = companionNames.length ? ` + ${companionNames.join(", ")}` : "";

  return `• *${name}*${namesText} • ${attendeesText} • ${momentText}`;
}

function buildListText(rows) {
  const confirmed = rows.filter((entry) => entry.will_attend);
  const declined = rows.filter((entry) => !entry.will_attend);
  const confirmedPeople = confirmed.reduce(
    (acc, entry) => acc + getEntryPeopleCount(entry),
    0,
  );
  const declinedPeople = declined.reduce(
    (acc, entry) => acc + getEntryPeopleCount(entry),
    0,
  );

  const confirmedLines = confirmed.map((entry) => formatConfirmationLine(entry));
  const declinedLines = declined.map((entry) => formatConfirmationLine(entry));

  const content = [];

  if (confirmedLines.length) {
    content.push(`*Pessoas confirmadas* (${confirmedPeople} pessoa${confirmedPeople === 1 ? "" : "s"})`);
    content.push(...confirmedLines);
  }

  if (declinedLines.length) {
    if (content.length) {
      content.push("");
    }
    content.push(
      `*Não comparecerão* (${declinedPeople} pessoa${declinedPeople === 1 ? "" : "s"})`,
    );
    content.push(...declinedLines);
  }

  return content.length ? content.join("\n") : "Nenhuma confirmação ainda.";
}

function countTotals(rows) {
  const peopleAtChurch = rows.reduce((acc, entry) => {
    if (!entry.will_attend) {
      return acc;
    }
    const people = getEntryPeopleCount(entry);
    if (entry.moment === "igreja" || entry.moment === "ambos") {
      return acc + people;
    }
    return acc;
  }, 0);

  const peopleAtRestaurant = rows.reduce((acc, entry) => {
    if (!entry.will_attend) {
      return acc;
    }
    const people = getEntryPeopleCount(entry);
    if (entry.moment === "restaurante" || entry.moment === "ambos") {
      return acc + people;
    }
    return acc;
  }, 0);

  const yes = rows
    .filter((entry) => entry.will_attend)
    .reduce((acc, entry) => acc + getEntryPeopleCount(entry), 0);
  const no = rows
    .filter((entry) => !entry.will_attend)
    .reduce((acc, entry) => acc + getEntryPeopleCount(entry), 0);

  return {
    yes,
    no,
    total: rows.length,
    peopleAtChurch,
    peopleAtRestaurant,
  };
}

function buildBlocksForPayload(payload, rows) {
  const { name, statusText, selectedMomentLabel, peopleCount, createdAtText } = payload;
  const totals = countTotals(rows);

  const summaryText = [
    `*Total de respostas:* ${totals.total}`,
    `*Total de pessoas confirmadas:* ${formatPeopleCount(totals.yes)}`,
    `*Não comparecerão:* ${formatPeopleCount(totals.no)}`,
  ].join("\n");

  const rowsText = buildListText(rows);
  const chunks = chunkText(rowsText, 2600);

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "Nova confirmação - Batizado da Maria Cecilia",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: [
          `*Nome:* ${name}`,
          `*Status:* ${statusText}`,
          `*Momentos:* ${selectedMomentLabel}`,
          `*Participantes:* ${peopleCount}`,
          `*Horário:* ${createdAtText || "-"}`,
        ].join("\n"),
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: summaryText,
      },
    },
    { type: "divider" },
  ];

  if (payload.note) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Observações:* ${payload.note}`,
      },
    });
  }

  chunks.forEach((chunk, index) => {
    if (index > 0) {
      blocks.push({ type: "divider" });
    }

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: index === 0 ? `*Lista atualizada completa*\n\n${chunk}` : chunk,
      },
    });
  });

  return blocks;
}

async function sendToSlack(payload) {
  const hasChannel = Boolean(slackWebhookUrl || (slackBotToken && slackChannelId));
  if (!hasChannel) {
    return { success: false, reason: "missing_slack_credentials" };
  }

  const response = slackWebhookUrl
    ? await sendWithWebhook(payload)
    : await sendWithBotToken(payload);

  return response;
}

async function sendWithBotToken(payload) {
  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${slackBotToken}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      channel: slackChannelId,
      ...payload,
    }),
  });

  const slackData = await response.json().catch(() => ({}));
  if (!response.ok || !slackData?.ok) {
    return {
      success: false,
      reason: slackData?.error || "Erro ao enviar mensagem para o Slack",
      details: slackData,
    };
  }

  return { success: true };
}

async function sendWithWebhook(payload) {
  const response = await fetch(slackWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    return {
      success: false,
      reason: `Slack webhook retornou ${response.status} ${response.statusText}`,
      details: text,
    };
  }

  return { success: true };
}

function isMongoConfigured() {
  return Boolean(mongodbUri);
}

function normalizePayload(raw) {
  const name = normalizePersonName(raw.name);
  const willAttend = parseWillAttend(raw.willAttend);
  const moment = willAttend ? normalizeMoment(raw.attendanceMode || raw.moment || "") : "";
  const companions = normalizeCompanions(raw.companions);
  const attendees = willAttend ? normalizeAttendees(raw.attendees, companions) : 1;
  const note = sanitizeText(raw.note);

  return {
    name,
    willAttend,
    attendees,
    moment,
    companions,
    note,
    createdAtText: new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function buildMessageBlocks(entry, allEntries) {
  const statusText = entry.willAttend
    ? "Confirmou presença"
    : "Não poderá comparecer";
  const selectedMomentLabel = entry.willAttend ? buildListForMoment(entry.moment) : "-";
  const peopleCount = getEntryPeopleCount(entry);

  return {
    text: "Nova confirmação - Batizado da Maria Cecilia",
    blocks: buildBlocksForPayload(
      {
        name: entry.name,
        statusText,
        selectedMomentLabel,
        peopleCount: formatPeopleCount(peopleCount),
        note: entry.note,
        createdAtText: entry.createdAtText,
      },
      allEntries,
    ),
  };
}

async function getCollection() {
  if (!isMongoConfigured()) {
    return { success: false, reason: "missing_storage_credentials" };
  }

  try {
    if (!mongoCache.client) {
      mongoCache.client = new MongoClient(mongodbUri, {
        maxPoolSize: 4,
        minPoolSize: 0,
      });
      await mongoCache.client.connect();
      mongoCache.db = mongoCache.client.db(mongodbDbName);
    }

    return {
      success: true,
      collection: mongoCache.db.collection(mongodbCollection),
    };
  } catch (error) {
    return {
      success: false,
      reason: error instanceof Error ? error.message : "Erro ao conectar no MongoDB",
    };
  }
}

async function saveConfirmation(row) {
  const collectionResult = await getCollection();
  if (!collectionResult.success) {
    return collectionResult;
  }

  try {
    const insertResult = await collectionResult.collection.insertOne(row);
    return { success: true, id: insertResult.insertedId };
  } catch (error) {
    return {
      success: false,
      reason: error instanceof Error ? error.message : "Erro ao salvar no MongoDB",
    };
  }
}

async function getAllConfirmations() {
  const collectionResult = await getCollection();
  if (!collectionResult.success) {
    return collectionResult;
  }

  try {
    const data = await collectionResult.collection
      .find({}, { projection: { _id: 0 } })
      .sort({ created_at: 1 })
      .toArray();

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      reason: error instanceof Error ? error.message : "Erro ao consultar confirmações",
    };
  }
}

export {
  buildDuplicateError,
  buildMessageBlocks,
  findDuplicateNames,
  normalizePayload,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = normalizePayload(parseBody(req));

    if (!data.name) {
      return res.status(400).json({ error: "Informe o nome completo." });
    }

    const isAttending = data.willAttend;

    if (!isAttending && data.moment) {
      return res
        .status(400)
        .json({ error: "Não é possível selecionar momentos quando não confirma presença." });
    }

    if (isAttending && !data.moment) {
      return res.status(400).json({
        error: "Selecione de quais momentos você participará.",
      });
    }

    if (isMongoConfigured()) {
      const existingEntriesResult = await getAllConfirmations();
      if (!existingEntriesResult.success) {
        console.error("[confirmacao] não foi possível validar duplicidade:", existingEntriesResult.reason);
        return res.status(503).json({
          error: "Não foi possível validar sua confirmação agora. Tente novamente em alguns instantes.",
        });
      }

      const duplicateNames = findDuplicateNames(data, existingEntriesResult.data);
      if (duplicateNames.length) {
        return res.status(409).json({
          error: buildDuplicateError(duplicateNames),
        });
      }
    }

    // Sem MongoDB configurado: a confirmação é registrada nos logs do Vercel
    // e retornamos sucesso para o convidado. Allan acompanha pelo painel da Vercel.
    if (!isMongoConfigured()) {
      console.log(
        "[confirmacao] (sem MongoDB) nova confirmação:",
        JSON.stringify({
          name: data.name,
          willAttend: isAttending,
          moment: data.moment || null,
          attendees: data.attendees,
          companions: data.companions || null,
          note: data.note || null,
          at: new Date().toISOString(),
        }),
      );

      // Tenta avisar no Slack mesmo sem MongoDB, se houver credencial.
      const slackPayload = buildMessageBlocks(
        {
          name: data.name,
          willAttend: isAttending,
          attendees: data.attendees,
          moment: data.moment,
          note: data.note,
          createdAtText: data.createdAtText,
        },
        [],
      );
      const slackResult = await sendToSlack(slackPayload);
      if (!slackResult.success && slackResult.reason !== "missing_slack_credentials") {
        console.warn("[confirmacao] Slack falhou:", slackResult.reason);
      }

      return res.status(200).json({
        success: true,
        message: "Confirmação recebida.",
        stored: "log",
        slack: slackResult.success,
      });
    }

    const saved = await saveConfirmation({
      name: data.name,
      will_attend: isAttending,
      moment: isAttending ? data.moment : null,
      attendees: data.attendees,
      companions: data.companions || null,
      note: data.note || null,
      created_at: new Date(),
    });

    if (!saved.success) {
      console.error("[confirmacao] erro no MongoDB:", saved.reason);
      // Mesmo com erro no banco, loga a confirmação para não perder o dado.
      console.log(
        "[confirmacao] (fallback log) nova confirmação:",
        JSON.stringify({
          name: data.name,
          willAttend: isAttending,
          moment: data.moment || null,
          attendees: data.attendees,
          companions: data.companions || null,
          note: data.note || null,
          at: new Date().toISOString(),
        }),
      );
      return res.status(503).json({
        error: "Não foi possível salvar sua confirmação agora. Tente novamente em alguns instantes.",
      });
    }

    const allEntriesResult = await getAllConfirmations();
    const allEntries = allEntriesResult.success ? allEntriesResult.data : [];
    const totals = countTotals(allEntries);

    const slackPayload = buildMessageBlocks(
      {
        name: data.name,
        willAttend: isAttending,
        attendees: data.attendees,
        moment: data.moment,
        note: data.note,
        createdAtText: data.createdAtText,
      },
      allEntries,
    );

    const slackResult = await sendToSlack(slackPayload);

    if (!slackResult.success && slackResult.reason !== "missing_slack_credentials") {
      console.warn("[confirmacao] Slack falhou:", slackResult.reason);
    }

    return res.status(200).json({
      success: true,
      message: "Confirmação enviada.",
      total: totals,
      slack: slackResult.success,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao registrar confirmação.";

    console.error("[confirmacao] erro inesperado:", message);
    return res.status(500).json({ error: message });
  }
}
