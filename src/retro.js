import "./styles.css";

/* =============================================================
   BATIZADO DA MARIA CECILIA — RETROSPECTIVA
   Tela pós-evento: fotos do dia + "tempo desde" + agradecimento.
   Reaproveita o design system de styles.css e a mesma linguagem de
   interação do convite (cursor, reveal, scroll), sem o wizard de RSVP.
   ============================================================= */

const VISIT_API_ENDPOINT = "/api/track-visit";
const EVENT_DATETIME = new Date("2026-09-19T12:00:00-03:00");

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const supportsHover = window.matchMedia(
  "(hover: hover) and (pointer: fine)",
).matches;

/* =============================================================
   1. CUSTOM CURSOR
   ============================================================= */
const cursor = document.querySelector(".cursor");
const cursorDot = document.querySelector(".cursor-dot");
const cursorRing = document.querySelector(".cursor-ring");

if (cursor && supportsHover && !prefersReducedMotion) {
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let dotX = mouseX;
  let dotY = mouseY;
  let ringX = mouseX;
  let ringY = mouseY;

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  const animate = () => {
    dotX += (mouseX - dotX) * 0.65;
    dotY += (mouseY - dotY) * 0.65;
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

  const hoverTargets = document.querySelectorAll(
    'a, button, [data-cursor="hover"], .t-card, .g-item',
  );
  hoverTargets.forEach((el) => {
    el.addEventListener("mouseenter", () => cursor.classList.add("is-hover"));
    el.addEventListener("mouseleave", () =>
      cursor.classList.remove("is-hover"),
    );
  });
} else {
  document.body.classList.add("no-custom-cursor");
  if (cursor) cursor.style.display = "none";
}

/* =============================================================
   2. MAGNETIC BUTTONS + RIPPLE
   ============================================================= */
if (supportsHover && !prefersReducedMotion) {
  const magnets = document.querySelectorAll(".btn-magnetic");
  magnets.forEach((btn) => {
    const strength = 0.25;

    const onMove = (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    };
    const onLeave = () => {
      btn.style.transform = "";
    };

    btn.addEventListener("mousemove", onMove);
    btn.addEventListener("mouseleave", onLeave);
  });

  document.querySelectorAll(".btn-magnetic, .btn-mini").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.4;
      const ripple = document.createElement("span");
      ripple.className = "btn-ripple";
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 720);
    });
  });

  const tiltCards = document.querySelectorAll(".t-card");
  tiltCards.forEach((card) => {
    const onMove = (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${-y * 3}deg) rotateY(${x * 3}deg) translateY(-4px)`;
    };
    const onLeave = () => {
      card.style.transform = "";
    };
    card.addEventListener("mousemove", onMove);
    card.addEventListener("mouseleave", onLeave);
  });
}

/* =============================================================
   3. REVEAL ON SCROLL
   ============================================================= */
const revealTargets = document.querySelectorAll("[data-reveal]");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
);

revealTargets.forEach((el) => revealObserver.observe(el));

/* =============================================================
   4. SCROLL PROGRESS + SCROLL CUE + BACK TO TOP
   ============================================================= */
const scrollProgressBar = document.getElementById("scrollProgressBar");
const scrollCue = document.querySelector(".scroll-cue");
const backToTop = document.querySelector("[data-back-to-top]");

const updateScrollProgress = () => {
  if (!scrollProgressBar) return;
  const docHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
    1,
  );
  const viewport = window.innerHeight;
  const total = Math.max(docHeight - viewport, 1);
  const progress = Math.min(Math.max((window.scrollY / total) * 100, 0), 100);
  scrollProgressBar.style.width = `${progress}%`;
};

const updateScrollCue = () => {
  if (!scrollCue) return;
  const threshold = window.innerHeight * 0.1;
  scrollCue.classList.toggle("is-hidden", window.scrollY > threshold);
};

const updateBackToTop = () => {
  if (!backToTop) return;
  backToTop.classList.toggle(
    "is-visible",
    window.scrollY > window.innerHeight * 0.6,
  );
};

window.addEventListener(
  "scroll",
  () => {
    updateScrollProgress();
    updateScrollCue();
    updateBackToTop();
  },
  { passive: true },
);
updateScrollProgress();
updateScrollCue();
updateBackToTop();

/* =============================================================
   5. SMOOTH SCROLL
   ============================================================= */
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (e) => {
    const href = link.getAttribute("href");
    if (!href || href === "#" || href.length < 2) return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  });
});

/* =============================================================
   6. TEMPO DESDE O GRANDE DIA (contador invertido)
   ============================================================= */
const cdCells = {
  days: document.querySelector('[data-cd="days"]'),
  hours: document.querySelector('[data-cd="hours"]'),
  minutes: document.querySelector('[data-cd="minutes"]'),
  seconds: document.querySelector('[data-cd="seconds"]'),
};

let lastSec = -1;

const pad = (n) => String(n).padStart(2, "0");

const updateElapsed = () => {
  const now = Date.now();
  const diff = Math.max(0, now - EVENT_DATETIME.getTime());
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
      cdCells.seconds.classList.add("is-flip");
      setTimeout(() => cdCells.seconds.classList.remove("is-flip"), 360);
    }
    lastSec = seconds;
  }
};

updateElapsed();
setInterval(updateElapsed, 1000);

/* =============================================================
   7. GALERIA — LIGHTBOX
   ============================================================= */
const galleryItems = document.querySelectorAll(".g-item");
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxClose = document.querySelector(".lightbox-close");

let lastFocused = null;

const openLightbox = (item) => {
  if (!lightbox || !lightboxImg) return;
  const full = item.dataset.full;
  const alt = item.querySelector("img")?.alt || "";
  lightboxImg.src = full;
  lightboxImg.alt = alt;
  lastFocused = document.activeElement;
  lightbox.hidden = false;
  document.body.style.overflow = "hidden";
  lightboxClose?.focus();
};

const closeLightbox = () => {
  if (!lightbox) return;
  lightbox.hidden = true;
  lightboxImg.src = "";
  document.body.style.overflow = "";
  if (lastFocused instanceof HTMLElement) lastFocused.focus();
};

galleryItems.forEach((item) => {
  item.addEventListener("click", () => openLightbox(item));
});

lightboxClose?.addEventListener("click", closeLightbox);

lightbox?.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && lightbox && !lightbox.hidden) closeLightbox();
});

/* =============================================================
   8. VISIT TRACKER (beacon)
   ============================================================= */
const trackVisit = () => {
  if (!VISIT_API_ENDPOINT) return;
  const payload = {
    page: window.location.href,
    path: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    referrer: document.referrer || "Acesso direto",
    userAgent: window.navigator.userAgent,
    language: window.navigator.language,
    platform: window.navigator.platform,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: {
      width: window.screen.width,
      height: window.screen.height,
    },
  };
  const body = JSON.stringify(payload);
  try {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.sendBeacon === "function"
    ) {
      const sent = navigator.sendBeacon(
        VISIT_API_ENDPOINT,
        new Blob([body], { type: "application/json" }),
      );
      if (sent) return;
    }
    fetch(VISIT_API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body,
      keepalive: true,
    });
  } catch {
    /* no-op */
  }
};
trackVisit();
