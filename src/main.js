import './styles.css';

const API_ENDPOINT = '/api/confirmacao';

const CHURCH_NAME = 'SANTUÁRIO NOSSA SENHORA DE FÁTIMA';
const CHURCH_DATE = '19 de setembro de 2026';
const CHURCH_TIME = '12:00';
const CHURCH_ADDRESS =
  'Av. Alfredo Balthazar da Silveira, 900. Recreio dos Bandeirantes. (Próximo ao Barra World)';
const RESTAURANT_NAME = 'Bistral Rio';
const RESTAURANT_TIME = '13:30';
const RESTAURANT_ADDRESS = 'Av. Lúcio Costa, 16.756';

const SUCCESS_MESSAGE =
  'Que alegria ter você conosco! 🤍 Será uma bênção compartilhar esse momento tão especial da vida da Maria Cecilia com você.';
const SUCCESS_MESSAGE_NON_PARTICIPATE =
  'Obrigado por responder, Nathelly e Allan vão receber seu carinho no dia.';

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

let attendanceChoice = null;

const setAttendees = (value) => {
  const parsed = Number.parseInt(value, 10);
  const safe = Number.isNaN(parsed) ? 1 : Math.max(1, parsed);
  attendeesInput.value = String(safe);
  decreaseBtn.disabled = safe <= 1;
};

const resetForm = () => {
  form.reset();
  attendeesInput.value = '1';
  setAttendees(1);
};

const showChoice = (choice) => {
  attendanceChoice = choice;
  errorMessage.textContent = '';
  successMessage.classList.add('hidden');
  form.classList.remove('hidden');

  const isAttending = choice === 'sim';
  attendeesGroup.classList.toggle('hidden', !isAttending);
  companionsGroup.classList.toggle('hidden', !isAttending);
  notesGroup.classList.toggle('hidden', false);

  btnYes.classList.toggle('active', isAttending);
  btnNo.classList.toggle('active', !isAttending);

  if (!isAttending) {
    companionsInput.value = '';
    setAttendees(1);
  }

  nameInput.focus();
};

const buildPayload = () => {
  const willAttend = attendanceChoice;
  const attendees = Number(attendeesInput.value) || 1;

  return {
    name: nameInput.value.trim(),
    willAttend,
    attendees: willAttend === 'sim' ? attendees : 0,
    companions: companionsInput.value.trim(),
    note: noteInput.value.trim(),
    churchName: CHURCH_NAME,
    churchDate: CHURCH_DATE,
    churchTime: CHURCH_TIME,
    churchAddress: CHURCH_ADDRESS,
    restaurantName: RESTAURANT_NAME,
    restaurantTime: RESTAURANT_TIME,
    restaurantAddress: RESTAURANT_ADDRESS,
  };
};

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
        'Fluxo de integração com Slack ainda não configurado. A confirmação não foi enviada.';
      resetForm();
      form.classList.add('hidden');
      successMessage.classList.add('hidden');
      attendanceChoice = null;
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
    btnYes.classList.remove('active');
    btnNo.classList.remove('active');
  } catch {
    errorMessage.textContent =
      'Não foi possível enviar. Tente novamente em instantes.';
  } finally {
    submitBtn.disabled = false;
  }
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
