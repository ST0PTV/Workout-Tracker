// Übungsanimationen (v2.0): Keyframes, Phasen, Kernpunkte und Quellen je Übung – Daten, kein DOM.
// Jeder Zahlenwert trägt seine Herkunft: V(wert, quellen, lesart). Lesarten (READ): wie der Wert gelesen wurde.
// Winkelkonvention siehe js/motion.js. Alle Werte sind Gruppenmittel kleiner Studien, keine Vorgabe für die eigene Technik.
// Recherche: Drive „Research - Animations“ (2026-10-14), Rohdaten im claude.ai-Projekt (claude/v2-animation-research/).
import { LEN, ARM_REACH } from './motion.js';

export const ANIM_CHECKED_AT = '2026-10-14';

// Lesart eines Werts
export const READ = {
  fulltext: 'Volltext',
  abstract: 'Abstract',
  summary: 'automatische Seitenzusammenfassung – noch nicht am PDF geprüft',
  computed: 'berechnet aus Studienwerten',
  ik: 'aus der Geometrie gelöst, nicht gemessen',
  protocol: 'Vorgabe im Studienprotokoll, nicht gemessen',
  convention: 'Zeichenkonvention, nicht gemessen'
};
// Datenbasis einer Animation
export const BASIS = {
  measured: { label: 'Gemessen', text: 'Die Gelenkwinkel der Endpositionen stammen aus Bewegungsmessungen in Studien (3D-Motion-Capture, Sensoren oder Goniometer). Fehlende Winkel sind aus der Geometrie berechnet und so gekennzeichnet.' },
  protocol: { label: 'Nach Studienprotokoll', text: 'Keine Studie hat die Bewegung gemessen. Die Winkel sind Vorgaben aus Studienprotokollen.' },
  transfer: { label: 'Übertragen', text: 'Die Winkel stammen aus einer anderen Variante oder einem anderen Gerät und sind übertragen.' }
};
export const STATUS = { consensus: 'Konsens', contested: 'umstritten', single: 'Einzelstudie' };
export const TEMPO_BASIS = { measured: 'gemessen', protocol: 'Studienprotokoll', computed: 'aus Studienwerten berechnet', convention: 'Konvention' };

const V = (v, src, read, raw) => ({ v, src: [].concat(src || []), read, raw: raw || null });
const C = (v, raw) => V(v, [], 'convention', raw); // Konvention
const K = (v, src, raw) => V(v, src, 'computed', raw);
const PLATE = 46; // Hantelscheibe Ø 45 cm → Radius 0.225 m ≈ 46 Einheiten (1 m ≈ 204.6 Einheiten)
// Stangenpositionen beim Kreuzheben (Weltkoordinaten, Knöchel bei x = 0, Ballen bei x = 30): Start über dem Mittelfuß am Schienbein,
// auf Kniehöhe vor der Kniescheibe, oben am Oberschenkel. Konvention; Stangenweg ≈ 8 Einheiten (≈ 4 cm) nach hinten, vgl. Hancock et al. 2012.
const STEP = 28; // Stufe beim Wadenheben (≈ 14 cm): Oberkante bei y = −28, nur unter dem Vorfuß (x 16–38), Ballen bei x = 30
const PU = { grip: 62, bar: -330 }; // Klimmzugstange: Hände bei ±62 (1,5-fache Biakromialbreite ≈ 82 Einheiten), Stange auf 1,6 m
const DL_BAR = { start: [16, -PLATE], knee: [14, -95], top: [8, -150] };

// Hantelscheibe an einem Punkt (Seitenansicht) – als Szene-Objekt
const plate = (at, r = PLATE) => ({ type: 'plate', at, r });
const dumbbell = (at) => ({ type: 'dumbbell', at });

export const ANIMATIONS = [
  // ---------- Kniebeuge ----------
  {
    ref: 'back-squat', view: 'side', basis: 'measured',
    basisNote: 'Winkel aus Glassbrook et al. 2019 (3D, je 6 Gewichtheber hochstabig und 6 Kraftdreikämpfer tiefstabig, 74–83 % 1RM; Tabelle 4 am PDF geprüft). Rumpf- und Schienbeinneigung daraus berechnet.',
    tempo: { basis: 'protocol', note: '1,5 s ab / 1,5 s auf (Metronom in Yavuz & Erdag 2017); natürliches Tempo nicht gemessen.' },
    variants: [{ key: 'high', label: 'Hochstabig' }, { key: 'low', label: 'Tiefstabig' }],
    frames: {
      high: [
        { label: 'Oben', pose: { shank: K(0, 'S1', 'Standwert'), knee: V(10, 'S1', 'fulltext', '170° eingeschlossen'), hip: V(11, 'S1', 'fulltext', '169° eingeschlossen'), ankle: V(0, 'S1', 'fulltext'), armTargetTrunk: [-8, 15], armScale: [0.55, 0.95], elbowSide: -1, props: squatProps([-8, 15]) } },
        { label: 'Unten', pose: { shank: K(33, 'S1', 'gleich der Dorsalflexion (Fuß flach)'), knee: V(126, 'S1', 'fulltext', '54 ± 7° eingeschlossen'), hip: V(111, 'S1', 'fulltext', '69 ± 7° Thorax–Oberschenkel'), ankle: V(33, 'S1', 'fulltext', 'ROM 33 ± 4°'), armTargetTrunk: [-8, 15], armScale: [0.55, 0.95], elbowSide: -1, props: squatProps([-8, 15]) } }
      ],
      low: [
        { label: 'Oben', pose: { shank: K(0, 'S1', 'Standwert'), knee: V(4, 'S1', 'fulltext', '176° eingeschlossen'), hip: V(12, 'S1', 'fulltext', '168° eingeschlossen'), ankle: V(0, 'S1', 'fulltext'), armTargetTrunk: [-14, 3], armScale: [0.45, 0.5], elbowSide: -1, props: squatProps([-14, 3]) } },
        { label: 'Unten', pose: { shank: K(33, 'S1', 'gleich der Dorsalflexion (Fuß flach)'), knee: V(118, 'S1', 'fulltext', '62 ± 11° eingeschlossen'), hip: V(121, 'S1', 'fulltext', '59 ± 9° Thorax–Oberschenkel'), ankle: V(33, 'S1', 'fulltext', 'ROM 33 ± 6°'), armTargetTrunk: [-14, 3], armScale: [0.45, 0.5], elbowSide: -1, props: squatProps([-14, 3]) } }
      ]
    },
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Oben', kp: [0, 4] }, { a: 0, b: 1, dur: 1.5, label: 'Absenken', kp: [1, 2] }, { a: 1, b: 1, dur: 0.4, label: 'Unten', kp: [3] }, { a: 1, b: 0, dur: 1.5, label: 'Aufstehen', kp: [2] }],
    keyPoints: [
      { short: 'Stange', anchor: 'bar', side: 'l', status: 'consensus', text: 'Hochstabig: Oberkörper aufrechter. Tiefstabig: mehr Vorlage. Beides ist korrekt.', src: ['S1', 'S2', 'S3'],
        explain: 'Die hochstabige Variante (Stange auf dem Trapezmuskel) läuft mit aufrechterem Rumpf und mehr Knie- und Sprunggelenkbeugung, die tiefstabige (Stange über der hinteren Schulter) mit mehr Vorlage. In Murawa et al. 2020 unterschied sich der Hüftwinkel zwischen beiden nicht signifikant. Keine Variante ist „richtiger“; sie verteilen die Last anders.' },
      { short: 'Knie', anchor: 'knee', side: 'r', status: 'contested', text: 'Knie dürfen über die Zehen wandern; das verteilt die Last zwischen Knie und Hüfte.', src: ['S5', 'S4', 'S6'],
        explain: 'Umstritten. Wird das Knie am Vorwandern gehindert, sinkt das Kniedrehmoment (117 statt 150 N·m), aber das Hüftdrehmoment steigt stark (303 statt 28 N·m) und der Rumpf neigt sich weiter vor (Fry et al. 2003, n = 7). Bei der Kraftdreikampf-Kniebeuge im breiten Stand wurde ein möglichst senkrechtes Schienbein angewiesen; der Körperschwerpunkt wanderte dadurch nach hinten (Swinton et al. 2012, n = 12 Kraftdreikämpfer). Die Regel „Knie nicht über die Zehen“ gilt in der Übersicht von Straub & Powers 2024 als Lastverteilung, nicht als Fehler.' },
      { short: 'Rücken', anchor: 'back', side: 'l', status: 'consensus', text: 'Vorlage aus der Hüfte, Rücken neutral halten statt rund werden lassen.', src: ['S6'],
        explain: 'Empfehlung aus einem klinischen Kommentar (Evidenzstufe 5) zur Belastbarkeit der Wirbelsäule. Daten, dass eine bestimmte Rückenhaltung Verletzungen verhindert, gibt es dazu nicht.' },
      { short: 'Tiefe', anchor: 'hip', side: 'l', status: 'contested', text: 'Tiefe nach Beweglichkeit: so tief, wie Becken und Rücken stabil bleiben.', src: ['S10', 'S11', 'S6'],
        explain: 'Umstritten. Für die tiefe Kniebeuge: mehr Zuwachs an Adduktoren, Gesäß und tiefer 1RM nach 10 Wochen (Kubo et al. 2019, n = 17); eine Übersicht fand keine Belege für ein höheres Risiko passiver Strukturen (Hartmann et al. 2013). Dagegen: Straub & Powers 2024 raten, die Tiefe dort zu begrenzen, wo die Hüftbeugung ausgeschöpft ist und das Becken nach hinten kippt. Einteilung: teilweise 0–90°, parallel 90–110°, tief 110–135° Kniebeugung.' },
      { short: 'Stand', anchor: 'foot', side: 'r', status: 'single', text: 'Füße etwa schulterbreit, Zehen leicht nach außen; Knie folgen der Fußrichtung.', src: ['S7', 'S6'],
        explain: 'Lorenzetti et al. 2018 (n = 42, 0 und 50 % Körpergewicht) empfehlen etwa 20° Fußöffnung bei schulterbreitem Stand und raten von Extremen ab. Eine Fußöffnung von 30° änderte die Aktivität von Quadrizeps und Beinbeuger nicht (Übersicht Straub & Powers 2024). Einzelstudie, kein Beweis für ein Optimum.' }
    ],
    sources: {
      S1: { label: 'Glassbrook et al. 2019, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000001836', read: 'fulltext', note: 'Akzeptiertes Manuskript; Tabelle 4, Block 74–83 % 1RM' },
      S2: { label: 'Glassbrook et al. 2017, J Strength Cond Res (Review)', url: 'https://doi.org/10.1519/JSC.0000000000002007', read: 'abstract' },
      S3: { label: 'Murawa et al. 2020, PeerJ', url: 'https://doi.org/10.7717/peerj.9256', read: 'fulltext' },
      S4: { label: 'Swinton et al. 2012, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3182577067', read: 'fulltext' },
      S5: { label: 'Fry et al. 2003, J Strength Cond Res', url: 'https://doi.org/10.1519/1533-4287(2003)017<0629:eokpoh>2.0.co;2', read: 'abstract' },
      S6: { label: 'Straub & Powers 2024, Int J Sports Phys Ther (klinischer Kommentar)', url: 'https://doi.org/10.26603/001c.94600', read: 'fulltext' },
      S7: { label: 'Lorenzetti et al. 2018, BMC Sports Sci Med Rehabil', url: 'https://doi.org/10.1186/s13102-018-0103-7', read: 'fulltext' },
      S10: { label: 'Kubo et al. 2019, Eur J Appl Physiol', url: 'https://doi.org/10.1007/s00421-019-04181-y', read: 'abstract' },
      S11: { label: 'Hartmann et al. 2013, Sports Med (Review)', url: 'https://doi.org/10.1007/s40279-013-0073-6', read: 'abstract' }
    }
  },

  // ---------- Kreuzheben ----------
  {
    ref: 'deadlift', view: 'side', basis: 'measured',
    basisNote: 'Knie- und Sprunggelenkwinkel aus Hanen et al. 2025 (3D, 30 trainierte Männer, 85 % 1RM, Volltext). Der Hüftwinkel der Studie ist ein Becken–Oberschenkel-Winkel; die Rumpfneigung ist deshalb aus der Geometrie gelöst: Die Stange liegt am Start über dem Mittelfuß am Schienbein und auf Kniehöhe vor der Kniescheibe, die gestreckten Arme (Armlänge nach ANSUR II) reichen von der Schulter zur Stange. Oben zeigt der Arm leicht nach vorn zur Stange am Oberschenkel.',
    tempo: { basis: 'computed', note: 'Konzentrisch ≈ 1,3 s aus 0,40 m/s mittlerer Geschwindigkeit bei 80–89 % 1RM (Kasovic et al. 2019) und ≈ 0,5 m Hubweg; Absenken nicht gemessen (Konvention).' },
    frames: [
      { label: 'Start', pose: { shank: V(11.7, 'S1', 'computed', 'gleich der Dorsalflexion (Fuß flach)'), knee: V(58.6, 'S1', 'fulltext'), ankle: V(11.7, 'S1', 'fulltext'), solve: { param: 'trunk', joint: 'shoulder', at: DL_BAR.start, dist: ARM_REACH, range: [-10, 95] }, trunk: null, armAt: DL_BAR.start, elbow: C(0), props: handPlate } },
      { label: 'Knie', pose: { shank: V(0, 'S1', 'fulltext', 'Sprunggelenk ≈ 0°'), knee: V(25.2, 'S1', 'fulltext'), ankle: V(0, 'S1', 'fulltext'), solve: { param: 'trunk', joint: 'shoulder', at: DL_BAR.knee, dist: ARM_REACH, range: [-10, 95] }, trunk: null, armAt: DL_BAR.knee, elbow: C(0), props: handPlate } },
      { label: 'Oben', pose: { shank: V(0, 'S1', 'fulltext'), knee: V(6.5, 'S1', 'fulltext'), hip: V(3.7, 'S1', 'fulltext', 'Lockout 3,7°'), ankle: V(0, 'S1', 'fulltext'), armAt: DL_BAR.top, elbow: C(0), props: handPlate } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Start', kp: [0] }, { a: 0, b: 1, dur: 0.6, label: 'Zug bis Knie', kp: [1, 3] }, { a: 1, b: 2, dur: 0.7, label: 'Hüfte streckt', kp: [2] }, { a: 2, b: 2, dur: 0.4, label: 'Oben', kp: [4] }, { a: 2, b: 1, dur: 0.7, label: 'Absenken', kp: [1] }, { a: 1, b: 0, dur: 0.6, label: 'Absenken', kp: [3] }],
    keyPoints: [
      { short: 'Start', anchor: 'bar', side: 'r', status: 'consensus', text: 'Start: Stange über dem Mittelfuß, Hüfte tiefer als die Schultern, Arme gestreckt.', src: ['S1', 'S3', 'S9'],
        explain: 'Hüfte unter Schulterhöhe und gestreckte Arme sind die Startdefinitionen der Messstudien. „Stange über dem Mittelfuß“ stützt sich auf eine kleine Studie (n = 6): Start über dem Kahnbein ergab weniger horizontale Stangenbewegung als über den Zehengrundgelenken (37,5 statt 66,7 mm bei 90 % 1RM; Hancock et al. 2012). Schwach: 1RM nur selbst angegeben, 4 von 6 Teilnehmern rundeten unter der Last den Rücken.' },
      { short: 'Nah', anchor: 'shin', side: 'r', status: 'consensus', text: 'Stange während des ganzen Zugs nah an Schienbeinen und Oberschenkeln führen.', src: ['S2', 'S3', 'S6'],
        explain: 'Der horizontale Abstand Hüfte–Stange bestimmt das Hüftdrehmoment; er sank in Shoji et al. 2025 von ≈ 30 cm am Start auf ≈ 14 cm am Ende, bei schwererer Last kürzer. Geübte Heber halten die Stange beim Knie näher am Körper (Schellenberg et al. 2013, Einleitung).' },
      { short: 'Hüfte', anchor: 'hip', side: 'l', status: 'single', text: 'Knie und Hüfte strecken; ab Kniehöhe schiebt vor allem die Hüfte nach vorn.', src: ['S1', 'S5'],
        explain: 'Bis zum Knie bewegen sich Knie (33°) und Hüfte (38°) ähnlich viel, danach vor allem die Hüfte (49° gegenüber 19° Knie; Hanen et al. 2025). Hales et al. 2009 beschreiben das Kreuzheben als sequenziell.' },
      { short: 'Rücken', anchor: 'back', side: 'l', status: 'contested', text: 'Rücken möglichst neutral halten – leichte Rundung unter hoher Last ist häufig.', src: ['S2', 'S6', 'S7'],
        explain: 'Umstritten, was „neutral“ bedeutet. Gemessen: Elite-Heber blieben 1,5–13° unter ihrer vollen Lendenbeugung (Cholewicki & McGill 1992, n = 4); trotz Anweisung „keine Lendenbeugung“ traten ≈ 26° auf (Schellenberg et al. 2013); die Beugung nimmt mit der Last zu und verkürzt den Hebelarm (Shoji et al. 2025). Keine gelesene Studie verbindet ein bestimmtes Maß an Rundung mit Verletzungen.' },
      { short: 'Oben', anchor: 'chest', side: 'r', status: 'consensus', text: 'Oben aufrecht stehen, Hüfte und Knie ganz gestreckt; dann kontrolliert absenken.', src: ['S1', 'S3'],
        explain: 'Lockout in Hanen et al. 2025: Hüfte 3,7°, Knie 6,5° Beugung – aufrecht, nicht überstreckt.' }
    ],
    sources: {
      S1: { label: 'Hanen et al. 2025, Front Bioeng Biotechnol', url: 'https://doi.org/10.3389/fbioe.2025.1597209', read: 'fulltext' },
      S2: { label: 'Schellenberg et al. 2013, BMC Sports Sci Med Rehabil', url: 'https://doi.org/10.1186/2052-1847-5-27', read: 'fulltext' },
      S3: { label: 'Otsuka et al. 2021, PLoS One', url: 'https://doi.org/10.1371/journal.pone.0251418', read: 'fulltext' },
      S5: { label: 'Hales et al. 2009, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3181bc1d2a', read: 'abstract' },
      S6: { label: 'Shoji et al. 2025, Front Sports Act Living', url: 'https://doi.org/10.3389/fspor.2025.1682991', read: 'fulltext' },
      S7: { label: 'Cholewicki & McGill 1992, J Biomech', url: 'https://doi.org/10.1016/0021-9290(92)90242-s', read: 'abstract' },
      S8: { label: 'Kasovic et al. 2019, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000003377', read: 'abstract' },
      S9: { label: 'Hancock, Wyatt & Kilgore 2012, Int J Exerc Sci', url: 'https://digitalcommons.wku.edu/ijes/vol5/iss3/1', read: 'fulltext' }
    }
  },

  // ---------- Rumänisches Kreuzheben ----------
  {
    ref: 'romanian-deadlift', view: 'side', basis: 'measured',
    basisNote: 'Hüft- und Kniewinkel aus Sørensen et al. 2021 (3D, 21 Handballspielerinnen, 8RM, Volltext); Rumpfneigung daraus berechnet, Schienbein nahezu senkrecht (Konvention).',
    tempo: { basis: 'computed', note: 'Aus mittleren Hüft-Winkelgeschwindigkeiten (Sørensen et al. 2021): exzentrisch ≈ 0,9 s; konzentrisch dort explosiv (≈ 0,4 s), hier langsamer gezeigt.' },
    frames: [
      { label: 'Oben', pose: { shank: C(3), knee: V(8.4, 'S11', 'fulltext'), hip: V(9.7, 'S11', 'fulltext'), ankle: C(3), armPlumb: true, elbow: C(0), props: handPlate } },
      { label: 'Unten', pose: { shank: C(5), knee: V(34.8, 'S11', 'fulltext'), hip: V(100.2, 'S11', 'fulltext'), ankle: C(5), armPlumb: true, elbow: C(0), props: handPlate } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Oben', kp: [4] }, { a: 0, b: 1, dur: 1.1, label: 'Absenken', kp: [0, 1, 2] }, { a: 1, b: 1, dur: 0.3, label: 'Unten', kp: [3] }, { a: 1, b: 0, dur: 0.9, label: 'Aufrichten', kp: [1, 2] }],
    keyPoints: [
      { short: 'Knie', anchor: 'knee', side: 'r', status: 'consensus', text: 'Knie leicht gebeugt halten; die Bewegung kommt aus der Hüfte.', src: ['S10', 'S11'],
        explain: 'Kniebeugung unten 15–35°: Definition ≈ 15° (Lee et al. 2018), gemessen 33° bis zum Boden (Lee et al. 2018) und 34,8 ± 9,7° bis unter das Knie (Sørensen et al. 2021).' },
      { short: 'Hüfte', anchor: 'glute', side: 'l', status: 'consensus', text: 'Hüfte nach hinten schieben, Oberkörper neigt sich nach vorn.', src: ['S11'],
        explain: 'Hüftbeugung unten 100,2 ± 7,5° (Sørensen et al. 2021). Die Rumpfneigung selbst wurde nicht gemessen; in der Animation ist sie aus Hüft- und Kniewinkel berechnet.' },
      { short: 'Stange', anchor: 'bar', side: 'r', status: 'consensus', text: 'Stange eng an den Oberschenkeln entlang nach unten führen.', src: ['S10'],
        explain: 'Der enge Kontakt der Stange zu den Beinen unterscheidet das rumänische vom gestreckten Kreuzheben (Definition in Lee et al. 2018). Ein gemessener Stangenweg liegt nicht vor.' },
      { short: 'Tiefe', anchor: 'hand', side: 'r', status: 'contested', text: 'Tiefe: bis knapp unter das Knie oder so weit, wie der Rücken stabil bleibt.', src: ['S10', 'S11'],
        explain: 'Umstritten. Sørensen et al. 2021 und die von Lee et al. 2018 zitierten Studien senkten bis knapp unter das Knie; Lee et al. 2018 bis zum Boden, wobei einige Teilnehmer den Boden nicht erreichten (Autoren vermuten verkürzte Beinbeuger). Rumpf- und Lendenwinkel wurden für diese Übung nicht gemessen.' },
      { short: 'Oben', anchor: 'chest', side: 'r', status: 'single', text: 'Oben die Hüfte vollständig strecken; der Oberkörper bleibt senkrecht.', src: ['S11'],
        explain: 'Oben 9,7 ± 5,9° Hüftbeugung (Sørensen et al. 2021). Dass man sich nicht nach hinten lehnen soll, ist Trainingswissen, nicht untersucht.' }
    ],
    sources: {
      S10: { label: 'Lee et al. 2018, J Exerc Sci Fit', url: 'https://doi.org/10.1016/j.jesf.2018.08.001', read: 'fulltext' },
      S11: { label: 'Sørensen et al. 2021, Int J Sports Phys Ther', url: 'https://doi.org/10.26603/001c.24150', read: 'fulltext', note: '23 Teilnehmerinnen rekrutiert, 21 ausgewertet (2 wegen Markerverlust ausgeschlossen)' }
    }
  },

  // ---------- Hip Thrust ----------
  {
    ref: 'hip-thrust', view: 'side', basis: 'measured',
    basisNote: 'Hüft- und Kniewinkel unten aus Brazil et al. 2021 (3D, 19 trainierte Männer, 70 % 1RM, Volltext); Kniewinkel oben aus Sørensen et al. 2021; Hüftwinkel oben nicht berichtet (rechnerische Untergrenze). Schienbeinneigung so gelöst, dass der obere Rücken auf der Bank liegt.',
    tempo: { basis: 'measured', note: 'Hochdrücken 0,83 ± 0,15 s bei 70 % 1RM mit maximaler Absicht (Brazil et al. 2021); Absenken 1,48 ± 0,42 s bei 70 % 1RM (Bezodis et al. 2017, n = 7).' },
    frames: [
      { label: 'Unten', pose: { knee: V(108, 'S13', 'fulltext', '−108 ± 8° bei 51 % des Hubs'), hip: V(83, 'S13', 'fulltext', '−83 ± 16° am Spitzenmoment'), foot: C(90, 'Fuß flach'), solve: { param: 'shank', joint: 'shoulder', y: -88, range: [-30, 70] }, armTargetTrunk: [22, -98], armScale: [0.6, 0.9], elbowSide: 1, props: hipThrustProps } },
      { label: 'Oben', pose: { knee: V(76.1, 'S11', 'fulltext', 'HT 90°, gestrecktes Ende'), hip: K(10, ['S13', 'S3'], 'Untergrenze ≈ 8° aus Start minus ROM; Definition „Rumpf parallel zum Boden“'), foot: C(90, 'Fuß flach'), solve: { param: 'shank', joint: 'shoulder', y: -88, range: [-30, 70] }, armTargetTrunk: [22, -98], armScale: [0.6, 0.9], elbowSide: 1, props: hipThrustProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Unten', kp: [0, 1] }, { a: 0, b: 1, dur: 0.83, label: 'Hochdrücken', kp: [2, 3] }, { a: 1, b: 1, dur: 0.5, label: 'Oben', kp: [2] }, { a: 1, b: 0, dur: 1.5, label: 'Absenken', kp: [4] }],
    keyPoints: [
      { short: 'Aufbau', anchor: 'upperBack', side: 'l', status: 'consensus', text: 'Oberer Rücken auf der Bank, Stange über der Hüfte, Füße schulterbreit flach am Boden.', src: ['S3', 'S11', 'S13'],
        explain: 'Aufbau der Messstudien: Schulterblätter auf einer 0,36 m hohen Bank (Otsuka et al. 2021), Stange auf dem Becken bzw. oberen Oberschenkel, Füße flach und schulterbreit.' },
      { short: 'Füße', anchor: 'foot', side: 'r', status: 'contested', text: 'Füße so stellen, dass die Schienbeine oben etwa senkrecht stehen.', src: ['S3', 'S11'],
        explain: 'Umstritten. Otsuka et al. 2021 ließen die Schienbeine senkrecht halten. In Sørensen et al. 2021 erhöhten weiter entfernte Füße (≈ 57° Kniebeugung oben) die Beinbeuger-Aktivität gegenüber ≈ 76°. Die Fußposition verschiebt den Schwerpunkt der Belastung; ein Optimum ist nicht belegt.' },
      { short: 'Oben', anchor: 'hip', side: 'r', status: 'single', text: 'Hüfte strecken, bis Oberkörper und Oberschenkel etwa waagerecht in einer Linie sind.', src: ['S3'],
        explain: 'Endkriterium „Rumpf parallel zum Boden“ (Otsuka et al. 2021). Mit einer 0,36 m hohen Bank erreichten dort einige Teilnehmer die neutrale Hüfte nicht; der Hüftwinkel oben wurde in keiner gelesenen Studie berichtet.' },
      { short: 'Rücken', anchor: 'lowBack', side: 'l', status: 'single', text: 'Bewegung aus der Hüfte; der untere Rücken bewegt sich nur wenig mit.', src: ['S13'],
        explain: 'Becken–Rumpf-Bewegung 12 ± 21° gegenüber 75 ± 19° in der Hüfte (Brazil et al. 2021); einzelne Teilnehmer streckten, andere beugten den Lenden-Becken-Bereich.' },
      { short: 'Ab', anchor: 'bar', side: 'r', status: 'consensus', text: 'Kontrolliert absenken, bis die Scheiben (fast) den Boden berühren.', src: ['S3', 'S13'],
        explain: 'In beiden Messstudien begann jede Wiederholung aus der Ruhe mit den Scheiben am oder nahe am Boden.' }
    ],
    sources: {
      S13: { label: 'Brazil et al. 2021, PLoS One', url: 'https://doi.org/10.1371/journal.pone.0249307', read: 'fulltext' },
      S3: { label: 'Otsuka et al. 2021, PLoS One', url: 'https://doi.org/10.1371/journal.pone.0251418', read: 'fulltext' },
      S11: { label: 'Sørensen et al. 2021, Int J Sports Phys Ther', url: 'https://doi.org/10.26603/001c.24150', read: 'fulltext' },
      S14: { label: 'Bezodis et al. 2017, ISBS Proceedings (Konferenzbeitrag)', url: 'https://commons.nmu.edu/isbs/vol35/iss1/184', read: 'fulltext' }
    }
  },

  // ---------- Bulgarian Split Squat ----------
  {
    ref: 'bulgarian-split-squat', view: 'side', basis: 'measured',
    basisNote: 'Rumpf-, Schienbein- und Hüftwinkel unten aus Arakawa et al. 2025 (3D, 9 trainierte Männer, Körpergewicht, breiter Stand 130 % Beinlänge, natürliche Rumpfneigung; Tabelle 1 am PDF geprüft); Kniewinkel daraus berechnet (106°; Mackey & Riemann 2021 nennen ≈ 96°). Hinteres Bein aus der Bankhöhe gelöst.',
    tempo: { basis: 'computed', note: '2,39 ± 0,32 s je Wiederholung ohne Metronom (Mackey & Riemann 2021), hier gleichmäßig auf Ab und Auf verteilt.' },
    frames: [
      { label: 'Oben', pose: { shank: C(8), knee: C(20), hip: C(20), ankle: C(8), leg2: { ankle: [-122, -104], foot: C(200) }, armPlumb: true, elbow: C(0), props: bssProps } },
      { label: 'Unten', pose: { shank: V(28.6, 'S2', 'fulltext', 'Schienbein 28,6 ± 6,7°'), knee: K(106, 'S2', 'aus Rumpf 13,4°, Schienbein 28,6° und Hüfte 90,8°'), hip: V(90.8, 'S2', 'fulltext', '89,2 ± 8,8° (180° = Stand)'), ankle: V(28.6, 'S2', 'computed', 'gleich der Schienbeinneigung'), leg2: { ankle: [-122, -104], foot: C(200) }, armPlumb: true, elbow: C(0), props: bssProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Oben', kp: [0, 1] }, { a: 0, b: 1, dur: 1.2, label: 'Absenken', kp: [2, 3] }, { a: 1, b: 1, dur: 0.3, label: 'Unten', kp: [2, 4] }, { a: 1, b: 0, dur: 1.2, label: 'Aufstehen', kp: [4] }],
    keyPoints: [
      { short: 'Hinten', anchor: 'ankle2', side: 'l', status: 'consensus', text: 'Hinteren Fuß mit dem Spann auf eine Bank legen, etwa auf Kniehöhe.', src: ['S1', 'S2', 'S3', 'S8'],
        explain: 'Bankhöhe in den Studien 0,40–0,41 m bzw. Kniescheiben- oder Schienbeinhöhe.' },
      { short: 'Vorne', anchor: 'foot', side: 'r', status: 'contested', text: 'Vorderen Fuß so weit vorn aufsetzen, dass das Knie unten etwa über dem Fuß steht.', src: ['S1', 'S2', 'S6'],
        explain: 'Umstritten. Abstand 100–130 % der Beinlänge (Arakawa et al. 2025) oder „Knie über den Zehen in der Parallelposition“ (Mackey & Riemann 2021). Ein längerer Schritt verlagert die Last vom Knie zur Hüfte (Song et al. 2023, normaler Split Squat).' },
      { short: 'Tiefe', anchor: 'thigh', side: 'r', status: 'consensus', text: 'Senkrecht absenken, bis der vordere Oberschenkel etwa waagerecht ist.', src: ['S1', 'S2', 'S3'],
        explain: 'Ziel ≈ 90° Knie (Mackey & Riemann 2021), Oberschenkel parallel (Arakawa et al. 2025) oder bis das hintere Knie den Boden berührt (Aygun-Polat et al. 2025).' },
      { short: 'Rumpf', anchor: 'chest', side: 'r', status: 'contested', text: 'Oberkörper leicht nach vorn neigen; mehr Neigung betont Gesäß und Beinbeuger.', src: ['S2', 'S3'],
        explain: 'Umstritten. Natürlich ≈ 13° Vorneigung (berechnet aus Arakawa et al. 2025); 40° Vorneigung erhöhte die EMG-Aktivität von Gesäß und Beinbeuger (Aygun-Polat et al. 2025); ein aufrechterer Rumpf erhöht das Moment am hinteren Bein (Arakawa et al. 2025).' },
      { short: 'Last', anchor: 'knee', side: 'r', status: 'single', text: 'Last liegt vor allem auf dem vorderen Bein, das hintere Bein stützt nur.', src: ['S4'],
        explain: 'Der vordere Fuß trug 84 % der Vertikalkraft (Helme et al. 2022, n = 26, 5RM).' }
    ],
    sources: {
      S1: { label: 'Mackey & Riemann 2021, Int J Exerc Sci', url: 'https://doi.org/10.70252/CIYT8956', read: 'fulltext' },
      S2: { label: 'Arakawa et al. 2025, Int J Exerc Sci', url: 'https://doi.org/10.70252/NEXQ5666', read: 'fulltext', note: 'Tabelle 1, breiter Stand, natürliche Rumpfneigung' },
      S3: { label: 'Aygun-Polat et al. 2025, BMC Sports Sci Med Rehabil', url: 'https://doi.org/10.1186/s13102-025-01306-z', read: 'fulltext' },
      S4: { label: 'Helme et al. 2022, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000003727', read: 'abstract' },
      S6: { label: 'Song et al. 2023, Front Bioeng Biotechnol', url: 'https://doi.org/10.3389/fbioe.2023.1277493', read: 'fulltext' },
      S8: { label: 'Miller et al. 2019, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000003338', read: 'abstract' }
    }
  },

  // ---------- Ausfallschritt vorwärts ----------
  {
    ref: 'dumbbell-forward-lunge', view: 'side', basis: 'measured',
    basisNote: 'Spitzenwinkel des vorderen Beins aus Riemann et al. 2012 (elektromagnetische Bewegungsmessung, 16 Personen, barfuß; Tabelle 1 am PDF geprüft). Rumpf daraus berechnet (≈ 0°, passt zur Anweisung „aufrecht“). Schrittlänge 70 % Beinlänge (Protokoll); hinteres Bein und Schrittphase sind Konvention.',
    tempo: { basis: 'protocol', note: 'Absenken in ≈ 2 s (Metronom, Riemann et al. 2012); Schritt und Rückkehr nicht gemessen.' },
    frames: [
      { label: 'Stand', pose: { rootPos: [0, -15], shank: C(0), knee: C(0), hip: C(0), ankle: C(0), leg2: { hip: C(0), knee: C(0), ankle: C(0) }, armPlumb: true, elbow: C(0), props: lungeProps } },
      { label: 'Schritt', pose: { rootPos: [70, -30], shank: C(0), knee: C(35), hip: C(40), ankle: C(10), leg2: { ankle: [0, -15], foot: C(90) }, armPlumb: true, elbow: C(0), props: lungeProps } },
      { label: 'Aufsetzen', pose: { rootPos: [118, -15], shank: C(5), knee: C(38), hip: C(40), ankle: C(5), leg2: { ankle: [21, -33], foot: C(140) }, armPlumb: true, elbow: C(0), props: lungeProps } },
      { label: 'Unten', pose: { rootPos: [118, -15], shank: V(11.4, 'L1', 'computed', 'gleich der Dorsalflexion'), knee: V(96.4, 'L1', 'fulltext', '−96,4 ± 10,7°'), hip: V(84.3, 'L1', 'fulltext', '−84,3 ± 14,9°'), ankle: V(11.4, 'L1', 'fulltext', '−11,4 ± 8,1°'), leg2: { ankle: [21, -33], foot: C(140) }, armPlumb: true, elbow: C(0), props: lungeProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Stand', kp: [4] }, { a: 0, b: 1, dur: 0.4, label: 'Schritt', kp: [0] }, { a: 1, b: 2, dur: 0.3, label: 'Aufsetzen', kp: [0] }, { a: 2, b: 3, dur: 1.0, label: 'Absenken', kp: [1, 2] }, { a: 3, b: 3, dur: 0.3, label: 'Unten', kp: [2] }, { a: 3, b: 2, dur: 0.8, label: 'Abdrücken', kp: [3] }, { a: 2, b: 1, dur: 0.3, label: 'Zurück', kp: [3] }, { a: 1, b: 0, dur: 0.4, label: 'Stand', kp: [] }],
    keyPoints: [
      { short: 'Schritt', anchor: 'foot', side: 'r', status: 'contested', text: 'Mit einem großen Schritt nach vorn treten, etwa 70–100 % der Beinlänge.', src: ['L1', 'L3', 'L4'],
        explain: 'Umstritten. 70 % Beinlänge (Riemann et al. 2012) bis 100 % (Stastny et al. 2015). Ein kurzer Schritt erhöht die Last im Kniescheibengelenk bei 70–90° Kniebeugung (Escamilla et al. 2008).' },
      { short: 'Rumpf', anchor: 'chest', side: 'r', status: 'single', text: 'Oberkörper aufrecht halten; leichte Vorneigung verlagert Arbeit zur Hüfte.', src: ['L1', 'L5'],
        explain: 'Aufrecht in Riemann et al. 2012 und Stastny et al. 2015; ein vorgeneigter Rumpf erhöhte Hüftbeugung und Hüftstrecker-Impuls (Farrokhi et al. 2008, n = 10).' },
      { short: 'Tiefe', anchor: 'knee', side: 'r', status: 'consensus', text: 'Absenken, bis das vordere Knie etwa 90° gebeugt ist.', src: ['L1'],
        explain: 'Gemessene Spitzenbeugung 92–96° (Riemann et al. 2012), Zusatzlast änderte die Winkel nicht signifikant.' },
      { short: 'Abdruck', anchor: 'thigh', side: 'r', status: 'single', text: 'Über das vordere Bein kräftig abdrücken und zurück in den Stand gehen.', src: ['L1'],
        explain: 'Kinematisch dominiert das Knie, kinetisch die Hüftstrecker; Zusatzlast erhöhte die Arbeit von Hüfte und Sprunggelenk, nicht des Knies (Riemann et al. 2012).' },
      { short: 'Hanteln', anchor: 'hand', side: 'l', status: 'single', text: 'Hanteln locker seitlich am Körper hängen lassen.', src: ['L1'],
        explain: 'Lasten in beiden Händen mit den Armen an der Seite; jede Hand trug die Hälfte der Zusatzlast von 12,5–50 % des Körpergewichts (Riemann et al. 2012).' }
    ],
    sources: {
      L1: { label: 'Riemann et al. 2012, J Athl Train', url: 'https://doi.org/10.4085/1062-6050-47.4.16', read: 'fulltext' },
      L3: { label: 'Stastny et al. 2015, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000000976', read: 'fulltext' },
      L4: { label: 'Escamilla et al. 2008, J Orthop Sports Phys Ther', url: 'https://doi.org/10.2519/jospt.2008.2694', read: 'abstract' },
      L5: { label: 'Farrokhi et al. 2008, J Orthop Sports Phys Ther', url: 'https://doi.org/10.2519/jospt.2008.2634', read: 'abstract' }
    }
  },

  // ---------- Wadenheben stehend ----------
  {
    ref: 'standing-calf-raise', view: 'side', basis: 'measured',
    basisNote: 'Sprunggelenkwinkel aus Larsen et al. 2025 (23 Trainierte, Volltext): individuell per Goniometer eingestellter Bewegungsumfang, keine Bewegungsmessung unter Last. Körper über dem Fußballen senkrecht; Stufe ≈ 14 cm hoch, nur unter dem Vorfuß, die Ferse hängt frei (Konvention).',
    tempo: { basis: 'protocol', note: '1 s hoch, 2 s runter, kurz halten unten (Trainingsprotokolle Goli et al. 2026, Larsen et al. 2025).' },
    frames: [
      { label: 'Unten', pose: { root: 'toe', rootPos: [30, -STEP - 2], shank: C(0), knee: V(0, 'S1', 'protocol', 'Knie gestreckt'), hip: C(0), ankle: V(31, 'S1', 'fulltext', '−31 ± 6,8° (Dorsalflexion)'), shoulder: C(25), elbow: C(95), armScale: [1, 0.9], props: calfProps } },
      { label: 'Oben', pose: { root: 'toe', rootPos: [30, -STEP - 2], shank: C(0), knee: V(0, 'S1', 'protocol', 'Knie gestreckt'), hip: C(0), ankle: V(-33.6, 'S1', 'fulltext', '+33,6 ± 7,8° Plantarflexion'), shoulder: C(25), elbow: C(95), armScale: [1, 0.9], props: calfProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Unten, kurz halten', kp: [0, 4] }, { a: 0, b: 1, dur: 1.0, label: 'Hochdrücken', kp: [1, 2] }, { a: 1, b: 1, dur: 0.3, label: 'Oben', kp: [1] }, { a: 1, b: 0, dur: 2.0, label: 'Absenken', kp: [0, 3] }],
    keyPoints: [
      { short: 'Ferse', anchor: 'heel', side: 'l', status: 'contested', text: 'Unten die Ferse kontrolliert unter Stufenhöhe senken, bis die Wade gedehnt ist.', src: ['S1', 'S2', 'S5'],
        explain: 'Umstritten, wie viel die gedehnte Position bringt: Training im gedehnten Bereich ließ den inneren Wadenkopf stärker wachsen (Kassiano et al. 2023, Beinpresse); bei gleicher Gesamtlast kein Unterschied (Goli et al. 2026); schwache Hinweise zugunsten der Dehnung bei Larsen et al. 2025.' },
      { short: 'Ballen', anchor: 'toe', side: 'r', status: 'contested', text: 'Oben so hoch wie möglich auf den Fußballen drücken.', src: ['S1', 'S5'],
        explain: 'Umstritten, ob der obere Teil der Bewegung zusätzlich etwas bringt. Spitzen-Plantarflexion 33,6 ± 7,8° (Larsen et al. 2025). Training nur im oberen Bereich brachte das geringste Wachstum (Kassiano et al. 2023); ob der obere Teil zusätzlich etwas bringt, ist offen.' },
      { short: 'Knie', anchor: 'knee', side: 'r', status: 'single', text: 'Knie gestreckt halten – so arbeitet der Wadenmuskel (Gastrocnemius) etwas stärker.', src: ['S3'],
        explain: 'Bei 45° Kniebeugung war die Aktivität des Gastrocnemius 5 % niedriger und die des Soleus 4 % höher als bei gestrecktem Knie (Hébert-Losier et al. 2012); die Autoren halten den Unterschied für klein.' },
      { short: 'Füße', anchor: 'foot', side: 'r', status: 'single', text: 'Fußspitzen gerade; nach außen oder innen verschiebt die Last leicht.', src: ['S4'],
        explain: 'Zehen nach außen begünstigten den inneren, nach innen den äußeren Wadenkopf (Nunes et al. 2020, an der Beinpresse gemessen).' },
      { short: 'Ruhig', anchor: 'shin', side: 'r', status: 'single', text: 'Ruhig bewegen: unten kurz halten, nicht federn.', src: ['S1', 'S2'],
        explain: 'Pause in der gedehnten Position (Larsen et al. 2025) und kein Federn (Goli et al. 2026) waren Protokollanweisungen, keine Messergebnisse.' }
    ],
    sources: {
      S1: { label: 'Larsen et al. 2025, Eur J Sport Sci', url: 'https://doi.org/10.1002/ejsc.70030', read: 'fulltext' },
      S2: { label: 'Goli et al. 2026, Int J Exerc Sci', url: 'https://doi.org/10.70252/IJES2026403', read: 'fulltext' },
      S3: { label: 'Hébert-Losier et al. 2012, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e31824435cf', read: 'abstract' },
      S4: { label: 'Nunes et al. 2020, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000003674', read: 'abstract' },
      S5: { label: 'Kassiano et al. 2023, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000004460', read: 'abstract' }
    }
  },

  // ---------- Dips ----------
  {
    ref: 'dips', view: 'side', basis: 'measured', noFloor: true,
    basisNote: 'Ellbogen-, Schulter- und Rumpfwinkel aus McKenzie et al. 2022 (3D, 15 geübte Männer, V-Barren, selbst gewählte Technik; Tabelle 1 am PDF geprüft). Beinhaltung Konvention.',
    tempo: { basis: 'measured', note: '1,35 ± 0,32 s je Wiederholung, Tiefpunkt bei 53 % (McKenzie et al. 2022, nicht ermüdet).' },
    frames: [
      { label: 'Oben', pose: { root: 'wrist', rootPos: [0, -200], trunk: V(18.5, 'S1', 'fulltext', '18,49 ± 12,54° Vorneigung'), shoulder: V(-3, 'S1', 'fulltext', '2,99 ± 8,21° Extension'), elbow: V(18.2, 'S1', 'fulltext'), armScale: [0.9, 0.95], hip: C(25), knee: C(90), ankle: C(-20), props: dipProps } },
      { label: 'Unten', pose: { root: 'wrist', rootPos: [0, -200], trunk: V(30.3, 'S1', 'fulltext', '30,34 ± 21,06° am Tiefpunkt (Spitze 37°)'), shoulder: V(-67.7, 'S1', 'fulltext', '67,66 ± 11,34° Extension'), elbow: V(115.9, 'S1', 'fulltext'), armScale: [0.9, 0.95], hip: C(25), knee: C(90), ankle: C(-20), props: dipProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Oben', kp: [2] }, { a: 0, b: 1, dur: 0.72, label: 'Absenken', kp: [0, 1] }, { a: 1, b: 1, dur: 0.15, label: 'Unten', kp: [0, 4] }, { a: 1, b: 0, dur: 0.63, label: 'Hochdrücken', kp: [3, 4] }],
    keyPoints: [
      { short: 'Tiefe', anchor: 'elbow', side: 'l', status: 'contested', text: 'Absenken, bis die Ellbogen etwa 90–115° gebeugt sind – Tiefe nicht erzwingen.', src: ['S1', 'S2', 'S4'],
        explain: 'Umstritten. Selbst gewählte Tiefe: ≈ 115° Ellbogenbeugung und 68–78° Schulterextension, also 76 % (Ermüdungsstudie) bzw. 88 % (Vergleich Bank-, Barren-, Ringdips) des zuvor gemessenen maximalen Bereichs (McKenzie et al. 2022). Getestet wurden 75–95° (Çinarli et al. 2021). Bedenken gegen endgradige Schulterextension stützen sich auf Fallberichte, nicht auf Verlaufsdaten.' },
      { short: 'Rumpf', anchor: 'chest', side: 'r', status: 'single', text: 'Oberkörper leicht nach vorn neigen, unten etwa 30–40° aus der Senkrechten.', src: ['S1', 'S2'],
        explain: 'Spitzenneigung 37 ± 10° (McKenzie et al. 2022); am Barren deutlich mehr als bei Bankdips (13°).' },
      { short: 'Oben', anchor: 'shoulder', side: 'l', status: 'single', text: 'Oben Arme weitgehend strecken, Körper ruhig über den Griffen.', src: ['S1'],
        explain: 'Ellbogen oben ≈ 17–18° Beugung bei selbst gewählter Technik (McKenzie et al. 2022).' },
      { short: 'Kontrolle', anchor: 'hip', side: 'r', status: 'single', text: 'Gegen Satzende auf Kontrolle achten – Fehlversuche gingen teils tiefer als üblich.', src: ['S1'],
        explain: 'Zwei von vier gescheiterten Wiederholungen überschritten den zuvor gemessenen maximalen Bewegungsumfang (Nebenbefund, McKenzie et al. 2022).' },
      { short: 'Ellbogen', anchor: 'uarm', side: 'l', status: 'single', text: 'Ellbogen nah am Körper führen.', src: ['S1', 'S2', 'S4'],
        explain: 'Anweisung in Çinarli et al. 2021. Gemessene Schulterabduktion ≈ 12° oben, ≈ 28° am Tiefpunkt, Spitze 31° kurz davor (McKenzie et al. 2022). Dass ein weiter Griff riskanter ist, wurde nur vermutet.' }
    ],
    sources: {
      S1: { label: 'McKenzie et al. 2022, Int J Environ Res Public Health (Ermüdung, Barrendip)', url: 'https://doi.org/10.3390/ijerph192114390', read: 'fulltext' },
      S2: { label: 'McKenzie et al. 2022, Int J Environ Res Public Health (Bank-, Barren-, Ringdips)', url: 'https://doi.org/10.3390/ijerph192013211', read: 'fulltext' },
      S4: { label: 'Çinarli et al. 2021, Kinesiologia Slovenica', url: 'https://journals.uni-lj.si/kinsi/article/view/29659', read: 'fulltext' }
    }
  },

  // ---------- Bankdrücken ----------
  {
    ref: 'bench-press-barbell', view: 'side', basis: 'measured', layout: 'rows',
    basisNote: 'Ellbogenwinkel unten aus Mausehund et al. 2022 (3D, 35 Personen, 6–8RM, mittlerer Griff; am PDF geprüft); Stangenposition aus Larsen et al. 2021/2022. Schulterwinkel in der Seitenansicht aus der Stangenposition gelöst; Arme außerhalb der Bildebene verkürzt dargestellt.',
    tempo: { basis: 'protocol', note: '2 s ab (Metronom, Bartolomei et al. 2024), Drücken ≈ 1 s (bei 1RM 1,0–1,4 s bis zur zweiten Geschwindigkeitsspitze, Larsen et al. 2021).' },
    frames: [
      { label: 'Oben', pose: { root: 'shoulder', rootPos: [0, -102], trunk: C(-90, 'liegend'), hip: C(-6), knee: C(99), foot: C(90, 'Fuß flach'), armPoints: { elbow: [4, -52], wrist: [8, -104] }, facts: [V(20, 'S1', 'computed', 'Ellbogen oben: Spitze 101,4° minus ROM 78,3° ≈ 23°; 0–20° vertretbar')], props: benchProps } },
      { label: 'Brust', pose: { root: 'shoulder', rootPos: [0, -102], trunk: C(-90, 'liegend'), hip: C(-6), knee: C(99), foot: C(90, 'Fuß flach'), armPoints: { elbow: [12, 14], wrist: [34, -36] }, facts: [V(101.4, 'S1', 'fulltext', 'Ellbogen unten 101,4 ± 8,3° (3D, mittlerer Griff); Oberarm 59,3 ± 8,2° vom Rumpf'), V(0.17, 'S3', 'fulltext', 'Stange ≈ 0,17 m fußwärts vom Schultergelenk')], props: benchProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Oben', kp: [0, 1] }, { a: 0, b: 1, dur: 2.0, label: 'Absenken', kp: [2] }, { a: 1, b: 1, dur: 0.15, label: 'Brust', kp: [2, 4] }, { a: 1, b: 0, dur: 1.0, label: 'Drücken', kp: [3] }],
    keyPoints: [
      { short: 'Aufbau', anchor: 'upperBack', side: 'l', status: 'consensus', text: 'Schulterblätter zurückziehen, Füße fest am Boden, Gesäß bleibt auf der Bank.', src: ['S5', 'S8'],
        explain: 'Fünf Kontaktpunkte (Kopf, Schulterblätter, Rumpf, Gesäß, Füße) sind die Technikdefinition in Bartolomei et al. 2024. Zurückgezogene Schulterblätter senkten in einer Modellrechnung die Kräfte im Schultergelenk und die Aktivität der Rotatorenmanschette (Noteboom et al. 2024, n = 10, 16 kg).' },
      { short: 'Griff', anchor: 'hand', side: 'r', status: 'contested', text: 'Griff etwa 1,4- bis 2-fach schulterbreit; enger Griff fordert den Trizeps stärker.', src: ['S2', 'S1', 'S8'],
        explain: 'Umstritten. Untersucht wurden 1,0–2,1-fache Schulterbreite. Mittlerer und weiter Griff erlaubten ein höheres 1RM als der enge (Larsen et al. 2021). Eng erhöht Ellbogenmomente und Trizepsanteil, weit die Schultermomente (Mausehund et al. 2022). Ein Griff bis 1,5-fach statt 2-fach schulterbreit senkte modellierte Schultergelenkkräfte; 1-fach erhöhte dafür die Scherkraft nach oben (Noteboom et al. 2024, n = 10, 16 kg, Modellrechnung).' },
      { short: 'Senken', anchor: 'elbow', side: 'r', status: 'contested', text: 'Stange kontrolliert zur unteren Brust senken, Oberarme ca. 45–65° vom Rumpf.', src: ['S1', 'S3', 'S8', 'S12'],
        explain: 'Umstritten. Schulterabduktion unten 38–66° je nach Griff und Anweisung (Mausehund et al. 2022); Studien geben ≈ 45° vor oder testen 45/70/90°. Berührungspunkt ≈ 16–18 cm fußwärts vom Schultergelenk (berechnet aus Larsen et al. 2022); ein „idealer“ Punkt ist nicht untersucht.' },
      { short: 'Weg', anchor: 'bar', side: 'r', status: 'consensus', text: 'Beim Drücken wandert die Stange leicht Richtung Schultern zurück.', src: ['S2', 'S3', 'S10', 'S11'],
        explain: 'Horizontaler Weg ≈ 13 cm (Larsen et al. 2021); Abstand Stange–Schulter 17 → 7–9 cm (Larsen et al. 2022); Geübte halten die Stange näher an den Schultern (Madsen & McLaughlin 1984).' },
      { short: 'Bogen', anchor: 'lowBack', side: 'l', status: 'contested', text: 'Leichtes Hohlkreuz ist möglich; ein starker Bogen verkürzt den Weg der Stange.', src: ['S5', 'S6', 'S13', 'S1'],
        explain: 'Umstritten. Mit Bogen +4,2 kg 1RM und 28–47 mm weniger Hubweg (Bartolomei et al. 2024); kein 1RM-Unterschied bei 11 Kraftdreikämpfern (García-Ramos et al. 2018); der Bogen senkte die Schultermomente um 8 % (Cudlip et al. 2022). Mittlerer Bogenwinkel 26–32° (Mausehund et al. 2022).' }
    ],
    sources: {
      S1: { label: 'Mausehund et al. 2022, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000003948', read: 'fulltext' },
      S2: { label: 'Larsen, Gomo & van den Tillaar 2021, Front Sports Act Living', url: 'https://doi.org/10.3389/fspor.2020.637066', read: 'fulltext' },
      S3: { label: 'Larsen et al. 2022, Int J Environ Res Public Health', url: 'https://doi.org/10.3390/ijerph192114238', read: 'fulltext' },
      S5: { label: 'Bartolomei et al. 2024, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000004778', read: 'fulltext' },
      S6: { label: 'García-Ramos et al. 2018, Sports Biomech', url: 'https://doi.org/10.1080/14763141.2018.1544662', read: 'abstract' },
      S8: { label: 'Noteboom et al. 2024, Front Physiol', url: 'https://doi.org/10.3389/fphys.2024.1393235', read: 'fulltext' },
      S10: { label: 'Madsen & McLaughlin 1984, Med Sci Sports Exerc', url: 'https://pubmed.ncbi.nlm.nih.gov/6493018/', read: 'abstract' },
      S11: { label: 'Duffey & Challis 2007, J Strength Cond Res', url: 'https://doi.org/10.1519/R-19885.1', read: 'abstract' },
      S12: { label: 'Rodríguez-Ridao et al. 2020, Int J Environ Res Public Health', url: 'https://doi.org/10.3390/ijerph17197339', read: 'fulltext' },
      S13: { label: 'Cudlip et al. 2022, J Sports Sci', url: 'https://doi.org/10.1080/02640414.2022.2046937', read: 'abstract' }
    }
  },

  // ---------- Liegestütz ----------
  {
    ref: 'push-up', view: 'side', basis: 'measured',
    basisNote: 'Ellbogenbereich aus Suprak et al. 2013 (16 Personen; gemeinsamer Bereich 105° → 35°, am PDF geprüft) und San Juan et al. 2015 (Volltext). Körperlinie gerade (Anweisung); Rumpfneigung so gelöst, dass die Zehen am Boden bleiben.',
    tempo: { basis: 'protocol', note: '2 s ab, 2 s auf (Anweisung in Suprak et al. 2013 und San Juan et al. 2015).' },
    frames: [
      { label: 'Oben', pose: { root: 'wrist', rootPos: [0, -6], solve: { param: 'trunk', joint: 'toe', y: 0, range: [20, 89] }, hip: V(0, 'P2', 'protocol', 'Körperlinie ≈ 180°'), knee: C(0), foot: C(165), armPoints: { elbow: [3, 54], wrist: [6, 104] }, handFlat: 1, facts: [V(10, 'P1', 'protocol', 'Ellbogen oben gestreckt (Anweisung); Minimum 20° in San Juan et al. 2015')], props: pushupProps } },
      { label: 'Unten', pose: { root: 'wrist', rootPos: [0, -6], solve: { param: 'trunk', joint: 'toe', y: 0, range: [20, 89] }, hip: V(0, 'P2', 'protocol', 'Körperlinie ≈ 180°'), knee: C(0), foot: C(165), armPoints: { elbow: [-14, 4], wrist: [10, 32] }, handFlat: 1, facts: [V(105, 'P1', 'fulltext', 'Ellbogen unten ≥ 105° (gemeinsamer Bereich 105° → 35°); Oberarm 53,6° vom Rumpf')], props: pushupProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Oben', kp: [0, 1] }, { a: 0, b: 1, dur: 2.0, label: 'Absenken', kp: [2, 3] }, { a: 1, b: 1, dur: 0.15, label: 'Unten', kp: [2] }, { a: 1, b: 0, dur: 2.0, label: 'Hochdrücken', kp: [0] }],
    keyPoints: [
      { short: 'Linie', anchor: 'hip', side: 'l', status: 'consensus', text: 'Körper bildet eine gerade Linie von Kopf bis Ferse.', src: ['P2', 'P1'],
        explain: 'Anweisung in allen gelesenen Protokollen (≈ 180° zwischen Ober- und Unterkörper, San Juan et al. 2015); Hüft- und Rumpfwinkel wurden nicht gemessen.' },
      { short: 'Hände', anchor: 'wrist', side: 'r', status: 'consensus', text: 'Hände etwas breiter als schulterbreit auf Schulterhöhe aufsetzen.', src: ['P1', 'P2', 'P3'],
        explain: 'Hände auf Höhe des Schultereckgelenks (Suprak et al. 2013, San Juan et al. 2015); ≈ 150 % Schulterbreite beim Vergleich mit dem Bankdrücken (van den Tillaar 2019).' },
      { short: 'Tiefe', anchor: 'chest', side: 'l', status: 'consensus', text: 'Brust bis knapp über den Boden senken, dann Arme wieder strecken.', src: ['P1', 'P2'],
        explain: 'Tiefe in den Studien: Brust berührt einen 10 cm hohen Block; Ellbogenbeugung unten mindestens ≈ 105°.' },
      { short: 'Oberarme', anchor: 'elbow', side: 'r', status: 'contested', text: 'Oberarme etwa 35–55° vom Rumpf; sehr weit abgespreizt hebt das die Schulter an.', src: ['P1'],
        explain: 'Umstritten und nur eine Studie: Oberarmwinkel zum Rumpf eng 35,5°, selbst gewählt 53,6°, weit 64,8° (Suprak et al. 2013). Die Autoren verbinden die weite Position mit einer ungünstigeren Schulterblattstellung; Verletzungsdaten gibt es nicht.' }
    ],
    sources: {
      P1: { label: 'Suprak et al. 2013, J Athl Train', url: 'https://doi.org/10.4085/1062-6050-48.5.08', read: 'fulltext' },
      P2: { label: 'San Juan et al. 2015, BMC Musculoskelet Disord', url: 'https://doi.org/10.1186/s12891-015-0486-5', read: 'fulltext' },
      P3: { label: 'van den Tillaar 2019, Sports Med Int Open', url: 'https://doi.org/10.1055/a-1001-2526', read: 'fulltext' }
    }
  },

  // ---------- Rudern am Kabel ----------
  {
    ref: 'seated-cable-row', view: 'side', basis: 'measured',
    basisNote: 'Schulter- und Ellbogenwinkel aus einer IMU-Messung an 14 Personen (NPJ Microgravity 2026, Volltext; leichte bis mittlere Last, Werte aus Mittelwertkurven). Rumpf aufrecht (Anweisung in Padovan et al. 2025), Beinhaltung Konvention.',
    tempo: { basis: 'protocol', note: '2 s ziehen, 2 s zurück, ≈ 0,5 s halten (Protokolle der IMU-Studie und Padovan et al. 2025).' },
    frames: [
      { label: 'Start', pose: { root: 'hip', rootPos: [0, -98], trunk: V(0, 'S2', 'protocol', 'aufrecht'), hip: C(80), knee: C(25), foot: C(55), shoulder: V(61.1, 'S1', 'fulltext', '61,1 ± 5,3°'), elbow: K(5.9, 'S1', 'Maximum 105,4° minus ROM 99,5°'), armScale: [1, 0.85], props: rowProps } },
      { label: 'Zug', pose: { root: 'hip', rootPos: [0, -98], trunk: V(0, 'S2', 'protocol', 'aufrecht'), hip: C(80), knee: C(25), foot: C(55), shoulder: V(-5, 'S1', 'fulltext', '−5,0 ± 9,7°'), elbow: V(105.4, 'S1', 'fulltext', '105,4 ± 13,1°'), armScale: [1, 0.65], props: rowProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Start', kp: [0] }, { a: 0, b: 1, dur: 2.0, label: 'Ziehen', kp: [1, 2] }, { a: 1, b: 1, dur: 0.5, label: 'Halten', kp: [1, 3] }, { a: 1, b: 0, dur: 2.0, label: 'Zurück', kp: [4] }],
    keyPoints: [
      { short: 'Sitz', anchor: 'knee', side: 'r', status: 'consensus', text: 'Aufrecht sitzen, Knie leicht gebeugt, Arme vorne gestreckt.', src: ['S2', 'S4'],
        explain: 'Haltung in den Studien: aufrechter Rumpf ohne Brustauflage, leicht gebeugte Knie, gestreckte Ellbogen am Start.' },
      { short: 'Zug', anchor: 'elbow', side: 'l', status: 'consensus', text: 'Griff zum Bauch ziehen, Oberarme nach hinten führen.', src: ['S1', 'S2', 'S3', 'S4'],
        explain: 'Endposition: Griff am Bauch; Schulter ≈ 0 bis −5° (gemessen −5,0 ± 9,7°), Ellbogen ≈ 90–105° (gemessen 105,4 ± 13,1°).' },
      { short: 'Ellbogen', anchor: 'uarm', side: 'l', status: 'single', text: 'Ellbogen eng: mehr Latissimus; Ellbogen weit: mehr oberer Rücken und hintere Schulter.', src: ['S4', 'S8'],
        explain: 'Wenig Abduktion begünstigte den unteren Latissimus, 60–90° Abduktion erhöhten Trapez- und hintere Schulteraktivität (Vasconcelos et al. 2023, n = 21; Begutachtung nicht angegeben). Enger Griff mit mehr Latissimus auch in einer HD-EMG-Studie (Übersicht Di Fonza et al. 2026).' },
      { short: 'Rumpf', anchor: 'chest', side: 'r', status: 'single', text: 'Oberkörper ruhig halten; Vor- oder Rücklage verschiebt die Belastung.', src: ['S2', 'S5'],
        explain: 'Aufrecht als Anweisung (Padovan et al. 2025). 20° Rücklage: oberer Trapezmuskel 42 statt 15 % der Maximalaktivität; 30° Vorlage: unterer Trapezmuskel 61 statt 50 % (Park & Kim 2022, n = 23). Die Diskussion der Studie widerspricht teils den eigenen Tabellen.' },
      { short: 'Zurück', anchor: 'hand', side: 'r', status: 'consensus', text: 'Langsam zurück, bis die Arme wieder gestreckt sind.', src: ['S1', 'S2', 'S4'],
        explain: 'Start und Ende mit gestreckten Ellbogen in allen Protokollen.' }
    ],
    sources: {
      S1: { label: 'E4D-Kinematikstudie 2026, NPJ Microgravity', url: 'https://doi.org/10.1038/s41526-026-00588-y', read: 'fulltext' },
      S2: { label: 'Padovan et al. 2025, J Funct Morphol Kinesiol', url: 'https://doi.org/10.3390/jfmk11010006', read: 'fulltext' },
      S3: { label: 'Lehman et al. 2004, Dyn Med', url: 'https://doi.org/10.1186/1476-5918-3-4', read: 'fulltext' },
      S4: { label: 'Vasconcelos et al. 2023, Int J Strength Cond', url: 'https://doi.org/10.47206/ijsc.v3i1.190', read: 'fulltext' },
      S5: { label: 'Park & Kim 2022, J Musculoskelet Sci Technol', url: 'https://doi.org/10.29273/jmst.2022.6.1.22', read: 'fulltext' },
      S8: { label: 'Di Fonza et al. 2026, J Funct Morphol Kinesiol (Review)', url: 'https://doi.org/10.3390/jfmk11030315', read: 'fulltext' }
    }
  },

  // ---------- Klimmzug (Frontansicht) ----------
  {
    ref: 'pull-up', view: 'front', basis: 'measured', noFloor: true,
    basisNote: 'Frontansicht. Schulterwinkel aus Prinold & Bull 2014 (3D, 11 geübte Männer, drei Griffe; humerothorakale Elevation 23–126° als gepoolter Bereich, kein Mittelwert je Position) und Ellbogen-Bewegungsumfang aus Youdas et al. 2010 (3D, n = 25, Abstract). Die Figur hängt mit den Händen an der Stange (1,5-fache Schulterbreite); Ellbogen und Handgelenke sind in die Bildebene projiziert, deshalb erscheint der Ellbogen oben stärker gebeugt als gemessen. Beine angewinkelt (Protokoll), Körperhöhe folgt aus der Armgeometrie.',
    tempo: { basis: 'measured', note: 'Hochziehen im Mittel 1,2 s (0,8–2,2 s, maximale Absicht; Prinold & Bull 2014); Absenken dort nicht gemessen, hier 1,5 s (EMG-Protokolle: 2 s / 2 s).' },
    frames: [
      { label: 'Hang', pose: { root: 'wristR', rootPos: [PU.grip, PU.bar + 8], armPoints: { elbow: [13.4, -66.9], wrist: [24, -120] }, legs: { hip: C(0), knee: C(70, 'Beine angewinkelt, Fersen hinten (Protokoll)') }, props: pullupProps },
        facts: [V(0, 'S2', 'protocol', 'Ellbogen gestreckt im Hang (Protokoll)'), V(126, 'S2', 'fulltext', 'humerothorakale Elevation: oberes Ende des Bereichs 23–126° (gepoolt); in der Frontprojektion ≈ 169°')] },
      { label: 'Oben', pose: { root: 'wristR', rootPos: [PU.grip, PU.bar + 8], armPoints: { elbow: [30, 34], wrist: [24, -22] }, legs: { hip: C(0), knee: C(70, 'Beine angewinkelt, Fersen hinten (Protokoll)') }, props: pullupProps },
        facts: [V(93.4, 'S3', 'abstract', 'Ellbogen-Bewegungsumfang 93,4 ± 14,6° (Klimmzug, n = 25); Frontprojektion zeigt ≈ 145°'), V(23, 'S2', 'fulltext', 'humerothorakale Elevation: unteres Ende des Bereichs 23–126°'), V(1, 'S2', 'protocol', 'Kinn über der Stange (Endkriterium)')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Hang', kp: [0, 3] }, { a: 0, b: 1, dur: 1.2, label: 'Hochziehen', kp: [1, 2] }, { a: 1, b: 1, dur: 0.3, label: 'Oben', kp: [1] }, { a: 1, b: 0, dur: 1.5, label: 'Absenken', kp: [4] }],
    keyPoints: [
      { short: 'Hang', anchor: 'elbowL', side: 'l', status: 'consensus', text: 'Aus dem gestreckten Hang starten: Arme lang, Ellbogen gestreckt.', src: ['S2', 'S3', 'S4'],
        explain: 'Startdefinition aller gelesenen Studien: Hang mit gestreckten Armen. Der gemessene Ellbogen-Bewegungsumfang (93 ± 15°, Youdas et al. 2010) bezieht sich auf diesen Start.' },
      { short: 'Kinn', anchor: 'chin', side: 'r', status: 'consensus', text: 'Hochziehen, bis das Kinn über der Stange ist.', src: ['S2', 'S4'],
        explain: 'Endkriterium in Prinold & Bull 2014 und Snarr et al. 2017 (Kinn über der Stange bzw. auf Höhe der Hände). Wiederholungen mit Schwung wurden dort verworfen.' },
      { short: 'Schwung', anchor: 'kneeR', side: 'r', status: 'single', text: 'Ohne Schwung aus Beinen oder Hüfte ziehen – Beine ruhig halten.', src: ['S4', 'S6'],
        explain: 'Strikte Ausführung als Protokoll (Snarr et al. 2017). Beim Kipping bewegen sich Hüfte (≈ 49°) und Knie (≈ 57°) deutlich mehr als beim strikten Klimmzug (Dinunzio et al. 2018, Abstract, n = 11). Ob das besser oder schlechter ist, hängt vom Ziel ab; untersucht wurde nur der Unterschied.' },
      { short: 'Griff', anchor: 'handL', side: 'l', status: 'single', text: 'Griff etwa schulterbreit bis 1,5-fache Schulterbreite.', src: ['S1', 'S4'],
        explain: 'Schulterbreit („front“) bis weit (Hände am abgeschrägten Teil der Stange) in Prinold & Bull 2016; 1,5-fache Schulterbreite in EMG-Protokollen. Der weite Griff hielt den Oberarm näher an der Frontalebene (≈ 90° Abduktion mit 45° Außenrotation). Ein Optimum ist nicht belegt.' },
      { short: 'Ab', anchor: 'shoulderL', side: 'l', status: 'single', text: 'Kontrolliert absenken, bis die Arme wieder gestreckt sind.', src: ['S4'],
        explain: 'Protokoll 2 s auf / 2 s ab (Snarr et al. 2017). Die Absenkphase wurde kinematisch nicht gemessen.' }
    ],
    sources: {
      S1: { label: 'Prinold & Bull 2016, J Sci Med Sport', url: 'https://doi.org/10.1016/j.jsams.2015.08.002', read: 'fulltext', note: 'Schulterblatt-Kinematik; Angaben zum Schulterblatt-Kippbereich widersprechen der eigenen Diskussion' },
      S2: { label: 'Prinold & Bull 2014, J Biomech', url: 'https://doi.org/10.1016/j.jbiomech.2014.05.015', read: 'fulltext' },
      S3: { label: 'Youdas et al. 2010, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3181f1598c', read: 'abstract' },
      S4: { label: 'Snarr et al. 2017, J Hum Kinet', url: 'https://doi.org/10.1515/hukin-2017-0068', read: 'fulltext' },
      S6: { label: 'Dinunzio et al. 2018, Sports Biomech', url: 'https://doi.org/10.1080/14763141.2018.1452971', read: 'abstract' }
    }
  },

  // ---------- Latzug (Frontansicht) ----------
  {
    ref: 'lat-pulldown', view: 'front', basis: 'transfer',
    basisNote: 'Frontansicht. Keine gelesene Studie berichtet Gelenkwinkel für den Latzug an Gesunden; Schulter- und Ellbogenbereich sind vom Klimmzug übertragen (Prinold & Bull 2014, Youdas et al. 2010). Griffbreite, Start mit gestreckten Armen und Endpunkt an der oberen Brust sind Studienprotokolle (Padovan et al. 2024). Sitzend, Oberschenkel unter dem Polster; Arme in die Bildebene projiziert.',
    tempo: { basis: 'protocol', note: '2 s ziehen, 0,5 s halten, 2 s zurück (Metronom, Padovan et al. 2024).' },
    frames: [
      { label: 'Start', pose: { rootPos: [0, -108], armPoints: { elbow: [13.4, -66.9], wrist: [24, -120] }, legs: { hip: C(85, 'sitzend'), knee: C(85) }, props: pulldownProps },
        facts: [V(0, 'L1', 'protocol', 'Ellbogen gestreckt am Start'), V(1.5, 'L1', 'protocol', 'Griff 1,5-fache Biakromialbreite, Obergriff'), V(126, 'S2', 'fulltext', 'Schulter: übertragen vom Klimmzug-Hang (obere Grenze 23–126°)')] },
      { label: 'Brust', pose: { rootPos: [0, -108], armPoints: { elbow: [12, 44], wrist: [24, 20] }, legs: { hip: C(85, 'sitzend'), knee: C(85) }, props: pulldownProps },
        facts: [V(93.4, 'S3', 'abstract', 'Ellbogen: übertragen vom Klimmzug (ROM 93,4 ± 14,6°)'), V(1, 'L1', 'protocol', 'Stange zur Mitte der Brust (Endkriterium)')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Start', kp: [0, 1] }, { a: 0, b: 1, dur: 2.0, label: 'Ziehen', kp: [2, 3] }, { a: 1, b: 1, dur: 0.5, label: 'Halten', kp: [2] }, { a: 1, b: 0, dur: 2.0, label: 'Zurück', kp: [4] }],
    keyPoints: [
      { short: 'Griff', anchor: 'handL', side: 'l', status: 'consensus', text: 'Griff etwa 1,5-fache Schulterbreite, Handflächen nach vorn.', src: ['L1', 'L3', 'L7'],
        explain: 'Protokoll der gelesenen Studien (1,5-fache Biakromialbreite). Enger, mittlerer und weiter Griff (1–2-fach) ergaben ähnliche Latissimus-Aktivität; mit dem weiten Griff war das 6RM etwas niedriger (Andersen et al. 2014, n = 15). Griffbreite und Unterarmdrehung änderten die Aktivität kaum (Lusk et al. 2010).' },
      { short: 'Polster', anchor: 'thighR', side: 'r', status: 'single', text: 'Oberschenkel unter dem Polster fixieren, Becken bleibt auf dem Sitz.', src: ['L1'],
        explain: 'Aufbau in Padovan et al. 2024 (Becken durch das Oberschenkelpolster fixiert). Ob das die Ausführung verbessert, wurde nicht untersucht.' },
      { short: 'Ziehen', anchor: 'chest', side: 'r', status: 'consensus', text: 'Aus gestreckten Armen die Stange vor dem Kopf zur oberen Brust ziehen.', src: ['L1', 'L8'],
        explain: 'Zur Brustmitte (Padovan et al. 2024). Vor dem Kopf erlaubte mehr Last als hinter dem Nacken (8RM 70,0 vs. 59,3 kg) bei gleicher Latissimus-Aktivität; Sperandei et al. 2009 fanden vor dem Kopf die höchste Brust- und ähnliche Latissimus-Aktivität.' },
      { short: 'Rumpf', anchor: 'belly', side: 'l', status: 'contested', text: 'Oberkörper ruhig und fast aufrecht halten, nur leichte Rücklage.', src: ['L1', 'L4'],
        explain: 'Umstritten. Padovan et al. 2024 ließen eine leichte Rücklage zu, andere Protokolle verlangen einen senkrechten Rumpf; Buonsenso et al. 2025 testeten eine Variante mit 30° Rücklage als eigene Übungsform. Ein gemessener Rumpfwinkel liegt nicht vor.' },
      { short: 'Zurück', anchor: 'elbowL', side: 'l', status: 'consensus', text: 'Kontrolliert nach oben zurückführen, bis die Arme gestreckt sind.', src: ['L1', 'L7'],
        explain: 'Start und Ende mit gestreckten Ellbogen in allen Protokollen; Tempo 2 s / 2 s.' }
    ],
    sources: {
      L1: { label: 'Padovan et al. 2024, J Hum Kinet', url: 'https://doi.org/10.5114/jhk/185211', read: 'fulltext' },
      L3: { label: 'Andersen et al. 2014, J Strength Cond Res', url: 'https://doi.org/10.1097/JSC.0000000000000232', read: 'abstract' },
      L4: { label: 'Buonsenso et al. 2025, J Funct Morphol Kinesiol', url: 'https://doi.org/10.3390/jfmk10030345', read: 'abstract' },
      L7: { label: 'Lusk et al. 2010, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3181ddb0ab', read: 'abstract' },
      L8: { label: 'Sperandei et al. 2009, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3181b8d30a', read: 'abstract' },
      S2: { label: 'Prinold & Bull 2014, J Biomech (Klimmzug, übertragen)', url: 'https://doi.org/10.1016/j.jbiomech.2014.05.015', read: 'fulltext' },
      S3: { label: 'Youdas et al. 2010, J Strength Cond Res (Klimmzug, übertragen)', url: 'https://doi.org/10.1519/JSC.0b013e3181f1598c', read: 'abstract' }
    }
  },

  // ---------- Seitheben (Frontansicht) ----------
  {
    ref: 'lateral-raise-dumbbell', view: 'front', basis: 'protocol',
    basisNote: 'Frontansicht. Keine Studie hat das Seitheben selbst vermessen. Endposition 90° Abduktion und fast gestreckter Ellbogen sind das Protokoll von Coratella et al. 2020 (EMG, 10 Bodybuilder, sitzend). Dass sich das Schulterblatt beim Anheben mitdreht (≈ 1° je 2,3° Oberarm), stammt aus Messungen ohne Last (Braman et al. 2009) und wird nicht gezeichnet. Stehend, Ebene der Bewegung in der Zeichnung frontal.',
    tempo: { basis: 'protocol', note: '2 s anheben, 0,5 s halten, 2 s absenken, 0,5 s halten (Metronom, Coratella et al. 2020).' },
    frames: [
      { label: 'Unten', pose: { arm: { abd: V(8, 'L1', 'protocol', 'Arm hängt neben dem Körper (Protokoll 0°, hier 8° wegen der Hanteln)'), elbow: C(12, 'fast gestreckt') }, legs: { hip: C(0), knee: C(0) }, props: raiseProps } },
      { label: 'Oben', pose: { arm: { abd: V(90, 'L1', 'protocol', 'bis 90° Abduktion (Protokollziel, nicht gemessen)'), elbow: C(12, 'fast gestreckt, bleibt gleich') }, legs: { hip: C(0), knee: C(0) }, props: raiseProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Unten', kp: [1, 3] }, { a: 0, b: 1, dur: 2.0, label: 'Anheben', kp: [0, 2] }, { a: 1, b: 1, dur: 0.5, label: 'Oben', kp: [0] }, { a: 1, b: 0, dur: 2.0, label: 'Absenken', kp: [4] }],
    keyPoints: [
      { short: 'Höhe', anchor: 'handR', side: 'r', status: 'consensus', text: 'Arme seitlich anheben, bis die Oberarme etwa waagerecht sind.', src: ['L1', 'L5'],
        explain: 'Zielwinkel 90° im Studienprotokoll (Coratella et al. 2020). Seitheben über 90° war in einer Querschnittsstudie mit Impingement-Zeichen assoziiert (Kolber et al. 2014, n = 77) – ein Zusammenhang, kein Beleg für eine Ursache.' },
      { short: 'Ellbogen', anchor: 'elbowL', side: 'l', status: 'single', text: 'Ellbogen fast gestreckt und während der Bewegung gleich lassen.', src: ['L1'],
        explain: 'Protokoll „fast gestreckt“; eine Variante mit 90° gebeugtem Ellbogen wurde in derselben Studie getestet. Ein Vergleich der Wirkung auf das Muskelwachstum liegt nicht vor.' },
      { short: 'Daumen', anchor: 'handL', side: 'l', status: 'contested', text: 'Daumen nach vorn oder leicht nach oben, nicht nach unten gedreht.', src: ['L1', 'L4', 'L6'],
        explain: 'Umstritten. Daumen nach unten erhöhte die EMG-Aktivität des mittleren Deltamuskels (Coratella et al. 2020; Übersicht Rabello et al. 2022). Dagegen: In der Empty-Can-Position drehte das Schulterblatt stärker nach innen und kippte nach vorn (Thigpen et al. 2005, Abstract) – eine Haltung, die als ungünstig gilt; Verletzungsdaten gibt es nicht.' },
      { short: 'Rumpf', anchor: 'belly', side: 'r', status: 'single', text: 'Rumpf ruhig halten, nicht mit Schwung aus dem Oberkörper arbeiten.', src: ['L1'],
        explain: 'Die Studie ließ sitzend trainieren, um Rumpfbeteiligung zu vermeiden. Rumpfbewegung beim Seitheben wurde nie gemessen.' },
      { short: 'Ab', anchor: 'shoulderL', side: 'l', status: 'single', text: 'Kontrolliert absenken, etwa so langsam wie beim Anheben.', src: ['L1'],
        explain: 'Protokoll 2 s / 2 s (Coratella et al. 2020). Beim Absenken drehte das Schulterblatt in Messungen ohne Last etwas später zurück als es beim Anheben mitging (Braman et al. 2009).' }
    ],
    sources: {
      L1: { label: 'Coratella et al. 2020, Int J Environ Res Public Health', url: 'https://doi.org/10.3390/ijerph17176015', read: 'fulltext' },
      L2: { label: 'Kai et al. 2016, J Phys Ther Sci', url: 'https://doi.org/10.1589/jpts.28.1876', read: 'fulltext' },
      L3: { label: 'Braman et al. 2009, J Shoulder Elbow Surg', url: 'https://doi.org/10.1016/j.jse.2009.02.001', read: 'fulltext' },
      L4: { label: 'Thigpen et al. 2005, Am J Sports Med', url: 'https://doi.org/10.1177/0363546505281797', read: 'abstract' },
      L5: { label: 'Kolber et al. 2014, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000000250', read: 'abstract' },
      L6: { label: 'Rabello et al. 2022, J Bodyw Mov Ther (Review)', url: 'https://doi.org/10.1016/j.jbmt.2022.12.002', read: 'abstract' }
    }
  }
];

// ---------- Szenen (Geräte) ----------
function trunkPoint(P, dx, dy) { // Punkt in Rumpfkoordinaten (dx nach vorn, dy nach oben) ab Schultergelenk
  const t = P.angles.trunk * Math.PI / 180, up = [Math.sin(t), -Math.cos(t)], fw = [Math.cos(t), Math.sin(t)];
  const s = P.joints.shoulder;
  return [s[0] + fw[0] * dx + up[0] * dy, s[1] + fw[1] * dx + up[1] * dy];
}
function squatProps(off) {
  return (P) => { const bar = trunkPoint(P, off[0], off[1]); return { anchors: { bar }, scene: [plate(bar)] }; };
}
function handPlate(P) { const bar = P.joints.hand; return { anchors: { bar }, scene: [plate(bar)] }; }
function hipThrustProps(P) {
  const bar = trunkPoint(P, 22, -98);
  return { anchors: { bar }, scene: [{ type: 'rect', x: -320, y: -74, w: 144, h: 74, rx: 6 }, plate(bar)] };
}
function bssProps(P) {
  const hand = P.joints.hand;
  return { anchors: { hand }, scene: [{ type: 'rect', x: -185, y: -82, w: 70, h: 82, rx: 6 }, dumbbell(hand)] };
}
function lungeProps(P) { const hand = P.joints.hand; return { anchors: { hand }, scene: [dumbbell(hand)] }; }
function calfProps(P) {
  const s = P.joints.shoulder, pad = [s[0] - 6, s[1] - 14];
  return { anchors: {}, scene: [{ type: 'rect', x: 16, y: -STEP, w: 22, h: STEP, rx: 2, step: true }, { type: 'line', from: [pad[0], pad[1] - 120], to: [pad[0], pad[1]], w: 4 }, { type: 'rect', x: pad[0] - 16, y: pad[1] - 4, w: 32, h: 10, rx: 4 }, { type: 'line', from: [P.joints.hand[0] - 10, P.joints.hand[1]], to: [P.joints.hand[0] + 10, P.joints.hand[1]], w: 3 }] };
}
function dipProps(P) {
  const w = P.joints.wrist;
  return { anchors: { uarm: midpoint(P.joints.shoulder, P.joints.elbow) }, scene: [{ type: 'line', from: [w[0], w[1] + 4], to: [w[0], w[1] + 230], w: 4 }, { type: 'bar', at: [w[0], w[1] + 2], r: 5 }] };
}
function benchProps(P) {
  const bar = P.joints.hand;
  return { anchors: { bar }, scene: [{ type: 'rect', x: -95, y: -92, w: 225, h: 12, rx: 3 }, { type: 'line', from: [-60, -80], to: [-60, 0], w: 5 }, { type: 'line', from: [100, -80], to: [100, 0], w: 5 }, plate(bar)] };
}
function pushupProps(P) { return { anchors: {}, scene: [] }; }
function rowProps(P) {
  const hand = P.joints.hand, pulley = [240, -70];
  return { anchors: { hand, uarm: midpoint(P.joints.shoulder, P.joints.elbow) }, scene: [{ type: 'rect', x: -34, y: -90, w: 68, h: 10, rx: 3 }, { type: 'line', from: [0, -80], to: [0, 0], w: 5 }, { type: 'line', from: [166, -78], to: [190, -8], w: 5 }, { type: 'line', from: hand, to: pulley, w: 1.5, dash: true }, { type: 'bar', at: hand, r: 4 }, { type: 'bar', at: pulley, r: 6 }] };
}
// Frontansicht
function pullupProps(P) {
  return { anchors: { bar: [0, PU.bar] }, scene: [{ type: 'line', from: [-130, PU.bar], to: [130, PU.bar], w: 5 }, { type: 'bar', at: [-130, PU.bar], r: 5 }, { type: 'bar', at: [130, PU.bar], r: 5 }] };
}
function pulldownProps(P) {
  const hr = P.joints.handR, hl = P.joints.handL, y = (hr[1] + hl[1]) / 2;
  return { anchors: { bar: [0, y] }, scene: [
    { type: 'rect', x: -36, y: -100, w: 72, h: 10, rx: 3 }, { type: 'line', from: [0, -90], to: [0, 0], w: 5 }, // Sitz
    { type: 'line', from: [0, -370], to: [0, y - 4], w: 1.5, dash: true }, // Seilzug
    { type: 'rect', x: -44, y: -128, w: 88, h: 12, rx: 5, front: true }, // Oberschenkelpolster
    { type: 'line', from: [hl[0] - 14, y], to: [hr[0] + 14, y], w: 5, front: true }, { type: 'bar', at: [hr[0] + 14, y], r: 4 }, { type: 'bar', at: [hl[0] - 14, y], r: 4 }
  ] };
}
function raiseProps(P) {
  return { anchors: {}, scene: [{ type: 'dumbbell', at: P.joints.handR }, { type: 'dumbbell', at: P.joints.handL }] };
}
function midpoint(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }

export function animationFor(ref) { return ANIMATIONS.find((a) => a.ref === ref) || null; }
export function framesOf(anim, variant) {
  const fr = Array.isArray(anim.frames) ? anim.frames : anim.frames[variant || anim.variants[0].key];
  return anim.view === 'front' ? fr.map((f) => ({ ...f, pose: { view: 'front', ...f.pose } })) : fr;
}
export { LEN };
