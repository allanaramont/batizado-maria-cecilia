// track-visit: registra cada visita ao site.
// O cliente so manda o path. A localizacao vem dos headers
// automaticos do Vercel (x-vercel-ip-*) — sem geolocation API,
// sem userAgent, sem nada que identifique o usuario.

const slackBotToken = process.env.SLACK_BOT_TOKEN;
const slackChannelId =
  process.env.SLACK_VISITS_CHANNEL_ID ||
  process.env.SLACK_BATIZADO_CHANNEL_ID ||
  process.env.SLACK_CHANNEL_ID ||
  "C0BUTFJ35QA";
const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

function readHeader(req, name) {
  if (!req?.headers) return null;
  if (typeof req.headers.get === "function") {
    return req.headers.get(name);
  }
  return req.headers[name];
}

function normalizeLocationPart(value) {
  if (typeof value !== "string") {
    return "";
  }

  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

function getLocation(req) {
  const city = readHeader(req, "x-vercel-ip-city");
  const region = readHeader(req, "x-vercel-ip-country-region");
  const country = readHeader(req, "x-vercel-ip-country");
  const parts = [city, region, country].map(normalizeLocationPart).filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Localizacao indisponivel";
}

function getPath(req) {
  const body = typeof req.body === "string" ? safeJSON(req.body) : req.body || {};
  return body?.path || "/";
}

function safeJSON(str) {
  try { return JSON.parse(str); } catch { return {}; }
}

function formatTimestamp(d = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

function buildVisitMessage(path, location, timestamp) {
  return [
    "🕊️ *Nova visita ao Batizado*",
    `📍 *Local:* ${location}`,
    `🕒 *Data e hora:* ${timestamp}`,
    `🔗 *Página:* \`${path}\``,
  ].join("\n");
}

async function sendToSlack(text) {
  if (slackWebhookUrl) {
    const response = await fetch(slackWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      return { success: false, reason: `webhook ${response.status}` };
    }
    return { success: true };
  }

  if (slackBotToken && slackChannelId) {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${slackBotToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ channel: slackChannelId, text }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) {
      return { success: false, reason: data?.error || `slack ${response.status}` };
    }
    return { success: true };
  }

  return { success: false, reason: "missing_slack_credentials" };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const location = getLocation(req);
    const path = getPath(req);
    const timestamp = formatTimestamp();
    const text = buildVisitMessage(path, location, timestamp);

    if (!slackBotToken && !slackWebhookUrl) {
      // sem slack configurado: loga no console do Vercel (painel > Functions > Logs)
      console.log(`[track-visit] ${text}`);
      return res.status(200).json({ success: true, logged: true });
    }

    const slackResult = await sendToSlack(text);
    if (!slackResult.success) {
      console.log(`[track-visit] slack falhou: ${slackResult.reason} | ${text}`);
      return res.status(200).json({ success: true, logged: true });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao registrar visita.";
    return res.status(500).json({ error: message });
  }
}

export { buildVisitMessage, getLocation };
