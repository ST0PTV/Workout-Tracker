// Pläne-Tab (Kombination A + B): Plan-Liste als Karten, Plan als nummerierter Ablauf
// mit „Zuletzt …“ und Pausenzeit; Bearbeiten-Modus mit Pfeil-Tasten, Sätzen, Pause und Entfernen.
import { h } from './util.js';
import * as store from './store.js';
import * as P from './plans.js';
import * as lib from './exercises.js';
import { openSheet } from './sheet.js';
import { toast } from './ui.js';
import { icon } from './icons.js';
import { stepper } from './controls.js';
import { effectiveRest, stepRest, formatDuration } from './rest.js';

const fmtDate = (iso) => new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });

function context() {
  const exercises = lib.listExercises({ includeArchived: true });
  return {
    byId: Object.fromEntries(exercises.map((e) => [e.id, e])),
    sessions: store.get('sessions'),
    settings: store.get('settings')
  };
}

function planSummary(plan, ctx) {
  const d = P.planDetails(plan, ctx.byId, ctx.sessions);
  const sets = d.reduce((n, x) => n + x.sets, 0);
  return { count: d.length, sets, names: d.map((x) => x.exercise?.name || 'Unbekannte Übung') };
}

// ---------- Plan anlegen ----------

function openCreate(rerender) {
  const input = h('input', { class: 'input', type: 'text', placeholder: 'z. B. Push, Oberkörper A', 'aria-label': 'Name des Plans', maxlength: '60', autocapitalize: 'sentences' });
  const sheet = openSheet(h('form', { class: 'editor', onsubmit: (e) => {
    e.preventDefault();
    const r = P.newPlan(input.value);
    if (!r.ok) { toast(r.errors[0], { error: true }); return; }
    sheet.close();
    rerender();
    openPlan(r.plan.id, rerender, { edit: true });
  } },
  h('div', { class: 'field' }, h('label', {}, 'Name'), input),
  h('button', { class: 'btn primary block', type: 'submit' }, 'Plan anlegen')), { title: 'Neuer Plan' });
  setTimeout(() => input.focus(), 250);
}

// ---------- Übungen zum Plan hinzufügen ----------

function openExercisePicker(plan, onDone) {
  const inPlan = new Set(plan.items.map((i) => i.exerciseId));
  const chosen = [];
  const state = { query: '' };
  const active = lib.listExercises();
  const listBox = h('div');
  const addBtn = h('button', { class: 'btn primary block sticky-bottom', type: 'button', disabled: true }, 'Hinzufügen');
  const updateBtn = () => {
    addBtn.disabled = !chosen.length;
    addBtn.textContent = chosen.length ? `${chosen.length} hinzufügen` : 'Übungen auswählen';
  };
  const draw = () => {
    const sections = lib.groupedExercises(active, { query: state.query });
    listBox.replaceChildren(...(sections.length ? sections.map((s) => h('section', {},
      h('div', { class: 'sec' }, s.label),
      h('div', { class: 'card list' }, s.items.map((e) => {
        const on = chosen.includes(e.id);
        return h('button', { class: `row pick${on ? ' on' : ''}`, type: 'button', 'aria-pressed': String(on), onclick: () => {
          const i = chosen.indexOf(e.id);
          if (i >= 0) chosen.splice(i, 1); else chosen.push(e.id);
          draw(); updateBtn();
        } },
        h('span', { class: `check${on ? ' on' : ''}` }, on ? h('b', {}, String(chosen.indexOf(e.id) + 1)) : null),
        h('span', { class: 't' }, h('b', {}, e.name), h('small', {}, lib.muscleSummary(e)),
          inPlan.has(e.id) ? h('small', { class: 'accent' }, 'Schon im Plan') : null));
      })))) : [h('p', { class: 'muted empty-line' }, active.length ? 'Keine Übung passt zur Suche.' : 'Noch keine Übungen. Lege sie im Tab „Übungen“ an oder übernimm sie aus dem Startpool.')]));
  };
  const search = h('input', { type: 'search', class: 'search-input', placeholder: 'Übung suchen', 'aria-label': 'Übung suchen', autocomplete: 'off' });
  search.addEventListener('input', () => { state.query = search.value; draw(); });
  addBtn.addEventListener('click', () => { sheet.close(); onDone([...chosen]); });
  draw(); updateBtn();
  const sheet = openSheet(h('div', {},
    h('p', { class: 'muted small' }, 'Antippen in der gewünschten Reihenfolge – die Zahl zeigt die Position.'),
    h('label', { class: 'search' }, icon('search', { size: 18 }), search),
    listBox, addBtn), { title: 'Übungen hinzufügen', full: true });
}

// ---------- Plan-Ansicht (Ablauf) und Bearbeiten ----------

export function openPlan(planId, rerender, { edit = false } = {}) {
  const mode = { edit };
  const body = h('div', { class: 'plan' });
  let sheet = null;

  const draw = () => {
    const plan = P.getPlan(planId);
    if (!plan) { sheet?.close(); return; }
    const ctx = context();
    const details = P.planDetails(plan, ctx.byId, ctx.sessions);
    const title = sheet?.panel.querySelector('.sheet-head h2');
    if (title) title.textContent = plan.name;

    const head = h('div', { class: 'plan-head' },
      mode.edit
        ? h('input', { class: 'input', type: 'text', value: plan.name, 'aria-label': 'Name des Plans', maxlength: '60', onchange: (e) => {
          const r = P.renamePlan(planId, e.target.value);
          if (!r.ok) { toast(r.errors[0], { error: true }); e.target.value = P.getPlan(planId).name; } else { draw(); rerender(); }
        } })
        : h('p', { class: 'muted small' }, details.length ? `${details.length} Übungen · ${details.reduce((n, x) => n + x.sets, 0)} Arbeitssätze` : 'Noch keine Übungen im Plan.'),
      h('button', { class: `pill${mode.edit ? ' on' : ''}`, type: 'button', onclick: () => { mode.edit = !mode.edit; draw(); } },
        mode.edit ? 'Fertig' : h('span', { class: 'pill-in' }, icon('edit', { size: 16 }), 'Bearbeiten')));

    const steps = details.map((d) => {
      const ex = d.exercise;
      const name = ex ? ex.name : 'Unbekannte Übung';
      const rest = effectiveRest(ex, ctx.settings);
      const info = h('div', { class: 't' },
        h('b', {}, name, mode.edit ? null : h('span', { class: 'tag' }, `${d.sets} ${d.sets === 1 ? 'Satz' : 'Sätze'} · Pause ${formatDuration(rest)}`)),
        ex ? h('small', {}, lib.muscleSummary(ex)) : null,
        d.archivedExercise ? h('small', { class: 'warn' }, 'Übung ist archiviert') : null,
        ex?.note ? h('i', {}, icon('edit', { size: 13, cls: 'inline' }), ` ${ex.note}`) : null,
        !mode.edit ? h('span', { class: `last${d.last ? '' : ' none'}` }, d.last && d.last.sets.length ? `Zuletzt ${fmtDate(d.last.date)}: ${P.formatLastSets(d.last.sets)}` : 'Noch nicht trainiert') : null);

      const editRow = mode.edit ? h('div', { class: 'edit-controls' },
        h('div', { class: 'ctl' }, h('span', { class: 'ctl-label' }, 'Sätze'),
          stepper({ value: d.sets, small: true, label: 'Sätze', onStep: (v, delta) => {
            const next = Math.max(1, Math.min(10, v + delta));
            const r = P.setTargetSets(planId, d.item.id, next);
            if (!r.ok) { toast(r.errors[0], { error: true }); return null; }
            rerender();
            return next;
          } })),
        ex ? h('div', { class: 'ctl' }, h('span', { class: 'ctl-label' }, 'Pause'),
          stepper({ value: rest, small: true, format: formatDuration, label: 'Pause', onStep: (v, delta) => {
            const next = stepRest(v, delta);
            const r = lib.saveExercise({ ...lib.getExercise(ex.id), restSeconds: next });
            if (!r.ok) { toast(r.errors[0], { error: true }); return null; }
            return next;
          } })) : null) : null;

      const side = mode.edit ? h('div', { class: 'arrows horiz' },
        h('button', { type: 'button', 'aria-label': `${name} nach oben`, disabled: d.index === 0, onclick: () => { P.moveItem(planId, d.item.id, d.index - 1); draw(); rerender(); } }, icon('up')),
        h('button', { type: 'button', 'aria-label': `${name} nach unten`, disabled: d.index === details.length - 1, onclick: () => { P.moveItem(planId, d.item.id, d.index + 1); draw(); rerender(); } }, icon('down')),
        h('button', { type: 'button', class: 'danger', 'aria-label': `${name} entfernen`, onclick: () => { P.removeItem(planId, d.item.id); toast(`${name} entfernt.`); draw(); rerender(); } }, icon('trash'))) : null;

      return h('div', { class: 'stp' },
        h('div', { class: 'num' }, String(d.index + 1)),
        h('div', { class: 'card stp-card' }, h('div', { class: 'stp-main' }, info), editRow ? h('div', { class: 'edit-bottom' }, editRow, side) : null));
    });

    body.replaceChildren(...[
      head,
      ...steps,
      mode.edit || !details.length ? h('button', { class: 'addline', type: 'button', onclick: () => openExercisePicker(P.getPlan(planId), (ids) => {
        if (!ids.length) return;
        const r = P.addExercises(planId, ids);
        if (!r.ok) { toast(r.errors[0], { error: true }); return; }
        toast(`${ids.length} ${ids.length === 1 ? 'Übung' : 'Übungen'} hinzugefügt.`);
        draw(); rerender();
      }) }, icon('plus', { size: 18 }), 'Übungen hinzufügen') : null,
      !mode.edit && details.length ? h('p', { class: 'muted small center' }, 'Training starten folgt in v0.5.') : null,
      mode.edit && plan.archived ? h('button', { class: 'btn block subtle', type: 'button', onclick: () => {
        const r = P.setPlanArchived(planId, false);
        if (!r.ok) { toast(r.errors[0], { error: true }); return; }
        toast('Plan wiederhergestellt.'); draw(); rerender();
      } }, 'Wiederherstellen') : null,
      mode.edit && !plan.archived ? h('button', { class: 'btn block subtle danger-text', type: 'button', onclick: () => {
        if (!confirm(`Plan „${plan.name}“ löschen?`)) return;
        const r = P.deleteOrArchivePlan(planId);
        if (!r.ok) { toast(r.errors[0], { error: true }); return; }
        toast(r.archived ? 'Plan archiviert (mit ihm wurde schon trainiert).' : 'Plan gelöscht.');
        sheet.close(); rerender();
      } }, 'Plan löschen') : null].filter(Boolean));
  };

  draw();
  sheet = openSheet(body, { title: P.getPlan(planId)?.name || 'Plan', full: true });
}

// ---------- Liste ----------

export function plansView(rerender) {
  const ctx = context();
  const plans = P.listPlans().sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const archived = P.listPlans({ includeArchived: true }).filter((p) => p.archived);
  const card = (plan, dim = false) => {
    const s = planSummary(plan, ctx);
    return h('button', { class: `pcard${dim ? ' dim-list' : ''}`, type: 'button', onclick: () => openPlan(plan.id, rerender) },
      h('span', { class: 'pc-top' }, h('b', {}, plan.name), icon('chevron', { size: 18 })),
      h('small', {}, `${s.count} ${s.count === 1 ? 'Übung' : 'Übungen'} · ${s.sets} Arbeitssätze`),
      s.count ? h('span', { class: 'ex' }, s.names.join(' · ')) : h('span', { class: 'ex muted' }, 'Noch leer – tippen zum Befüllen'));
  };
  return h('section', { class: 'plans' },
    h('h1', {}, 'Pläne'),
    plans.length
      ? plans.map((p) => card(p))
      : h('div', { class: 'card empty' },
        h('div', { class: 'big' }, icon('plans', { size: 44 })), h('h2', {}, 'Noch keine Pläne'),
        h('p', { class: 'muted' }, 'Stelle Übungen in deiner Reihenfolge zusammen, z. B. Push, Pull, Beine.'),
        h('div', { class: 'row-btns' }, h('button', { class: 'btn primary', type: 'button', onclick: () => openCreate(rerender) }, 'Ersten Plan anlegen'))),
    archived.length ? h('div', {}, h('div', { class: 'sec' }, `Archiviert (${archived.length})`), archived.map((p) => card(p, true))) : null,
    h('button', { class: 'fab', type: 'button', 'aria-label': 'Plan anlegen', onclick: () => openCreate(rerender) }, icon('plus', { size: 30 })));
}
