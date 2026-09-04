const slackBotToken = process.env.SLACK_BOT_TOKEN;
const defaultSlackChannelId = "C0BUTFJ35QA";
const slackChannelId =
  process.env.SLACK_VISIT_CHANNEL_ID ||
  process.env.SLACK_BATIZADO_CHANNEL_ID ||
  process.env.SLACK_CHANNEL_ID ||
  process.env.SLACK_VISITS_CHANNEL_ID ||
  defaultSlackChannelId;
const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
const botPrefix = "🕊️";

function readHeader(req, name) {
  if (!req?.headers) {
    return null;
  }

  if (typeof req.headers.get === "function") {
    return req.headers.get(name);
  }

  return req.headers[name];
}

function readPlatformLocationHeaders(req) {
  const city = readHeader(req, "x-vercel-ip-city");
  const region = readHeader(req, "x-vercel-ip-country-region");
  const country = readHeader(req, "x-vercel-ip-country");
  const clientIp = readHeader(req, "x-forwarded-for");

  const parts = [city, region, country].filter((value) => typeof value === "string" && value.trim().length > 0);
  return {
    location: parts.length > 0 ? parts.join(", ") : null,
    clientIp,
  };
}

function parseBody(req) {
  if (!req) {
    return {};
  }

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
    return "Nao informado";
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : "Nao informado";
}

function sanitizeBoolean(value) {
  return value === true ? "Sim" : "Nao";
}

function formatDate(value) {
  if (typeof value !== "string") {
    return "Nao informado";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Nao informado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(parsed);
}

function resolveLocation(latitude, longitude, clientLocationLabel, platformLocation, locationError) {
  if (typeof latitude === "number" && typeof longitude === "number") {
    return `Lat: ${latitude}, Lng: ${longitude}`;
  }

  if (clientLocationLabel) {
    return clientLocationLabel;
  }

  if (platformLocation) {
    return platformLocation;
  }

  if (locationError) {
    return `Localizacao indisponivel (${sanitizeText(locationError)})`;
  }

  return "Localizacao indisponivel";
}

function buildPayload(rawBody, req) {
  const body = parseBody(rawBody);
  const clientMeta = readPlatformLocationHeaders(req);
  const screen = body?.screen;
  const cityAndState = clientMeta.location;
  const clientIp = clientMeta.clientIp;
  const resolvedLocation = resolveLocation(
    body?.location?.latitude,
    body?.location?.longitude,
    body?.locationLabel,
    cityAndState,
    body?.locationError,
  );

  return {
    page: sanitizeText(body?.page),
    path: sanitizeText(body?.path),
    fullUrl: sanitizeText(body?.fullUrl),
    referrer: sanitizeText(body?.referrer),
    userAgent: sanitizeText(body?.userAgent),
    language: sanitizeText(body?.language),
    platform: sanitizeText(body?.platform),
    timezone: sanitizeText(body?.timezone),
    screen: {
      width: Number.isFinite(Number(screen?.width)) ? Number(screen.width) : 0,
      height: Number.isFinite(Number(screen?.height)) ? Number(screen.height) : 0,
    },
    timestamp: formatDate(body?.timestamp),
    visitorIp: sanitizeText(clientIp),
    locationText: sanitizeText(resolvedLocation),
    hasGeolocation: sanitizeBoolean(Boolean(body?.location?.latitude || body?.location?.longitude || body?.locationLabel)),
  };
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

function buildBlocks(entry) {
  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${botPrefix} Nova visita no site do Batizado da Maria Cecilia`,
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: [
          `*Pagina:* ${entry.page}`,
          `*Caminho:* ${entry.path}`,
          `*URL:* ${entry.fullUrl}`,
          `*Origem:* ${entry.referrer}`,
          `*IP:* ${entry.visitorIp}`,
          `*User Agent:* ${entry.userAgent}`,
          `*Idioma:* ${entry.language}`,
          `*Plataforma:* ${entry.platform}`,
          `*Fuso horario:* ${entry.timezone}`,
          `*Tela:* ${entry.screen.width > 0 && entry.screen.height > 0 ? `${entry.screen.width}x${entry.screen.height}` : "Nao informada"}`,
          `*Localizacao:* ${entry.locationText}`,
          `*Geolocalizacao permitida:* ${entry.hasGeolocation}`,
          `*Horário do acesso:* ${entry.timestamp}`,
        ].join("\n"),
      },
    },
  ];
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const entry = buildPayload(req, req);

    if (!slackBotToken && !slackWebhookUrl) {
      return res.status(202).json({ success: false, disabled: true });
    }

    const slackPayload = {
      text: `Visita: ${entry.fullUrl}`,
      blocks: buildBlocks(entry),
    };

    const slackResult = await sendToSlack(slackPayload);
    if (!slackResult.success) {
      return res.status(202).json({
        success: false,
        disabled: false,
        reason: slackResult.reason || "Erro ao enviar para o Slack.",
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao registrar visita.";
    return res.status(500).json({ error: message });
  }
}
