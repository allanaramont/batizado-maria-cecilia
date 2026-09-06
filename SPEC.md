# SPEC

## §G

Registrar detalhes completos de cada acesso ao Batizado no Slack.

## §C

- cliente envia contexto de navegação disponível
- servidor mantém localização via headers `x-vercel-ip-*`
- segredos Slack permanecem server-only
- origem vazia → `Acesso direto`
- mensagem Slack legível, um dado por linha

## §I

- api: `POST /api/track-visit` → `200 {success}`
- env: `SLACK_BOT_TOKEN`, `SLACK_VISITS_CHANNEL_ID`, `SLACK_BATIZADO_CHANNEL_ID`

## §V

V1: ∀ visita → mensagem Slack inclui Página, Caminho, Origem, User Agent, Idioma, Plataforma, Fuso horário, Tela & Localização

V2: ∀ campo ausente → fallback legível; referrer ausente → `Acesso direto`

V3: localização → headers Vercel; ⊥ geolocation API no cliente

V4: visita → `sendBeacon` ou `fetch` com `keepalive`; falha não bloqueia navegação

## §T

id|status|task|cites
T1|x|enviar contexto completo do cliente para `/api/track-visit`|V1,V3,V4
T2|x|formatar contexto completo no Slack com localização server-side|V1,V2
T3|x|cobrir payload, fallback e mensagem com testes|V1,V2,V3

## §B

id|date|cause|fix
