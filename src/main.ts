import QRCode from 'qrcode';
import initSqlJs from 'sql.js';

type StaticQrConfig = {
  cardNumber: string;
  constant: string;
  deviceId: string;
};

async function loadStaticQrConfig(): Promise<StaticQrConfig | null> {
  const SQL = await initSqlJs({
    locateFile: (file) => new URL(`./dist/${file}`, document.baseURI).href
  });
  const databaseResponse = await fetch(new URL('./data/qr-config.sqlite', document.baseURI));
  if (!databaseResponse.ok) {
    throw new Error(`SQLite configuration could not be loaded (${databaseResponse.status}).`);
  }

  const database = new SQL.Database(new Uint8Array(await databaseResponse.arrayBuffer()));
  try {
    const result = database.exec(
      'SELECT card_number, constant, device_id FROM qr_static_config WHERE id = 1'
    );
    const row = result[0]?.values[0];
    if (!row) return null;
    if (row.length !== 3) throw new Error('SQLite configuration row has an invalid shape.');

    const [cardNumber, constant, deviceId] = row;
    if (
      typeof cardNumber !== 'string' ||
      typeof constant !== 'string' ||
      typeof deviceId !== 'string'
    ) {
      throw new Error('SQLite configuration contains values with an invalid type.');
    }

    return { cardNumber, constant, deviceId };
  } finally {
    database.close();
  }
}

type ViewConfig = {
  canvasId: string;
  qrDataId?: string;
  progressBarId?: string;
  // true → bar starts full and empties (countdown, original behavior)
  // false/undefined → bar starts empty and fills up (Basic-Fit app behavior)
  progressFromFull?: boolean;
};

const VIEW_NEW: ViewConfig = {
  canvasId: 'qrCanvas',
  progressBarId: 'qrProgressBar'
};

const VIEW_DEBUG: ViewConfig = {
  canvasId: 'qrCanvasDebug',
  qrDataId: 'qrDataDebug',
  progressBarId: 'progressBarDebug',
  progressFromFull: true
};

async function generateHash(cardNr: string, constant: string, iat: number, deviceId: string): Promise<string> {
  const dataToHash = cardNr + constant + iat + deviceId;
  const encoder = new TextEncoder();
  const data = encoder.encode(dataToHash);

  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.slice(-8).toUpperCase();
}

async function generateQRCodeData(cardNumber: string, constant: string, deviceId: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const hash = await generateHash(cardNumber, constant, timestamp, deviceId);
  return `GM2:${cardNumber}:${constant}:${timestamp}:${hash}`;
}

async function displayQRCode(view: ViewConfig, cardNumber: string, constant: string, deviceId: string) {
  const canvas = document.getElementById(view.canvasId) as HTMLCanvasElement | null;
  if (!canvas) return;
  const qrData = await generateQRCodeData(cardNumber, constant, deviceId);

  await QRCode.toCanvas(canvas, qrData, {
    width: 360,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });

  canvas.style.width = '';
  canvas.style.height = '';

  if (view.qrDataId) {
    const qrDataElement = document.getElementById(view.qrDataId);
    if (qrDataElement) qrDataElement.textContent = qrData;
  }
}

let refreshInterval: number | null = null;

function startQRRefresh(view: ViewConfig, cardNumber: string, constant: string, deviceId: string) {
  const REFRESH_INTERVAL = 5000;
  const progressBar = view.progressBarId
    ? (document.getElementById(view.progressBarId) as HTMLDivElement | null)
    : null;

  function resetAndAnimate() {
    if (!progressBar) return;
    const start = view.progressFromFull ? '100%' : '0%';
    const end = view.progressFromFull ? '0%' : '100%';
    progressBar.style.transition = 'none';
    progressBar.style.width = start;
    void progressBar.offsetWidth;
    progressBar.style.transition = 'width 5s linear';
    progressBar.style.width = end;
  }

  displayQRCode(view, cardNumber, constant, deviceId);
  resetAndAnimate();

  refreshInterval = window.setInterval(() => {
    displayQRCode(view, cardNumber, constant, deviceId);
    resetAndAnimate();
  }, REFRESH_INTERVAL);
}

function skipToNextQR(view: ViewConfig, cardNumber: string, constant: string, deviceId: string) {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    startQRRefresh(view, cardNumber, constant, deviceId);
  }
}

function stopQRRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  void initializeApp();
});

async function initializeApp(): Promise<void> {
  const loadingSection = document.getElementById('loadingSection') as HTMLDivElement;
  const configSection = document.getElementById('configSection') as HTMLDivElement;
  const qrSection = document.getElementById('qrSection') as HTMLDivElement;
  const qrSectionDebug = document.getElementById('qrSectionDebug') as HTMLDivElement;
  const configStatus = document.getElementById('configStatus') as HTMLParagraphElement;

  const cardNumberInput = document.getElementById('cardNumber') as HTMLInputElement;
  const deviceIdInput = document.getElementById('deviceId') as HTMLInputElement;
  const constantInput = document.getElementById('constant') as HTMLInputElement;

  const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
  const debugBtn = document.getElementById('debugBtn') as HTMLButtonElement;
  const closeBtn = document.getElementById('closeBtn') as HTMLButtonElement;
  const helpBtn = document.getElementById('helpBtn') as HTMLButtonElement;
  const feedbackBtn = document.getElementById('feedbackBtn') as HTMLButtonElement;
  const backBtnDebug = document.getElementById('backBtnDebug') as HTMLButtonElement;
  const skipQrBtnDebug = document.getElementById('skipQrBtnDebug') as HTMLButtonElement;
  const qrCardNumberLabel = document.getElementById('qrCardNumber') as HTMLSpanElement;
  const appBasePath = new URL('.', window.location.href).pathname;
  const setupRoutePath = `${appBasePath}setup/`;

  generateBtn.disabled = true;
  debugBtn.disabled = true;
  configStatus.textContent = 'Loading static QR settings from SQLite...';

  let staticConfig: StaticQrConfig | null = null;
  let databaseError: string | null = null;
  try {
    staticConfig = await loadStaticQrConfig();
  } catch (error) {
    databaseError = errorMessage(error);
  }

  // URL parameters override the static SQLite defaults.
  const urlParams = new URLSearchParams(window.location.search);
  const urlCardNumber = urlParams.get('cardNumber');
  const urlDeviceId = urlParams.get('deviceId');
  const urlConstant = urlParams.get('constant');

  cardNumberInput.value = urlCardNumber || staticConfig?.cardNumber || '';
  deviceIdInput.value = urlDeviceId || staticConfig?.deviceId || '';
  constantInput.value = urlConstant || staticConfig?.constant || '';
  if (databaseError) {
    configStatus.textContent = `Could not load static QR settings from SQLite: ${databaseError}. Enter values manually.`;
  } else if (staticConfig) {
    configStatus.textContent = 'SQLite defaults loaded. URL parameters take precedence.';
  } else {
    configStatus.textContent = 'No static SQLite settings found. Enter the required values below.';
  }
  generateBtn.disabled = false;
  debugBtn.disabled = false;

  function currentForm(): { cardNumber: string; deviceId: string; constant: string } | null {
    const cardNumber = cardNumberInput.value.trim();
    const deviceId = deviceIdInput.value.trim();
    const constant = constantInput.value.trim();

    if (!cardNumber || !deviceId || !constant) return null;

    return { cardNumber, deviceId, constant };
  }

  function readForm(): { cardNumber: string; deviceId: string; constant: string } | null {
    const form = currentForm();
    if (!form) alert('Please fill in all fields');
    return form;
  }

  function showConfig() {
    stopQRRefresh();
    loadingSection.style.display = 'none';
    qrSection.style.display = 'none';
    qrSectionDebug.style.display = 'none';
    configSection.style.display = 'block';
  }

  function showNormalQr(form: { cardNumber: string; deviceId: string; constant: string }, updateLocation: boolean) {
    if (updateLocation && (window.location.pathname !== appBasePath || window.location.search)) {
      window.history.pushState(null, '', appBasePath);
    }
    stopQRRefresh();
    loadingSection.style.display = 'none';
    qrCardNumberLabel.textContent = form.cardNumber;
    configSection.style.display = 'none';
    qrSectionDebug.style.display = 'none';
    qrSection.style.display = 'flex';
    startQRRefresh(VIEW_NEW, form.cardNumber, form.constant, form.deviceId);
  }

  function showDebugQr(form: { cardNumber: string; deviceId: string; constant: string }) {
    stopQRRefresh();
    loadingSection.style.display = 'none';
    configSection.style.display = 'none';
    qrSection.style.display = 'none';
    qrSectionDebug.style.display = 'flex';
    startQRRefresh(VIEW_DEBUG, form.cardNumber, form.constant, form.deviceId);
  }

  function openSetupRoute() {
    if (window.location.pathname !== setupRoutePath) {
      window.history.pushState(null, '', setupRoutePath);
    }
    showConfig();
  }

  function isSetupRoute(): boolean {
    const currentPath = window.location.pathname.replace(/\/+$/, '');
    const setupPath = setupRoutePath.replace(/\/+$/, '');
    return currentPath === setupPath;
  }

  function showRouteFromLocation() {
    const form = currentForm();
    if (isSetupRoute() || !form) {
      showConfig();
    } else {
      showNormalQr(form, false);
    }
  }

  const requestedSetup = new URLSearchParams(window.location.search).get('view') === 'setup';
  if (requestedSetup) {
    window.history.replaceState(null, '', setupRoutePath);
  }
  window.addEventListener('popstate', showRouteFromLocation);

  const initialForm = currentForm();
  if (requestedSetup || isSetupRoute() || !initialForm) {
    showConfig();
  } else {
    showNormalQr(initialForm, false);
  }

  generateBtn.addEventListener('click', () => {
    const form = readForm();
    if (!form) return;
    showNormalQr(form, true);
  });

  debugBtn.addEventListener('click', () => {
    const form = readForm();
    if (!form) return;
    showDebugQr(form);
  });

  closeBtn.addEventListener('click', openSetupRoute);
  backBtnDebug.addEventListener('click', showConfig);

  helpBtn.addEventListener('click', () => {
    // Stubbed per design — wire up a real help flow when ready.
  });

  feedbackBtn.addEventListener('click', () => {
    // Stubbed per design — wire up a real feedback flow when ready.
  });

  skipQrBtnDebug.addEventListener('click', () => {
    const form = readForm();
    if (!form) return;
    skipToNextQR(VIEW_DEBUG, form.cardNumber, form.constant, form.deviceId);
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'An unexpected error occurred.';
}
