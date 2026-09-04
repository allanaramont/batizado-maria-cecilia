import assert from "node:assert/strict";
import test from "node:test";

import { buildVisitMessage, getLocation } from "./track-visit.js";

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

test("formata a visita com localização, data e página em linhas separadas", () => {
  const message = buildVisitMessage(
    "/#rsvp",
    "Rio de Janeiro, RJ, BR",
    "04/09/2026, 19:09",
  );

  assert.equal(
    message,
    "🕊️ *Nova visita ao Batizado*\n" +
      "📍 *Local:* Rio de Janeiro, RJ, BR\n" +
      "🕒 *Data e hora:* 04/09/2026, 19:09\n" +
      "🔗 *Página:* `/#rsvp`",
  );
});
