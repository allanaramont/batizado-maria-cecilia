import './styles.css';

/* =============================================================
   BATIZADO DA MARIA CECÍLIA
   Frontend interactions
   ============================================================= */

const API_ENDPOINT = '/api/confirmacao';
const VISIT_API_ENDPOINT = '/api/track-visit';

const EVENT_DATETIME = new Date('2026-09-19T12:00:00-03:00');

const SUCCESS_MESSAGE_NAO =
  'Obrigado pelo retorno. Nathelly e Allan vão receber seu carinho no dia.';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* =============================================================
   1. CUSTOM CURSOR
   ============================================================= */
const cursor = document.querySelector('.cursor');
const cursorDot = document.querySelector('.cursor-dot');
const cursorRing = document.querySelector('.cursor-ring');

if (cursor && supportsHover && !prefersReducedMotion) {
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let dotX = mouseX;
  let dotY = mouseY;
  let ringX = mouseX;
  let ringY = mouseY;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  const animate = () => {
    // dot follows tightly
    dotX += (mouseX - dotX) * 0.65;
    dotY += (mouseY - dotY) * 0.65;
    // ring follows with lag
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;

    if (cursorDot) {
      cursorDot.style.transform = `translate(${dotX}px, ${dotY}px) translate(-50%, -50%)`;
    }
    if (cursorRing) {
      cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
    }
    requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);

  // hover state for interactive elements
  const hoverTargets = document.querySelectorAll(
    'a, button, [data-cursor="hover"], input, textarea, label, .local-card, .t-card'
  );
  hoverTargets.forEach((el) => {
    el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
  });
} else {
  document.body.classList.add('no-custom-cursor');
  if (cursor) cursor.style.display = 'none';
}

/* =============================================================
   2. MAGNETIC BUTTONS + RIPPLE
   ============================================================= */
if (supportsHover && !prefersReducedMotion) {
  const magnets = document.querySelectorAll('.btn-magnetic');
  magnets.forEach((btn) => {
    const strength = 0.25; // mais sutil

    const onMove = (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    };
    const onLeave = () => {
      btn.style.transform = '';
    };

    btn.addEventListener('mousemove', onMove);
    btn.addEventListener('mouseleave', onLeave);
  });

  // ripple burst on click
  document.querySelectorAll('.btn-magnetic, .btn-mini').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.4;
      const ripple = document.createElement('span');
      ripple.className = 'btn-ripple';
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 720);
    });
  });

  // timeline cards: subtle 3D tilt on hover
  const tiltCards = document.querySelectorAll('.t-card');
  tiltCards.forEach((card) => {
    const onMove = (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${-y * 3}deg) rotateY(${x * 3}deg) translateY(-4px)`;
    };
    const onLeave = () => {
      card.style.transform = '';
    };
    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
  });
}

/* =============================================================
   3. REVEAL ON SCROLL
   ============================================================= */
const revealTargets = document.querySelectorAll('[data-reveal]');
const splitTargets = document.querySelectorAll('[data-split]');
const displayLines = document.querySelectorAll('.display-line');
const hero = document.querySelector('.hero');

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
);

revealTargets.forEach((el) => revealObserver.observe(el));
displayLines.forEach((el) => revealObserver.observe(el));

/* =============================================================
   3b. TYPEWRITER EFFECT (eyebrow + name)
   ============================================================= */
const typeEyebrow = document.getElementById('typeEyebrow');
const typeName1 = document.getElementById('typeName1');
const typeName2 = document.getElementById('typeName2');
const typeLead = document.getElementById('typeLead');
const typeDatePre = document.getElementById('typeDatePre');
const typeDateMonth = document.getElementById('typeDateMonth');
const typeDatePost = document.getElementById('typeDatePost');
const typeSub = document.getElementById('typeSub');
const heroCta = document.querySelector('.hero-cta');
const scrollCue = document.querySelector('.scroll-cue');
const backToTop = document.querySelector('[data-back-to-top]');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function typeInto(el, text, speed = 55) {
  if (!el) return;
  for (let i = 0; i <= text.length; i++) {
    el.textContent = text.slice(0, i);
    await sleep(speed);
  }
}

// Variante com segmentos: cada segmento tem seu próprio speed e pauseAfter.
// Permite respirar em palavras-chave para imitar ritmo de leitura humana.
async function typeIntoRhythmic(el, segments) {
  if (!el) return;
  let acc = '';
  for (const seg of segments) {
    for (let i = 1; i <= seg.text.length; i++) {
      acc += seg.text[i - 1];
      el.textContent = acc;
      await sleep(seg.speed);
    }
    if (seg.pauseAfter) await sleep(seg.pauseAfter);
  }
}

async function runTypewriter() {
  if (!hero) return;
  hero.classList.add('is-typing');

  // pausa inicial bem curta — convite entra rápido
  await sleep(200);

  // 1) Eyebrow desce de cima (-80px, ~1.4s). Já começamos a digitar
  //    o nome enquanto ele ainda está deslizando, para dar sensação de fluxo.
  hero.classList.add('phase-1');
  await sleep(750);

  // 2) Nome digita rápido (Maria + Cecilia) em paralelo ao fim do slide
  await typeInto(typeName1, 'Maria', 55);
  await sleep(80);
  await typeInto(typeName2, 'Cecilia', 55);
  await sleep(160);

  // 3) Lead, data e sub ficam visíveis (digitam em seguida)
  hero.classList.add('phase-3');
  await sleep(160);

  // 4) Lead digita em ritmo de leitura humana, com micro-pausas em
  //    "carinho" e "momento" para soar como alguém falando e dar
  //    peso emocional às palavras-chave. O nome "Maria Cecília" já
  //    aparece no título logo acima, então não precisa repetir aqui.
  await typeIntoRhythmic(typeLead, [
    { text: 'Convidamos você com muito ', speed: 28 },
    { text: 'carinho', speed: 32, pauseAfter: 140 },
    { text: ' para celebrar esse ', speed: 28 },
    { text: 'momento', speed: 32, pauseAfter: 160 },
  ]);
  await sleep(160);

  // 5) Data digita em três partes (mantém o "setembro" em italic rosa)
  await typeInto(typeDatePre, '19 · ', 50);
  await typeInto(typeDateMonth, 'setembro', 55);
  await typeInto(typeDatePost, ' · 2026', 50);
  await sleep(160);

  // 6) Sub "às 12h00" digita
  await typeInto(typeSub, 'às 12h00', 55);
  await sleep(220);

  // 7) CTAs e scroll-cue sobem de baixo com stagger via transition-delay
  //    (definido no CSS) — sem sleep aqui, a próxima ação só rola com
  //    scroll do usuário, então não há motivo pra segurar a função.
  hero.classList.add('phase-4');

  // cleanup imediato: libera as linhas do título para o reveal padrão
  document
    .querySelectorAll('.hero .display-line')
    .forEach((el) => el.classList.add('is-visible'));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runTypewriter);
} else {
  runTypewriter();
}

/* =============================================================
   4. SCROLL PROGRESS
   ============================================================= */
const scrollProgressBar = document.getElementById('scrollProgressBar');

const updateScrollProgress = () => {
  if (!scrollProgressBar) return;
  const docHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
    1
  );
  const viewport = window.innerHeight;
  const total = Math.max(docHeight - viewport, 1);
  const progress = Math.min(Math.max((window.scrollY / total) * 100, 0), 100);
  scrollProgressBar.style.width = `${progress}%`;
};

window.addEventListener('scroll', updateScrollProgress, { passive: true });
updateScrollProgress();

/* =============================================================
   5b. SCROLL CUE — hide after first viewport of scroll
   ============================================================= */
const updateScrollCue = () => {
  if (!scrollCue) return;
  const threshold = window.innerHeight * 0.1;
  scrollCue.classList.toggle('is-hidden', window.scrollY > threshold);
};
window.addEventListener('scroll', updateScrollCue, { passive: true });
updateScrollCue();

const updateBackToTop = () => {
  if (!backToTop) return;
  backToTop.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.6);
};

window.addEventListener('scroll', updateBackToTop, { passive: true });
updateBackToTop();

/* =============================================================
   5. SMOOTH SCROLL
============================================================= */
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (!href || href === '#' || href.length < 2) return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });
});

/* =============================================================
   6. COUNTDOWN
   ============================================================= */
const cdCells = {
  days: document.querySelector('[data-cd="days"]'),
  hours: document.querySelector('[data-cd="hours"]'),
  minutes: document.querySelector('[data-cd="minutes"]'),
  seconds: document.querySelector('[data-cd="seconds"]'),
};

let lastSec = -1;

const pad = (n) => String(n).padStart(2, '0');

const updateCountdown = () => {
  const now = Date.now();
  const diff = Math.max(0, EVENT_DATETIME.getTime() - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  if (cdCells.days) cdCells.days.textContent = pad(days);
  if (cdCells.hours) cdCells.hours.textContent = pad(hours);
  if (cdCells.minutes) cdCells.minutes.textContent = pad(minutes);
  if (cdCells.seconds) {
    cdCells.seconds.textContent = pad(seconds);
    if (lastSec !== -1 && lastSec !== seconds) {
      cdCells.seconds.classList.add('is-flip');
      setTimeout(() => cdCells.seconds.classList.remove('is-flip'), 360);
    }
    lastSec = seconds;
  }
};

updateCountdown();
setInterval(updateCountdown, 1000);

/* =============================================================
   7. RSVP WIZARD
   ============================================================= */
const wizard = document.querySelector('.wizard');
const form = document.getElementById('confirmationForm');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const successWrap = document.querySelector('.wizard-success');
const rsvpInner = document.querySelector('.rsvp-inner');
const successFinal = document.getElementById('successFinal');
const wizardLoading = document.getElementById('wizardLoading');
const loadingIllustration = document.getElementById('loadingIllustration');
const loadingStepTitle = document.getElementById('loadingStepTitle');
const loadingStepDesc = document.getElementById('loadingStepDesc');
const loadingDots = document.getElementById('loadingDots');
const LOADING_STEP_DURATION_MS = 3900;

// textos de cada etapa (titulo + descricao)
const LOADING_STEP_DEFINITIONS = {
  church: {
    getTitle: () => 'Enviando confirmação para o Santuário',
    getDescription: () => 'Nossa Senhora de Fátima',
  },
  restaurant: {
    getTitle: ({ peopleCount }) =>
      peopleCount === 1
        ? 'Reservando seu lugar no Bistral'
        : `Reservando ${peopleCount} lugares no Bistral`,
    getDescription: () => 'para o almoço em família',
  },
  notify: {
    getTitle: () => 'Avisando a Maria Cecilia',
    getDescription: ({ isPlural }) =>
      isPlural ? 'que vocês estarão com a gente' : 'que você estará com a gente',
  },
  family: {
    getTitle: () => 'A família tá emocionada',
    getDescription: () => 'Allan, Nathelly e a Rubi já tão sabendo',
  },
};

const getPeopleCount = (payload) => {
  if (payload.willAttend !== 'sim') return 1;
  if (Number(payload.attendees) > 0) return Number(payload.attendees);

  const namedCompanions =
    typeof payload.companions === 'string'
      ? payload.companions
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean).length
      : 0;

  return Math.max(1, namedCompanions + 1);
};

const buildSuccessMessage = (payload) => {
  const isPlural = getPeopleCount(payload) > 1;
  return isPlural
    ? 'Que alegria ter vocês conosco! Será uma bênção compartilhar esse momento tão especial da vida da Maria Cecilia com vocês.'
    : 'Que alegria ter você conosco! Será uma bênção compartilhar esse momento tão especial da vida da Maria Cecilia com você.';
};

// roda o carrossel de loading em loop enquanto a API nao responde.
// Quando a flag stop vira true, a animacao para e o card final aparece.
let loadingLoopRunning = false;
const runLoadingAnimation = async (payload, stopPromise) => {
  // descobre quais etapas vao aparecer baseado na escolha da pessoa
  const stepKeys = [];
  if (payload.willAttend === 'sim') {
    if (payload.attendanceMode === 'igreja' || payload.attendanceMode === 'ambos') {
      stepKeys.push('church');
    }
    if (payload.attendanceMode === 'restaurante' || payload.attendanceMode === 'ambos') {
      stepKeys.push('restaurant');
    }
    stepKeys.push('notify');
  }
  stepKeys.push('family');

  // pluralizacao baseada na quantidade ou nos nomes informados
  const peopleCount = getPeopleCount(payload);
  const isPlural = peopleCount > 1;

  // monta dots conforme a quantidade de etapas
  if (loadingDots) {
    loadingDots.innerHTML = stepKeys
      .map(() => '<span class="dot"></span>')
      .join('');
  }

  // esconde etapas que nao vao aparecer
  const allStepEls = loadingIllustration?.querySelectorAll('.loading-step') || [];
  allStepEls.forEach((s) => {
    s.classList.toggle('is-active', stepKeys.includes(s.dataset.step));
  });

  // estado: mostra o loading, esconde o final
  if (wizardLoading) wizardLoading.hidden = false;
  if (successFinal) successFinal.hidden = true;

  // loop principal: se a API responder cedo, termina o primeiro ciclo antes
  // de revelar o sucesso; se demorar, continua ciclando ate ela responder.
  loadingLoopRunning = true;
  let idx = 0;
  let completedFirstCycle = stepKeys.length === 1;
  let requestCompleted = false;
  const requestCompletion = stopPromise.then(() => {
    requestCompleted = true;
    return 'request';
  });

  const setStep = (i) => {
    const key = stepKeys[i];
    const definition = LOADING_STEP_DEFINITIONS[key];
    const def = definition
      ? {
          title: definition.getTitle({ isPlural, peopleCount }),
          desc: definition.getDescription({ isPlural, peopleCount }),
        }
      : null;
    if (!def) return;

    // atualiza ilustracao (crossfade automatico pelo CSS)
    allStepEls.forEach((s) => {
      s.classList.toggle('is-active', s.dataset.step === key);
    });

    // atualiza texto
    if (loadingStepTitle) loadingStepTitle.textContent = def.title;
    if (loadingStepDesc) loadingStepDesc.textContent = def.desc;

    // atualiza dots: anteriores = done, atual = active
    const dots = loadingDots?.querySelectorAll('.dot') || [];
    dots.forEach((d, di) => {
      d.classList.toggle('is-done', di < i);
      d.classList.toggle('is-active', di === i);
    });
  };

  setStep(0);

  while (loadingLoopRunning) {
    const waitForNextStep = sleep(LOADING_STEP_DURATION_MS).then(() => 'step');
    const event = await Promise.race(
      requestCompleted ? [waitForNextStep] : [waitForNextStep, requestCompletion]
    );

    if (!loadingLoopRunning) break;
    if (requestCompleted && completedFirstCycle) break;
    if (event !== 'step') continue;

    // avanca para a proxima etapa (com loop)
    idx = (idx + 1) % stepKeys.length;
    setStep(idx);
    if (idx === stepKeys.length - 1) completedFirstCycle = true;
  }

  loadingLoopRunning = false;
};

const stopLoadingAnimation = () => {
  loadingLoopRunning = false;
};
const wpItems = document.querySelectorAll('.wp-item');

const nameInput = document.getElementById('name');
const attendeesInput = document.getElementById('attendees');
const decreaseBtn = document.getElementById('decrease');
const increaseBtn = document.getElementById('increase');
const companionList = document.getElementById('companionList');
const addCompanionBtn = document.getElementById('addCompanion');

// Helper: conta quantas palavras tem no nome (precisamos de 2+: nome + sobrenome)
const getNameWordCount = (raw) =>
  (raw || '').trim().split(/\s+/).filter(Boolean).length;

// Validação do nome: retorna null se válido, ou a mensagem de erro
const validateName = () => {
  const count = getNameWordCount(nameInput.value);
  if (count === 0) return 'Por favor, informe seu nome.';
  if (count < 2) return 'Por favor, informe nome e sobrenome.';
  return null;
};

// Feedback visual em tempo real: borda do campo muda conforme a pessoa digita
nameInput?.addEventListener('input', () => {
  const count = getNameWordCount(nameInput.value);
  nameInput.classList.toggle('is-valid', count >= 2);
  nameInput.classList.toggle('is-invalid', count > 0 && count < 2);
});

const state = {
  step: 1,
  totalSteps: 4,
  attendanceChoice: null, // 'sim' | 'nao'
  attendanceMoment: null, // 'igreja' | 'restaurante' | 'ambos'
  attendees: 1,
  companionMode: null, // 'count' | 'names'
  companionNames: [], // array of strings
};

const MOMENT_LABEL = {
  igreja: 'Cerimônia (Igreja)',
  restaurante: 'Almoço (Restaurante)',
  ambos: 'Cerimônia + Almoço',
};

const showPanel = (n) => {
  if (!wizard) return;
  state.step = n;
  wizard.dataset.step = String(n);
  wizard.querySelectorAll('.wizard-panel').forEach((p) => {
    const pn = Number(p.dataset.panel);
    p.hidden = pn !== n;
    if (pn === n) {
      p.style.animation = 'none';
      void p.offsetWidth;
      p.style.animation = '';
    }
  });
  wpItems.forEach((item) => {
    const pn = Number(item.dataset.progress);
    item.classList.toggle('is-active', pn <= n);
  });
  errorMessage.textContent = '';
};

const setAttendees = (v) => {
  const safe = Math.max(1, Number.isNaN(parseInt(v, 10)) ? 1 : parseInt(v, 10));
  state.attendees = safe;
  if (attendeesInput) attendeesInput.value = String(safe);
  if (decreaseBtn) decreaseBtn.disabled = safe <= 1;
};

// companion list rendering
const renderCompanions = () => {
  if (!companionList) return;
  companionList.innerHTML = '';
  state.companionNames.forEach((name, idx) => {
    const row = document.createElement('div');
    row.className = 'companion-row';
    row.innerHTML = `
      <input type="text" placeholder="Nome do acompanhante" value="${name.replace(/"/g, '&quot;')}" data-companion-idx="${idx}" />
      <button type="button" class="ic-remove" aria-label="Remover" data-remove-companion="${idx}">×</button>
    `;
    companionList.appendChild(row);
  });
  // bind events
  companionList.querySelectorAll('input').forEach((inp) => {
    inp.addEventListener('input', (e) => {
      const i = Number(e.target.dataset.companionIdx);
      state.companionNames[i] = e.target.value;
    });
  });
  companionList.querySelectorAll('[data-remove-companion]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const i = Number(e.currentTarget.dataset.removeCompanion);
      state.companionNames.splice(i, 1);
      renderCompanions();
    });
  });
};

const addCompanionRow = () => {
  state.companionNames.push('');
  renderCompanions();
  // focus the new input
  const inputs = companionList?.querySelectorAll('input');
  if (inputs && inputs.length) {
    inputs[inputs.length - 1].focus();
  }
};

// companion mode toggle
const setCompanionMode = (mode) => {
  state.companionMode = mode;
  document.querySelectorAll('[data-companion-mode]').forEach((b) =>
    b.classList.toggle('is-active', b.dataset.companionMode === mode)
  );
  document.querySelectorAll('[data-companion-area]').forEach((a) => {
    a.hidden = a.dataset.companionArea !== mode;
  });
  if (mode === 'names' && state.companionNames.length === 0) {
    addCompanionRow();
  }
};

document.querySelectorAll('[data-companion-mode]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.companionMode;
    // toggle off if clicking the active one
    if (state.companionMode === mode) {
      setCompanionMode(null);
    } else {
      setCompanionMode(mode);
    }
  });
});

addCompanionBtn?.addEventListener('click', addCompanionRow);

const buildAttendeesText = () => {
  if (state.attendanceChoice === 'nao') return 'Não vai comparecer';
  if (state.companionMode === 'count') {
    return `${state.attendees} ${state.attendees === 1 ? 'pessoa' : 'pessoas'}`;
  }
  if (state.companionMode === 'names') {
    const list = state.companionNames.map((n) => n.trim()).filter(Boolean);
    if (!list.length) return 'Só você';
    return ['Você', ...list].join(', ');
  }
  return 'Só você';
};

const buildCompanionsString = () => {
  if (state.companionMode !== 'names') return '';
  return state.companionNames.map((n) => n.trim()).filter(Boolean).join(', ');
};

const fillReview = () => {
  const map = {
    name: nameInput.value.trim() || '—',
    attendees: buildAttendeesText(),
    moment: state.attendanceChoice === 'nao' ? '—' : (MOMENT_LABEL[state.attendanceMoment] || '—'),
  };
  document.querySelectorAll('[data-r]').forEach((el) => {
    const k = el.dataset.r;
    el.textContent = map[k] || '—';
  });
};

const resetWizard = () => {
  state.attendanceChoice = null;
  state.attendanceMoment = null;
  state.attendees = 1;
  state.companionMode = null;
  state.companionNames = [];
  form.reset();
  setAttendees(1);
  setCompanionMode(null);
  renderCompanions();
  document.querySelectorAll('[data-choice], [data-moment]').forEach((b) =>
    b.classList.remove('is-active')
  );
  if (successWrap) successWrap.hidden = true;
  if (form) form.hidden = false;
  if (rsvpInner) rsvpInner.classList.remove('is-success');
  if (wizardLoading) wizardLoading.hidden = true;
  if (successFinal) successFinal.hidden = true;
  // limpa estado das ilustracoes e dots pra proxima vez
  document.querySelectorAll('.loading-step').forEach((s) => {
    s.classList.remove('is-active');
  });
  stopLoadingAnimation();
  showPanel(1);
};

// choice buttons (presence)
document.querySelectorAll('[data-choice]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.attendanceChoice = btn.dataset.choice;
    document.querySelectorAll('[data-choice]').forEach((b) =>
      b.classList.toggle('is-active', b === btn)
    );
    showPanel(2);
  });
});

// moment buttons
document.querySelectorAll('[data-moment]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.attendanceMoment = btn.dataset.moment;
    document.querySelectorAll('[data-moment]').forEach((b) =>
      b.classList.toggle('is-active', b === btn)
    );
  });
});

// next / back
document.querySelectorAll('[data-next]').forEach((btn) => {
  btn.addEventListener('click', () => {
    errorMessage.textContent = '';
    if (state.step === 2) {
      const nameError = validateName();
      if (nameError) {
        errorMessage.textContent = nameError;
        nameInput.focus();
        return;
      }
      if (state.attendanceChoice === 'nao') {
        fillReview();
        showPanel(4);
        return;
      }
    } else if (state.step === 3) {
      if (state.attendanceChoice === 'sim' && !state.attendanceMoment) {
        errorMessage.textContent = 'Selecione de quais momentos você participará.';
        return;
      }
    }
    if (state.step < state.totalSteps) {
      if (state.step === 3) fillReview();
      showPanel(state.step + 1);
    }
  });
});

document.querySelectorAll('[data-back]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (state.step > 1) {
      if (state.step === 4 && state.attendanceChoice === 'nao') {
        showPanel(2);
      } else {
        showPanel(state.step - 1);
      }
    }
  });
});

// reset
document.querySelectorAll('[data-reset]').forEach((btn) => {
  btn.addEventListener('click', () => resetWizard());
});

// counter
decreaseBtn?.addEventListener('click', () => setAttendees(state.attendees - 1));
increaseBtn?.addEventListener('click', () => setAttendees(state.attendees + 1));

// submit
const submitConfirmation = async (e) => {
  e.preventDefault();
  errorMessage.textContent = '';

  const nameError = validateName();
  if (nameError) {
    errorMessage.textContent = nameError;
    showPanel(2);
    nameInput.focus();
    return;
  }
  if (!state.attendanceChoice) {
    errorMessage.textContent = 'Escolha uma opção de presença.';
    showPanel(1);
    return;
  }
  if (state.attendanceChoice === 'sim' && !state.attendanceMoment) {
    errorMessage.textContent = 'Selecione de quais momentos você participará.';
    showPanel(3);
    return;
  }

  const payload = {
    name: nameInput.value.trim(),
    willAttend: state.attendanceChoice,
    attendees:
      state.attendanceChoice === 'sim' && state.companionMode === 'count'
        ? Number(attendeesInput.value) || 1
        : 0,
    attendanceMode: state.attendanceMoment || '',
    companions: buildCompanionsString(),
  };

  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
  }

  // Esconde o form e mostra o card de loading imediatamente.
  // O loading fica em loop ate a API responder, ai mostra o card final.
  form.hidden = true;
  if (successWrap) successWrap.hidden = false;
  if (rsvpInner) rsvpInner.classList.add('is-success');
  if (wizardLoading) wizardLoading.hidden = false;
  if (successFinal) successFinal.hidden = true;

  // Cria um Promise que sinaliza quando o submit termina (sucesso ou erro).
  // O carrossel usa esse sinal, mas só para depois do primeiro ciclo completo.
  let stopResolve;
  const stopPromise = new Promise((resolve) => {
    stopResolve = resolve;
  });

  // Dispara o carrossel de loading em paralelo com o fetch
  const loadingPromise = runLoadingAnimation(payload, stopPromise).catch(() => {
    // ignora erro do loop — so queremos parar de animar
  });

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));

    // Sinaliza o fim da requisição; a animação termina o ciclo atual antes
    // de mostrar o card confirmado.
    stopResolve();
    await loadingPromise;

    if (!response.ok) {
      // Mensagens de erro mais uteis dependendo do status
      if (response.status === 404) {
        errorMessage.textContent =
          'A confirmacao so funciona em producao. Teste em batizado.desenvbr.com ou rode vercel dev localmente.';
      } else if (response.status === 0 || response.status >= 500) {
        errorMessage.textContent =
          'Nosso servidor esta demorando pra responder. Tente de novo em alguns instantes.';
      } else {
        errorMessage.textContent = result?.error || 'Nao foi possivel enviar a confirmacao.';
      }
      // Volta a mostrar o form pra pessoa tentar de novo
      form.hidden = false;
      if (successWrap) successWrap.hidden = true;
      if (rsvpInner) rsvpInner.classList.remove('is-success');
      if (wizardLoading) wizardLoading.hidden = true;
      return;
    }

    successMessage.textContent =
      payload.willAttend === 'sim' ? buildSuccessMessage(payload) : SUCCESS_MESSAGE_NAO;
    // Esconde o loading e mostra o card final com foto + check
    if (wizardLoading) wizardLoading.hidden = true;
    if (successFinal) successFinal.hidden = false;
  } catch {
    // Mesmo em erro, deixa a sequência visual terminar antes de devolver o
    // formulário, evitando um corte brusco da animação.
    stopResolve();
    await loadingPromise;
    errorMessage.textContent =
      'Nao foi possivel conectar ao servidor. Verifique sua conexao e tente novamente.';
    // Volta a mostrar o form
    form.hidden = false;
    if (successWrap) successWrap.hidden = true;
    if (rsvpInner) rsvpInner.classList.remove('is-success');
    if (wizardLoading) wizardLoading.hidden = true;
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
    }
  }
};

form?.addEventListener('submit', submitConfirmation);

setAttendees(1);
setCompanionMode(null);
renderCompanions();
showPanel(1);

/* =============================================================
   8. VISIT TRACKER (beacon)
   ============================================================= */
const trackVisit = () => {
  if (!VISIT_API_ENDPOINT) return;
  // payload minimo: só o path. Localizacao vem dos headers
  // x-vercel-ip-* do proprio Vercel — não precisa de geolocation API
  // nem de userAgent/tela/etc, é mais leve e mais respeitoso com privacidade
  const payload = { path: window.location.pathname };
  const body = JSON.stringify(payload);
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const sent = navigator.sendBeacon(
        VISIT_API_ENDPOINT,
        new Blob([body], { type: 'application/json' })
      );
      if (sent) return;
    }
    fetch(VISIT_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body,
      keepalive: true,
    });
  } catch {
    /* no-op */
  }
};
trackVisit();
