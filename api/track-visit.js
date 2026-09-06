// track-visit: registra cada visita ao site.
// O cliente envia contexto de navegação. A localização vem dos headers
// automáticos do Vercel (x-vercel-ip-*), sem geolocation API.

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
  return parts.length > 0 ? parts.join(", ") : "Localização indisponível";
}

function safeJSON(value) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function parseBody(req) {
  if (req?.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req?.body === "string") {
    return safeJSON(req.body);
  }

  return {};
}

function readText(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function formatScreen(screen) {
  if (!screen || typeof screen !== "object") {
    return "Não informada";
  }

  const { width, height } = screen;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return "Não informada";
  }

  return `${width}x${height}`;
}

function formatTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function buildVisitMessage({
  page,
  path,
  referrer,
  userAgent,
  language,
  platform,
  timezone,
  screen,
  location,
  timestamp,
}) {
  return [
    "🕊️ *Nova visita ao Batizado da Maria Cecília*",
    `*Página:* ${readText(page, "Não informada")}`,
    `*Caminho:* ${readText(path, "/")}`,
    `*Origem:* ${readText(referrer, "Acesso direto")}`,
    `*User Agent:* ${readText(userAgent, "Não informado")}`,
    `*Idioma:* ${readText(language, "Não informado")}`,
    `*Plataforma:* ${readText(platform, "Não informado")}`,
    `*Fuso horário:* ${readText(timezone, "Não informado")}`,
    `*Tela:* ${formatScreen(screen)}`,
    `*Localização:* ${readText(location, "Localização indisponível")}`,
    `*Acessado em:* ${readText(timestamp, formatTimestamp())}`,
  ].join("\n");
}

async function sendToSlack(text) {
  const payload = { text };

  if (slackWebhookUrl) {
    const response = await fetch(slackWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
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
      body: JSON.stringify({ channel: slackChannelId, ...payload }),
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
    const body = parseBody(req);
    const location = getLocation(req);
    const text = buildVisitMessage({
      page: body.page,
      path: body.path,
      referrer: body.referrer,
      userAgent: body.userAgent,
      language: body.language,
      platform: body.platform,
      timezone: body.timezone,
      screen: body.screen,
      location,
      timestamp: formatTimestamp(),
    });

    if (!slackBotToken && !slackWebhookUrl) {
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

export { buildVisitMessage, formatScreen, getLocation, parseBody };
