// v2.26.0: Geräte-Funktionen des Browsers – Bildschirm anlassen (A1) und dauerhafter Speicher (A2).
// Alles ist optional: Fehlt eine Schnittstelle oder lehnt der Browser ab, passiert still nichts.

// ---------- A1: Bildschirm während des Trainings anlassen (Screen Wake Lock API) ----------

let lock = null;
let wanted = false;
let pending = null;

export function wakeLockSupported() {
  return typeof navigator !== 'undefined' && !!navigator.wakeLock && typeof navigator.wakeLock.request === 'function';
}

async function acquire() {
  if (!wanted || lock || pending || !wakeLockSupported()) return;
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
  pending = navigator.wakeLock.request('screen')
    .then((l) => {
      lock = l;
      // Der Browser gibt die Sperre selbst frei (z. B. App im Hintergrund); beim Zurückkommen neu anfordern.
      l.addEventListener?.('release', () => { if (lock === l) lock = null; });
      if (!wanted) release();
    })
    .catch(() => { /* abgelehnt (Energiesparmodus, nicht unterstützt): ohne Hinweis weiter */ })
    .finally(() => { pending = null; });
  await pending;
}

function release() {
  const l = lock;
  lock = null;
  if (l) l.release().catch(() => {});
}

// Wird bei jedem Neuzeichnen aufgerufen: an = laufendes Training und Einstellung aktiv.
export function setKeepAwake(on) {
  wanted = !!on;
  if (wanted) acquire(); else release();
}

export function keepAwakeActive() {
  return !!lock;
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') acquire(); });
}

// ---------- A2: dauerhaften Speicher anfragen und Belegung anzeigen (StorageManager) ----------

function storageApi() {
  return typeof navigator !== 'undefined' ? navigator.storage : undefined;
}

// Ergebnis: true (zugesagt), false (abgelehnt) oder null (nicht unterstützt).
export async function requestPersist() {
  const s = storageApi();
  if (!s || typeof s.persist !== 'function') return null;
  try { return await s.persist(); } catch { return null; }
}

// { persisted: true|false|null, usage: Bytes|null, quota: Bytes|null }
export async function storageStatus() {
  const s = storageApi();
  const out = { persisted: null, usage: null, quota: null };
  if (!s) return out;
  try { if (typeof s.persisted === 'function') out.persisted = await s.persisted(); } catch { /* unbekannt */ }
  try {
    if (typeof s.estimate === 'function') {
      const e = await s.estimate();
      out.usage = Number.isFinite(e?.usage) ? e.usage : null;
      out.quota = Number.isFinite(e?.quota) ? e.quota : null;
    }
  } catch { /* unbekannt */ }
  return out;
}

export function fmtBytes(b) {
  if (b === null || b === undefined) return '–';
  if (b < 1024 * 1024) return `${(b / 1024).toLocaleString('de-DE', { maximumFractionDigits: 0 })} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB`;
  return `${(b / 1024 ** 3).toLocaleString('de-DE', { maximumFractionDigits: 1 })} GB`;
}
