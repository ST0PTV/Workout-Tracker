// Pausen-Timer: rein zeitstempelbasiert (Start + Dauer), daher korrekt auch nach Sperrbildschirm,
// App-Wechsel oder Neuladen. Kein Ton, kein Alarm, keine Vibration – das Ende wird nur angezeigt.
import { nowISO } from './util.js';
import { REST_STEP, REST_MIN, REST_MAX } from './rest.js';

export function startRest(entryId, durationSec, now = nowISO()) {
  return { entryId, startedAt: now, durationSec };
}

// { remaining, overtime, done, progress } – remaining/overtime in ganzen Sekunden.
export function restState(timer, nowMs = Date.now()) {
  if (!timer) return null;
  const elapsed = Math.max(0, (nowMs - Date.parse(timer.startedAt)) / 1000);
  const left = timer.durationSec - elapsed;
  return {
    remaining: Math.max(0, Math.ceil(left)),
    overtime: left < 0 ? Math.floor(-left) : 0,
    done: left <= 0,
    progress: Math.min(1, elapsed / timer.durationSec)
  };
}

// Laufende Pause um ±15 s verlängern/verkürzen (Dauer bleibt in den Grenzen der Pausenzeit).
export function adjustRest(timer, delta) {
  if (!timer) return null;
  const next = Math.max(REST_MIN, Math.min(REST_MAX, timer.durationSec + delta * REST_STEP));
  return { ...timer, durationSec: next };
}
