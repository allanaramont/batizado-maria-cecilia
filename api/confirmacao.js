const slackBotToken = process.env.SLACK_BOT_TOKEN;
const defaultSlackChannelId = "C0BUTFJ35QA";
const slackChannelId =
  process.env.SLACK_BATIZADO_CHANNEL_ID ||
  process.env.SLACK_CHANNEL_ID ||
  process.env.SLACK_CONFIRMATION_CHANNEL_ID ||
  process.env.SLACK_VISITS_CHANNEL_ID ||
  defaultSlackChannelId;
const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.BATIZADO_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.BATIZADO_SUPABASE_SERVICE_KEY;
const supabaseTable =
  process.env.SUPABASE_CONFIRMATION_TABLE ||
  process.env.BATIZADO_SUPABASE_TABLE ||
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

function sanitizeInt(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return Math.max(1, parsed);
}

function formatConfirmationLine(item) {
  const momentText = item.will_attend
    ? buildListForMoment(item.moment || "")
    : "-";

  const attendeesText = item.will_attend
    ? `${item.attendees} pessoa${item.attendees === 1 ? "" : "s"}`
    : "0 pessoas";
  const companionsText = item.companions
    ? ` • Acompanhantes: ${item.companions}`
    : "";
  const noteText = item.note ? ` • Obs: ${item.note}` : "";

  return `• *${item.name}* • ${attendeesText} • ${momentText}${item.will_attend ? "" : ""}${
    item.will_attend ? companionsText : ""
  }${noteText}`;
}

function buildListText(rows) {
  const confirmed = rows.filter((entry) => entry.will_attend);
  const declined = rows.filter((entry) => !entry.will_attend);

  const confirmedLines = confirmed.map((entry) =>
    `✅ ${formatConfirmationLine(entry)}`,
  );
  const declinedLines = declined.map((entry) =>
    `❌ ${formatConfirmationLine(entry)}`,
  );

  const content = [];

  if (confirmedLines.length) {
    content.push(`*Presentes* (${confirmedLines.length})`);
    content.push(...confirmedLines);
  }

  if (declinedLines.length) {
    if (content.length) {
      content.push("");
    }
    content.push(`*Não comparecerão* (${declinedLines.length})`);
    content.push(...declinedLines);
  }

  return content.length ? content.join("\n") : "Nenhuma confirmação ainda.";
}

function countTotals(rows) {
  const peopleAtChurch = rows.reduce((acc, entry) => {
    if (!entry.will_attend) {
      return acc;
    }

    const people = Number(entry.attendees || 0);
    if (entry.moment === "igreja" || entry.moment === "ambos") {
      return acc + people;
    }
    return acc;
  }, 0);

  const peopleAtRestaurant = rows.reduce((acc, entry) => {
    if (!entry.will_attend) {
      return acc;
    }

    const people = Number(entry.attendees || 0);
    if (entry.moment === "restaurante" || entry.moment === "ambos") {
      return acc + people;
    }
    return acc;
  }, 0);

  const yes = rows.filter((entry) => entry.will_attend).length;
  const no = rows.length - yes;

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
    `*Respostas:* ${totals.total}`,
    `*Presentes:* ${totals.yes}`,
    `*Não comparecerão:* ${totals.no}`,
    `*Total igreja:* ${totals.peopleAtChurch} pessoa${totals.peopleAtChurch === 1 ? "" : "s"}`,
    `*Total restaurante:* ${totals.peopleAtRestaurant} pessoa${totals.peopleAtRestaurant === 1 ? "" : "s"}`,
    `*Restaurante:* ${RESTAURANT_NAME} (${RESTAURANT_TIME})`,
    `*Igreja:* ${CHURCH_NAME} (${CHURCH_TIME})`,
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
          `*Horário:* ${payload.createdAtText || "-"}`,
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
        text: index === 0 ? `*Lista atualizada completa*\n${chunk}` : chunk,
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

function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseServiceKey);
}

function supabaseBaseUrl() {
  return `${String(supabaseUrl).replace(/\/$/, "")}/rest/v1`;
}

function supabaseHeaders() {
  return {
    apikey: supabaseServiceKey,
    Authorization: `Bearer ${supabaseServiceKey}`,
    "Content-Type": "application/json; charset=utf-8",
  };
}

async function saveConfirmation(row) {
  if (!isSupabaseConfigured()) {
    return { success: false, reason: "missing_storage_credentials" };
  }

  const response = await fetch(`${supabaseBaseUrl()}/${supabaseTable}`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(),
      Prefer: "return=representation",
    },
    body: JSON.stringify([row]),
  });

  const data = await response.json().catch(() => []);
  if (!response.ok) {
    return {
      success: false,
      reason: data?.message || data?.error || "Erro ao salvar no Supabase",
      details: data,
    };
  }

  return { success: true, data };
}

async function getAllConfirmations() {
  if (!isSupabaseConfigured()) {
    return { success: false, reason: "missing_storage_credentials" };
  }

  const select = [
    "id",
    "name",
    "will_attend",
    "moment",
    "attendees",
    "companions",
    "note",
    "created_at",
  ].join(",");

  const response = await fetch(
    `${supabaseBaseUrl()}/${supabaseTable}?select=${select}&order=created_at.asc`,
    {
      method: "GET",
      headers: supabaseHeaders(),
    },
  );

  const data = await response.json().catch(() => []);
  if (!response.ok) {
    return {
      success: false,
      reason: data?.message || data?.error || "Erro ao consultar confirmações",
      details: data,
    };
  }

  return {
    success: true,
    data: Array.isArray(data) ? data : [],
  };
}

function normalizePayload(raw) {
  const name = sanitizeText(raw.name);
  const willAttend = raw.willAttend === "sim";
  const people = willAttend ? sanitizeInt(raw.attendees) : 0;
  const moment = willAttend ? normalizeMoment(raw.attendanceMode || raw.moment || "") : "";
  const companions = sanitizeText(raw.companions);
  const note = sanitizeText(raw.note);

  return {
    name,
    willAttend,
    people,
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
    ? "✅ Confirmou presença"
    : "❌ Não poderá comparecer";
  const selectedMomentLabel = entry.willAttend
    ? buildListForMoment(entry.moment)
    : "-";

  const payload = {
    text: `${statusText} - ${entry.name}`,
    blocks: buildBlocksForPayload(
      {
        name: entry.name,
        statusText,
        selectedMomentLabel,
        peopleCount: `${entry.people} pessoa${entry.people === 1 ? "" : "s"}`,
        note: entry.note,
        createdAtText: entry.createdAtText,
      },
      allEntries,
    ),
  };

  return payload;
}

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

    if (!isSupabaseConfigured()) {
      return res.status(202).json({
        success: false,
        disabled: true,
        message:
          "Confirmação recebida, mas a integração de armazenamento não está configurada (Supabase).",
      });
    }

    const saved = await saveConfirmation({
      name: data.name,
      will_attend: isAttending,
      moment: isAttending ? data.moment : null,
      attendees: data.people,
      companions: data.companions || null,
      note: data.note || null,
      created_at: new Date().toISOString(),
    });

    if (!saved.success) {
      return res.status(502).json({
        error: saved.reason || "Erro ao registrar confirmação no banco.",
      });
    }

    const allEntriesResult = await getAllConfirmations();
    if (!allEntriesResult.success) {
      return res.status(502).json({
        error: allEntriesResult.reason || "Erro ao carregar lista atualizada.",
      });
    }

    const allEntries = allEntriesResult.data;
    const totals = countTotals(allEntries);

    const slackPayload = buildMessageBlocks(
      {
        name: data.name,
        willAttend: isAttending,
        people: data.people,
        moment: data.moment,
        note: data.note,
        createdAtText: data.createdAtText,
      },
      allEntries,
    );

    const slackResult = await sendToSlack({
      ...slackPayload,
      text: `${isAttending ? "✅" : "❌"} ${data.name}`,
    });

    if (!slackResult.success) {
      if (slackResult.reason === "missing_slack_credentials") {
        return res.status(202).json({
          success: false,
          disabled: true,
          message: "Confirmação recebida, mas o envio para Slack não está configurado.",
          total: totals,
        });
      }

      return res.status(502).json({ error: slackResult.reason || "Erro ao enviar para o Slack." });
    }

    return res.status(200).json({
      success: true,
      message: "Confirmação enviada e lista atualizada enviada ao Slack.",
      total: totals,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao registrar confirmação.";

    return res.status(500).json({ error: message });
  }
}
