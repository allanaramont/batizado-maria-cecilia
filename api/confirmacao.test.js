import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMessageBlocks,
  findDuplicateNames,
  normalizePayload,
} from "./confirmacao.js";

test("conta o titular e os acompanhantes quando os nomes são informados", () => {
  const payload = normalizePayload({
    name: "Nathelly Monteiro",
    willAttend: "sim",
    attendees: 0,
    attendanceMode: "ambos",
    companions: "Allan Monteiro",
  });

  assert.equal(payload.attendees, 2);
  assert.equal(payload.companions, "ALLAN MONTEIRO");
});

test("preserva a quantidade explícita escolhida no contador", () => {
  const payload = normalizePayload({
    name: "Allan Monteiro",
    willAttend: "sim",
    attendees: 3,
    attendanceMode: "ambos",
    companions: "",
  });

  assert.equal(payload.attendees, 3);
});

test("usa a quantidade corrigida nos totais e na lista do Slack", () => {
  const nathelly = normalizePayload({
    name: "Nathelly Monteiro",
    willAttend: "sim",
    attendees: 0,
    attendanceMode: "ambos",
    companions: "Allan Monteiro",
  });
  const message = buildMessageBlocks(
    {
      name: nathelly.name,
      willAttend: nathelly.willAttend,
      attendees: nathelly.attendees,
      moment: nathelly.moment,
      note: nathelly.note,
      createdAtText: nathelly.createdAtText,
    },
    [
      {
        name: "Allan Monteiro",
        will_attend: true,
        moment: "ambos",
        attendees: 3,
        companions: "",
      },
      {
        name: nathelly.name,
        will_attend: nathelly.willAttend,
        moment: nathelly.moment,
        attendees: nathelly.attendees,
        companions: nathelly.companions,
      },
    ],
  );

  const slackText = message.blocks
    .map((block) => block.text?.text || "")
    .join("\n");

  assert.match(slackText, /\*Total de respostas:\* 2/);
  assert.match(slackText, /\*Total de pessoas confirmadas:\* 5 pessoas/);
  assert.doesNotMatch(slackText, /\*Restaurante:\*/);
  assert.doesNotMatch(slackText, /\*Igreja:\*/);
  assert.match(slackText, /\*Participantes:\* 2 pessoas/);
  assert.match(slackText, /• \*NATHELLY MONTEIRO\* • 2 pessoas • Igreja \+ Restaurante/);
  assert.match(slackText, /↳ \*ALLAN MONTEIRO\* • acompanhante/);
});

test("corrige a contagem de registros antigos com acompanhantes nomeados", () => {
  const message = buildMessageBlocks(
    {
      name: "Outra Pessoa",
      willAttend: true,
      attendees: 1,
      moment: "igreja",
      note: "",
      createdAtText: "04/09/2026, 19:10",
    },
    [
      {
        name: "Nathelly Monteiro",
        will_attend: true,
        moment: "ambos",
        attendees: 1,
        companions: "Allan Monteiro",
      },
    ],
  );
  const slackText = message.blocks
    .map((block) => block.text?.text || "")
    .join("\n");

  assert.match(slackText, /\*Pessoas confirmadas\* \(2 pessoas\)/);
  assert.match(slackText, /• \*NATHELLY MONTEIRO\* • 2 pessoas • Igreja \+ Restaurante/);
  assert.match(slackText, /↳ \*ALLAN MONTEIRO\* • acompanhante/);
});

test("salva o titular e os acompanhantes com nomes normalizados", () => {
  const payload = normalizePayload({
    name: " nathelly   monteiro ",
    willAttend: "sim",
    attendees: 0,
    attendanceMode: "ambos",
    companions: " allan monteiro,  Maria Cecília ",
  });

  assert.equal(payload.name, "NATHELLY MONTEIRO");
  assert.equal(payload.companions, "ALLAN MONTEIRO, MARIA CECÍLIA");
});

test("detecta titular ou acompanhante já presente na lista", () => {
  const duplicates = findDuplicateNames(
    {
      name: "Nathelly Monteiro",
      companions: "Allan Monteiro",
    },
    [
      {
        name: "allan monteiro",
        companions: "Outra Pessoa",
      },
      {
        name: "NATHELLY MONTEIRO",
        companions: "",
      },
    ],
  );

  assert.deepEqual(duplicates, ["NATHELLY MONTEIRO", "ALLAN MONTEIRO"]);
});
