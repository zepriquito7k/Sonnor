const models = {
  lite: 'qwen2.5-coder:3b',
  vision: 'qwen2.5vl:7b'
};
const messagesEl = document.querySelector('#messages');
const form = document.querySelector('#form');
const promptEl = document.querySelector('#prompt');
const sendEl = document.querySelector('#send');
const ambientWordEl = document.querySelector('#ambient-word');
const menuToggleEl = document.querySelector('#menu-toggle');
const newChatEl = document.querySelector('#new-chat');
const clearChatEl = document.querySelector('#clear-chat');
const conversationListEl = document.querySelector('#conversation-list');
const themeButtons = document.querySelectorAll('[data-theme]');
const selectChatsEl = document.querySelector('#select-chats');
const selectionCountEl = document.querySelector('#selection-count');
const deleteSelectedEl = document.querySelector('#delete-selected');
const menuTabs = document.querySelectorAll('.menu-tab');
const menuPanels = document.querySelectorAll('.menu-panel');
const customColorButtonEl = document.querySelector('#custom-color-button');
const customPaletteEl = document.querySelector('#custom-palette');
const customHueEl = document.querySelector('#custom-hue');
const customSatEl = document.querySelector('#custom-sat');
const customLightEl = document.querySelector('#custom-light');
const customPaletteButtons = document.querySelectorAll('.custom-palette [data-color]');
const confirmDialogEl = document.querySelector('#confirm-dialog');
const confirmMessageEl = document.querySelector('#confirm-message');
const confirmOkEl = document.querySelector('#confirm-ok');
const confirmCancelEl = document.querySelector('#confirm-cancel');
const starterPills = document.querySelectorAll('.starter-pill');
const attachToggleEl = document.querySelector('#attach-toggle');
const fileInputEl = document.querySelector('#file-input');
const imageInputEl = document.querySelector('#image-input');
const attachmentsEl = document.querySelector('#attachments');
const imagePreviewEl = document.querySelector('#image-preview');
const imagePreviewImgEl = document.querySelector('#image-preview-img');
const imagePreviewCloseEl = document.querySelector('#image-preview-close');
const modelPickerToggleEl = document.querySelector('#model-picker-toggle');
const modelPickerMenuEl = document.querySelector('#model-picker-menu');
const currentModelLabelEl = document.querySelector('#current-model-label');
const modelModeButtons = document.querySelectorAll('[data-mode]');
const schemeToggleEl = document.querySelector('#scheme-toggle');
const motionButtons = document.querySelectorAll('[data-motion]');
const locationToggleEl = document.querySelector('#location-toggle');
const locationStatusEl = document.querySelector('#location-status');
const voicePlayerEl = document.querySelector('#voice-player');
const voicePrevEl = document.querySelector('#voice-prev');
const voiceToggleEl = document.querySelector('#voice-toggle');
const voiceNextEl = document.querySelector('#voice-next');
const voiceCloseEl = document.querySelector('#voice-close');
const voiceProgressEl = document.querySelector('#voice-progress');
const deviceToggleEl = document.querySelector('#device-toggle');
const devicePanelEl = document.querySelector('#device-panel');
const deviceListEl = document.querySelector('#device-list');

const storageKey = 'studio-ai-state-v1';
const serverStartKey = 'key-server-1991';
const serverStopKey = 'key-server-off-1991';
const allowedMotionModes = ['halo', 'ribbons', 'spotlight', 'mesh', 'azulejos', 'sand'];
const deviceId = getDeviceId();
const deviceName = getDeviceName();
let state = loadState();
let history = activeConversation().messages;
let selecting = false;
let selectedIds = new Set();
let pendingConfirm = null;
let attachments = [];
let scrollScheduled = false;
let aiOnline = null;
let deviceBlocked = false;
let remoteStateReady = false;
let applyingRemoteState = false;
let heartbeatTimer = null;
let lastGoodCustomColor = '#2f8cff';
let voiceState = {
  sentences: [],
  index: 0,
  speaking: false,
  paused: false,
  utterance: null
};
const ambientWords = ['Ola', 'Hello', 'Hola', 'Bonjour', 'Ciao', 'Hallo', 'Hej', 'Aloha', 'Salut'];
let ambientIndex = 0;
const starterSuggestions = [
  ['Criar pagina web', 'Ajuda-me a criar uma pagina web simples e bonita.'],
  ['Melhorar design', 'Sugere melhorias visuais para uma interface moderna.'],
  ['Explicar codigo', 'Explica-me este conceito de programacao de forma simples.'],
  ['Corrigir erro', 'Ajuda-me a encontrar e corrigir um erro no meu codigo.'],
  ['Ideias rapidas', 'Da-me ideias para um projeto pessoal pequeno.'],
  ['Organizar tarefa', 'Ajuda-me a organizar uma tarefa passo a passo.'],
  ['Plano de estudo', 'Cria um plano simples para eu aprender algo novo.'],
  ['Texto melhor', 'Melhora este texto deixando-o mais claro e natural.'],
  ['HTML e CSS', 'Faz um exemplo pequeno com HTML e CSS moderno.'],
  ['JavaScript', 'Ajuda-me a fazer uma interacao simples em JavaScript.'],
  ['Resumo', 'Resume isto de forma curta e facil de entender.'],
  ['Brainstorm', 'Faz um brainstorm de ideias criativas comigo.']
];

function setAppHeight() {
  const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${height}px`);
}

setAppHeight();
window.addEventListener('resize', setAppHeight);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', setAppHeight);
  window.visualViewport.addEventListener('scroll', setAppHeight);
}

setInterval(() => {
  ambientIndex = (ambientIndex + 1) % ambientWords.length;
  ambientWordEl.classList.add('switching');
  setTimeout(() => {
    ambientWordEl.textContent = ambientWords[ambientIndex];
    ambientWordEl.classList.remove('switching');
  }, 170);
}, 2800);

document.body.dataset.theme = state.theme;
document.body.dataset.scheme = state.scheme || 'dark';
document.body.dataset.motion = state.motionMode || 'spotlight';
lastGoodCustomColor = state.customColor || '#2f8cff';
syncCustomSliders(lastGoodCustomColor);
applyCustomColor(lastGoodCustomColor);
state.modelMode = state.modelMode || 'auto';
state.locale = state.locale || defaultLocale();
renderModelPicker();
checkAiReadiness();
renderMotionPicker();
renderLocationStatus();
randomizeBackground();
setInterval(randomizeBackground, 4200);
renderStarterPills();
renderConversationList();
renderMessages();
syncSharedState();
setInterval(syncSharedState, 6000);
startDeviceHeartbeat();

function renderStarterPills() {
  const shuffled = [...starterSuggestions].sort(() => Math.random() - 0.5).slice(0, starterPills.length);
  starterPills.forEach((pill, index) => {
    const suggestion = shuffled[index];
    pill.textContent = suggestion[0];
    pill.dataset.prompt = suggestion[1];
  });
}

function loadState() {
  const fallback = {
    theme: 'blue',
    customColor: '#2f8cff',
    scheme: 'dark',
    motionMode: 'spotlight',
    modelMode: 'auto',
    locale: defaultLocale(),
    activeId: makeId(),
    conversations: []
  };
  fallback.conversations.push({ id: fallback.activeId, title: 'Conversa 1', messages: [] });

  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey));
    if (!parsed || !parsed.conversations || !parsed.conversations.length) return fallback;
    parsed.theme = parsed.theme || 'blue';
    parsed.customColor = parsed.customColor || '#2f8cff';
    parsed.scheme = parsed.scheme || 'dark';
    parsed.motionMode = parsed.motionMode || 'spotlight';
    if (allowedMotionModes.indexOf(parsed.motionMode) === -1) parsed.motionMode = 'spotlight';
    parsed.modelMode = parsed.modelMode || 'auto';
    parsed.locale = parsed.locale || defaultLocale();
    parsed.activeId = parsed.activeId || parsed.conversations[0].id;
    return parsed;
  } catch {
    return fallback;
  }
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function saveState() {
  if (deviceBlocked && !applyingRemoteState) return;
  try {
    state.updatedAt = Date.now();
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // A interface continua a funcionar mesmo se o browser bloquear armazenamento.
  }
  if (remoteStateReady && !applyingRemoteState) saveSharedState();
}

function blockedAction() {
  if (!deviceBlocked) return false;
  addMessage('assistant', 'Este dispositivo esta bloqueado. Para desbloquear, envia Key-Unlock-nome-do-dispositivo.');
  return true;
}

function getDeviceId() {
  try {
    const existing = localStorage.getItem('studio-ai-device-id');
    if (existing) return existing;
    const created = makeId();
    localStorage.setItem('studio-ai-device-id', created);
    return created;
  } catch {
    return makeId();
  }
}

function getDeviceName() {
  const ua = navigator.userAgent || '';
  if (/iphone/i.test(ua)) return 'iPhone';
  if (/ipad/i.test(ua)) return 'iPad';
  if (/android/i.test(ua)) return 'Android';
  if (/windows/i.test(ua)) return 'PC Windows';
  if (/macintosh|mac os/i.test(ua)) return 'Mac';
  return 'Dispositivo';
}

function applyLoadedState(nextState) {
  if (!nextState || !Array.isArray(nextState.conversations)) return;
  applyingRemoteState = true;
  state = {
    ...state,
    ...nextState,
    conversations: nextState.conversations
  };
  if (!state.conversations.length) {
    const id = makeId();
    state.conversations.push({ id, title: 'Conversa 1', messages: [] });
    state.activeId = id;
  }
  if (!state.conversations.some((conversation) => conversation.id === state.activeId)) {
    state.activeId = state.conversations[0].id;
  }
  document.body.dataset.theme = state.theme || 'blue';
  document.body.dataset.scheme = state.scheme || 'dark';
  document.body.dataset.motion = state.motionMode || 'spotlight';
  lastGoodCustomColor = state.customColor || '#2f8cff';
  syncCustomSliders(lastGoodCustomColor);
  applyCustomColor(lastGoodCustomColor);
  renderModelPicker();
  renderMotionPicker();
  renderLocationStatus();
  renderConversationList();
  renderMessages();
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {}
  applyingRemoteState = false;
}

async function syncSharedState() {
  try {
    const response = await fetch('/api/state', { cache: 'no-store' });
    const data = await response.json();
    if (data && data.state && Array.isArray(data.state.conversations)) {
      const remoteUpdatedAt = Number(data.state.updatedAt || 0);
      const localUpdatedAt = Number(state.updatedAt || 0);
      if (!sendEl.disabled && remoteUpdatedAt > localUpdatedAt) {
        applyLoadedState(data.state);
      }
    } else {
      await saveSharedState();
    }
    remoteStateReady = true;
  } catch {
    remoteStateReady = false;
  }
}

async function saveSharedState() {
  try {
    const response = await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, state })
    });
    const data = await response.json().catch(() => ({}));
    if (data && data.updatedAt) state.updatedAt = data.updatedAt;
  } catch {
    // Se o servidor estiver a reiniciar, mantemos a copia local.
  }
}

function renderDevices(devices) {
  const activeDevices = (devices || []).filter((device) => device.online && device.id !== deviceId);
  deviceToggleEl.hidden = activeDevices.length === 0;
  deviceListEl.innerHTML = '';

  const visible = devices && devices.length ? devices : [];
  if (!visible.length) {
    const empty = document.createElement('div');
    empty.className = 'device-name';
    empty.textContent = 'Nenhum dispositivo ligado';
    deviceListEl.appendChild(empty);
    return;
  }

  for (const device of visible) {
    const row = document.createElement('div');
    row.className = 'device-row';
    const name = document.createElement('div');
    name.className = 'device-name';
    name.textContent = `${device.name || 'Dispositivo'}${device.host ? ' · host' : ''}${device.id === deviceId ? ' · este' : ''}`;
    const details = document.createElement('small');
    details.textContent = `${device.online ? 'ligado' : 'offline'} · ${device.ip || 'sem ip'}${device.blocked ? ' · bloqueado' : ''}`;
    name.appendChild(details);
    row.appendChild(name);

    if (device.id !== deviceId && !device.blocked && !device.host) {
      const block = document.createElement('button');
      block.type = 'button';
      block.className = 'device-block';
      block.textContent = 'Bloquear';
      block.addEventListener('click', () => blockDevice(device.id));
      row.appendChild(block);
    }

    deviceListEl.appendChild(row);
  }
}

async function refreshDevices() {
  try {
    const response = await fetch('/api/devices', { cache: 'no-store' });
    const data = await response.json();
    if (data && data.devices) renderDevices(data.devices);
    if (!response.ok && data && data.error === 'host-protected') {
      addMessage('assistant', 'O PC host nao pode ser bloqueado, porque e ele que da acesso a IA.');
    }
  } catch {}
}

async function blockDevice(id) {
  try {
    const response = await fetch('/api/device/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const data = await response.json();
    if (data && data.devices) renderDevices(data.devices);
  } catch {}
}

async function unlockDevice(query) {
  try {
    const response = await fetch('/api/device/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await response.json();
    if (data && data.devices) renderDevices(data.devices);
    addMessage('assistant', response.ok && data.ok
      ? `Dispositivo desbloqueado: ${data.device.name}.`
      : 'Nao encontrei esse dispositivo bloqueado.');
  } catch {
    addMessage('assistant', 'Nao consegui desbloquear agora.');
  }
}

async function listBlockedDevices() {
  try {
    const response = await fetch('/api/devices', { cache: 'no-store' });
    const data = await response.json();
    const blocked = ((data && data.devices) || []).filter((device) => device.blocked);
    renderDevices((data && data.devices) || []);
    addMessage('assistant', blocked.length
      ? blocked.map((device) => `${device.name} · ${device.ip} · codigo: Key-Unlock-${device.name}`).join('\n')
      : 'Nao ha dispositivos bloqueados.');
  } catch {
    addMessage('assistant', 'Nao consegui ver a lista de bloqueados.');
  }
}

function startDeviceHeartbeat() {
  const beat = async () => {
    try {
      const response = await fetch('/api/device/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deviceId, name: deviceName })
      });
      const data = await response.json();
      deviceBlocked = Boolean(data.blocked);
      document.body.classList.toggle('device-blocked', deviceBlocked);
      if (deviceBlocked) {
        currentModelLabelEl.textContent = 'Bloqueado';
      } else {
        renderModelPicker();
      }
      if (data && data.devices) renderDevices(data.devices);
    } catch {}
  };
  beat();
  heartbeatTimer = setInterval(beat, 5000);
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const value = parseInt(clean.length === 3 ? clean.split('').map((char) => char + char).join('') : clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function rgbToHsl(rgb) {
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > .5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    if (max === g) h = (b - r) / d + 2;
    if (max === b) h = (r - g) / d + 4;
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return `#${[r, g, b].map((value) => {
    return Math.round((value + m) * 255).toString(16).padStart(2, '0');
  }).join('')}`;
}

function syncCustomSliders(hex) {
  const hsl = rgbToHsl(hexToRgb(hex || '#2f8cff'));
  customHueEl.value = hsl.h;
  customSatEl.value = Math.max(30, hsl.s);
  customLightEl.value = Math.min(68, Math.max(28, hsl.l));
}

function mixRgb(rgb, target, amount) {
  return {
    r: Math.round(rgb.r + (target.r - rgb.r) * amount),
    g: Math.round(rgb.g + (target.g - rgb.g) * amount),
    b: Math.round(rgb.b + (target.b - rgb.b) * amount)
  };
}

function rgba(rgb, alpha) {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function applyCustomColor(hex) {
  const safeHex = hex || lastGoodCustomColor || '#2f8cff';
  const base = hexToRgb(safeHex);
  const black = { r: 0, g: 0, b: 0 };
  document.body.style.setProperty('--custom-color', safeHex);
  document.body.style.setProperty('--custom-a', rgba(mixRgb(base, black, .28), .72));
  document.body.style.setProperty('--custom-b', rgba(mixRgb(base, black, .82), .95));
  document.body.style.setProperty('--custom-c', rgba(mixRgb(base, black, .42), .58));
  document.body.style.setProperty('--custom-tone-a', rgba(mixRgb(base, black, .16), .72));
  document.body.style.setProperty('--custom-tone-b', rgba(mixRgb(base, black, .42), .46));
  document.body.style.setProperty('--custom-tone-c', rgba(mixRgb(base, black, .24), .28));
  document.body.style.setProperty('--custom-glow', rgba(mixRgb(base, black, .34), .66));
}

function defaultLocale() {
  return {
    country: 'Portugal',
    place: 'Cantanhede, Portugal',
    language: 'pt-PT',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Lisbon',
    coordinates: null
  };
}

function userContextPrompt() {
  const locale = state.locale || defaultLocale();
  const coords = locale.coordinates ? ` Coordenadas aproximadas: ${locale.coordinates.lat}, ${locale.coordinates.lon}.` : '';
  return `Contexto permanente do utilizador: esta pessoa esta em ${locale.place || 'Portugal'}, usa portugues europeu (${locale.language || 'pt-PT'}) e o fuso horario e ${locale.timezone || 'Europe/Lisbon'}.${coords} Nunca assumas Brasil. Para servicos, empresas, leis, preços, moradas, telecomunicacoes e recomendacoes locais, considera Portugal primeiro. Nao cites operadoras ou servicos de outros paises a menos que o utilizador peça.`;
}

function renderLocationStatus() {
  const locale = state.locale || defaultLocale();
  locationStatusEl.textContent = locale.coordinates
    ? `${locale.place} · localização ativa`
    : `${locale.place} guardado`;
}

function selectedModel() {
  if (state.modelMode === 'lite') return models.lite;
  if (state.modelMode === 'vision') return models.vision;
  return attachmentImages().length ? models.vision : models.lite;
}

function modelLabel() {
  if (state.modelMode === 'lite') return 'Studio Lite';
  if (state.modelMode === 'vision') return 'Studio Vision';
  return 'Automático';
}

function renderModelPicker() {
  currentModelLabelEl.textContent = aiOnline === false ? 'Offline' : modelLabel();
  modelModeButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.mode === state.modelMode);
  });
}

function setAiOnlineStatus(isOnline) {
  aiOnline = isOnline;
  document.body.classList.remove('model-checking');
  document.body.classList.toggle('ai-offline', !isOnline);
  document.body.classList.toggle('ai-online', isOnline);
  renderModelPicker();

  if (isOnline) {
    document.body.classList.add('model-settled');
    setTimeout(() => document.body.classList.remove('model-settled'), 620);
  }
}

async function checkAiReadiness() {
  document.body.classList.add('model-checking');
  document.body.classList.remove('ai-offline', 'ai-online', 'model-settled');

  try {
    const response = await fetch('/api/health', { cache: 'no-store' });
    setAiOnlineStatus(response.ok);
  } catch {
    setAiOnlineStatus(false);
  }
}

async function startAiServer() {
  document.body.classList.add('model-checking');
  document.body.classList.remove('ai-offline', 'ai-online', 'model-settled');
  currentModelLabelEl.textContent = 'A ligar...';
  sendEl.disabled = true;
  sendEl.classList.add('loading');

  try {
    const response = await fetch('/api/start-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: serverStartKey })
    });
    const data = await response.json().catch(() => ({}));
    setAiOnlineStatus(Boolean(response.ok && data.ok));
    addMessage('assistant', response.ok && data.ok
      ? 'Servidor da IA ligado. Ja podes usar.'
      : 'Nao consegui ligar o servidor da IA. Abre a app Ollama manualmente e tenta outra vez.');
  } catch {
    setAiOnlineStatus(false);
    addMessage('assistant', 'Nao consegui contactar o servidor do Studio. Confirma que a pagina foi aberta pelo atalho certo.');
  } finally {
    sendEl.disabled = false;
    sendEl.classList.remove('loading');
    promptEl.focus();
  }
}

async function stopStudioServer() {
  document.body.classList.add('model-checking');
  document.body.classList.remove('ai-online', 'ai-offline', 'model-settled');
  currentModelLabelEl.textContent = 'A desligar...';
  sendEl.disabled = true;
  sendEl.classList.add('loading');

  try {
    const response = await fetch('/api/stop-server', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: serverStopKey })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error('stop failed');

    setTimeout(() => {
      setAiOnlineStatus(false);
      currentModelLabelEl.textContent = 'Offline';
      addMessage('assistant', 'IA desligada. O site continua aberto; para voltar, escreve key-server-1991.');
    }, 520);
  } catch {
    setAiOnlineStatus(false);
    addMessage('assistant', 'Nao consegui desligar pelo site. Fecha pelo PowerShell se precisares.');
  } finally {
    setTimeout(() => {
      sendEl.disabled = false;
      sendEl.classList.remove('loading');
      promptEl.focus();
    }, 900);
  }
}

function renderMotionPicker() {
  if (allowedMotionModes.indexOf(state.motionMode || '') === -1) {
    state.motionMode = 'spotlight';
    document.body.dataset.motion = 'spotlight';
  }
  motionButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.motion === (state.motionMode || 'spotlight'));
  });
}

function randomPercent(min, max) {
  return `${Math.round(min + Math.random() * (max - min))}%`;
}

function randomizeBackground() {
  document.body.style.setProperty('--p1x', randomPercent(8, 38));
  document.body.style.setProperty('--p1y', randomPercent(8, 42));
  document.body.style.setProperty('--p2x', randomPercent(58, 92));
  document.body.style.setProperty('--p2y', randomPercent(10, 46));
  document.body.style.setProperty('--p3x', randomPercent(28, 84));
  document.body.style.setProperty('--p3y', randomPercent(58, 92));
}

function autosizePrompt() {
  promptEl.style.height = 'auto';
  promptEl.style.height = `${Math.min(promptEl.scrollHeight, 142)}px`;
  promptEl.style.overflowY = promptEl.scrollHeight > 142 ? 'auto' : 'hidden';
}

function scrollMessagesToBottom() {
  if (scrollScheduled) return;
  scrollScheduled = true;
  requestAnimationFrame(() => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
    scrollScheduled = false;
  });
}

function activeConversation() {
  return state.conversations.find((conversation) => conversation.id === state.activeId) || state.conversations[0];
}

function renderMessages() {
  messagesEl.innerHTML = '';
  history = activeConversation().messages;
  document.body.classList.toggle('chatting', history.length > 0);
  for (const item of history) {
    addMessage(item.role === 'user' ? 'user' : 'assistant', item.content, false);
  }
}

function renderConversationList() {
  conversationListEl.innerHTML = '';
  selectionCountEl.textContent = `${selectedIds.size} selecionadas`;
  for (const conversation of state.conversations) {
    const row = document.createElement('div');
    row.className = 'conversation-row';

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'conversation-check';
    check.checked = selectedIds.has(conversation.id);
    check.addEventListener('change', () => {
      if (check.checked) selectedIds.add(conversation.id);
      else selectedIds.delete(conversation.id);
      renderConversationList();
    });

    const openButton = document.createElement('button');
    openButton.type = 'button';
    openButton.className = `conversation-open${conversation.id === state.activeId ? ' active' : ''}`;
    openButton.textContent = conversation.title;
    openButton.addEventListener('click', () => {
      if (selecting) {
        check.checked = !check.checked;
        check.dispatchEvent(new Event('change'));
        return;
      }
      state.activeId = conversation.id;
      saveState();
      renderConversationList();
      renderMessages();
      document.body.classList.remove('menu-open');
    });

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'trash-button';
    deleteButton.setAttribute('aria-label', `Apagar ${conversation.title}`);
    deleteButton.innerHTML = trashIcon();
    deleteButton.addEventListener('click', () => deleteConversations([conversation.id]));

    row.appendChild(check);
    row.appendChild(openButton);
    row.appendChild(deleteButton);
    conversationListEl.appendChild(row);
  }
}

function ensureConversationExists() {
  if (state.conversations.length) return;
  const id = makeId();
  state.conversations.push({ id, title: 'Conversa 1', messages: [] });
  state.activeId = id;
}

function deleteConversations(ids) {
  if (!ids.length) return;
  const text = ids.length === 1 ? 'Apagar esta conversa?' : `Apagar ${ids.length} conversas?`;
  showConfirm(text, () => {
    state.conversations = state.conversations.filter((conversation) => !ids.includes(conversation.id));
    selectedIds = new Set([...selectedIds].filter((id) => !ids.includes(id)));
    ensureConversationExists();

    if (!state.conversations.some((conversation) => conversation.id === state.activeId)) {
      state.activeId = state.conversations[0].id;
    }

    saveState();
    renderConversationList();
    renderMessages();
  });
}

function showConfirm(message, onConfirm) {
  pendingConfirm = onConfirm;
  confirmMessageEl.textContent = message;
  confirmDialogEl.classList.add('open');
  confirmDialogEl.setAttribute('aria-hidden', 'false');
}

function closeConfirm() {
  pendingConfirm = null;
  confirmDialogEl.classList.remove('open');
  confirmDialogEl.setAttribute('aria-hidden', 'true');
}

function addMessage(role, text, messageAttachments = []) {
  const el = document.createElement('div');
  el.className = `message-wrap ${role}`;
  const bubble = document.createElement('div');
  bubble.className = `message ${role}`;
  const p = document.createElement('p');
  p.textContent = text;
  p.addEventListener('click', (event) => {
    if (!voiceState.speaking) return;
    const sentenceIndex = sentenceIndexFromClick(p.textContent, event);
    startSpeaking(p.textContent, sentenceIndex);
  });
  bubble.appendChild(p);

  const actions = document.createElement('div');
  actions.className = 'message-actions';
  actions.appendChild(actionButton('copy', 'Copiar', copyIcon(), () => copyText(text, actions)));
  actions.appendChild(actionButton('speak', 'Escutar', volumeIcon(), () => startSpeaking(p.textContent, 0)));
  el.appendChild(bubble);

  if (messageAttachments.length) {
    const media = document.createElement('div');
    media.className = 'message-media';
    for (const item of messageAttachments) {
      if (!item.preview) continue;
      const img = document.createElement('img');
      img.src = item.preview;
      img.alt = item.name || 'Imagem anexada';
      img.addEventListener('click', () => openImagePreview(item.preview, item.name));
      media.appendChild(img);
    }
    if (media.children.length) el.appendChild(media);
  }

  el.appendChild(actions);

  messagesEl.appendChild(el);
  scrollMessagesToBottom();
  return p;
}

function actionButton(name, label, icon, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `message-action ${name}`;
  button.setAttribute('aria-label', label);
  button.innerHTML = icon;
  button.addEventListener('click', onClick);
  return button;
}

async function copyText(text, actions) {
  await navigator.clipboard.writeText(text);
  const button = actions.querySelector('.copy');
  button.innerHTML = checkIcon();
  button.classList.add('confirmed');
  setTimeout(() => {
    button.innerHTML = copyIcon();
    button.classList.remove('confirmed');
  }, 1100);
}

async function ask(prompt) {
  const model = selectedModel();
  const attachmentContext = buildAttachmentContext();
  const sentAttachments = attachments.map((item) => ({ ...item }));
  const sentImages = sentAttachments.filter((item) => item.image).map((item) => item.image);
  const visiblePrompt = prompt;
  if (attachmentContext) {
    prompt = `${prompt}\n\n${attachmentContext}`;
  }
  document.body.classList.add('chatting');
  history.push({ role: 'user', content: visiblePrompt });
  if (history.length === 1) {
    activeConversation().title = 'A criar tema...';
    renderConversationList();
    createConversationTitle(prompt, activeConversation().id);
  }
  saveState();
  addMessage('user', visiblePrompt, sentAttachments);
  attachments = [];
  renderAttachments();
  const reply = addMessage('assistant', '');
  reply.parentElement.classList.add('thinking');
  reply.parentElement.classList.add('streaming');
  sendEl.disabled = true;
  sendEl.classList.add('loading');

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `${userContextPrompt()} Responde sempre em portugues europeu natural, como usado em Portugal. Evita brasileirismos, usa termos como ficheiro, telemovel, ecra, apagar, guardar. Se receberes imagens, analisa-as diretamente e descreve o que ves antes de ajudar. Se nao souberes algo, diz de forma simples.`
          },
          ...history.slice(0, -1),
          { role: 'user', content: prompt, images: sentImages }
        ],
        stream: true
      })
    });

    if (!response.ok || !response.body) {
      throw new Error('Nao consegui ligar ao Ollama.');
    }

    setAiOnlineStatus(true);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let full = '';
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        const data = JSON.parse(line);
        const part = data.message && data.message.content ? data.message.content : '';
        if (part && reply.parentElement.classList.contains('thinking')) {
          reply.parentElement.classList.remove('thinking');
        }
        full += part;
        const token = document.createElement('span');
        token.className = 'token-glow';
        token.textContent = part;
        reply.appendChild(token);
        const messageWrap = reply.closest('.message-wrap');
        const speakButton = messageWrap.querySelector('.speak');
        if (speakButton) speakButton.onclick = () => startSpeaking(reply.textContent, 0);
        const copyButton = messageWrap.querySelector('.copy');
        if (copyButton) copyButton.onclick = () => copyText(reply.textContent, messageWrap.querySelector('.message-actions'));
        scrollMessagesToBottom();
      }
    }

    if (buffer.trim()) {
      const data = JSON.parse(buffer);
      const part = data.message && data.message.content ? data.message.content : '';
      full += part;
      const token = document.createElement('span');
      token.className = 'token-glow';
      token.textContent = part;
      reply.appendChild(token);
    }

    history.push({ role: 'assistant', content: full });
    reply.parentElement.classList.remove('streaming');
    attachments = [];
    renderAttachments();
    saveState();
  } catch (error) {
    setAiOnlineStatus(false);
    reply.parentElement.classList.remove('thinking');
    reply.parentElement.classList.remove('streaming');
    reply.textContent = 'Nao consegui falar com o Ollama. Confirma que a app Ollama esta aberta e, se estiveres no Opera, tenta atualizar a pagina ou abrir no Edge/Chrome.';
  } finally {
    sendEl.disabled = false;
    sendEl.classList.remove('loading');
    promptEl.focus();
  }
}

function buildAttachmentContext() {
  const useful = attachments.filter((item) => item.content);
  if (!useful.length) return '';
  return useful.map((item) => `Ficheiro: ${item.name}\n${item.content}`).join('\n\n---\n\n');
}

function splitSentences(text) {
  const parts = text.match(/[^.!?\n]+[.!?]*/g) || [text];
  return parts.map((part) => part.trim()).filter(Boolean);
}

function startSpeaking(text, index = 0) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  voiceState.sentences = splitSentences(text);
  voiceState.index = Math.max(0, Math.min(index, voiceState.sentences.length - 1));
  voiceState.speaking = true;
  voiceState.paused = false;
  voicePlayerEl.classList.add('open');
  voicePlayerEl.setAttribute('aria-hidden', 'false');
  speakCurrentSentence();
}

function speakCurrentSentence() {
  const sentence = voiceState.sentences[voiceState.index];
  if (!sentence) return stopSpeaking();
  voiceProgressEl.style.width = `${((voiceState.index + 1) / voiceState.sentences.length) * 100}%`;
  voiceToggleEl.classList.remove('play');
  const utterance = new SpeechSynthesisUtterance(sentence);
  utterance.lang = 'pt-PT';
  utterance.rate = 1;
  utterance.onend = () => {
    if (!voiceState.speaking || voiceState.paused) return;
    if (voiceState.index < voiceState.sentences.length - 1) {
      voiceState.index += 1;
      speakCurrentSentence();
    } else {
      stopSpeaking();
    }
  };
  voiceState.utterance = utterance;
  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  window.speechSynthesis.cancel();
  voiceState.speaking = false;
  voiceState.paused = false;
  voicePlayerEl.classList.remove('open');
  voicePlayerEl.setAttribute('aria-hidden', 'true');
  voiceProgressEl.style.width = '0%';
}

function sentenceIndexFromClick(text, event) {
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
  return Math.floor(ratio * splitSentences(text).length);
}

function copyIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
}

function checkIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
}

function volumeIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
}

function prevIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/></svg>';
}

function nextIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 17 5-5-5-5"/><path d="m13 17 5-5-5-5"/></svg>';
}

function pauseIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H6v16h4z"/><path d="M18 4h-4v16h4z"/></svg>';
}

function playIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 12 7-12 7z"/></svg>';
}

function closeIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
}

function attachmentImages() {
  return attachments
    .filter((item) => item.image)
    .map((item) => item.image);
}

function renderAttachments() {
  attachmentsEl.innerHTML = '';
  attachmentsEl.hidden = attachments.length === 0;
  for (const item of attachments) {
    const chip = document.createElement('div');
    chip.className = item.preview ? 'attachment-chip image-chip' : 'attachment-chip';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Remover ${item.name}`);
    remove.addEventListener('click', (event) => {
      event.stopPropagation();
      attachments = attachments.filter((attachment) => attachment.id !== item.id);
      renderAttachments();
    });

    if (item.preview) {
      const img = document.createElement('img');
      img.src = item.preview;
      img.alt = item.name;
      chip.addEventListener('click', () => openImagePreview(item.preview, item.name));
      chip.appendChild(img);
    } else {
      const label = document.createElement('span');
      label.textContent = item.name;
      chip.appendChild(label);
    }

    chip.appendChild(remove);
    attachmentsEl.appendChild(chip);
  }
}

function openImagePreview(src, name) {
  imagePreviewImgEl.src = src;
  imagePreviewImgEl.alt = name || 'Imagem anexada';
  imagePreviewEl.classList.add('open');
  imagePreviewEl.setAttribute('aria-hidden', 'false');
}

function closeImagePreview() {
  imagePreviewEl.classList.remove('open');
  imagePreviewEl.setAttribute('aria-hidden', 'true');
  imagePreviewImgEl.src = '';
}

async function addFiles(files, readContent) {
  for (const file of files) {
    const item = {
      id: makeId(),
      name: file.name,
      content: '',
      image: '',
      preview: ''
    };
    if (readContent) {
      item.content = await file.text();
      if (item.content.length > 12000) {
        item.content = `${item.content.slice(0, 12000)}\n\n[ficheiro cortado por ser grande]`;
      }
    } else {
      const dataUrl = await imageToDataUrl(file);
      item.image = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      item.preview = dataUrl;
      item.content = `[imagem anexada: ${file.name}]`;
    }
    attachments.push(item);
  }
  renderAttachments();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(String(reader.result || ''));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function imageToDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSize = 1280;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => resolve(String(reader.result || ''));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

async function createConversationTitle(prompt, conversationId) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: models.lite,
        messages: [
          {
            role: 'system',
            content: 'Cria um titulo curto para uma conversa. Maximo 4 palavras. Responde apenas com o titulo, sem aspas e sem pontuacao final.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: false
      })
    });

    if (!response.ok) throw new Error('title failed');
    const data = await response.json();
    const title = ((data.message && data.message.content) || '').trim().replace(/^["']|["']$/g, '').slice(0, 34);
    const conversation = state.conversations.find((item) => item.id === conversationId);
    if (!conversation) return;
    conversation.title = title || prompt.slice(0, 28) || 'Nova conversa';
    saveState();
    renderConversationList();
  } catch {
    const conversation = state.conversations.find((item) => item.id === conversationId);
    if (!conversation) return;
    conversation.title = prompt.slice(0, 28) || 'Nova conversa';
    saveState();
    renderConversationList();
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const prompt = promptEl.value.trim();
  if (!prompt) return;
  promptEl.value = '';
  autosizePrompt();
  if (prompt === serverStartKey) {
    startAiServer();
    return;
  }
  if (prompt === serverStopKey) {
    stopStudioServer();
    return;
  }
  if (prompt === 'list-device-block') {
    listBlockedDevices();
    return;
  }
  if (/^Key-Unlock-/i.test(prompt)) {
    unlockDevice(prompt.replace(/^Key-Unlock-/i, '').trim());
    return;
  }
  if (deviceBlocked) {
    addMessage('assistant', 'Este dispositivo esta bloqueado. Usa Key-Unlock-nome-do-dispositivo para desbloquear.');
    return;
  }
  ask(prompt);
});

promptEl.addEventListener('input', autosizePrompt);

attachToggleEl.addEventListener('click', () => {
  document.body.classList.toggle('attach-open');
  document.body.classList.remove('menu-open');
  document.body.classList.remove('model-picker-open');
});

fileInputEl.addEventListener('change', async () => {
  await addFiles([...fileInputEl.files], true);
  fileInputEl.value = '';
  document.body.classList.remove('attach-open');
  promptEl.focus();
});

imageInputEl.addEventListener('change', async () => {
  await addFiles([...imageInputEl.files], false);
  imageInputEl.value = '';
  document.body.classList.remove('attach-open');
  promptEl.focus();
});

promptEl.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

menuToggleEl.addEventListener('click', () => {
  document.body.classList.toggle('menu-open');
  document.body.classList.remove('attach-open');
  document.body.classList.remove('model-picker-open');
  document.body.classList.remove('device-panel-open');
});

deviceToggleEl.addEventListener('click', () => {
  document.body.classList.toggle('device-panel-open');
  document.body.classList.remove('menu-open');
  document.body.classList.remove('attach-open');
  document.body.classList.remove('model-picker-open');
  refreshDevices();
});

newChatEl.addEventListener('click', () => {
  if (blockedAction()) return;
  const id = makeId();
  state.conversations.unshift({ id, title: `Conversa ${state.conversations.length + 1}`, messages: [] });
  state.activeId = id;
  saveState();
  renderConversationList();
  renderMessages();
  renderStarterPills();
  document.body.classList.remove('menu-open');
  promptEl.focus();
});

clearChatEl.addEventListener('click', () => {
  if (blockedAction()) return;
  showConfirm('Limpar esta conversa?', () => {
    activeConversation().messages = [];
    history = activeConversation().messages;
    saveState();
    renderMessages();
    promptEl.focus();
  });
});

selectChatsEl.addEventListener('click', () => {
  selecting = !selecting;
  selectedIds.clear();
  document.body.classList.toggle('selecting', selecting);
  selectChatsEl.setAttribute('aria-label', selecting ? 'Cancelar sele??o' : 'Selecionar conversas');
  renderConversationList();
});

deleteSelectedEl.innerHTML = trashIcon();
deleteSelectedEl.addEventListener('click', () => {
  deleteConversations([...selectedIds]);
});

function trashIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 6V5.2C9 4.54 9.54 4 10.2 4h3.6c.66 0 1.2.54 1.2 1.2V6" />
      <path d="M6.5 7h11" />
      <path d="M8 9l.62 8.02c.06.56.53.98 1.09.98h4.58c.56 0 1.03-.42 1.09-.98L16 9" />
      <path d="M10.5 11.2v4.3" />
      <path d="M13.5 11.2v4.3" />
    </svg>
  `;
}

themeButtons.forEach((button) => {
  button.classList.toggle('active', button.dataset.theme === state.theme);
  button.addEventListener('click', () => {
    if (blockedAction()) return;
    state.theme = button.dataset.theme;
    document.body.dataset.theme = state.theme;
    themeButtons.forEach((item) => item.classList.toggle('active', item === button));
    customColorButtonEl.classList.remove('active');
    customPaletteEl.classList.remove('open');
    saveState();
  });
});

customColorButtonEl.classList.toggle('active', state.theme === 'custom');

menuTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    menuTabs.forEach((item) => item.classList.toggle('active', item === tab));
    menuPanels.forEach((panel) => panel.classList.toggle('active', panel.id === `panel-${tab.dataset.panel}`));
  });
});

function setCustomTheme(hex) {
  if (deviceBlocked) return;
  state.theme = 'custom';
  state.customColor = hex || lastGoodCustomColor || '#2f8cff';
  lastGoodCustomColor = state.customColor;
  applyCustomColor(state.customColor);
  document.body.dataset.theme = 'custom';
  themeButtons.forEach((item) => item.classList.toggle('active', false));
  customColorButtonEl.classList.add('active');
  saveState();
}

function setCustomThemeFromSliders() {
  const hex = hslToHex(Number(customHueEl.value), Number(customSatEl.value), Number(customLightEl.value));
  setCustomTheme(hex);
}

customColorButtonEl.addEventListener('click', (event) => {
  event.stopPropagation();
  customPaletteEl.classList.toggle('open');
  customColorButtonEl.classList.toggle('open', customPaletteEl.classList.contains('open'));
});

customPaletteEl.addEventListener('click', (event) => {
  event.stopPropagation();
});

customPaletteButtons.forEach((button) => {
  const color = button.dataset.color;
  button.style.setProperty('--swatch-color', color);
  button.addEventListener('click', () => {
    syncCustomSliders(color);
    setCustomTheme(color);
  });
});

[customHueEl, customSatEl, customLightEl].forEach((input) => {
  input.addEventListener('input', setCustomThemeFromSliders);
});

schemeToggleEl.addEventListener('click', () => {
  if (blockedAction()) return;
  state.scheme = state.scheme === 'light' ? 'dark' : 'light';
  document.body.dataset.scheme = state.scheme;
  saveState();
});

motionButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (blockedAction()) return;
    state.motionMode = button.dataset.motion;
    document.body.dataset.motion = state.motionMode;
    renderMotionPicker();
    randomizeBackground();
    saveState();
  });
});

locationToggleEl.addEventListener('click', () => {
  if (!navigator.geolocation) {
    locationStatusEl.textContent = 'Localização não suportada neste browser';
    return;
  }

  locationStatusEl.textContent = 'A pedir localização...';
  navigator.geolocation.getCurrentPosition(
    (position) => {
      state.locale = state.locale || defaultLocale();
      state.locale.coordinates = {
        lat: Number(position.coords.latitude.toFixed(5)),
        lon: Number(position.coords.longitude.toFixed(5))
      };
      state.locale.country = 'Portugal';
      state.locale.place = 'Portugal';
      state.locale.language = 'pt-PT';
      state.locale.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Lisbon';
      saveState();
      renderLocationStatus();
    },
    () => {
      state.locale = state.locale || defaultLocale();
      state.locale.country = 'Portugal';
      state.locale.place = state.locale.place || 'Cantanhede, Portugal';
      state.locale.language = 'pt-PT';
      state.locale.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Lisbon';
      saveState();
      renderLocationStatus();
      locationStatusEl.textContent = `${state.locale.place} guardado · browser bloqueou GPS`;
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
  );
});

modelPickerToggleEl.addEventListener('click', () => {
  if (deviceBlocked) return;
  document.body.classList.toggle('model-picker-open');
  document.body.classList.remove('menu-open');
  document.body.classList.remove('attach-open');
});

modelModeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (blockedAction()) return;
    state.modelMode = button.dataset.mode;
    saveState();
    renderModelPicker();
    document.body.classList.add('model-switching');
    document.body.classList.remove('model-settled');
    setTimeout(() => {
      document.body.classList.remove('model-switching');
      document.body.classList.add('model-settled');
      setTimeout(() => document.body.classList.remove('model-settled'), 520);
    }, 650);
    document.body.classList.remove('model-picker-open');
  });
});

confirmOkEl.addEventListener('click', () => {
  const action = pendingConfirm;
  closeConfirm();
  if (action) action();
});

confirmCancelEl.addEventListener('click', closeConfirm);

confirmDialogEl.addEventListener('click', (event) => {
  if (event.target === confirmDialogEl) closeConfirm();
});

imagePreviewCloseEl.addEventListener('click', closeImagePreview);
imagePreviewEl.addEventListener('click', (event) => {
  if (event.target === imagePreviewEl) closeImagePreview();
});

voicePrevEl.innerHTML = prevIcon();
voiceToggleEl.innerHTML = pauseIcon();
voiceNextEl.innerHTML = nextIcon();
voiceCloseEl.innerHTML = closeIcon();

voicePrevEl.addEventListener('click', () => {
  if (!voiceState.sentences.length) return;
  window.speechSynthesis.cancel();
  voiceState.index = Math.max(0, voiceState.index - 1);
  voiceState.paused = false;
  speakCurrentSentence();
});

voiceNextEl.addEventListener('click', () => {
  if (!voiceState.sentences.length) return;
  window.speechSynthesis.cancel();
  voiceState.index = Math.min(voiceState.sentences.length - 1, voiceState.index + 1);
  voiceState.paused = false;
  speakCurrentSentence();
});

voiceToggleEl.addEventListener('click', () => {
  if (!voiceState.speaking) return;
  if (voiceState.paused) {
    voiceState.paused = false;
    voiceToggleEl.innerHTML = pauseIcon();
    window.speechSynthesis.resume();
  } else {
    voiceState.paused = true;
    voiceToggleEl.innerHTML = playIcon();
    window.speechSynthesis.pause();
  }
});

voiceCloseEl.addEventListener('click', stopSpeaking);

document.addEventListener('click', (event) => {
  if (!event.target.closest('#menu, #menu-toggle')) {
    document.body.classList.remove('menu-open');
    customPaletteEl.classList.remove('open');
    customColorButtonEl.classList.remove('open');
  }

  if (!event.target.closest('.attach-wrap')) {
    document.body.classList.remove('attach-open');
  }

  if (!event.target.closest('.model-picker-wrap')) {
    document.body.classList.remove('model-picker-open');
  }

  if (!event.target.closest('#device-panel, #device-toggle')) {
    document.body.classList.remove('device-panel-open');
  }
});

starterPills.forEach((pill) => {
  pill.addEventListener('click', () => {
    const prompt = pill.dataset.prompt;
    if (!prompt) return;
    ask(prompt);
  });
});
