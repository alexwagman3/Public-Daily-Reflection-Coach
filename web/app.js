// Minimal multi-turn client. No build step — drop into GitHub Pages or any
// static host and point it at your Worker's URL.

const STORAGE_KEY = 'reflection-coach.apiBase';

const $ = (id) => document.getElementById(id);
const apiBaseInput = $('api-base');
const traitSelect = $('trait-select');
const startBtn = $('start-btn');
const resetBtn = $('reset-btn');
const chatSection = $('chat');
const logEl = $('log');
const form = $('chat-form');
const input = $('input');
const statusEl = $('status');

let state = {
  apiBase: localStorage.getItem(STORAGE_KEY) || '',
  trait: null,
  messages: [], // {role, content}
  busy: false,
};

apiBaseInput.value = state.apiBase;

apiBaseInput.addEventListener('change', () => {
  state.apiBase = apiBaseInput.value.trim().replace(/\/$/, '');
  localStorage.setItem(STORAGE_KEY, state.apiBase);
  loadTraits().catch(showError);
});

function setStatus(msg) {
  statusEl.textContent = msg || '';
}

function showError(err) {
  setStatus(err?.message || String(err));
}

function appendMessage(role, content) {
  const div = document.createElement('div');
  div.className = `msg ${role === 'user' ? 'user' : 'coach'}`;
  const label = document.createElement('span');
  label.className = 'role';
  label.textContent = role === 'user' ? 'You' : 'Coach';
  const body = document.createElement('div');
  body.textContent = content;
  div.appendChild(label);
  div.appendChild(body);
  logEl.appendChild(div);
  div.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

async function loadTraits() {
  if (!state.apiBase) {
    traitSelect.innerHTML = '<option>Enter API base URL above…</option>';
    startBtn.disabled = true;
    return;
  }
  setStatus('Loading traits…');
  const res = await fetch(`${state.apiBase}/api/traits`);
  if (!res.ok) throw new Error(`Could not load traits (${res.status}).`);
  const data = await res.json();
  traitSelect.innerHTML = '';
  for (const t of data.traits) {
    const opt = document.createElement('option');
    opt.value = t.key;
    opt.textContent = `${t.name} — ${t.framework}`;
    traitSelect.appendChild(opt);
  }
  startBtn.disabled = false;
  setStatus(data.description || '');
}

async function sendTurn() {
  if (state.busy) return;
  state.busy = true;
  setStatus('Coach is thinking…');
  try {
    const res = await fetch(`${state.apiBase}/api/reflect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trait: state.trait, messages: state.messages }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status}).`);
    state.messages.push({ role: 'assistant', content: data.result });
    appendMessage('assistant', data.result);
    setStatus('');
  } catch (err) {
    showError(err);
  } finally {
    state.busy = false;
  }
}

startBtn.addEventListener('click', async () => {
  if (!state.apiBase) {
    showError(new Error('Enter your API base URL first.'));
    return;
  }
  state.trait = traitSelect.value;
  state.messages = [];
  logEl.innerHTML = '';
  chatSection.hidden = false;
  resetBtn.hidden = false;
  await sendTurn(); // empty messages → server returns deterministic opener
});

resetBtn.addEventListener('click', () => {
  state.messages = [];
  logEl.innerHTML = '';
  chatSection.hidden = true;
  resetBtn.hidden = true;
  setStatus('');
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || state.busy) return;
  state.messages.push({ role: 'user', content: text });
  appendMessage('user', text);
  input.value = '';
  sendTurn();
});

loadTraits().catch(showError);
