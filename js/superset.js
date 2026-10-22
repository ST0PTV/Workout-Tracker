// Supersätze (v2.30.0, Feature-To-Do B1, Variante B). Ohne DOM, in Node testbar.
// Im Plan koppelt item.supersetNext = true einen Eintrag mit dem nächsten; Ketten ab zwei Einträgen sind eine Gruppe.
// Im Training tragen die Einträge einer Gruppe dieselbe entry.ssGroup. Ablauf: ein Satz pro Übung im Wechsel
// (A, B, A, B …), keine Pause innerhalb der Runde, nach der Runde die längste Pause der Gruppe.
// Volumen und Satzzählung bleiben unverändert (jeder Satz zählt wie bisher).
import { effectiveRest } from './rest.js';

export const LETTERS = 'ABCDEFGH';

// Gruppen aus Plan-Einträgen: Map itemId → Gruppen-Schlüssel (nur Ketten mit mindestens zwei Einträgen).
// makeId erzeugt den Schlüssel (im Training eine neue uuid je Gruppe).
export function chainGroups(items, makeId) {
  const out = new Map();
  let chain = [];
  const flush = () => {
    if (chain.length >= 2) { const id = makeId(); for (const it of chain) out.set(it.id, id); }
    chain = [];
  };
  items.forEach((it, i) => {
    chain.push(it);
    if (!(it.supersetNext === true && i < items.length - 1)) flush();
  });
  flush();
  return out;
}

// Kopplungen bereinigen: der letzte Eintrag hat keine Kopplung (sie zeigte ins Leere).
export function normalizeLinks(items) {
  return items.map((it, i) => (it.supersetNext && i === items.length - 1 ? (({ supersetNext, ...rest }) => rest)(it) : it));
}

// Gruppenmitglieder eines Eintrags in Trainingsreihenfolge; [] ohne Gruppe oder bei nur einem Mitglied.
export function members(session, entryId) {
  const en = session.entries.find((e) => e.id === entryId);
  if (!en?.ssGroup) return [];
  const m = session.entries.filter((e) => e.ssGroup === en.ssGroup);
  return m.length >= 2 ? m : [];
}

export const letterOf = (session, entryId) => {
  const m = members(session, entryId);
  const i = m.findIndex((e) => e.id === entryId);
  return i >= 0 ? LETTERS[i] || String(i + 1) : null;
};

const hasOpen = (en) => en.sets.some((x) => x.completedAt === null);

// Nach einem erledigten Satz: { rest: false, next } = ohne Pause weiter mit next (Partner in derselben Runde);
// { rest: true, next } = Runde vorbei, Pause, danach next (erstes Mitglied mit offenem Satz, kann null sein).
// null = Eintrag gehört zu keiner Gruppe (normales Verhalten).
export function afterSet(session, entryId) {
  const m = members(session, entryId);
  if (!m.length) return null;
  const i = m.findIndex((e) => e.id === entryId);
  const partner = m.slice(i + 1).find(hasOpen);
  if (partner) return { rest: false, next: partner.id };
  return { rest: true, next: m.find(hasOpen)?.id ?? null };
}

// Pause nach der Runde: die längste Pause der Gruppe (Übung bzw. Plan-Platz).
export function roundRest(session, entryId, exercisesById, settings) {
  const m = members(session, entryId);
  const list = m.length ? m : session.entries.filter((e) => e.id === entryId);
  return Math.max(...list.map((e) => effectiveRest(exercisesById[e.exerciseId], settings, e)));
}
