import assert from "node:assert/strict";
import test from "node:test";

import { buildVisitMessage, formatScreen, getLocation, parseBody } from "./track-visit.js";

test("decodifica e limpa a localização enviada pelos headers da Vercel", () => {
  const location = getLocation({
    headers: {
      "x-vercel-ip-city": "Rio%20de%20Janeiro ",
      "x-vercel-ip-country-region": " RJ ",
      "x-vercel-ip-country": "BR",
    },
  });

  assert.equal(location, "Rio de Janeiro, RJ, BR");
});

test("formata contexto completo da visita em linhas separadas", () => {
  const message = buildVisitMessage(
    {
      page: "https://batizado.desenvbr.com/#rsvp",
      path: "/#rsvp",
      referrer: "Acesso direto",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      language: "pt-BR",
      platform: "MacIntel",
      timezone: "America/Sao_Paulo",
      screen: { width: 1800, height: 1169 },
      location: "Rio de Janeiro, RJ, BR",
      timestamp: "04/09/2026, 19:09",
    },
  );

  assert.equal(
    message,
    "🕊️ *Nova visita ao Batizado da Maria Cecília*\n" +
      "*Página:* https://batizado.desenvbr.com/#rsvp\n" +
      "*Caminho:* /#rsvp\n" +
      "*Origem:* Acesso direto\n" +
      "*User Agent:* Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)\n" +
      "*Idioma:* pt-BR\n" +
      "*Plataforma:* MacIntel\n" +
      "*Fuso horário:* America/Sao_Paulo\n" +
      "*Tela:* 1800x1169\n" +
      "*Localização:* Rio de Janeiro, RJ, BR\n" +
      "*Acessado em:* 04/09/2026, 19:09",
  );
});

test("usa fallbacks legíveis quando contexto da visita está ausente", () => {
  const message = buildVisitMessage({ location: "Localização indisponível" });

  assert.match(message, /\*Origem:\* Acesso direto/);
  assert.match(message, /\*User Agent:\* Não informado/);
  assert.match(message, /\*Tela:\* Não informada/);
});

test("formata somente telas com dimensões válidas", () => {
  assert.equal(formatScreen({ width: 1800, height: 1169 }), "1800x1169");
  assert.equal(formatScreen({ width: 0, height: 1169 }), "Não informada");
});

test("lê payload JSON enviado pelo beacon", () => {
  assert.deepEqual(parseBody({ body: '{\"path\":\"/pt-BR\",\"referrer\":\"Acesso direto\"}' }), {
    path: "/pt-BR",
    referrer: "Acesso direto",
  });
});
