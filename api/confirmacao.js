const slackBotToken = process.env.SLACK_BOT_TOKEN;
const defaultSlackChannelId = "C0BUTFJ35QA";
const slackChannelId =
  process.env.SLACK_BATIZADO_CHANNEL_ID ||
  process.env.SLACK_CHANNEL_ID ||
  process.env.SLACK_CONFIRMATION_CHANNEL_ID ||
  process.env.SLACK_VISITS_CHANNEL_ID ||
  defaultSlackChannelId;
const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

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

function buildMessage(data) {
  const isAttending = data?.willAttend === "sim";
  const name = sanitizeText(data.name) || "Nome não informado";
  const people = isAttending ? Math.max(1, Number(data.attendees) || 1) : 0;
  const companions = sanitizeText(data.companions);
  const note = sanitizeText(data.note);

  const statusText = isAttending
    ? "✅ Confirmou presença"
    : "❌ Não poderá comparecer";

  const details = [
    `*Nome:* ${name}`,
    `*Status:* ${statusText}`,
    `*Participantes:* ${String(people)}`,
    `*Restaurante:* ${RESTAURANT_NAME} (${RESTAURANT_TIME})`,
    `*Igreja:* ${CHURCH_NAME} (${CHURCH_TIME})`,
    `*Cardápio:* ${MENU_FILE_URL}`,
  ];

  if (isAttending && companions) {
    details.push(`*Acompanhantes:* ${companions}`);
  }
  if (note) {
    details.push(`*Observações:* ${note}`);
  }

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
        text: `*Nome:* ${name}\n*Status:* ${statusText}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: [
          `*Horário da cerimônia:* ${CHURCH_TIME}`,
          `*Data:* ${CHURCH_DATE}`,
          `*Local da cerimônia:* ${CHURCH_ADDRESS}`,
          `*Local do almoço:* ${RESTAURANT_ADDRESS}`,
        ].join("\n"),
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: details.join("\n"),
      },
    },
  ];

  return {
    text: `${statusText} - ${name}`,
    blocks,
  };
}

async function sendWithBotToken(payload) {
  if (!slackBotToken || !slackChannelId) {
    return { success: false, reason: "missing_credentials" };
  }

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
  if (!slackWebhookUrl) {
    return { success: false, reason: "missing_credentials" };
  }

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, willAttend, attendees, companions = "", note = "" } =
      await parseBody(req);

    const safeName = sanitizeText(name);
    const isAttending = willAttend === "sim";

    if (!safeName) {
      return res.status(400).json({ error: "Informe o nome completo." });
    }
    if (willAttend !== "sim" && willAttend !== "nao") {
      return res.status(400).json({ error: "Escolha uma opção de presença." });
    }

    const payload = buildMessage({
      willAttend,
      name: safeName,
      attendees: isAttending ? Math.max(1, Number(attendees) || 1) : 0,
      companions: sanitizeText(companions),
      note: sanitizeText(note),
      createdAt: new Date().toISOString(),
    });

    const result = slackWebhookUrl
      ? await sendWithWebhook(payload)
      : await sendWithBotToken(payload);

    if (!result.success) {
      if (result.reason === "missing_credentials") {
        return res
          .status(202)
          .json({ success: false, disabled: true, message: "Integração com Slack não configurada." });
    }

      return res.status(502).json({ error: result.reason || "Erro ao enviar para o Slack." });
    }

    return res
      .status(200)
      .json({ success: true, message: "Confirmação enviada com sucesso." });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao registrar confirmação.";

    return res.status(500).json({ error: message });
  }
}
