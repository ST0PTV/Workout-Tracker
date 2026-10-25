// Zyklus (v2.24.0, Variante C, Nutzerwahl): Einstellungen, eine kleine Zeile auf dem Trainings-Start, Details im Sheet.
// Beschwerden statt Phasen: keine Trainingsempfehlung nach Zyklusphase, kein Eisprung-Datum, keine Diagnosen,
// keine Verletzungs- oder Kalorienaussagen. Der „leichte Tag“ ist jederzeit frei wählbar und kommt nie automatisch.
import { infoBody } from './info.js';
import { h } from './util.js';
import * as store from './store.js';
import { openSheet } from './sheet.js';
import { icon } from './icons.js';
import { toast } from './ui.js';
import { switchInput } from './controls.js';
import * as C from './cycle.js';
import { TEMPLATES } from './routine-data.js';
import { startRun } from './routine-view.js';

const LIGHT_ROUTINE = 'tpl:cd-relax-10'; // Gehen und Dehnen, 10 min
const fmt = (k) => new Date(`${k}T12:00:00`).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
const load = () => C.normalizeCycle(store.get('cycle'));
const save = (c) => { if (!store.set('cycle', c)) { toast('Speichern fehlgeschlagen.', { error: true }); return false; } return true; };

export const CYCLE_INFO = {
  checkedAt: '2026-10-22',
  short: [
    'Freiwillig, nur auf diesem Gerät. Kein Verhütungs- oder Fruchtbarkeitsmittel.',
    'Keine Trainingsregeln je Phase – Studien zeigen dafür keinen Vorteil.',
    'Die nächste Periode ist nur ein grobes Zeitfenster; Arzt-Hinweise sind keine Diagnose.'
  ],
  points: [
    'Die Funktion ist freiwillig und speichert alles nur auf diesem Gerät (auch im Backup). Sie ersetzt keine ärztliche Beratung und ist kein Verhütungs- oder Fruchtbarkeitsmittel.',
    'Warum keine Trainingstipps je Phase: In einer randomisierten Studie mit hormonell bestätigten Phasen (24 Frauen, 3 Zyklen) brachte Training mit Schwerpunkt in der ersten oder zweiten Zyklushälfte keinen Vorteil für Muskelaufbau oder Kraft gegenüber gleichmäßigem Training; entscheidend war das Trainingsvolumen. Eine Übersicht über mehrere Meta-Analysen kam zum selben Schluss.',
    'Akute Leistung: In einer großen Meta-Analyse (78 Studien) war die Leistung in den ersten Zyklustagen höchstens trivial geringer als in den übrigen Phasen; die meisten Studien hatten niedrige Qualität. Allgemeine Regeln lassen sich daraus nicht ableiten – wie du dich fühlst, ist der bessere Maßstab.',
    'Regelschmerzen: Regelmäßiges Training über den ganzen Monat (Dehnen, Rumpftraining, Yoga oder Ausdauer, meist 45–60 min, 3× pro Woche) ging in Studien mit deutlich weniger Regelschmerzen einher – die Evidenz ist aber von niedriger Qualität, und Krafttraining wurde dort nicht untersucht.',
    'Die nächste Periode ist nur ein grobes Zeitfenster aus deinen Angaben. Zykluslängen schwanken; in über 600.000 Zyklen lag die zweite Zyklushälfte zwischen etwa 7 und 17 Tagen. Nur deine eingetragenen Periodentage sind sicher. Einen Eisprung zeigt die App bewusst nicht an.',
    'Mit Pille, Ring oder Pflaster gibt es keine natürlichen Zyklusphasen; die App zeigt dann keine Schätzung. Die Pille hatte in einer Meta-Analyse keinen Einfluss auf Muskelaufbau und Kraft durch Training. Mit Hormonspirale, Implantat, Minipille oder Spritze sind Blutungen oft unregelmäßig – deshalb auch hier keine Vorhersage.',
    'Hinweise zum Arztbesuch erscheinen nur bei deinen eigenen Angaben, z. B. wenn über 90 Tage keine Periode eingetragen ist, Zyklen mehrfach länger als 35 Tage sind oder du sehr starke Blutung oder starke Schmerzen einträgst. Sie sind keine Diagnose.'
  ],
  sources: [
    { label: "D'Souza et al. 2026, Med Sci Sports Exerc", url: 'https://doi.org/10.1249/MSS.0000000000004031', note: 'RCT, 24 Frauen, hormonell bestätigte Phasen: kein Vorteil durch phasenbasiertes Training (Abstract)' },
    { label: 'Colenso-Semple et al. 2023, Front Sports Act Living', url: 'https://doi.org/10.3389/fspor.2023.1054542', note: 'Umbrella-Review: kein nachweisbarer Einfluss der Phase auf Kraft oder Anpassung (Abstract)' },
    { label: 'McNulty et al. 2020, Sports Medicine', url: 'https://doi.org/10.1007/s40279-020-01319-3', note: 'Meta-Analyse, 78 Studien: höchstens trivial geringere Leistung in der frühen Follikelphase (Abstract)' },
    { label: 'Armour et al. 2019, Cochrane Database Syst Rev', url: 'https://doi.org/10.1002/14651858.CD004142.pub4', note: 'Training gegen Regelschmerzen: großer Effekt, niedrige Evidenzqualität; kein Krafttraining untersucht (Abstract)' },
    { label: 'Bull et al. 2019, npj Digital Medicine', url: 'https://doi.org/10.1038/s41746-019-0152-7', note: '612.613 Zyklen: Lutealphase 7–17 Tage (95 %-Bereich); Autorinnen/Autoren teils von einem App-Anbieter (Abstract)' },
    { label: 'Nolan et al. 2024, Sports Medicine', url: 'https://doi.org/10.1007/s40279-023-01911-3', note: 'Meta-Analyse: Pille ohne Einfluss auf Muskelaufbau und Kraft; andere Methoden nicht untersucht (Abstract)' },
    { label: 'IOC REDs Clinical Assessment Tool 2 (2023)', url: 'https://stillmed.olympics.com/media/Documents/Athletes/Medical-Scientific/Consensus-Statements/REDs/IOC-REDs-CAT-V2.pdf', note: 'Ausbleiben von 3–11 Zyklen, Zyklen > 35 Tage als Warnzeichen; nicht zur alleinigen Diagnose (automatische Seitenzusammenfassung)' }
  ]
};

function openCycleInfo() {
  openSheet(infoBody({
    short: CYCLE_INFO.short, details: [h('ul', {}, CYCLE_INFO.points.map((t) => h('li', {}, t))),
      h('p', { class: 'muted small' }, 'Den ersten Periodentag trägst du im Training-Tab über die Zeile „Zyklus“ ein. Ausschalten behält deine Einträge; löschen kannst du sie dort einzeln.')],
    sources: CYCLE_INFO.sources, checked: CYCLE_INFO.checkedAt
  }), { title: 'Zyklus: so funktioniert es' });
}

function statusText(st) {
  if (st.mode === 'combined') return st.inPeriod ? `Blutung · Tag ${st.day}` : 'Beschwerden eintragen';
  if (st.mode === 'nodata') return 'Ersten Periodentag eintragen';
  if (st.inPeriod) return `Tag ${st.day} · Periode`;
  return `Tag ${st.day}`;
}

// Kleine Zeile auf dem Trainings-Start (nur wenn aktiviert); Hinweis-Karte nur bei Auslöser.
export function cycleStartCards(rerender) {
  const c = load();
  const st = C.cycleStatus(c);
  if (st.mode === 'off') return [];
  const flags = C.redFlags(c);
  return [
    h('button', { type: 'button', class: 'card cyc-line', onclick: () => openCycleSheet(rerender) },
      h('span', {}, h('i', { class: `cyc-dot${st.inPeriod ? ' on' : ''}` }), `Zyklus: ${statusText(st)}`),
      h('span', { class: 'cyc-right' }, st.checkDue ? h('small', { class: 'muted' }, 'Angaben prüfen') : null, icon('chevron', { size: 18 }))),
    flags.length ? h('div', { class: 'card cyc-flag', role: 'note' }, h('b', {}, 'Hinweis'), flags.map((f) => h('p', { class: 'small' }, C.RED_FLAG_TEXT[f]))) : null
  ].filter(Boolean);
}

export function openCycleSheet(rerender) {
  let sheet = null;
  const body = h('div', { class: 'cyc-sheet' });
  const update = (next) => { if (save(next)) { draw(); rerender(); } };
  const draw = () => {
    const c = load();
    const st = C.cycleStatus(c);
    const today = C.dayKey();
    const tags = C.symptomsOn(c, today);
    const flags = C.redFlags(c);
    let nextLine = null;
    if (st.mode === 'calendar') nextLine = `Nächste Periode etwa ${fmt(st.next.from)} – ${fmt(st.next.to)} (Schätzung${st.basedOn ? ` aus ${st.basedOn + 1} eingetragenen Perioden` : ' aus deiner Angabe'})`;
    else if (st.mode === 'other') nextLine = 'Mit dieser Verhütungsmethode ist die nächste Blutung nicht vorhersagbar.';
    else if (st.mode === 'combined') nextLine = 'Mit Pille, Ring oder Pflaster gibt es keine natürlichen Zyklusphasen – deshalb keine Schätzung.';
    const recent = [...c.periods].reverse().slice(0, 4);
    body.replaceChildren(
      h('div', { class: 'cyc-big' }, statusText(st)),
      nextLine ? h('p', { class: 'muted small' }, nextLine) : null,
      h('h3', {}, 'Wie fühlst du dich heute?'),
      h('div', { class: 'chips wrap' }, Object.entries(C.SYMPTOMS).map(([k, label]) => h('button', { type: 'button', class: `chip${tags.includes(k) ? ' on' : ''}`, 'aria-pressed': String(tags.includes(k)), onclick: () => update(C.toggleSymptom(c, k, today)) }, label))),
      h('p', { class: 'muted small' }, 'Trainiere so, wie du dich fühlst – die Phase allein ändert nichts am Aufbau.'),
      flags.length ? h('div', { class: 'card cyc-flag', role: 'note' }, h('b', {}, 'Hinweis'), flags.map((f) => h('p', { class: 'small' }, C.RED_FLAG_TEXT[f]))) : null,
      h('button', { class: 'btn block', type: 'button', onclick: () => {
        const r = TEMPLATES.find((t) => t.id === LIGHT_ROUTINE);
        if (!r) return;
        sheet?.close(); startRun(r, { returnTo: '#/' });
      } }, 'Leichter Tag: Entspannen 10 min'),
      st.inPeriod && st.mode !== 'nodata'
        ? h('button', { class: 'btn block', type: 'button', onclick: () => update(C.endPeriod(c, today)) }, 'Periode beendet (heute)')
        : h('button', { class: 'btn primary block', type: 'button', onclick: () => update(C.startPeriod(c, today)) }, st.mode === 'combined' ? 'Blutung hat begonnen (heute)' : 'Periode hat begonnen (heute)'),
      h('label', { class: 'field cyc-date' }, h('span', {}, 'Anderer Tag:'),
        h('input', { class: 'input', type: 'date', max: today, onchange: (e) => { if (e.target.value) update(C.startPeriod(c, e.target.value)); } })),
      recent.length ? h('div', {}, h('h3', {}, 'Eingetragen'),
        h('div', { class: 'card list' }, recent.map((p) => h('div', { class: 'row' },
          h('span', { class: 't' }, `${fmt(p.start)}${p.end ? ` – ${fmt(p.end)}` : ''}`),
          h('button', { class: 'link small', type: 'button', 'aria-label': `Eintrag ${fmt(p.start)} löschen`, onclick: () => update(C.removePeriod(c, p.start)) }, 'Löschen'))))) : null,
      st.checkDue ? h('div', { class: 'card' }, h('p', { class: 'small' }, `Angaben noch aktuell? ${c.avgLength} Tage Zyklus, ${c.bleedDays} Tage Blutung, ${C.CONTRACEPTION[c.contraception]}.`),
        h('button', { class: 'btn block', type: 'button', onclick: () => update({ ...c, checkedAt: today }) }, 'Passt')) : null,
      h('button', { class: 'link small center-btn', type: 'button', onclick: openCycleInfo }, 'So funktioniert es · Quellen'));
  };
  draw();
  sheet = openSheet(body, { title: 'Zyklus' });
}

// Einstellungen → Zyklus (optional, standardmäßig aus).
export function cycleSettingsCard(rerender) {
  const c = load();
  const set = (patch) => { if (save({ ...c, ...patch })) rerender(); };
  const num = (label, key, [lo, hi]) => h('div', { class: 'field' }, h('label', { for: `cyc-${key}` }, label),
    h('input', { id: `cyc-${key}`, class: 'input', type: 'number', inputmode: 'numeric', min: lo, max: hi, value: c[key], onchange: (e) => {
      const v = Number(e.target.value);
      if (!Number.isInteger(v) || v < lo || v > hi) { toast(`Bitte ${lo}–${hi} eingeben.`, { error: true }); e.target.value = c[key]; return; }
      set({ [key]: v });
    } }));
  return h('div', { class: 'card' },
    h('div', { class: 'title-row' }, h('h2', {}, 'Zyklus (optional)'),
      h('button', { class: 'info-btn', type: 'button', 'aria-label': 'Zyklus: so funktioniert es', onclick: openCycleInfo }, icon('info', { size: 18 }))),
    h('label', { class: 'set-line' }, h('span', { class: 'set-label' }, 'Zyklus berücksichtigen'),
      switchInput('Zyklus berücksichtigen', !!c.enabled, (v) => set({ enabled: v, checkedAt: v ? C.dayKey() : c.checkedAt }))),
    c.enabled ? h('div', { class: 'cyc-fields' },
      num('Zykluslänge (Tage, ca.)', 'avgLength', C.LIMITS.avgLength),
      num('Blutung (Tage, ca.)', 'bleedDays', C.LIMITS.bleedDays),
      h('div', { class: 'field' }, h('label', { for: 'cyc-contra' }, 'Verhütung'),
        h('select', { id: 'cyc-contra', class: 'input', onchange: (e) => set({ contraception: e.target.value }) },
          Object.entries(C.CONTRACEPTION).map(([k, label]) => h('option', { value: k, selected: c.contraception === k }, label)))),
      h('p', { class: 'muted small' }, 'Periodentage trägst du im Training-Tab ein.')) : null);
}
