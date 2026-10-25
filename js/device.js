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

// ---------- v3.0.5: Lücke am unteren Rand im iOS-Home-Bildschirm ----------
// Beobachtet (3.0.2–3.0.4, Screenshots): Solange das Dokument nicht scrollt, meldet iOS ein Fenster, das ca. 55 pt
// kürzer ist als der Bildschirm; fixierte Elemente mit bottom: 0 hängen dann in der Luft. Ursache nicht belegt
// (Hypothese: iOS-26-Fehler „als wäre die Safari-Leiste noch da“). Nur im Home-Bildschirm-Modus messen wir
// Bildschirmhöhe − Fensterhöhe und schieben die Hülle per --vb-gap bis an den Rand. Im Safari-Browser bleibt 0.
let gapNow = 0;
const isStandalone = () => (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const fullHeight = () => (innerWidth > innerHeight ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height));

export function initViewportGap() {
  if (typeof document === 'undefined') return;
  const upd = () => {
    let gap = 0;
    if (isStandalone()) {
      gap = Math.max(0, Math.round(fullHeight() - innerHeight));
      if (gap > 120) gap = 0; // größere Werte = Tastatur o. Ä., nicht die Leisten-Lücke
    }
    gapNow = gap;
    document.documentElement.style.setProperty('--vb-gap', `${gap}px`);
  };
  upd();
  addEventListener('resize', upd);
  addEventListener('orientationchange', () => setTimeout(upd, 300));
}

// Vorübergehende Messzeile für Einstellungen → Info (bis der Fix auf dem iPhone bestätigt ist).
export function viewportInfo() {
  const probe = (css) => {
    const d = document.createElement('div');
    d.style.cssText = `position:fixed;visibility:hidden;pointer-events:none;top:0;left:0;width:1px;${css}`;
    document.body.append(d);
    const r = d.getBoundingClientRect();
    d.remove();
    return r;
  };
  const lvh = Math.round(probe('height:100lvh').height);
  const dvh = Math.round(probe('height:100dvh').height);
  const top = Math.round(probe('height:env(safe-area-inset-top,0px)').height);
  const bottom = Math.round(probe('height:env(safe-area-inset-bottom,0px)').height);
  return `Bildschirm ${fullHeight()} · Fenster ${innerHeight} · Lücke ${gapNow} · lvh ${lvh} · dvh ${dvh} · oben ${top} · unten ${bottom} · ${isStandalone() ? 'App' : 'Browser'}`;
}
