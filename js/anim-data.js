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
  },

  // ========== Zweite Runde (v2.1): zehn weitere Übungen ==========
  // ---------- Frontkniebeuge ----------
  {
    ref: 'front-squat', view: 'side', basis: 'measured',
    basisNote: 'Knie- und Hüftwinkel aus Sorrentino et al. 2024 (Trägheitssensoren, 12 geübte Männer, Langhantel mit 25 % Körpergewicht; Volltext). Der Hüftwinkel der Sensoren ist ein Becken–Oberschenkel-Winkel und enthält die Beckenkippung; die daraus berechnete Rumpfneigung fällt deshalb größer aus als eine Thorax-Messung. Sprunggelenk nicht gemessen (Wert der Kniebeuge übernommen). Oberarme waagerecht, Stange auf den vorderen Schultern (Protokoll McCormick et al. 2023).',
    tempo: { basis: 'protocol', note: '≈ 3 s je Wiederholung (Sorrentino et al. 2024); 2 s ab / 2 s auf mit Metronom (Goršič et al. 2020, Bozkurt et al. 2026). Natürliches Tempo nicht gemessen.' },
    frames: [
      { label: 'Oben', pose: { shank: K(0, 'S1', 'Standwert'), knee: V(6, 'S1', 'fulltext', '6,0 ± 5,8° (Langhantel); 4,9 ± 4,6° ohne Last'), hip: V(9, 'S1', 'fulltext', '9,0 ± 7,8° (Langhantel); 11,6 ± 8,3° ohne Last'), ankle: C(0), shoulder: V(90, 'S5', 'protocol', 'Oberarme waagerecht'), elbow: C(140), armScale: [0.9, 0.85], props: frontSquatProps } },
      { label: 'Unten', pose: { shank: C(33, 'gleich der Dorsalflexion; nicht gemessen'), knee: V(118.3, 'S1', 'fulltext', '118,3 ± 7,0° (Langhantel); 113,5 ± 8,4° ohne Last'), hip: V(111.4, 'S1', 'fulltext', '111,4 ± 11,3° (Langhantel); 126,1 ± 12,1° ohne Last, Becken–Oberschenkel'), ankle: C(33, 'nicht gemessen; Wert der Kniebeuge (33°) übernommen'), shoulder: V(90, 'S5', 'protocol', 'Oberarme waagerecht'), elbow: C(140), armScale: [0.9, 0.85], props: frontSquatProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Oben', kp: [0] }, { a: 0, b: 1, dur: 1.5, label: 'Absenken', kp: [1, 2] }, { a: 1, b: 1, dur: 0.3, label: 'Unten', kp: [2, 3] }, { a: 1, b: 0, dur: 1.5, label: 'Aufstehen', kp: [4] }],
    keyPoints: [
      { short: 'Stange', anchor: 'bar', side: 'r', status: 'single', text: 'Stange liegt vorn auf Schultern und Schlüsselbein, Oberarme etwa waagerecht.', src: ['S5'],
        explain: 'Protokolldefinition in McCormick et al. 2023 (n = 26): Stange auf vorderen Schultern und Schlüsselbein, Ellbogen voll gebeugt, Oberarme parallel zum Boden. Die Armhaltung wurde nicht gemessen.' },
      { short: 'Rumpf', anchor: 'chest', side: 'r', status: 'contested', text: 'Oberkörper bleibt aufrechter als bei der Kniebeuge mit Stange im Nacken.', src: ['S8', 'S3'],
        explain: 'Umstritten. Mit Maximallast neigte sich der Rumpf bei der Nackenkniebeuge stärker vor, die Kniekinematik war gleich (Yavuz et al. 2015, 2D, n = 12, Abstract). Goršič et al. 2020 (3D, n = 18, 70 % 1RM) fanden keinen signifikanten Rumpfunterschied, nur weniger Beckenkippung bei der Frontkniebeuge. Die Animation zeigt unten ≈ 26° Neigung, berechnet aus einem Sensor-Hüftwinkel, der die Beckenkippung enthält.' },
      { short: 'Tiefe', anchor: 'knee', side: 'r', status: 'single', text: 'Tiefster Punkt: Knie etwa 110–120° gebeugt (gemessen mit leichter Last).', src: ['S1'],
        explain: 'Maximale Kniebeugung 113,5 ± 8,4° ohne Last und 118,3 ± 7,0° mit Langhantel (25 % Körpergewicht); Einschlusskriterium war mindestens 90° (Sorrentino et al. 2024, n = 12). Schwere Lasten wurden nicht gemessen.' },
      { short: 'Hüfte', anchor: 'hip', side: 'l', status: 'single', text: 'Mit Langhantel wurde die Hüfte unten weniger gebeugt als ohne Last.', src: ['S1'],
        explain: '126,1 ± 12,1° ohne Last gegenüber 111,4 ± 11,3° mit Langhantel (signifikant; Sorrentino et al. 2024). Becken–Oberschenkel-Winkel aus Trägheitssensoren, nicht Thorax–Oberschenkel.' },
      { short: 'Knie', anchor: 'thigh', side: 'r', status: 'single', text: 'Bei gleicher Muskelaktivität waren die Druckkräfte im Knie geringer als im Nacken.', src: ['S11'],
        explain: 'Gullett et al. 2009 (n = 15, Abstract): Nackenkniebeuge mit signifikant höheren Kompressionskräften und Kniestreckmomenten; Muskelaktivität ohne Unterschied. Scherkräfte klein und gleich. Ob das langfristig einen Unterschied macht, ist nicht untersucht.' }
    ],
    sources: {
      S1: { label: 'Sorrentino et al. 2024, Physiol Rep', url: 'https://doi.org/10.14814/phy2.16034', read: 'fulltext', note: 'Raumfahrtmedizinische Studie (Zentrifuge); Werte bei normaler Schwerkraft' },
      S3: { label: 'Goršič et al. 2020, Sports Biomech', url: 'https://doi.org/10.1080/14763141.2020.1832563', read: 'fulltext' },
      S4: { label: 'Bozkurt et al. 2026, Front Physiol', url: 'https://doi.org/10.3389/fphys.2025.1727141', read: 'fulltext' },
      S5: { label: 'McCormick et al. 2023, Int J Sports Phys Ther', url: 'https://doi.org/10.26603/001c.84306', read: 'fulltext' },
      S8: { label: 'Yavuz et al. 2015, J Sports Sci', url: 'https://doi.org/10.1080/02640414.2014.984240', read: 'abstract' },
      S11: { label: 'Gullett et al. 2009, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e31818546bb', read: 'abstract' }
    }
  },

  // ---------- Beinpresse (45°-Schlitten) ----------
  {
    ref: 'leg-press', view: 'side', basis: 'protocol',
    basisNote: 'Keine Studie hat die Bewegung an der 45°-Beinpresse gemessen. Knie 0° → 90° ist die Vorgabe aus Martín-Fuentes et al. 2020; Lehnenneigung, Hüftwinkel und die Füße flach auf der Platte sind Konvention. Zum Vergleich sind Messwerte einer horizontalen Schwungrad-Beinpresse angegeben (Sjöberg et al. 2021).',
    tempo: { basis: 'protocol', note: '2 s ab / 2 s auf mit Metronom (Martín-Fuentes et al. 2020); natürliches Tempo nicht gemessen.' },
    frames: [
      { label: 'Oben', pose: { root: 'hip', rootPos: [0, -70], trunk: C(-70, 'Lehne ≈ 20° über der Waagerechten'), hip: C(70, 'Beine entlang der Schienen'), knee: V(5, 'L2', 'protocol', 'Startposition 0° im Protokoll; hier 5°, Knie nicht durchgedrückt'), foot: C(-45, 'Fuß flach auf der Platte'), shoulder: C(5), elbow: C(25), armScale: [1, 0.9], props: legPressProps } },
      { label: 'Unten', pose: { root: 'hip', rootPos: [0, -70], trunk: C(-70, 'Lehne ≈ 20° über der Waagerechten'), hip: C(125, 'Oberschenkel nahe am Rumpf; nicht gemessen'), knee: V(90, 'L2', 'protocol', 'Umkehrpunkt 90° (Schienbein parallel zum Boden)'), foot: C(-45, 'Fuß flach auf der Platte'), shoulder: C(5), elbow: C(25), armScale: [1, 0.9], props: legPressProps },
        facts: [V(109, 'L1', 'fulltext', 'Übertragen: Kniebeugung 109 ± 9° an einer horizontalen Schwungrad-Beinpresse (Ziel war 90°)'), V(78, 'L1', 'fulltext', 'Übertragen: Hüftbeugung 78 ± 12° (horizontale Presse, Sitz gleitet)'), V(32, 'L1', 'fulltext', 'Übertragen: Dorsalflexion 32 ± 12°; hier folgen ≈ 30° aus dem flachen Fuß')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Oben', kp: [0] }, { a: 0, b: 1, dur: 2.0, label: 'Absenken', kp: [1, 2] }, { a: 1, b: 1, dur: 0.2, label: 'Unten', kp: [1] }, { a: 1, b: 0, dur: 2.0, label: 'Drücken', kp: [3] }],
    keyPoints: [
      { short: 'Füße', anchor: 'plate', side: 'r', status: 'consensus', text: 'Füße etwa schulterbreit mittig auf die Platte; Breite und Fußdrehung frei wählen.', src: ['L2', 'L5', 'L6'],
        explain: 'Breiter oder enger Stand und 0° oder 30° Fußdrehung änderten Kniekräfte und Muskelaktivität nicht (Escamilla et al. 2001, n = 10, Abstract; Übersicht Martín-Fuentes et al. 2020). Füße auf mittlerer Höhe war Protokoll der Messstudie.' },
      { short: 'Weg', anchor: 'knee', side: 'l', status: 'consensus', text: 'Knie von fast gestreckt bis etwa 90° beugen; tiefer, wenn das Becken liegen bleibt.', src: ['L2', 'L5', 'L1'],
        explain: 'Protokolle nutzen 0–90° (Martín-Fuentes et al. 2020) bis 0–120° (EMG-Studien in der Übersicht); an einer Schwungrad-Presse gingen Trainierte trotz 90°-Ziel bis 109 ± 9° (Sjöberg et al. 2021, n = 9). Ab wann das Becken von der Lehne abhebt, wurde nicht gemessen.' },
      { short: 'Höhe', anchor: 'thigh', side: 'r', status: 'contested', text: 'Füße höher oder tiefer setzen verschiebt die Last nur wenig; Befunde uneinheitlich.', src: ['L5', 'L6'],
        explain: 'Umstritten. Keine Unterschiede in Kniekräften zwischen hoher und tiefer Fußposition (Escamilla et al. 2001); in der Übersicht von Martín-Fuentes et al. 2020 berichtet eine Studie mehr Gesäßaktivität mit hohen Füßen bei 80 % 1RM, eine andere keinen Unterschied.' },
      { short: 'Lehne', anchor: 'back', side: 'l', status: 'single', text: 'Flachere Lehne (125° statt 90°) bringt mehr Hüftbewegung bei gleicher Kniebewegung.', src: ['L3'],
        explain: 'Marchetti et al. 2023 (n = 15, 70 % Körpermasse, Abstract): Sitz–Lehnen-Winkel 125° mit mehr Hüftverschiebung als 90°, Knieweg ähnlich; Zahlen im Abstract nicht angegeben. Die gezeigte Lehne ist Konvention.' }
    ],
    sources: {
      L1: { label: 'Sjöberg et al. 2021, Front Sports Act Living', url: 'https://doi.org/10.3389/fspor.2021.686335', read: 'fulltext', note: 'Horizontale Schwungrad-Beinpresse, nicht 45°-Schlitten' },
      L2: { label: 'Martín-Fuentes et al. 2020, Int J Environ Res Public Health (Beinpresse 45°)', url: 'https://doi.org/10.3390/ijerph17228698', read: 'fulltext' },
      L3: { label: 'Marchetti et al. 2023, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000004504', read: 'abstract' },
      L5: { label: 'Martín-Fuentes et al. 2020, Int J Environ Res Public Health (Review)', url: 'https://doi.org/10.3390/ijerph17134626', read: 'fulltext' },
      L6: { label: 'Escamilla et al. 2001, Med Sci Sports Exerc', url: 'https://doi.org/10.1097/00005768-200109000-00020', read: 'abstract' }
    }
  },

  // ---------- Beinstrecker ----------
  {
    ref: 'leg-extension', view: 'side', basis: 'protocol',
    basisNote: 'Keine Studie hat die Gelenkwinkel am Beinstrecker gemessen; nur der erreichte Bewegungsumfang (≈ 71° im Fenster 100° → 30°, Potentiometer an der Maschinenachse; Lacerda et al. 2021). Gezeigt ist der volle Bereich 90° → 0° (Protokoll Haffer et al. 2022). Hüftwinkel ≈ 70° aus dem Sitz-Lehnen-Winkel 110° berechnet.',
    tempo: { basis: 'measured', note: '2,04 ± 0,08 s je Wiederholung bei Vorgabe 1 s / 1 s; alternativ 5,98 ± 0,09 s bei 3 s / 3 s – beide mit ähnlichem Muskelzuwachs (Lacerda et al. 2021).' },
    frames: [
      { label: 'Start', pose: { root: 'hip', rootPos: [0, -118], trunk: K(-20, 'E1', 'Sitz–Lehnen-Winkel 110°'), hip: K(70, 'E1', 'aus 110° zwischen Sitz und Lehne, Oberschenkel waagerecht'), knee: V(90, 'E3', 'protocol', 'Start 90° (Haffer et al. 2022); 100° bei Lacerda et al. 2021'), ankle: C(0), shoulder: C(15), elbow: C(35), armScale: [1, 0.9], props: legExtensionProps } },
      { label: 'Gestreckt', pose: { root: 'hip', rootPos: [0, -118], trunk: K(-20, 'E1', 'Sitz–Lehnen-Winkel 110°'), hip: K(70, 'E1', 'aus 110° zwischen Sitz und Lehne, Oberschenkel waagerecht'), knee: V(0, 'E3', 'protocol', 'volle Streckung (Haffer et al. 2022); Endpunkt 30° bei Lacerda et al. 2021'), ankle: C(0), shoulder: C(15), elbow: C(35), armScale: [1, 0.9], props: legExtensionProps },
        facts: [V(70.8, 'E1', 'fulltext', 'Erreichter Bewegungsumfang 70,8 ± 0,8° im Fenster 100° → 30° (gemessen an der Maschinenachse)')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Start', kp: [0, 1] }, { a: 0, b: 1, dur: 1.0, label: 'Strecken', kp: [2] }, { a: 1, b: 1, dur: 0.3, label: 'Gestreckt', kp: [2] }, { a: 1, b: 0, dur: 1.0, label: 'Zurück', kp: [3, 4] }],
    keyPoints: [
      { short: 'Achse', anchor: 'knee', side: 'r', status: 'single', text: 'Kniegelenk auf Höhe der Drehachse der Maschine ausrichten.', src: ['E1'],
        explain: 'Einstellung im Protokoll von Lacerda et al. 2021 (äußerer Oberschenkelknorren an der Drehachse). Ob eine Fehlstellung messbar etwas ändert, wurde nicht untersucht.' },
      { short: 'Polster', anchor: 'pad', side: 'r', status: 'single', text: 'Fußpolster knapp oberhalb des Knöchels anlegen (etwa 3 cm).', src: ['E1'],
        explain: 'Protokolleinstellung (≈ 3 cm über dem Innenknöchel; Lacerda et al. 2021, n = 10 Untrainierte). Keine Studie verglich Polsterhöhen.' },
      { short: 'Weg', anchor: 'shin', side: 'r', status: 'consensus', text: 'Knie von etwa 90–100° Beugung bis zur Streckung bewegen.', src: ['E1', 'E3'],
        explain: 'Protokolle: 100° → 30° (Lacerda et al. 2021) und 90° → 0° (Haffer et al. 2022). Der erreichte Umfang wurde nur bei Lacerda gemessen (≈ 71°).' },
      { short: 'Lehne', anchor: 'hip', side: 'l', status: 'single', text: 'Flachere Lehne (Hüfte ≈ 40° statt 90°) ließ den geraden Oberschenkelmuskel mehr wachsen.', src: ['E2'],
        explain: 'Larsen et al. 2024 (n = 22 Untrainierte, 10 Wochen, Abstract): stärkeres Wachstum des Rectus femoris bei 40° Hüftbeugung, kein Unterschied am Vastus lateralis. Beide Winkel wirken; die Lehne bestimmt nur den Rectus-Anteil.' },
      { short: 'Tempo', anchor: 'foot', side: 'r', status: 'single', text: 'Zügig (1 s / 1 s) oder langsam (3 s / 3 s): ähnlicher Muskelzuwachs – Tempo frei wählen.', src: ['E1'],
        explain: 'Gemessene Dauer 2,0 s bzw. 6,0 s je Wiederholung; Muskelquerschnitt und 1RM stiegen in beiden Gruppen ähnlich (Lacerda et al. 2021, n = 10, Untrainierte, 14 Wochen).' }
    ],
    sources: {
      E1: { label: 'Lacerda et al. 2021, PeerJ', url: 'https://doi.org/10.7717/peerj.10909', read: 'fulltext' },
      E2: { label: 'Larsen et al. 2024, J Sports Sci', url: 'https://doi.org/10.1080/02640414.2024.2444713', read: 'abstract' },
      E3: { label: 'Haffer et al. 2022, Front Bioeng Biotechnol', url: 'https://doi.org/10.3389/fbioe.2022.857682', read: 'fulltext', note: 'Hüftprothesen-Studie; nur die Protokollvorgabe wird genutzt' }
    }
  },

  // ---------- Beinbeuger liegend ----------
  {
    ref: 'lying-leg-curl', view: 'side', basis: 'protocol',
    basisNote: 'Keine Studie hat die Bewegung am liegenden Beinbeuger gemessen. Hüfte ≈ 30° gebeugt (Geometrie der geknickten Bank) und Knie 0° → 90° sind die Vorgaben aus Maeo et al. 2021. Fußhaltung und Armposition sind Konvention.',
    tempo: { basis: 'protocol', note: '2 s beugen / 2 s strecken ohne Pause, Metronom 60 Schläge/min (Maeo et al. 2021).' },
    frames: [
      { label: 'Gestreckt', pose: { root: 'hip', rootPos: [0, -150], trunk: C(90, 'Bauchlage, Kopf nach vorn'), hip: V(30, 'C1', 'protocol', '≈ 30° durch die geknickte Bank'), knee: V(0, 'C1', 'protocol'), ankle: C(0), shoulder: C(80), elbow: C(90), armScale: [0.9, 0.9], props: legCurlProps } },
      { label: 'Gebeugt', pose: { root: 'hip', rootPos: [0, -150], trunk: C(90, 'Bauchlage, Kopf nach vorn'), hip: V(30, 'C1', 'protocol', '≈ 30° durch die geknickte Bank'), knee: V(90, 'C1', 'protocol', 'Vorgabe: voller Umfang 0–90°'), ankle: C(0), shoulder: C(80), elbow: C(90), armScale: [0.9, 0.9], props: legCurlProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Gestreckt', kp: [0, 1] }, { a: 0, b: 1, dur: 2.0, label: 'Beugen', kp: [1, 3] }, { a: 1, b: 1, dur: 0.1, label: 'Gebeugt', kp: [1] }, { a: 1, b: 0, dur: 2.0, label: 'Strecken', kp: [3] }],
    keyPoints: [
      { short: 'Hüfte', anchor: 'hip', side: 'l', status: 'single', text: 'Im Liegen ist die Hüfte etwa 30° gebeugt – das gibt die geknickte Bank vor.', src: ['C1'],
        explain: 'Maschinengeometrie in Maeo et al. 2021 (0° = anatomische Nullstellung). Ob das Becken während des Beugens abhebt, wurde nicht gemessen.' },
      { short: 'Knie', anchor: 'knee', side: 'r', status: 'single', text: 'Knie von gestreckt bis etwa 90° beugen; die Rolle liegt knapp über der Ferse.', src: ['C1'],
        explain: 'Voller Bewegungsumfang 0–90° als Trainingsvorgabe (Maeo et al. 2021, n = 20, 12 Wochen). Die Rollenposition ist Konvention.' },
      { short: 'Sitzend', anchor: 'thigh', side: 'l', status: 'single', text: 'Sitzend (Hüfte ≈ 90°) wuchs der Beinbeuger stärker als liegend – beides wirkt.', src: ['C1', 'C2'],
        explain: 'Innerhalb derselben Personen wuchsen die Beinbeuger (vor allem die zweigelenkigen Anteile) mit der sitzenden Variante stärker (Maeo et al. 2021). In gestreckter Hüfte entwickelten die Beinbeuger isometrisch bei 30° Kniebeugung mehr Kraft als bei 90° (Hirose et al. 2021, n = 20, Abstract).' },
      { short: 'Tempo', anchor: 'pad', side: 'r', status: 'single', text: 'Gleichmäßig: je etwa 2 s beugen und 2 s strecken, ohne Pause.', src: ['C1'],
        explain: 'Protokollvorgabe mit Metronom (Maeo et al. 2021); ein Tempovergleich wurde nicht durchgeführt.' }
    ],
    sources: {
      C1: { label: 'Maeo et al. 2021, Med Sci Sports Exerc', url: 'https://doi.org/10.1249/MSS.0000000000002523', read: 'fulltext' },
      C2: { label: 'Hirose et al. 2021, PLoS One', url: 'https://doi.org/10.1371/journal.pone.0245838', read: 'abstract' }
    }
  },

  // ---------- Schulterdrücken mit der Langhantel stehend ----------
  {
    ref: 'standing-barbell-overhead-press', view: 'side', basis: 'protocol',
    basisNote: 'Keine lesbare Studie hat das stehende Drücken gemessen. Start an der oberen Brust und Endposition mit gestreckten Ellbogen sind Protokollvorgaben (Hernández-Belmonte et al. 2020, sitzend an der Multipresse); Griffbreite 5–7 cm breiter als die Schultern. Armhaltung, leichte Rücklage beim Passieren des Gesichts und Kopfposition sind Konvention.',
    tempo: { basis: 'convention', note: 'Protokolle geben nur „kontrolliert ab, zügig auf“ vor (Hernández-Belmonte et al. 2020); hier 1,5 s ab / 1 s auf.' },
    frames: [
      { label: 'Start', pose: { shank: C(0), knee: C(5), hip: C(2), ankle: C(0), shoulder: C(40, 'Ellbogen vor der Stange, Unterarm etwa senkrecht'), elbow: C(150), armScale: [0.9, 0.95], props: ohpProps },
        facts: [V(0, 'S1', 'protocol', 'Stange berührt am Umkehrpunkt die obere Brust'), V(6, 'S1', 'protocol', 'Griff 5–7 cm breiter als die Schulterbreite (Protokoll)')] },
      { label: 'Gesicht', pose: { shank: C(0), knee: C(5), hip: C(-2, 'leichte Rücklage, damit die Stange am Gesicht vorbeikommt'), ankle: C(0), shoulder: C(85), elbow: C(112), armScale: [0.9, 0.95], props: ohpProps } },
      { label: 'Oben', pose: { shank: C(0), knee: C(5), hip: C(2), ankle: C(0), shoulder: C(172, 'Arme senkrecht über der Schulter'), elbow: V(0, 'S1', 'protocol', 'bis die Ellbogen ganz gestreckt sind'), armScale: [0.9, 0.95], props: ohpProps },
        facts: [V(53.4, 'S1', 'fulltext', 'Stangenweg 53,4 ± 6,5 cm (sitzend, Multipresse, n = 48)'), V(46, 'S1', 'fulltext', 'Geschwindigkeitsminimum („Sticking Point“) bei 46 ± 6 % des Wegs ab 75 % 1RM')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Start', kp: [0] }, { a: 0, b: 1, dur: 0.5, label: 'Drücken', kp: [3] }, { a: 1, b: 2, dur: 0.5, label: 'Drücken', kp: [1, 2] }, { a: 2, b: 2, dur: 0.3, label: 'Oben', kp: [1] }, { a: 2, b: 1, dur: 0.75, label: 'Absenken', kp: [4] }, { a: 1, b: 0, dur: 0.75, label: 'Absenken', kp: [4] }],
    keyPoints: [
      { short: 'Start', anchor: 'bar', side: 'r', status: 'single', text: 'Start mit der Stange an der oberen Brust, Griff knapp breiter als die Schultern.', src: ['S1'],
        explain: 'Protokoll von Hernández-Belmonte et al. 2020 (sitzend, Multipresse, n = 48): Obergriff 5–7 cm breiter als die Schultern, Stange berührt die obere Brust. Für das stehende Drücken wurde die Startposition nicht gemessen.' },
      { short: 'Oben', anchor: 'wrist', side: 'r', status: 'consensus', text: 'Nach oben drücken, bis die Ellbogen ganz gestreckt sind.', src: ['S1', 'S5'],
        explain: 'Endkriterium der Protokolle. Der volle Bewegungsumfang bis zum gestreckten Ellbogen aktivierte alle gemessenen Schultermuskeln stärker als 90° oder 135° (Paoli et al. 2010, n = 6, sitzend, Abstract).' },
      { short: 'Rumpf', anchor: 'lowBack', side: 'l', status: 'single', text: 'Rumpf ruhig halten: Im Stehen stabilisiert der Körper die Last selbst.', src: ['S6'],
        explain: 'Stehend war das 1RM mit Kurzhanteln ≈ 10 % niedriger als sitzend; stehend und mit Kurzhanteln war die Schulteraktivität am höchsten (Saeterbakken & Fimland 2013, n = 15, Abstract). Wie viel sich die Lendenwirbelsäule im Stehen bewegt, wurde nicht gemessen.' },
      { short: 'Mitte', anchor: 'head', side: 'l', status: 'single', text: 'Die schwerste Stelle liegt etwa auf halber Höhe – dort nicht ins Hohlkreuz ausweichen.', src: ['S1'],
        explain: 'Geschwindigkeitsminimum bei 46 ± 6 % des Stangenwegs ab 75 % 1RM (Hernández-Belmonte et al. 2020, sitzend). „Nicht ins Hohlkreuz“ ist Trainingswissen und nicht untersucht.' },
      { short: 'Ab', anchor: 'elbow', side: 'r', status: 'single', text: 'Stange kontrolliert bis zur oberen Brust absenken.', src: ['S1'],
        explain: 'Protokoll: kontrolliertes Absenken bis zur oberen Brust, dann ohne Pause drücken (Hernández-Belmonte et al. 2020). Ein Tempovergleich liegt nicht vor.' }
    ],
    sources: {
      S1: { label: 'Hernández-Belmonte et al. 2020, Biol Sport', url: 'https://doi.org/10.5114/biolsport.2020.98453', read: 'fulltext', note: 'Sitzend an der Multipresse; übertragen' },
      S5: { label: 'Paoli et al. 2010, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3181d756ea', read: 'abstract' },
      S6: { label: 'Saeterbakken & Fimland 2013, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e318276b873', read: 'abstract' }
    }
  },

  // ---------- Schulterdrücken mit Kurzhanteln (sitzend) ----------
  {
    ref: 'shoulder-press-dumbbell', view: 'side', basis: 'protocol',
    basisNote: 'Keine Studie hat die Bewegung gemessen. Bank 85°, volle Ellbogenstreckung und Hände über den Schultergelenken sind Protokollvorgaben einer EMG-Studie (2013, 24 Frauen, 4,5 kg). Arme außerhalb der Bildebene verkürzt dargestellt; die Tiefe unten ist Konvention.',
    tempo: { basis: 'convention', note: 'Protokolle: selbst gewählt, „kontrolliert“ (EMG-Studie 2013); hier 1,2 s auf / 1,5 s ab.' },
    frames: [
      { label: 'Unten', pose: { root: 'hip', rootPos: [0, -98], trunk: V(-5, 'D1', 'protocol', 'Bank 85°'), hip: C(85), knee: C(90), foot: C(90, 'Fuß flach'), armPoints: { elbow: [14, 36], wrist: [20, -8] }, props: shoulderPressProps },
        facts: [V(1, 'D1', 'protocol', 'Umkehrpunkt: Hantelbewegung wechselt von abwärts nach aufwärts; keine Tiefe vorgegeben')] },
      { label: 'Oben', pose: { root: 'hip', rootPos: [0, -98], trunk: V(-5, 'D1', 'protocol', 'Bank 85°'), hip: C(85), knee: C(90), foot: C(90, 'Fuß flach'), armPoints: { elbow: [8, -50], wrist: [10, -102] }, props: shoulderPressProps },
        facts: [V(0, 'D1', 'protocol', 'volle Ellbogenstreckung, Hände über den Schultergelenken')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.1, label: 'Unten', kp: [0, 2] }, { a: 0, b: 1, dur: 1.2, label: 'Drücken', kp: [1] }, { a: 1, b: 1, dur: 0.4, label: 'Oben', kp: [1] }, { a: 1, b: 0, dur: 1.5, label: 'Absenken', kp: [2, 3] }],
    keyPoints: [
      { short: 'Bank', anchor: 'back', side: 'l', status: 'single', text: 'Bank fast senkrecht (≈ 85°) stellen; Rücken und Gesäß bleiben an der Lehne.', src: ['D1', 'S1'],
        explain: '85° Lehne in der EMG-Studie 2013; 10° Rücklage mit Kopf, Rücken und Gesäß an der Lehne beim sitzenden Langhanteldrücken (Hernández-Belmonte et al. 2020). Ein Lehnenvergleich wurde nicht untersucht.' },
      { short: 'Oben', anchor: 'wrist', side: 'r', status: 'consensus', text: 'Hanteln hochdrücken, bis die Ellbogen gestreckt sind; Hände über den Schultern.', src: ['D1', 'S5'],
        explain: 'Protokoll der EMG-Studie 2013 (volle Streckung, Hände über den Schultergelenken). Der volle Bewegungsumfang aktivierte die Schultermuskeln stärker als Teilbereiche (Paoli et al. 2010, n = 6, Abstract).' },
      { short: 'Ab', anchor: 'elbow', side: 'r', status: 'single', text: 'Kontrolliert absenken und unten ohne Pause wenden.', src: ['D1'],
        explain: 'Umkehrpunkt im Protokoll: der Moment, in dem die Hantel die Richtung wechselt; eine Tiefe wurde nicht vorgegeben oder gemessen.' },
      { short: 'Hanteln', anchor: 'hand', side: 'r', status: 'single', text: 'Kurzhanteln fordern die Schulter etwas mehr als die Langhantel; das Gewicht ist niedriger.', src: ['S6', 'D3'],
        explain: 'Sitzend war die vordere Schulter mit Kurzhanteln ≈ 11 % aktiver als mit der Langhantel; das 1RM mit Kurzhanteln lag stehend ≈ 7 % unter dem der Langhantel (Saeterbakken & Fimland 2013, n = 15, Abstract). Mit Kurzhanteln sank die Last und die Trizepsaktivität (Kohler et al. 2010, n = 30, Abstract).' }
    ],
    sources: {
      D1: { label: 'Schulteraktivierung beim Kurzhanteldrücken, 2013, J Sports Med (Hindawi)', url: 'https://doi.org/10.1155/2013/612650', read: 'fulltext' },
      D3: { label: 'Kohler et al. 2010, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3181c8655a', read: 'abstract' },
      S1: { label: 'Hernández-Belmonte et al. 2020, Biol Sport', url: 'https://doi.org/10.5114/biolsport.2020.98453', read: 'fulltext' },
      S5: { label: 'Paoli et al. 2010, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3181d756ea', read: 'abstract' },
      S6: { label: 'Saeterbakken & Fimland 2013, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e318276b873', read: 'abstract' }
    }
  },

  // ---------- Langhantelrudern ----------
  {
    ref: 'barbell-row', view: 'side', basis: 'protocol',
    basisNote: 'Keine Studie hat Rumpf-, Hüft-, Knie- oder Armwinkel beim vorgebeugten Rudern gemessen. Vorgaben aus einem Kraft-Geschwindigkeits-Protokoll (Sports 2023): schulterbreiter Obergriff, Knie leicht gebeugt, Oberkörper weit vorgeneigt, Zug aus gestreckten Armen bis zum Bauch. Die Rumpfneigung (≈ 65°) ist Konvention.',
    tempo: { basis: 'convention', note: 'Kein Tempo gemessen oder vorgegeben; hier 1 s ziehen / 1,5 s absenken.' },
    frames: [
      { label: 'Unten', pose: { shank: C(5), knee: V(20, 'R1', 'protocol', '„Beine leicht gebeugt“'), ankle: C(5), trunk: C(65, 'Oberkörper weit vorgeneigt (Protokoll: „fast waagerecht“); nicht gemessen'), shoulder: C(65, 'Arme hängen senkrecht'), elbow: V(0, 'R1', 'protocol', 'Start mit gestreckten Ellbogen'), props: rowBarProps } },
      { label: 'Oben', pose: { shank: C(5), knee: V(20, 'R1', 'protocol', '„Beine leicht gebeugt“'), ankle: C(5), trunk: C(65, 'Oberkörper weit vorgeneigt; nicht gemessen'), shoulder: C(-25, 'Oberarm hinter die Rumpflinie gezogen; nicht gemessen'), elbow: C(95, 'nicht gemessen; Stange am Bauch'), armScale: [0.95, 0.95], props: rowBarProps },
        facts: [V(1, 'R1', 'protocol', 'Endpunkt: Stange berührt den Bauch bzw. unteren Brustkorb')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Unten', kp: [0, 1] }, { a: 0, b: 1, dur: 1.0, label: 'Ziehen', kp: [2] }, { a: 1, b: 1, dur: 0.2, label: 'Oben', kp: [2, 3] }, { a: 1, b: 0, dur: 1.5, label: 'Absenken', kp: [4] }],
    keyPoints: [
      { short: 'Griff', anchor: 'bar', side: 'r', status: 'single', text: 'Griff etwa schulterbreit, Handrücken nach oben (Obergriff).', src: ['R1'],
        explain: 'Protokoll (Sports 2023, n = 28): Obergriff auf Schulterbreite (Akromion zu Akromion). Griffbreiten wurden beim Langhantelrudern nicht verglichen.' },
      { short: 'Haltung', anchor: 'back', side: 'l', status: 'consensus', text: 'Knie leicht beugen, aus der Hüfte vorkippen, Rücken neutral halten.', src: ['R1', 'R3'],
        explain: 'Aufbau in beiden Protokollen: Knie leicht gebeugt, Oberkörper weit vorgeneigt, Wirbelsäule neutral. Winkel wurden nicht gemessen; die gezeigte Neigung ist Konvention.' },
      { short: 'Zug', anchor: 'belly', side: 'r', status: 'single', text: 'Aus gestreckten Armen die Stange zum unteren Brustkorb oder Bauch ziehen.', src: ['R1'],
        explain: 'Start mit gestreckten Ellbogen, Ende bei Berührung des Bauchs (Sports 2023). Ellbogenwinkel und Zugweg wurden nicht gemessen.' },
      { short: 'Rücken', anchor: 'lowBack', side: 'l', status: 'single', text: 'Vorgebeugt belastete die Lendenwirbelsäule stärker als Kabel- oder hängendes Rudern.', src: ['R3'],
        explain: 'Fenwick, Brown & McGill 2009 (n = 7, Abstract): Das vorgebeugte Rudern aktivierte den Rücken symmetrisch am stärksten, erzeugte aber die größte Lendenwirbelsäulenlast – und die höchste Steifigkeit. Ob das schädlich oder nützlich ist, hängt vom Ziel ab; Verletzungsdaten gibt es nicht.' },
      { short: 'Ab', anchor: 'elbow', side: 'r', status: 'single', text: 'Kontrolliert absenken, bis die Arme wieder gestreckt sind.', src: ['R1'],
        explain: 'Jede Wiederholung begann und endete mit gestreckten Ellbogen (Sports 2023). Das Absenktempo ist nicht untersucht.' }
    ],
    sources: {
      R1: { label: 'Kraft-Geschwindigkeits-Profile dreier Ruderübungen, 2023, Sports (MDPI)', url: 'https://doi.org/10.3390/sports11110220', read: 'fulltext' },
      R3: { label: 'Fenwick, Brown & McGill 2009, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3181942019', read: 'abstract' }
    }
  },

  // ---------- Bizepscurls ----------
  {
    ref: 'dumbbell-curl', view: 'side', basis: 'measured',
    basisNote: 'Bewegungsumfang des Ellbogens aus Marcolin et al. 2018 (Elektrogoniometer, 12 trainierte Männer, 65 % 1RM, Volltext): 123,1 ± 12,3°. Absolute Start- und Endwinkel wurden nicht berichtet; Start ≈ 15° Beugung ist Konvention, der obere Winkel folgt daraus. Leichte Vorbewegung des Ellbogens oben ist Konvention.',
    tempo: { basis: 'measured', note: 'Konzentrisch 1,44 ± 0,26 s, exzentrisch 1,72 ± 0,47 s bei Metronomvorgabe 3 s je Wiederholung (Marcolin et al. 2018).' },
    frames: [
      { label: 'Unten', pose: { shank: C(0), knee: C(3), hip: C(0), ankle: C(0), shoulder: C(0), elbow: C(15, 'fast gestreckt; Start nicht gemessen'), props: curlProps } },
      { label: 'Oben', pose: { shank: C(0), knee: C(3), hip: C(0), ankle: C(0), shoulder: C(8, 'leichte Vorbewegung des Ellbogens; nicht gemessen'), elbow: K(138, 'S1', 'Start 15° + gemessener Bewegungsumfang 123,1 ± 12,3°'), props: curlProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Unten', kp: [0, 1] }, { a: 0, b: 1, dur: 1.44, label: 'Beugen', kp: [1, 3] }, { a: 1, b: 1, dur: 0.2, label: 'Oben', kp: [2] }, { a: 1, b: 0, dur: 1.72, label: 'Senken', kp: [4] }],
    keyPoints: [
      { short: 'Oberarm', anchor: 'uarm', side: 'l', status: 'single', text: 'Oberarme bleiben seitlich am Körper; nur der Unterarm bewegt sich.', src: ['S1', 'S2'],
        explain: 'Haltung in den Protokollen: stehend, Arme seitlich am Körper (Oliveira et al. 2009; Marcolin et al. 2018). Wie weit der Ellbogen tatsächlich nach vorn wandert, wurde in keiner begutachteten Studie gemessen.' },
      { short: 'Rumpf', anchor: 'chest', side: 'r', status: 'single', text: 'Rumpf und Knie ruhig halten – kein Schwung aus dem Körper.', src: ['S1'],
        explain: 'Rumpfbewegung und Kniebeugung wurden in Marcolin et al. 2018 per Sichtkontrolle unterbunden; gemessen wurde das Ausweichen nicht.' },
      { short: 'Weg', anchor: 'hand', side: 'r', status: 'single', text: 'Unten den Arm fast strecken, oben so weit beugen, wie es ohne Ausweichen geht.', src: ['S1'],
        explain: 'Gemessener Umfang 123,1 ± 12,3° mit Kurzhanteln (Marcolin et al. 2018). Start- und Endwinkel wurden nicht berichtet.' },
      { short: 'Hand', anchor: 'wrist', side: 'r', status: 'single', text: 'Handfläche dreht beim Heben nach oben (ab etwa halber Beugung).', src: ['S1'],
        explain: 'Beschreibung der Kurzhantelcurls durch die Autoren (halb gedreht am Start, supiniert ab ≈ 90° Beugung), keine Messung. Ob die Drehung die Bizepsaktivität erhöht, wurde dort nicht geprüft.' },
      { short: 'Variante', anchor: 'elbow', side: 'l', status: 'single', text: 'Mit Kurzhanteln war der Bewegungsumfang etwas größer als mit SZ- oder gerader Stange.', src: ['S1', 'S2'],
        explain: 'Kurzhantel 123,1°, SZ-Stange 119,9°, gerade Stange 117,3° (Marcolin et al. 2018; der Text der Studie widerspricht an einer Stelle den eigenen Mittelwerten). Stehende und Schrägbank-Curls aktivierten den Bizeps über den ganzen Weg ähnlich, Scott-Curls nur über einen kurzen Bereich (Oliveira et al. 2009, n = 22, Abstract).' }
    ],
    sources: {
      S1: { label: 'Marcolin et al. 2018, PeerJ', url: 'https://doi.org/10.7717/peerj.5165', read: 'fulltext' },
      S2: { label: 'Oliveira et al. 2009, J Sports Sci Med', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3737788/', read: 'abstract' }
    }
  },

  // ---------- Trizepsdrücken am Kabel ----------
  {
    ref: 'triceps-pushdown', view: 'side', basis: 'protocol',
    basisNote: 'Keine Studie hat die Bewegung gemessen. Oberarme senkrecht und nah am Körper, Rumpf leicht vorgeneigt, Ellbogen 90° → 0° sind Protokollvorgaben (Hussain et al. 2020; Rendos et al. 2016). Die Rumpfneigung (≈ 8°) ist Konvention.',
    tempo: { basis: 'protocol', note: '1,5 s je Phase (Rendos et al. 2016); Hussain et al. 2020: 3 Schläge drücken / 2 Schläge zurück ohne Pause.' },
    frames: [
      { label: 'Oben', pose: { rootPos: [-44, -15], shank: C(3), knee: C(8), ankle: C(3), trunk: C(8, 'leicht vorgeneigt (Protokoll, kein Winkel)'), shoulder: K(8, 'T1', 'Oberarm senkrecht bei 8° Rumpfneigung'), elbow: V(90, 'T2', 'protocol'), armScale: [1, 0.95], props: pushdownProps } },
      { label: 'Gestreckt', pose: { rootPos: [-44, -15], shank: C(3), knee: C(8), ankle: C(3), trunk: C(8, 'leicht vorgeneigt (Protokoll, kein Winkel)'), shoulder: K(8, 'T1', 'Oberarm senkrecht bei 8° Rumpfneigung'), elbow: V(0, 'T1', 'protocol', 'volle Streckung'), armScale: [1, 0.95], props: pushdownProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Oben', kp: [0, 4] }, { a: 0, b: 1, dur: 1.5, label: 'Drücken', kp: [2] }, { a: 1, b: 1, dur: 0.2, label: 'Gestreckt', kp: [2] }, { a: 1, b: 0, dur: 1.5, label: 'Zurück', kp: [3, 1] }],
    keyPoints: [
      { short: 'Oberarme', anchor: 'uarm', side: 'l', status: 'single', text: 'Oberarme senkrecht und nah am Körper; sie bleiben während der Bewegung ruhig.', src: ['T1'],
        explain: 'Protokoll von Hussain et al. 2020 (n = 25, Untrainierte): Oberarme nah am, aber nicht am Körper, senkrecht zum Boden. Die Oberarmbewegung wurde nicht gemessen.' },
      { short: 'Rumpf', anchor: 'chest', side: 'r', status: 'single', text: 'Oberkörper leicht vorgeneigt; nicht mit dem Körpergewicht nachdrücken.', src: ['T1'],
        explain: 'Vorneigung nur so weit, dass die Stange bei voller Streckung am Körper vorbeikommt; keine Unterstützung durch das Körpergewicht (Protokoll). Ein Winkel wurde nicht angegeben.' },
      { short: 'Unten', anchor: 'hand', side: 'r', status: 'consensus', text: 'Nach unten drücken, bis die Arme ganz gestreckt sind.', src: ['T1', 'T2'],
        explain: 'Endpunkt beider Protokolle (0° Ellbogenbeugung).' },
      { short: 'Zurück', anchor: 'elbow', side: 'l', status: 'consensus', text: 'Zurück bis etwa 90° im Ellbogen, kontrolliert und ohne Pause umkehren.', src: ['T1', 'T2'],
        explain: 'Startwinkel 90° (Rendos et al. 2016) und keine Pause am Umkehrpunkt (Hussain et al. 2020). Ein größerer Bereich wurde nicht verglichen.' },
      { short: 'Griff', anchor: 'wrist', side: 'r', status: 'single', text: 'Gerade Stange im Obergriff, schulterbreit; Griffform ändert vor allem den Unterarm.', src: ['T1', 'T2'],
        explain: 'Schulterbreiter Obergriff an der geraden Stange (Hussain et al. 2020). Verschiedene Griffe (Stange, Kugelgriff) änderten die Trizepsaktivität nicht, nur die der Unterarmmuskeln (Rendos et al. 2016, Abstract).' }
    ],
    sources: {
      T1: { label: 'Hussain et al. 2020, Front Physiol', url: 'https://doi.org/10.3389/fphys.2020.00112', read: 'fulltext' },
      T2: { label: 'Rendos et al. 2016, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000001293', read: 'abstract' }
    }
  },

  // ---------- Schrägbankdrücken mit Kurzhanteln ----------
  {
    ref: 'incline-press-dumbbell', view: 'side', basis: 'transfer',
    basisNote: 'Keine Kinematik für Kurzhanteln auf der Schrägbank gefunden. Der Ellbogen-Bewegungsumfang (84,3 ± 6,4°) stammt aus einer Langhantel-Schrägbankstudie mit leichter Last (Schütz et al. 2022, 20 Personen, Bankwinkel nicht berichtet; Volltext). Bankwinkel 30° nach Rodríguez-Ridao et al. 2020; Armhaltung außerhalb der Bildebene verkürzt dargestellt, Tiefe unten ist Konvention.',
    tempo: { basis: 'protocol', note: 'Exzentrisch 2–3 s (Langhantel-Schrägbank, Sci Rep 2025); Drücken ≈ 1,2 s (Konvention).' },
    frames: [
      { label: 'Oben', pose: { root: 'hip', rootPos: [0, -100], trunk: V(-60, 'P3', 'abstract', 'Bank 30° (höchste Aktivität des oberen Brustmuskels)'), hip: C(30), knee: C(90), foot: C(90, 'Fuß flach'), armPoints: { elbow: [10, -54], wrist: [12, -106] }, props: inclineProps },
        facts: [V(0, 'P2', 'protocol', 'Drücken bis zur vollen Ellbogenstreckung')] },
      { label: 'Unten', pose: { root: 'hip', rootPos: [0, -100], trunk: V(-60, 'P3', 'abstract', 'Bank 30°'), hip: C(30), knee: C(90), foot: C(90, 'Fuß flach'), armPoints: { elbow: [16, 30], wrist: [30, -14] }, props: inclineProps },
        facts: [V(84.3, 'P1', 'fulltext', 'Übertragen: Ellbogen-Bewegungsumfang 84,3 ± 6,4° (Langhantel, 15 % Körpergewicht); 81,4° bei 30 %'), V(1, 'P5', 'protocol', 'Unten: Hanteln bis auf Brusthöhe (Flachbank: Band zwischen den Hanteln berührt die Brust)')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Oben', kp: [0, 1] }, { a: 0, b: 1, dur: 2.5, label: 'Absenken', kp: [2] }, { a: 1, b: 1, dur: 0.15, label: 'Unten', kp: [2] }, { a: 1, b: 0, dur: 1.2, label: 'Drücken', kp: [3, 4] }],
    keyPoints: [
      { short: 'Bank', anchor: 'back', side: 'l', status: 'contested', text: 'Bank auf etwa 30–45° stellen; flacher betont die Brust, steiler die vordere Schulter.', src: ['P3', 'P4', 'P2'],
        explain: 'Umstritten. 30° ergab die höchste Aktivität des oberen Brustmuskels, ab 45° verlagerte sie sich zur vorderen Schulter (Rodríguez-Ridao et al. 2020, n = 30, 60 % 1RM, Abstract); 30° und 45° lagen beide über der Flachbank, nur in einem Teil der Druckphase (Lauver et al. 2016, n = 14, Abstract). Die Kraft-Geschwindigkeits-Studie nutzte 45° (Sci Rep 2025). Langzeitwachstum nach Bankwinkel wurde nicht untersucht.' },
      { short: 'Kontakt', anchor: 'upperBack', side: 'l', status: 'consensus', text: 'Kopf, Schultern und Gesäß bleiben auf der Bank, Füße am Boden.', src: ['P5', 'P2'],
        explain: 'Protokolle: Kopf, Schultern und Hüfte an der Bank (Saeterbakken et al. 2020, Flachbank); Füße am Boden (Sci Rep 2025, Schrägbank 45°).' },
      { short: 'Senken', anchor: 'elbow', side: 'r', status: 'single', text: 'Hanteln kontrolliert bis auf Brusthöhe absenken (etwa 2–3 s).', src: ['P2', 'P5'],
        explain: 'Exzentrisch 2–3 s als Vorgabe (Sci Rep 2025, Langhantel); Tiefe bis auf Brusthöhe (Saeterbakken et al. 2020, Kurzhanteln, Flachbank). Für Kurzhanteln auf der Schrägbank liegt keine Messung vor.' },
      { short: 'Oben', anchor: 'wrist', side: 'r', status: 'consensus', text: 'Nach oben drücken, bis die Arme gestreckt sind.', src: ['P2', 'P5'],
        explain: 'Endkriterium beider Protokolle. Der Ellbogenweg auf der Schrägbank war etwas größer als auf der Flachbank (84° gegenüber 80°; Schütz et al. 2022, Langhantel).' },
      { short: 'Hanteln', anchor: 'hand', side: 'r', status: 'single', text: 'Mit Kurzhanteln ist das Gewicht niedriger, die Brustaktivität ähnlich wie mit der Stange.', src: ['P6'],
        explain: 'Flachbank, 1RM: Kurzhanteln 17 % weniger Last als die Langhantel, Brust- und vordere Schulteraktivität gleich, Bizeps höher, Trizeps niedriger (Saeterbakken et al. 2011, n = 12, Abstract). Für die Schrägbank nicht gemessen.' }
    ],
    sources: {
      P1: { label: 'Schütz et al. 2022, Sports (MDPI)', url: 'https://doi.org/10.3390/sports10020019', read: 'fulltext', note: 'Langhantel, 15/30 % Körpergewicht, Bankwinkel nicht berichtet' },
      P2: { label: 'Kraft-Geschwindigkeit Flach- und Schrägbank, 2025, Sci Rep', url: 'https://doi.org/10.1038/s41598-025-12166-5', read: 'fulltext' },
      P3: { label: 'Rodríguez-Ridao et al. 2020, Int J Environ Res Public Health', url: 'https://doi.org/10.3390/ijerph17197339', read: 'abstract' },
      P4: { label: 'Lauver et al. 2016, Eur J Sport Sci', url: 'https://doi.org/10.1080/17461391.2015.1022605', read: 'abstract' },
      P5: { label: 'Saeterbakken et al. 2020, PLoS One', url: 'https://doi.org/10.1371/journal.pone.0235555', read: 'fulltext' },
      P6: { label: 'Saeterbakken et al. 2011, J Sports Sci', url: 'https://doi.org/10.1080/02640414.2010.543916', read: 'abstract' }
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
  // Schulterpolster-Maschine: Säule vor der Figur, Schlitten mit Polster (folgt den Schultern) und Griffe an der Säule.
  const s = P.joints.shoulder, pad = [s[0] - 6, s[1] - 14], col = 118, top = pad[1] - 64, hand = P.joints.hand;
  return { anchors: {}, scene: [
    { type: 'rect', x: 16, y: -STEP, w: 22, h: STEP, rx: 2, step: true },
    { type: 'line', from: [col, 0], to: [col, -410], w: 7 }, foot(col - 40, col + 40), // Säule, Standfuß
    { type: 'line', from: [col, top], to: [pad[0], top], w: 6 }, { type: 'line', from: [pad[0], top], to: [pad[0], pad[1]], w: 4 }, // Schlitten, Haltearm zum Polster
    { type: 'rect', x: pad[0] - 16, y: pad[1] - 4, w: 32, h: 10, rx: 4 }, // Schulterpolster
    { type: 'line', from: [col, hand[1]], to: [hand[0] + 2, hand[1]], w: 4 }, { type: 'line', from: [hand[0] - 10, hand[1]], to: [hand[0] + 10, hand[1]], w: 3 } // Griffarm, Griff
  ] };
}
function dipProps(P) {
  // Barren laufen von vorn nach hinten, in der Seitenansicht als Stangen mit Stütze vorn und hinten.
  const w = P.joints.wrist, y = w[1] + 2;
  return { anchors: { uarm: midpoint(P.joints.shoulder, P.joints.elbow) }, scene: [
    { type: 'line', from: [w[0] - 62, y], to: [w[0] + 62, y], w: 6 }, // Barren
    { type: 'line', from: [w[0] - 62, y], to: [w[0] - 62, 0], w: 6 }, { type: 'line', from: [w[0] + 62, y], to: [w[0] + 62, 0], w: 6 }, foot(w[0] - 92, w[0] + 92), // Stützen, Standfuß
    { type: 'bar', at: [w[0], y], r: 5 }
  ] };
}
function benchProps(P) {
  const bar = P.joints.hand;
  return { anchors: { bar }, scene: [{ type: 'rect', x: -95, y: -92, w: 225, h: 12, rx: 3 }, { type: 'line', from: [-60, -80], to: [-60, 0], w: 5 }, { type: 'line', from: [100, -80], to: [100, 0], w: 5 }, plate(bar)] };
}
function pushupProps(P) { return { anchors: {}, scene: [] }; }
function rowProps(P) {
  const hand = P.joints.hand, pulley = [240, -70];
  return { anchors: { hand, uarm: midpoint(P.joints.shoulder, P.joints.elbow) }, scene: [
    { type: 'rect', x: -34, y: -90, w: 68, h: 10, rx: 3 }, { type: 'line', from: [0, -80], to: [0, 0], w: 5 }, // Sitz
    { type: 'line', from: [166, -78], to: [190, -8], w: 5 }, // Fußplatte
    { type: 'line', from: [264, 0], to: [264, -100], w: 7 }, { type: 'line', from: [264, -70], to: [pulley[0], -70], w: 5 }, foot(110, 290), // Turm der Kabelrolle, Arm, Standfuß
    { type: 'line', from: hand, to: pulley, w: 1.5, dash: true }, { type: 'bar', at: hand, r: 4 }, { type: 'bar', at: pulley, r: 9 }
  ] };
}
// Frontansicht
function pullupProps(P) {
  return { anchors: { bar: [0, PU.bar] }, scene: [{ type: 'line', from: [-130, PU.bar], to: [130, PU.bar], w: 5 }, { type: 'bar', at: [-130, PU.bar], r: 5 }, { type: 'bar', at: [130, PU.bar], r: 5 }] };
}
function pulldownProps(P) {
  const hr = P.joints.handR, hl = P.joints.handL, y = (hr[1] + hl[1]) / 2;
  return { anchors: { bar: [0, y] }, scene: [
    { type: 'rect', x: -36, y: -100, w: 72, h: 10, rx: 3 }, { type: 'line', from: [0, -90], to: [0, 0], w: 5 }, foot(-64, 64), // Sitz, Standfuß
    { type: 'line', from: [-32, -376], to: [32, -376], w: 6 }, { type: 'bar', at: [0, -370], r: 6 }, // Träger und Umlenkrolle oben
    { type: 'line', from: [0, -370], to: [0, y - 4], w: 1.5, dash: true }, // Seilzug
    // Oberschenkelpolster: zwei Polster auf den Oberschenkeln, an den Sitzkanten gehalten
    { type: 'rect', x: -34, y: -130, w: 28, h: 10, rx: 4, front: true }, { type: 'rect', x: 6, y: -130, w: 28, h: 10, rx: 4, front: true },
    { type: 'line', from: [-34, -125], to: [-34, -100], w: 4 }, { type: 'line', from: [34, -125], to: [34, -100], w: 4 },
    { type: 'line', from: [hl[0] - 14, y], to: [hr[0] + 14, y], w: 5, front: true }, { type: 'bar', at: [hr[0] + 14, y], r: 4 }, { type: 'bar', at: [hl[0] - 14, y], r: 4 }
  ] };
}
function raiseProps(P) {
  return { anchors: {}, scene: [{ type: 'dumbbell', at: P.joints.handR }, { type: 'dumbbell', at: P.joints.handL }] };
}
// ---------- Szenen der zweiten Runde (v2.1) ----------
const segDir = (P, seg) => P.F[seg].d; // Richtung eines Segments (Einheitsvektor)
const segNrm = (P, seg) => P.F[seg].n; // Normale (zeigt im Stand nach vorn)
const along = (p, d, k) => [p[0] + d[0] * k, p[1] + d[1] * k];
function benchLine(P, back, up, down) { // Lehne hinter dem Rumpf (back: Abstand hinter der Rumpfachse), von „down“ unter der Hüfte bis „up“ über ihr
  const d = segDir(P, 'trunk'), n = segNrm(P, 'trunk'), h = P.joints.hip; // d: Schulter → Hüfte
  const base = along(h, n, -back);
  return { type: 'line', from: along(base, d, -up), to: along(base, d, down), w: 14 };
}
function frontSquatProps(P) { const bar = trunkPoint(P, 12, -2); return { anchors: { bar }, scene: [plate(bar)] }; }
function legPressProps(P) {
  const an = P.joints.ankle, fd = segDir(P, 'foot'), fn = segNrm(P, 'foot');
  const sole = along(an, fn, -15), rail = [Math.SQRT1_2, -Math.SQRT1_2]; // Schienen 45° nach vorn-oben
  const pc = along(sole, fd, 12); // Plattenmitte
  return { anchors: { plate: along(pc, rail, 10) }, scene: [
    { type: 'line', from: along(pc, rail, -150), to: along(pc, rail, 90), w: 5 }, // Schiene
    { type: 'line', from: [pc[0] + 60, 0], to: along(pc, rail, 60), w: 5 }, // Stütze
    benchLine(P, 30, 150, 4), { type: 'line', from: along(along(P.joints.hip, segDir(P, 'trunk'), 16), segNrm(P, 'trunk'), -30), to: along(along(P.joints.hip, segDir(P, 'trunk'), 16), segNrm(P, 'trunk'), 44), w: 14 }, // Lehne, Sitz
    { type: 'line', from: [P.joints.hip[0] + 20, P.joints.hip[1] + 20], to: [P.joints.hip[0] + 20, 0], w: 5 }, foot(P.joints.hip[0] - 30, pc[0] + 80), // Standfuß
    { type: 'line', from: along(pc, fd, -34), to: along(pc, fd, 46), w: 8, front: true } // Fußplatte
  ] };
}
function legExtensionProps(P) {
  const an = P.joints.ankle, kn = P.joints.knee, sd = segDir(P, 'shank'), sn = segNrm(P, 'shank');
  const pad = along(along(an, sd, -8), sn, 19); // Mitte der Rolle: Schienbeinrand (≈ 8) + Rollenradius 11, knapp über dem Knöchel
  const h = P.joints.hip;
  return { anchors: { pad }, scene: [
    { type: 'rect', x: h[0] - 40, y: h[1] + 2, w: 90, h: 12, rx: 4 }, benchLine(P, 26, 120, -8), // Sitz, Lehne
    { type: 'line', from: [h[0] - 10, h[1] + 14], to: [h[0] - 10, 0], w: 6 }, { type: 'line', from: [h[0] - 50, 0], to: [h[0] + 40, 0], w: 4 },
    { type: 'line', from: kn, to: pad, w: 7, front: true }, { type: 'bar', at: pad, r: 11 } // gepolsterter Hebel ab Knieachse, Rolle
  ] };
}
function legCurlProps(P) {
  const an = P.joints.ankle, kn = P.joints.knee, sd = segDir(P, 'shank'), sn = segNrm(P, 'shank');
  const pad = along(along(an, sd, -8), sn, -19); // Mitte der Rolle: Wadenrand (≈ 8) + Rollenradius 11, hinten an der Wade knapp über der Ferse
  const h = P.joints.hip, s = P.joints.shoulder;
  const seat = along(h, segDir(P, 'thigh'), 40);
  return { anchors: { pad }, scene: [
    { type: 'line', from: [s[0] + 40, h[1] + 20], to: [h[0] - 4, h[1] + 20], w: 14 }, // Polster Rumpf
    { type: 'line', from: along(h, segNrm(P, 'thigh'), 20), to: along(seat, segNrm(P, 'thigh'), 20), w: 14 }, // schräges Polster Oberschenkel
    { type: 'line', from: [h[0] + 20, h[1] + 27], to: [h[0] + 20, 0], w: 6 }, { type: 'line', from: [s[0] + 30, h[1] + 27], to: [s[0] + 30, 0], w: 6 },
    foot(Math.min(h[0] + 20, s[0] + 30) - 30, Math.max(h[0] + 20, s[0] + 30) + 30), // Standfuß
    { type: 'line', from: kn, to: pad, w: 7, front: true }, { type: 'bar', at: pad, r: 11 }
  ] };
}
function ohpProps(P) { const bar = P.joints.hand; return { anchors: { bar }, scene: [plate(bar)] }; }
function shoulderPressProps(P) {
  const hand = P.joints.hand, h = P.joints.hip;
  return { anchors: { hand }, scene: [
    { type: 'rect', x: h[0] - 30, y: h[1] + 2, w: 64, h: 12, rx: 4 }, benchLine(P, 26, 130, -8),
    { type: 'line', from: [h[0], h[1] + 14], to: [h[0], 0], w: 6 }, foot(h[0] - 40, h[0] + 40), dumbbell(hand)
  ] };
}
function rowBarProps(P) { const bar = P.joints.hand; return { anchors: { bar, uarm: midpoint(P.joints.shoulder, P.joints.elbow) }, scene: [plate(bar)] }; }
function curlProps(P) { const hand = P.joints.hand; return { anchors: { hand, uarm: midpoint(P.joints.shoulder, P.joints.elbow) }, scene: [dumbbell(hand)] }; }
function pushdownProps(P) {
  const hand = P.joints.hand, top = [100, -410];
  return { anchors: { hand, uarm: midpoint(P.joints.shoulder, P.joints.elbow) }, scene: [
    { type: 'line', from: [top[0] + 40, 0], to: [top[0] + 40, -420], w: 6 }, { type: 'line', from: [top[0] - 12, -420], to: [top[0] + 40, -420], w: 6 }, // Säule, Ausleger
    { type: 'line', from: top, to: hand, w: 1.5, dash: true }, { type: 'bar', at: top, r: 7 }, // Seil, Umlenkrolle
    { type: 'line', from: [hand[0] - 12, hand[1]], to: [hand[0] + 12, hand[1]], w: 5, front: true } // Griffstange
  ] };
}
function inclineProps(P) {
  const hand = P.joints.hand, h = P.joints.hip;
  const top = along(along(h, segNrm(P, 'trunk'), -24), segDir(P, 'trunk'), -165); // oberes Ende der Lehne
  return { anchors: { hand }, scene: [
    benchLine(P, 24, 170, -6), { type: 'line', from: [h[0] - 20, h[1] + 24], to: [h[0] + 50, h[1] + 24], w: 14 }, // Lehne, Sitz
    { type: 'line', from: [h[0] + 10, h[1] + 30], to: [h[0] + 10, 0], w: 6 }, { type: 'line', from: top, to: [top[0], 0], w: 6 }, foot(h[0] - 20, h[0] + 40), foot(top[0] - 30, top[0] + 30), dumbbell(hand)
  ] };
}
const foot = (x0, x1) => ({ type: 'line', from: [x0, 0], to: [x1, 0], w: 5 }); // Standfuß einer Maschine auf dem Boden
function midpoint(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }

export function animationFor(ref) { return ANIMATIONS.find((a) => a.ref === ref) || null; }
export function framesOf(anim, variant) {
  const fr = Array.isArray(anim.frames) ? anim.frames : anim.frames[variant || anim.variants[0].key];
  return anim.view === 'front' ? fr.map((f) => ({ ...f, pose: { view: 'front', ...f.pose } })) : fr;
}
export { LEN };
