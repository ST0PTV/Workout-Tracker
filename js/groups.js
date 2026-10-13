// Übungsgruppen und Tausch im Training (v1.3, ohne DOM, in Node testbar).
// Gruppe = Bewegungsmuster (z. B. „Beine Grundübung“); eine Übung kann in mehreren Gruppen sein (groupIds).
// Tausch-Kandidaten kommen automatisch aus den Gruppen der geplanten Übung (Entscheidung a, 2026-10-13);
// ein groupId am Plan- bzw. Trainingseintrag schränkt optional auf diese eine Gruppe ein.
import * as store from './store.js';
import { nowISO } from './util.js';
import { createGroup as makeGroup, validateGroup } from './model.js';

export const MAX_GROUP_NAME = 40;

const norm = (name) => String(name ?? '').trim().replace(/\s+/g, ' ');

export function listGroups() {
  return [...store.get('groups')].sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

export function getGroup(id) {
  return store.get('groups').find((g) => g.id === id) || null;
}

function nameError(name, exceptId = null) {
  if (!name) return 'Bitte einen Namen eingeben.';
  if (name.length > MAX_GROUP_NAME) return `Name zu lang (höchstens ${MAX_GROUP_NAME} Zeichen).`;
  if (store.get('groups').some((g) => g.id !== exceptId && g.name.toLowerCase() === name.toLowerCase())) return `Es gibt schon eine Gruppe „${name}“.`;
  return null;
}

export function addGroup(rawName) {
  const name = norm(rawName);
  const err = nameError(name);
  if (err) return { ok: false, errors: [err] };
  const g = makeGroup({ name });
  const errors = validateGroup(g);
  if (errors.length) return { ok: false, errors };
  if (!store.set('groups', [...store.get('groups'), g])) return { ok: false, errors: ['Speichern fehlgeschlagen.'] };
  return { ok: true, errors: [], group: g };
}

export function renameGroup(id, rawName) {
  const groups = store.get('groups');
  const i = groups.findIndex((g) => g.id === id);
  if (i < 0) return { ok: false, errors: ['Gruppe nicht gefunden.'] };
  const name = norm(rawName);
  const err = nameError(name, id);
  if (err) return { ok: false, errors: [err] };
  groups[i] = { ...groups[i], name, updatedAt: nowISO() };
  if (!store.set('groups', groups)) return { ok: false, errors: ['Speichern fehlgeschlagen.'] };
  return { ok: true, errors: [], group: groups[i] };
}

// Löschen bereinigt Übungen (groupIds) und Planeinträge (groupId → null), damit validateData gültig bleibt.
// Alte Trainings behalten ihr groupId; es wird nicht gegen die Gruppen geprüft und dient nur dem Tausch.
export function deleteGroup(id) {
  const groups = store.get('groups');
  if (!groups.some((g) => g.id === id)) return { ok: false, errors: ['Gruppe nicht gefunden.'] };
  const now = nowISO();
  const exercises = store.get('exercises').map((e) => (e.groupIds.includes(id) ? { ...e, groupIds: e.groupIds.filter((g) => g !== id), updatedAt: now } : e));
  const plans = store.get('plans').map((p) => (p.items.some((it) => it.groupId === id) ? { ...p, items: p.items.map((it) => (it.groupId === id ? { ...it, groupId: null } : it)), updatedAt: now } : p));
  const ok = store.set('exercises', exercises) && store.set('plans', plans) && store.set('groups', groups.filter((g) => g.id !== id));
  return ok ? { ok: true, errors: [] } : { ok: false, errors: ['Speichern fehlgeschlagen.'] };
}

// Aktive Übungen einer Gruppe (archivierte nie als Tausch-Kandidat).
export function groupMembers(groupId, exercises = store.get('exercises')) {
  return exercises.filter((e) => !e.archived && e.groupIds.includes(groupId)).sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

// Tausch-Kandidaten für einen Trainingseintrag: Basis ist die geplante Übung (bzw. die aktuelle, wenn nicht getauscht).
// Gruppen = entry.groupId (optionale Einschränkung aus dem Plan) oder alle Gruppen der Basis-Übung.
// Ergebnis ohne die aktuell eingetragene Übung; die geplante ist enthalten, wenn schon getauscht wurde.
export function swapCandidates(entry, exercises = store.get('exercises'), groups = store.get('groups')) {
  const byId = Object.fromEntries(exercises.map((e) => [e.id, e]));
  const base = byId[entry.plannedExerciseId ?? entry.exerciseId];
  const known = new Set(groups.map((g) => g.id));
  const groupIds = (entry.groupId && known.has(entry.groupId) ? [entry.groupId] : (base?.groupIds || [])).filter((g) => known.has(g));
  const seen = new Set();
  const out = [];
  for (const gid of groupIds) {
    for (const ex of groupMembers(gid, exercises)) {
      if (ex.id === entry.exerciseId || seen.has(ex.id)) continue;
      seen.add(ex.id);
      out.push(ex);
    }
  }
  // Die geplante Übung immer anbieten, wenn getauscht wurde (auch wenn sie inzwischen archiviert ist).
  if (entry.plannedExerciseId && entry.plannedExerciseId !== entry.exerciseId && !seen.has(entry.plannedExerciseId) && byId[entry.plannedExerciseId]) {
    out.unshift(byId[entry.plannedExerciseId]);
  }
  return { groupIds, candidates: out };
}

export const groupNames = (ids, groups = store.get('groups')) => ids.map((id) => groups.find((g) => g.id === id)?.name).filter(Boolean);
