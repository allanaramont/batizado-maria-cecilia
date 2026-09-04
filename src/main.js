import './styles.css';

/* =============================================================
   BATIZADO DA MARIA CECÍLIA
   Frontend interactions
   ============================================================= */

const API_ENDPOINT = '/api/confirmacao';
const VISIT_API_ENDPOINT = '/api/track-visit';

const EVENT_DATETIME = new Date('2026-09-19T12:00:00-03:00');

const SUCCESS_MESSAGE_SIM =
  'Que alegria ter você conosco! Será uma bênção compartilhar esse momento tão especial da vida da Maria Cecilia com você.';
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
const topbar = document.querySelector('.topbar');
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
const typeDate = document.getElementById('typeDate');
const typeSub = document.getElementById('typeSub');
const heroCta = document.querySelector('.hero-cta');
const scrollCue = document.querySelector('.scroll-cue');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function typeInto(el, text, speed = 55) {
  if (!el) return;
  for (let i = 0; i <= text.length; i++) {
    el.textContent = text.slice(0, i);
    await sleep(speed);
  }
}

async function runTypewriter() {
  if (!hero) return;
  // marca o hero como "em digitação" — mantém h1 e eyebrow visíveis
  // (sem isso, o reveal base esconde o texto durante a digitação)
  hero.classList.add('is-typing');

  // 1) Eyebrow desce de cima (sem digitar)
  await sleep(220);
  hero.classList.add('phase-1');
  await sleep(900);

  // 2) Nome digita (Maria + Cecilia)
  await typeInto(typeName1, 'Maria', 130);
  await sleep(180);
  await typeInto(typeName2, 'Cecilia', 130);
  await sleep(380);

  // 3) Lead digita
  await typeInto(
    typeLead,
    'convidamos você com muito carinho para celebrar esse momento',
    32
  );
  await sleep(280);

  // 4) Data aparece em fade
  hero.classList.add('phase-3');
  await sleep(620);

  // 5) Sub "às 12h00" digita
  await typeInto(typeSub, 'às 12h00', 70);
  await sleep(380);

  // 6) CTAs e scroll-cue sobem de baixo
  hero.classList.add('phase-4');
  await sleep(900);

  // cleanup: libera as linhas do título para o reveal padrão
  // (mantém is-typing + phase-1/3/4 para o estado final ficar visível)
  document
    .querySelectorAll('.hero .display-line')
    .forEach((el) => el.classList.add('is-visible'));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runTypewriter);
} else {
  runTypewriter();
}

// Above-the-fold elements (topbar) show immediately on load.
topbar?.classList.add('is-visible');

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

/* =============================================================
   5. SMOOTH SCROLL WITH OFFSET (for topbar anchor links)
   ============================================================= */
const topbarOffset = 90;

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (!href || href === '#' || href.length < 2) return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - topbarOffset;
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
const wpItems = document.querySelectorAll('.wp-item');

const nameInput = document.getElementById('name');
const attendeesInput = document.getElementById('attendees');
const decreaseBtn = document.getElementById('decrease');
const increaseBtn = document.getElementById('increase');
const companionList = document.getElementById('companionList');
const addCompanionBtn = document.getElementById('addCompanion');

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
  showPanel(1);
};

// choice buttons (presence)
document.querySelectorAll('[data-choice]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.attendanceChoice = btn.dataset.choice;
    document.querySelectorAll('[data-choice]').forEach((b) =>
      b.classList.toggle('is-active', b === btn)
    );
    if (state.attendanceChoice === 'nao') {
      showPanel(4);
      fillReview();
    } else {
      showPanel(2);
    }
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
      if (!nameInput.value.trim()) {
        errorMessage.textContent = 'Por favor, informe seu nome.';
        nameInput.focus();
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
        showPanel(1);
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

  if (!nameInput.value.trim()) {
    errorMessage.textContent = 'Por favor, informe seu nome.';
    showPanel(2);
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
  if (submitBtn) submitBtn.disabled = true;

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));

    if (response.status === 202 && result?.disabled) {
      errorMessage.textContent =
        'Confirmação recebida, mas a integração ainda não está ativa.';
      return;
    }

    if (!response.ok) {
      errorMessage.textContent = result?.error || 'Não foi possível enviar a confirmação.';
      return;
    }

    successMessage.textContent =
      payload.willAttend === 'sim' ? SUCCESS_MESSAGE_SIM : SUCCESS_MESSAGE_NAO;
    form.hidden = true;
    if (successWrap) successWrap.hidden = false;
  } catch {
    errorMessage.textContent = 'Não foi possível enviar. Tente novamente em instantes.';
  } finally {
    if (submitBtn) submitBtn.disabled = false;
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
  const payload = {
    page: 'Batizado da Maria Cecilia',
    path: window.location.pathname,
    fullUrl: window.location.href,
    referrer: (document.referrer || '').trim(),
    userAgent: (navigator.userAgent || '').trim(),
    language: (navigator.language || '').trim(),
    platform: (navigator.platform || '').trim(),
    timezone: Intl.DateTimeFormat().resolvedOptions()?.timeZone,
    screen: {
      width: window.screen?.width || 0,
      height: window.screen?.height || 0,
    },
    timestamp: new Date().toISOString(),
  };
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
