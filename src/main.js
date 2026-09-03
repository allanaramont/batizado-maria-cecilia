import './styles.css';

const API_ENDPOINT = '/api/confirmacao';

const SUCCESS_MESSAGE =
  'Que alegria ter você conosco! 🤍 Será uma bênção compartilhar esse momento tão especial da vida da Maria Cecilia com você.';
const SUCCESS_MESSAGE_NON_PARTICIPATE =
  'Obrigado pelo retorno, Nathelly e Allan vão receber seu carinho no dia.';

const btnYes = document.getElementById('attendYes');
const btnNo = document.getElementById('attendNo');
const form = document.getElementById('confirmationForm');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const attendeesInput = document.getElementById('attendees');
const decreaseBtn = document.getElementById('decrease');
const increaseBtn = document.getElementById('increase');
const nameInput = document.getElementById('name');
const companionsInput = document.getElementById('companions');
const noteInput = document.getElementById('note');
const attendeesGroup = document.getElementById('attendeesGroup');
const companionsGroup = document.getElementById('companionsGroup');
const notesGroup = document.getElementById('notesGroup');
const scrollProgressBar = document.getElementById('scrollProgressBar');
const choiceButtons = [btnYes, btnNo];

const revealTargets = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  {
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.15,
  },
);

revealTargets.forEach((el) => {
  const delay = el.dataset?.revealDelay ? Number(el.dataset.revealDelay) : 0;
  if (!Number.isNaN(delay)) {
    el.style.setProperty('--reveal-delay', `${delay}ms`);
  }
  el.classList.add('reveal');
  observer.observe(el);
});

let attendanceChoice = null;

const setAttendees = (value) => {
  const parsed = Number.parseInt(value, 10);
  const safe = Number.isNaN(parsed) ? 1 : Math.max(1, parsed);
  attendeesInput.value = String(safe);
  decreaseBtn.disabled = safe <= 1;

  attendeesInput.classList.remove('bump');
  void attendeesInput.offsetWidth;
  attendeesInput.classList.add('bump');
};

const resetForm = () => {
  form.reset();
  setAttendees(1);
};

const resetChoices = () => {
  btnYes.classList.remove('active');
  btnNo.classList.remove('active');
  attendeesGroup.classList.add('hidden');
  companionsGroup.classList.add('hidden');
};

const showChoice = (choice) => {
  attendanceChoice = choice;
  errorMessage.textContent = '';
  successMessage.classList.add('hidden');
  choiceButtons.forEach((button) => button?.classList.remove('active'));

  const isAttending = choice === 'sim';
  form.classList.remove('hidden');
  attendeesGroup.classList.toggle('hidden', !isAttending);
  companionsGroup.classList.toggle('hidden', !isAttending);
  notesGroup.classList.remove('hidden');
  btnYes.classList.toggle('active', isAttending);
  btnNo.classList.toggle('active', !isAttending);

  if (!isAttending) {
    companionsInput.value = '';
  }

  requestAnimationFrame(() => {
    nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    nameInput.focus();
  });
};

const buildPayload = () => ({
  name: nameInput.value.trim(),
  willAttend: attendanceChoice,
  attendees: attendanceChoice === 'sim' ? Number(attendeesInput.value) || 1 : 0,
  companions: companionsInput.value.trim(),
  note: noteInput.value.trim(),
});

const submitConfirmation = async (event) => {
  event.preventDefault();
  errorMessage.textContent = '';

  const payload = buildPayload();

  if (!payload.name) {
    errorMessage.textContent = 'Informe o nome completo.';
    return;
  }
  if (!attendanceChoice) {
    errorMessage.textContent = 'Escolha uma opção de presença.';
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.status === 202 && result?.disabled) {
      errorMessage.textContent =
        'Confirmação recebida, mas a integração com Slack ainda não está ativa.';
      return;
    }

    if (!response.ok) {
      errorMessage.textContent = result?.error || 'Erro ao enviar confirmação.';
      return;
    }

    successMessage.innerHTML = payload.willAttend === 'sim'
      ? SUCCESS_MESSAGE
      : SUCCESS_MESSAGE_NON_PARTICIPATE;
    successMessage.classList.remove('hidden');

    resetForm();
    form.classList.add('hidden');
    attendanceChoice = null;
    resetChoices();

    setTimeout(() => {
      successMessage.classList.add('hidden');
    }, 7000);
  } catch {
    errorMessage.textContent = 'Não foi possível enviar. Tente novamente em instantes.';
  } finally {
    submitBtn.disabled = false;
  }
};

const updateScrollProgress = () => {
  if (!scrollProgressBar) {
    return;
  }

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

btnYes?.addEventListener('click', () => showChoice('sim'));
btnNo?.addEventListener('click', () => showChoice('nao'));

decreaseBtn?.addEventListener('click', () => {
  setAttendees(Number(attendeesInput.value) - 1);
});
increaseBtn?.addEventListener('click', () => {
  setAttendees(Number(attendeesInput.value) + 1);
});
form?.addEventListener('submit', submitConfirmation);

window.addEventListener('scroll', updateScrollProgress, { passive: true });
updateScrollProgress();
