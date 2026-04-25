/**
 * GI-CDSS Clinical Decision Engine
 * Source: Sleisenger & Fordtran's Gastrointestinal and Liver Disease, 10th Ed.
 *
 * Question ID mapping (from questions.ts):
 *   Q1  = 1n   (single-select: primary complaint)
 *   Q2  = 2n   (multi-select: duration)
 *   Q3  = 3n   (multi-select: pain quality)
 *   Q4  = 4n   (multi-select: location + radiation)
 *   Q5  = 5n   (multi-select: aggravating / relieving)
 *   Q6  = 6n   (multi-select: associated symptoms)
 *   Q7  = 7n   (multi-select: bowel habit)
 *   Q8  = 8n   (multi-select: weight + appetite)
 *   Q9  = 9n   (multi-select: swallowing)
 *   Q10_AI  = 10n   (single-select: diarrhoea painful/painless gate)
 *   Q10_AII = 101n  (multi-select: diarrhoea deep-dive)
 *   Q10_B   = 102n  (multi-select: jaundice characterisation)
 *   Q11 = 11n  (multi-select: past history + medications)
 *   Q12 = 12n  (multi-select: family history + lifestyle)
 *   Q13 = 13n  (multi-select: alarm features)
 *   Q14 = 14n  (multi-select: organic vs functional)
 *   Q15 = 15n  (multi-select: demographics)
 */

export interface RedFlag {
  label: string;
  severity: "critical" | "warning";
  rationale: string;
}

export interface TieredInvestigation {
  tier: "emergency" | "urgent" | "routine";
  name: string;
  indication?: string;
}

export interface Differential {
  condition: string;
  icd10: string;
  romeIV?: string;
  confirmatoryTest: string;
  confidence: "High" | "Moderate" | "Low";
  rationale: string;
  fits: string[];
  against: string[];
  investigations: TieredInvestigation[];
  treatment: string;
  classification: "organic" | "functional";
  /** @deprecated legacy — kept for PDF compat */
  icdHint?: string;
}

export type Classification = "Organic" | "Functional" | "Indeterminate";

export interface ClinicalReport {
  redFlags: RedFlag[];
  differentials: Differential[];
  classification: Classification;
  classificationRationale: string;
  /** @deprecated legacy flat list — still populated for PDF export compat */
  suggestedInvestigations: string[];
  safetyNetting: string[];
}

// ─── Answer helpers ───────────────────────────────────────────────────────────

/** Get all selected options for a question (handles comma-separated multi-select) */
function getAnswerOptions(answers: Map<bigint, string>, qId: bigint): string[] {
  const val = answers.get(qId);
  if (!val) return [];
  return val
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Check if a specific option letter is selected for a question */
function hasOption(
  answers: Map<bigint, string>,
  qId: bigint,
  option: string,
): boolean {
  return getAnswerOptions(answers, qId).includes(option);
}

/** Check if any of the given options is selected for a question */
function hasAnyOption(
  answers: Map<bigint, string>,
  qId: bigint,
  options: string[],
): boolean {
  const selected = getAnswerOptions(answers, qId);
  return options.some((o) => selected.includes(o));
}

// ─── Tiered investigation builder helpers ─────────────────────────────────────
function emg(name: string, indication?: string): TieredInvestigation {
  return { tier: "emergency", name, indication };
}
function urg(name: string, indication?: string): TieredInvestigation {
  return { tier: "urgent", name, indication };
}
function rtn(name: string, indication?: string): TieredInvestigation {
  return { tier: "routine", name, indication };
}

export function analyzeSession(answers: [bigint, string][]): ClinicalReport {
  // Build a map for O(1) lookup
  const ansMap = new Map<bigint, string>();
  for (const [id, val] of answers) {
    ansMap.set(id, val);
  }

  // ─── Q1: Primary complaint (single-select) ───
  const primaryIsUpperGI = hasAnyOption(ansMap, 1n, ["A"]);
  const primaryIsDysphagia = hasAnyOption(ansMap, 1n, ["B"]);
  const _primaryIsNausea = hasAnyOption(ansMap, 1n, ["C"]);
  const primaryIsBowelChange = hasAnyOption(ansMap, 1n, ["D"]);
  const primaryIsBlood = hasAnyOption(ansMap, 1n, ["E"]);
  const primaryIsJaundice = hasAnyOption(ansMap, 1n, ["F"]);
  const _primaryIsBloating = hasAnyOption(ansMap, 1n, ["G"]);
  const primaryIsAnorectal = hasAnyOption(ansMap, 1n, ["H"]);
  const primaryIsWeightLoss = hasAnyOption(ansMap, 1n, ["I"]);
  const _primaryIsCombo = hasAnyOption(ansMap, 1n, ["J"]);

  // ─── Q2: Duration ───
  const acuteOnset = hasOption(ansMap, 2n, "A"); // <1 week sudden
  const _subacute = hasOption(ansMap, 2n, "B"); // 1–4 weeks
  const _months16 = hasOption(ansMap, 2n, "C"); // 1–6 months
  const chronic = hasAnyOption(ansMap, 2n, ["D", "E"]); // >6 months / recurrent

  // ─── Q3: Pain quality ───
  const burningPain = hasOption(ansMap, 3n, "A");
  const gnawingPain = hasOption(ansMap, 3n, "B");
  const _crampingPain = hasOption(ansMap, 3n, "C");
  const crampingPain = _crampingPain;
  const constantPain = hasOption(ansMap, 3n, "D");
  const _vaguePain = hasOption(ansMap, 3n, "E");
  const fullnessPain = hasOption(ansMap, 3n, "F");
  const _urgencySymp = hasOption(ansMap, 3n, "G");
  const noPain = hasOption(ansMap, 3n, "H");

  // ─── Q4: Location + radiation ───
  const retrosternal = hasOption(ansMap, 4n, "A"); // behind breastbone
  const ruqLocation = hasOption(ansMap, 4n, "B"); // RUQ → shoulder/back
  const epigastricBack = hasOption(ansMap, 4n, "C"); // epigastric → back
  const periumbilicalRLQ = hasOption(ansMap, 4n, "D"); // peri-umbilical → RLQ
  const llqLocation = hasOption(ansMap, 4n, "E"); // LLQ
  const rlqLocation = hasOption(ansMap, 4n, "F"); // RLQ
  const diffuseAbdo = hasOption(ansMap, 4n, "G"); // entire abdomen
  const anorectalLocation = hasOption(ansMap, 4n, "H"); // anorectal
  const throatLocation = hasOption(ansMap, 4n, "I"); // throat/swallowing
  const _luvLocation = hasOption(ansMap, 4n, "J"); // LUQ

  // ─── Q5: Aggravating / relieving ───
  const worseAfterMeal = hasOption(ansMap, 5n, "A");
  const betterWithFood = hasOption(ansMap, 5n, "B"); // duodenal ulcer
  const worseLyingDown = hasOption(ansMap, 5n, "C"); // GERD
  const worseFattyFood = hasOption(ansMap, 5n, "D"); // biliary
  const reliefDefecation = hasOption(ansMap, 5n, "E"); // IBS
  const worseSpecificFood = hasOption(ansMap, 5n, "F"); // celiac/FODMAP
  const nocturnalSymp = hasOption(ansMap, 5n, "G"); // organic flag
  const stressWorsens = hasOption(ansMap, 5n, "H"); // functional
  const _noPattern = hasOption(ansMap, 5n, "I");
  const _worsePostPrandial = hasOption(ansMap, 5n, "J"); // mesenteric ischaemia

  // ─── Q6: Associated symptoms ───
  const nauseaVomiting = hasOption(ansMap, 6n, "A");
  const haematemesis = hasOption(ansMap, 6n, "B"); // 🚨 UGIB
  const melaena = hasOption(ansMap, 6n, "C"); // 🚨 UGIB
  const brightRedBlood = hasOption(ansMap, 6n, "D"); // LGIB
  const sigWeightLoss = hasOption(ansMap, 6n, "E"); // 🚨 malignancy
  const fever = hasOption(ansMap, 6n, "F");
  const jaundiceAssoc = hasOption(ansMap, 6n, "G");
  const extraIntestinal = hasOption(ansMap, 6n, "H"); // IBD EIM
  const dysphagiaAssoc = hasOption(ansMap, 6n, "I"); // 🚨 oesophageal Ca
  const _noAssociated = hasOption(ansMap, 6n, "J");

  // ─── Q7: Bowel habit ───
  const _normalBowel = hasOption(ansMap, 7n, "A");
  const diarrhoea = hasOption(ansMap, 7n, "B");
  const constipation = hasOption(ansMap, 7n, "C");
  const alternatingBowel = hasOption(ansMap, 7n, "D");
  const steatorrhoea = hasOption(ansMap, 7n, "E"); // 🚨 malabsorption
  const bloodMixedStool = hasOption(ansMap, 7n, "F"); // LGIB
  const mucusStool = hasOption(ansMap, 7n, "G");
  const malaenaBowel = hasOption(ansMap, 7n, "H"); // 🚨 UGIB
  const ribbonStools = hasOption(ansMap, 7n, "I"); // 🚨 CRC
  const incompleteEvac = hasOption(ansMap, 7n, "J");

  // ─── Q8: Weight + appetite ───
  const normalWeight = hasOption(ansMap, 8n, "A"); // unused but retained for documentation
  const mildWeightLoss = hasOption(ansMap, 8n, "B"); // unused but retained
  void normalWeight;
  void mildWeightLoss;
  const sigWeightLossQ8 = hasOption(ansMap, 8n, "C"); // 🚨
  const lostAppetite = hasOption(ansMap, 8n, "D");
  const earlySatiety = hasOption(ansMap, 8n, "E"); // 🚨 gastroparesis / gastric Ca
  const weightGained = hasOption(ansMap, 8n, "F");
  const malabsorption = hasOption(ansMap, 8n, "G"); // eating but losing weight

  // ─── Q9: Swallowing ───
  const swallowingNormal = hasOption(ansMap, 9n, "A");
  const solidsDysphagia = hasOption(ansMap, 9n, "B"); // occasional
  const progDysphagia = hasOption(ansMap, 9n, "C"); // 🚨 progressive solids
  const bothDysphagia = hasOption(ansMap, 9n, "D"); // solids + liquids = motility
  const odynophagia = hasOption(ansMap, 9n, "E"); // 🚨
  const regurgitation = hasOption(ansMap, 9n, "F"); // achalasia / Zenker
  const globusSensation = hasOption(ansMap, 9n, "G"); // functional globus

  // ─── Q10_AI (10n): diarrhoea gate (single-select) ───
  const diarrhoeaPainful = hasOption(ansMap, 10n, "A");
  const _diarrhoeaPainless = hasOption(ansMap, 10n, "B");

  // ─── Q10_AII (101n): diarrhoea deep-dive (multi-select) ───
  const wateryLargeVolume = hasOption(ansMap, 101n, "A"); // secretory
  const looseUrgency = hasOption(ansMap, 101n, "B"); // IBS-D
  const bloodyMucousDia = hasOption(ansMap, 101n, "C"); // 🚨 IBD/infective
  const steatorrhoeaDia = hasOption(ansMap, 101n, "D"); // 🚨 malabsorption
  const nocturnalDia = hasOption(ansMap, 101n, "E"); // 🚨 organic
  const postAntibioticDia = hasOption(ansMap, 101n, "F"); // C. diff
  const travelDia = hasOption(ansMap, 101n, "G"); // traveller's diarrhoea
  const _alternatingDia = hasOption(ansMap, 101n, "H"); // IBS-M

  // ─── Q10_B (102n): jaundice characterisation (multi-select) ───
  const jaundiceSuddenFever = hasOption(ansMap, 102n, "A"); // 🚨 cholangitis
  const jaundicePainlessProgressive = hasOption(ansMap, 102n, "B"); // 🚨 pancreatic Ca
  const jaundiceFatigue = hasOption(ansMap, 102n, "C"); // hepatocellular
  const jaundiceLiverFlare = hasOption(ansMap, 102n, "D"); // cirrhosis complication
  const jaundiceBloating = hasOption(ansMap, 102n, "E"); // ascites
  const _alcoholJaundice = hasOption(ansMap, 102n, "F"); // ALD

  // ─── Q11: Past history + medications ───
  const knownUlcerHP = hasOption(ansMap, 11n, "A");
  const knownIBD = hasOption(ansMap, 11n, "B");
  const knownLiverDisease = hasOption(ansMap, 11n, "C");
  const nsaidUse = hasOption(ansMap, 11n, "D"); // 🚨 PUD risk
  const recentAntibiotics = hasOption(ansMap, 11n, "E");
  const _immunosuppressed = hasOption(ansMap, 11n, "F");
  const prevAbdoSurgery = hasOption(ansMap, 11n, "G");
  const comorbidDiabThyroid = hasOption(ansMap, 11n, "H");
  const onPPI = hasOption(ansMap, 11n, "I");

  // ─── Q12: Family history + lifestyle ───
  const famCRC = hasOption(ansMap, 12n, "A"); // 🚨
  const famGastricCa = hasOption(ansMap, 12n, "B"); // 🚨
  const famIBD = hasOption(ansMap, 12n, "C");
  const famCeliac = hasOption(ansMap, 12n, "D");
  const famLiverDisease = hasOption(ansMap, 12n, "E");
  const smoking = hasOption(ansMap, 12n, "F");
  const heavyAlcohol = hasOption(ansMap, 12n, "G"); // 🚨
  const stressAnxiety = hasOption(ansMap, 12n, "H"); // functional
  const _dietChange = hasOption(ansMap, 12n, "I");

  // ─── Q13: Alarm features ───
  const _noAlarmFeatures = hasOption(ansMap, 13n, "A");
  const alarmHaematemesis = hasOption(ansMap, 13n, "B"); // 🚨
  const alarmMelaena = hasOption(ansMap, 13n, "C"); // 🚨
  const alarmBrightRedBlood = hasOption(ansMap, 13n, "D"); // 🚨
  const alarmWeightLoss = hasOption(ansMap, 13n, "E"); // 🚨
  const alarmProgDysphagia = hasOption(ansMap, 13n, "F"); // 🚨
  const _alarmPersistVomiting = hasOption(ansMap, 13n, "G"); // 🚨
  const alarmJaundice = hasOption(ansMap, 13n, "H"); // 🚨
  const alarmMass = hasOption(ansMap, 13n, "I"); // 🚨
  const _alarmAnaemia = hasOption(ansMap, 13n, "J");

  // ─── Q14: Organic vs functional ───
  const triggeredByStressIllness = hasOption(ansMap, 14n, "A");
  const worseWithStress = hasOption(ansMap, 14n, "B");
  const nocturnalSymQ14 = hasOption(ansMap, 14n, "C"); // 🚨
  const gettingWorse = hasOption(ansMap, 14n, "D"); // 🚨
  const fluctuates = hasOption(ansMap, 14n, "E");
  const stableNoProg = hasOption(ansMap, 14n, "F");
  const allInvestNormal = hasOption(ansMap, 14n, "G");
  const _foodLinked = hasOption(ansMap, 14n, "H");

  // ─── Q15: Demographics ───
  const _maleLt40 = hasOption(ansMap, 15n, "A");
  const _femaleLt40 = hasOption(ansMap, 15n, "B");
  const age4055 = hasOption(ansMap, 15n, "C");
  const ageOver55 = hasOption(ansMap, 15n, "D"); // 🚨
  const ironDeficiency = hasOption(ansMap, 15n, "E");
  const autoimmune = hasOption(ansMap, 15n, "F");
  const _opioids = hasOption(ansMap, 15n, "G");
  const recentTravel = hasOption(ansMap, 15n, "H");

  // ─── Derived composite flags ───────────────────────────────────────────
  const weightLoss =
    sigWeightLoss || sigWeightLossQ8 || alarmWeightLoss || primaryIsWeightLoss;
  const hasJaundice =
    primaryIsJaundice ||
    jaundiceAssoc ||
    alarmJaundice ||
    jaundiceSuddenFever ||
    jaundicePainlessProgressive ||
    jaundiceFatigue;
  const anyBloodInStool =
    melaena ||
    malaenaBowel ||
    bloodMixedStool ||
    bloodyMucousDia ||
    alarmMelaena;
  const anyUpperGIBleed = haematemesis || alarmHaematemesis;
  const anyRectalBleed =
    brightRedBlood ||
    alarmBrightRedBlood ||
    primaryIsBlood ||
    primaryIsAnorectal;
  const hasDysphagia =
    primaryIsDysphagia ||
    dysphagiaAssoc ||
    solidsDysphagia ||
    progDysphagia ||
    bothDysphagia ||
    alarmProgDysphagia;
  const hasHeartburn =
    burningPain && (retrosternal || worseLyingDown || throatLocation);
  const hasDiarrhoea = primaryIsBowelChange || diarrhoea || ansMap.has(101n);
  const hasConstipation = constipation || primaryIsBowelChange;
  const ruqPain = ruqLocation || (epigastricBack && worseFattyFood);
  const upperAbdoPain = primaryIsUpperGI || epigastricBack || ruqLocation;
  const organicFlag =
    nocturnalSymp || nocturnalSymQ14 || gettingWorse || alarmMass;

  // ═══════════════════════════════════════════════════════════════════════
  // RED FLAGS
  // ═══════════════════════════════════════════════════════════════════════
  const redFlags: RedFlag[] = [];

  if (progDysphagia || alarmProgDysphagia) {
    redFlags.push({
      label: "Progressive Dysphagia",
      severity: "critical",
      rationale:
        "Progressive difficulty swallowing is a high-risk alarm feature for oesophageal malignancy or stricture — urgent OGD mandatory (Sleisenger & Fordtran 10th Ed).",
    });
  } else if (hasDysphagia) {
    redFlags.push({
      label: "Dysphagia",
      severity: "warning",
      rationale:
        "Difficulty swallowing requires endoscopic evaluation to exclude structural oesophageal pathology.",
    });
  }

  if (anyUpperGIBleed) {
    redFlags.push({
      label: "Haematemesis (blood/coffee-ground vomit)",
      severity: "critical",
      rationale:
        "Haematemesis indicates upper GI bleeding — requires urgent OGD within 24 hours and haemodynamic assessment.",
    });
  }

  if (anyBloodInStool) {
    redFlags.push({
      label: "Melaena / Blood in Stool",
      severity: "critical",
      rationale:
        "Melaena or blood mixed in stool indicates significant GI bleeding — urgent investigation to exclude peptic ulceration, IBD, or colorectal neoplasm.",
    });
  }

  if (anyRectalBleed) {
    redFlags.push({
      label: "Rectal Bleeding",
      severity: "critical",
      rationale:
        "Rectal bleeding is an alarm feature requiring urgent investigation to exclude colorectal neoplasm, IBD, or upper GI haemorrhage.",
    });
  }

  if (weightLoss) {
    redFlags.push({
      label: "Unintentional Weight Loss",
      severity: "critical",
      rationale:
        "Unexplained weight loss is a red-flag symptom for malignancy, malabsorption, or chronic inflammatory disease.",
    });
  }

  if (hasDysphagia && weightLoss) {
    redFlags.push({
      label: "Dysphagia + Weight Loss — Suspect Malignancy",
      severity: "critical",
      rationale:
        "The combination of dysphagia and weight loss is highly suspicious for oesophageal or gastric malignancy.",
    });
  }

  if (nocturnalDia || nocturnalSymp || nocturnalSymQ14) {
    redFlags.push({
      label: "Nocturnal Symptoms (Organic Flag)",
      severity: "warning",
      rationale:
        "Symptoms waking the patient from sleep are essentially inconsistent with purely functional disease — organic pathology must be excluded.",
    });
  }

  if (ribbonStools) {
    redFlags.push({
      label: "Ribbon-Like / Narrow Stools",
      severity: "warning",
      rationale:
        "Very narrow or ribbon-like stools may indicate a colorectal mass causing luminal narrowing — colonoscopy required.",
    });
  }

  if (famCRC || famGastricCa) {
    redFlags.push({
      label: "Family History of GI Malignancy",
      severity: "warning",
      rationale:
        "Family history of colorectal or gastric cancer significantly elevates risk and lowers the threshold for surveillance investigation.",
    });
  }

  if (hasJaundice) {
    redFlags.push({
      label: "Jaundice",
      severity: "critical",
      rationale:
        "Jaundice with or without pain or pale stools suggests biliary obstruction, hepatocellular disease, or pancreatic malignancy.",
    });
  }

  if (jaundiceSuddenFever) {
    redFlags.push({
      label: "Charcot's Triad — Suspected Acute Cholangitis",
      severity: "critical",
      rationale:
        "Sudden-onset jaundice with RUQ pain and fever constitutes Charcot's triad — this is a biliary emergency requiring ERCP within 24 hours.",
    });
  }

  if (jaundicePainlessProgressive) {
    redFlags.push({
      label: "Painless Progressive Jaundice — Suspect Malignancy",
      severity: "critical",
      rationale:
        "Painless progressive jaundice with pale stools is the hallmark presentation of pancreatic adenocarcinoma or cholangiocarcinoma.",
    });
  }

  if (alarmMass) {
    redFlags.push({
      label: "Palpable Abdominal Mass",
      severity: "critical",
      rationale:
        "A new palpable abdominal or rectal mass is an alarm feature requiring urgent investigation to exclude malignancy.",
    });
  }

  if (earlySatiety && weightLoss) {
    redFlags.push({
      label: "Early Satiety with Weight Loss",
      severity: "critical",
      rationale:
        "Early satiety combined with weight loss is the classic presentation of gastric malignancy (linitis plastica).",
    });
  }

  if (steatorrhoea || steatorrhoeaDia) {
    redFlags.push({
      label: "Steatorrhoea (Fatty / Floating Stools)",
      severity: "warning",
      rationale:
        "Pale, greasy, floating, foul-smelling stools indicate significant fat malabsorption — coeliac disease, chronic pancreatitis, or SIBO must be excluded.",
    });
  }

  if (ageOver55 && (anyRectalBleed || weightLoss || ribbonStools)) {
    redFlags.push({
      label: "Age >55 with Lower GI Alarm Features",
      severity: "critical",
      rationale:
        "Colorectal cancer incidence rises sharply after age 55. Alarm features in this demographic require 2-week wait colonoscopy.",
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DIFFERENTIAL DIAGNOSES
  // ═══════════════════════════════════════════════════════════════════════
  const differentials: Differential[] = [];

  // ─── OESOPHAGEAL MALIGNANCY ───
  if ((progDysphagia || alarmProgDysphagia) && weightLoss) {
    differentials.push({
      condition: "Oesophageal Carcinoma (Adenocarcinoma / SCC)",
      icd10: "C15.9",
      confirmatoryTest: "Upper endoscopy + CT chest/abdomen/pelvis staging",
      confidence: "High",
      rationale:
        "Progressive dysphagia combined with weight loss is a high-risk alarm combination for oesophageal malignancy per Sleisenger & Fordtran 10th Ed.",
      fits: [
        "Progressive dysphagia (solids first)",
        "Unintentional weight loss",
        ...(smoking ? ["Smoking history (SCC risk)"] : []),
        ...(heavyAlcohol ? ["Heavy alcohol use (SCC risk)"] : []),
        ...(ageOver55 ? ["Age >55"] : []),
      ],
      against: [
        ...(!progDysphagia ? ["Dysphagia not described as progressive"] : []),
        ...(fluctuates
          ? ["Fluctuating symptoms (less typical for carcinoma)"]
          : []),
      ],
      treatment:
        "Urgent oncological referral. Staging CT + OGD with biopsy mandatory. MDT discussion. Nutritional support. Neoadjuvant chemotherapy ± radiotherapy per staging. Endoscopic stenting for palliation.",
      classification: "organic",
      icdHint: "C15.9",
      investigations: [
        emg(
          "Upper GI Endoscopy (OGD) + biopsy",
          "Confirm malignancy, histology",
        ),
        urg("CT Thorax/Abdomen/Pelvis with contrast", "TNM staging"),
        urg("Endoscopic Ultrasound (EUS)", "T-staging, nodal involvement"),
        urg("Full Blood Count (FBC) + Ferritin", "Anaemia, nutritional status"),
        rtn("PET-CT scan", "Distant metastases if staging surgery planned"),
        rtn("Nutritional assessment + dietitian referral", "Malnutrition risk"),
      ],
    });
  }

  // ─── OESOPHAGEAL STRICTURE / SCHATZKI RING ───
  if ((solidsDysphagia || progDysphagia) && !weightLoss && !bothDysphagia) {
    differentials.push({
      condition: "Oesophageal Stricture / Schatzki Ring",
      icd10: "K22.2",
      confirmatoryTest: "Upper endoscopy + barium swallow",
      confidence: progDysphagia ? "High" : "Moderate",
      rationale:
        "Dysphagia limited to solids with or without progressive worsening suggests a mechanical oesophageal obstruction (stricture, web, or ring).",
      fits: [
        "Dysphagia to solids",
        ...(progDysphagia ? ["Progressive worsening of dysphagia"] : []),
        ...(knownUlcerHP || onPPI
          ? ["GERD/acid history (peptic stricture)"]
          : []),
      ],
      against: [
        "No significant weight loss",
        ...(!odynophagia ? ["No odynophagia"] : []),
      ],
      treatment:
        "OGD with pneumatic/bougie dilation. Long-term PPI if peptic stricture. Surveillance endoscopy. Dietary modification (soft diet) during treatment.",
      classification: "organic",
      icdHint: "K22.2",
      investigations: [
        urg("Upper GI Endoscopy (OGD)", "Diagnosis and therapeutic dilation"),
        urg("Barium Swallow", "Define stricture level and morphology"),
        rtn("Oesophageal Manometry", "Exclude concurrent motility disorder"),
      ],
    });
  }

  // ─── ACHALASIA / MOTILITY DISORDER ───
  if (bothDysphagia || (regurgitation && hasDysphagia)) {
    differentials.push({
      condition: "Achalasia / Oesophageal Motility Disorder",
      icd10: "K22.0",
      confirmatoryTest: "High-resolution oesophageal manometry",
      confidence: bothDysphagia && regurgitation ? "High" : "Moderate",
      rationale:
        "Dysphagia to both solids and liquids, especially with effortless regurgitation of undigested food, suggests a motility disorder such as achalasia.",
      fits: [
        ...(bothDysphagia
          ? ["Dysphagia to both solids and liquids (motility pattern)"]
          : []),
        ...(regurgitation
          ? ["Regurgitation of undigested food without nausea"]
          : []),
        ...(noPain ? ["No significant pain"] : []),
      ],
      against: [
        ...(!weightLoss ? ["No significant weight loss"] : []),
        ...(!anyUpperGIBleed ? ["No haematemesis"] : []),
      ],
      treatment:
        "Pneumatic dilation (1st line) or Heller myotomy ± Dor fundoplication. Botulinum toxin for poor surgical candidates. Per-oral endoscopic myotomy (POEM) in specialist centres.",
      classification: "organic",
      icdHint: "K22.0",
      investigations: [
        urg(
          "High-Resolution Oesophageal Manometry",
          "Confirm achalasia subtype (Chicago Classification)",
        ),
        urg("Upper GI Endoscopy (OGD)", "Exclude pseudoachalasia / malignancy"),
        rtn(
          "Barium Swallow / Timed Barium Oesophagram",
          "Bird-beak sign, emptying",
        ),
      ],
    });
  }

  // ─── GERD ───
  if (
    (hasHeartburn || burningPain || worseLyingDown || retrosternal) &&
    !hasDysphagia
  ) {
    differentials.push({
      condition: "Gastro-oesophageal Reflux Disease (GERD)",
      icd10: "K21.0",
      confirmatoryTest: "24-hour pH-impedance monitoring or upper endoscopy",
      confidence:
        burningPain && (worseLyingDown || retrosternal) ? "High" : "Moderate",
      rationale:
        "Classic symptoms of heartburn, retrosternal burning, positional worsening and/or nocturnal symptoms are pathognomonic of GERD.",
      fits: [
        ...(burningPain ? ["Burning / heartburn quality"] : []),
        ...(retrosternal ? ["Retrosternal location"] : []),
        ...(worseLyingDown ? ["Positional worsening (lying/bending)"] : []),
        ...(nocturnalSymp ? ["Nocturnal symptoms"] : []),
        ...(onPPI ? ["Already on PPI (GERD presumed)"] : []),
      ],
      against: [
        ...(!hasDysphagia ? ["No dysphagia (uncomplicated GERD)"] : []),
        ...(weightLoss
          ? ["Weight loss — consider Barrett's or malignancy"]
          : []),
      ],
      treatment:
        "PPI therapy (omeprazole 20mg or pantoprazole 40mg OD) for 8 weeks. Lifestyle: weight reduction, elevate bed head, avoid late meals. Step-down to on-demand PPI for long-term. Refer for OGD if alarm features or refractory symptoms.",
      classification: "organic",
      icdHint: "K21.0",
      investigations: [
        urg(
          "Upper GI Endoscopy (OGD)",
          "Barrett's oesophagus, oesophagitis grade, exclude malignancy",
        ),
        urg(
          "Ambulatory 24-hour pH-Impedance Monitoring",
          "Confirm GERD, assess symptom correlation",
        ),
        rtn(
          "Oesophageal Manometry",
          "Pre-op assessment, exclude motility disorder",
        ),
      ],
    });
  }

  // ─── BARRETT'S OESOPHAGUS ───
  if ((hasHeartburn || burningPain) && chronic && weightLoss) {
    differentials.push({
      condition: "Barrett's Oesophagus",
      icd10: "K22.7",
      confirmatoryTest: "Upper endoscopy with biopsies (Seattle protocol)",
      confidence: "Moderate",
      rationale:
        "Long-standing GERD symptoms with weight loss raise concern for Barrett's oesophagus or early adenocarcinoma requiring surveillance endoscopy.",
      fits: [
        "Chronic heartburn / GERD symptoms",
        ...(weightLoss ? ["Weight loss"] : []),
        ...(chronic ? ["Longstanding symptom duration"] : []),
      ],
      against: [...(!progDysphagia ? ["No progressive dysphagia"] : [])],
      treatment:
        "High-dose PPI (twice daily). Surveillance OGD every 3–5 years (non-dysplastic). Endoscopic mucosal resection (EMR) or radiofrequency ablation (RFA) for dysplastic Barrett's. Anti-reflux surgery (Nissen fundoplication) in selected cases.",
      classification: "organic",
      icdHint: "K22.7",
      investigations: [
        urg(
          "Upper GI Endoscopy + biopsies (Seattle protocol)",
          "Dysplasia grade, intestinal metaplasia",
        ),
        rtn("Ambulatory 24-hour pH Monitoring", "GERD severity"),
        rtn("Full Blood Count (FBC)", "Baseline anaemia screen"),
      ],
    });
  }

  // ─── EOSINOPHILIC OESOPHAGITIS ───
  if (hasDysphagia && odynophagia && !weightLoss && !progDysphagia) {
    differentials.push({
      condition: "Eosinophilic Oesophagitis (EoE)",
      icd10: "K20.0",
      confirmatoryTest:
        "Upper endoscopy with oesophageal biopsies (>15 eos/HPF)",
      confidence: "Moderate",
      rationale:
        "Dysphagia with odynophagia in the absence of alarm features, especially in younger patients, raises the possibility of eosinophilic oesophagitis.",
      fits: [
        "Dysphagia",
        "Odynophagia",
        ...(autoimmune ? ["Atopic/autoimmune history"] : []),
      ],
      against: [
        "No known atopic history captured",
        ...(!weightLoss ? ["No significant weight loss"] : []),
      ],
      treatment:
        "Swallowed topical corticosteroids (fluticasone or budesonide). Elemental / 6-food elimination diet. PPI trial (may have GERD overlap). Oesophageal dilation if stricture. Allergen identification with dietitian.",
      classification: "organic",
      icdHint: "K20.0",
      investigations: [
        urg(
          "Upper GI Endoscopy (OGD) + oesophageal biopsies",
          "Eosinophil count ≥15/HPF, rings/furrows",
        ),
        rtn("Full Blood Count (FBC)", "Peripheral eosinophilia"),
        rtn("Allergy panel / IgE screen", "Atopic sensitisation"),
      ],
    });
  }

  // ─── PEPTIC ULCER DISEASE ───
  if (
    (upperAbdoPain || epigastricBack) &&
    (gnawingPain || burningPain || betterWithFood || nsaidUse || knownUlcerHP)
  ) {
    differentials.push({
      condition: "Peptic Ulcer Disease (Gastric / Duodenal)",
      icd10: knownUlcerHP ? "K26.9" : "K25.9",
      confirmatoryTest: "Upper endoscopy + CLO test (H. pylori)",
      confidence:
        nsaidUse || knownUlcerHP || betterWithFood ? "High" : "Moderate",
      rationale:
        "Epigastric gnawing/burning pain — especially hunger pain relieved by food (duodenal) or worsened after eating (gastric) — with NSAID use or prior H. pylori is characteristic of peptic ulcer disease.",
      fits: [
        "Epigastric / upper abdominal pain",
        ...(gnawingPain ? ["Gnawing / hunger-like pain character"] : []),
        ...(burningPain ? ["Burning epigastric pain"] : []),
        ...(nsaidUse ? ["Regular NSAID use"] : []),
        ...(knownUlcerHP ? ["Previous H. pylori / ulcer history"] : []),
        ...(betterWithFood
          ? ["Pain relieved by food (duodenal ulcer pattern)"]
          : []),
      ],
      against: [
        ...(weightLoss
          ? ["Weight loss — exclude gastric malignancy"]
          : ["No significant weight loss"]),
        ...(hasDysphagia ? ["Dysphagia present — investigate oesophagus"] : []),
      ],
      treatment:
        "H. pylori eradication (triple therapy: PPI + clarithromycin + amoxicillin × 14 days). Cease NSAIDs — switch to COX-2 inhibitor + PPI if essential. PPI for 4–8 weeks. Repeat OGD for gastric ulcer at 6–8 weeks.",
      classification: "organic",
      icdHint: "K25–K27",
      investigations: [
        urg("Upper GI Endoscopy (OGD)", "Ulcer diagnosis, H. pylori CLO test"),
        rtn("H. pylori Urea Breath Test", "Non-invasive detection"),
        rtn("H. pylori Stool Antigen", "Alternative non-invasive test"),
        rtn("Full Blood Count (FBC)", "Anaemia from chronic blood loss"),
      ],
    });
  }

  // ─── UPPER GI HAEMORRHAGE ───
  if (anyUpperGIBleed || melaena || alarmMelaena || malaenaBowel) {
    differentials.push({
      condition:
        "Upper GI Haemorrhage (Peptic Ulcer / Mallory–Weiss / Varices)",
      icd10: "K92.1",
      confirmatoryTest: "Urgent upper endoscopy within 24 hours",
      confidence: "High",
      rationale:
        "Haematemesis or melaena indicates an upper GI bleeding source — peptic ulcer is most common; varices if liver disease history present.",
      fits: [
        ...(anyUpperGIBleed ? ["Haematemesis / coffee-ground vomiting"] : []),
        ...(melaena || malaenaBowel ? ["Melaena (black tarry stools)"] : []),
        ...(knownLiverDisease ? ["Known liver disease (variceal risk)"] : []),
        ...(heavyAlcohol
          ? ["Heavy alcohol use (variceal / Mallory-Weiss risk)"]
          : []),
      ],
      against: [...(!fever ? ["No fever"] : [])],
      treatment:
        "EMERGENCY: Resuscitate (IV access, cross-match, fluid resuscitation). IV PPI (pantoprazole 80mg bolus then 8mg/hr infusion). Urgent OGD within 24h. Endoscopic haemostasis (clips, adrenaline injection). Terlipressin if variceal. ICU referral if haemodynamically unstable.",
      classification: "organic",
      icdHint: "K92.1",
      investigations: [
        emg(
          "Urgent Upper GI Endoscopy (OGD)",
          "Source identification + haemostasis",
        ),
        emg(
          "Full Blood Count (FBC) + Cross-match + Coagulation",
          "Haemoglobin, transfusion threshold",
        ),
        emg(
          "Liver Function Tests (LFTs) + Urea/Creatinine",
          "Liver disease, pre-renal failure",
        ),
        urg(
          "Iron studies, B12, Folate, Ferritin",
          "Chronic blood loss assessment",
        ),
      ],
    });
  }

  // ─── GASTRIC ADENOCARCINOMA ───
  if (upperAbdoPain && (lostAppetite || earlySatiety) && weightLoss) {
    differentials.push({
      condition: "Gastric Adenocarcinoma",
      icd10: "C16.9",
      confirmatoryTest: "Upper endoscopy with biopsies + CT staging",
      confidence: ageOver55 || famGastricCa ? "High" : "Moderate",
      rationale:
        "Anorexia, early satiety, and significant weight loss with upper abdominal pain is the classic triad of gastric malignancy.",
      fits: [
        "Upper abdominal pain / discomfort",
        ...(earlySatiety ? ["Early satiety"] : []),
        ...(lostAppetite ? ["Anorexia / loss of appetite"] : []),
        ...(weightLoss ? ["Significant unintentional weight loss"] : []),
        ...(ageOver55 ? ["Age >55"] : []),
        ...(famGastricCa ? ["Family history of gastric cancer"] : []),
      ],
      against: [
        ...(!progDysphagia ? ["No progressive dysphagia"] : []),
        ...(acuteOnset ? ["Acute onset (less typical for malignancy)"] : []),
      ],
      treatment:
        "Urgent endoscopy with biopsy + CT staging. MDT review. Curative intent: subtotal/total gastrectomy + D2 lymphadenectomy. Neoadjuvant FLOT regimen for resectable disease. Palliative chemotherapy (FOLFOX/CAPOX) for advanced disease.",
      classification: "organic",
      icdHint: "C16.9",
      investigations: [
        emg(
          "Upper GI Endoscopy (OGD) + multiple biopsies",
          "Histological confirmation",
        ),
        urg("CT Thorax/Abdomen/Pelvis with contrast", "TNM staging"),
        urg("Endoscopic Ultrasound (EUS)", "T and N staging"),
        rtn("CA 72-4, CEA Tumour Markers", "Baseline, monitoring response"),
        rtn("FBC, LFTs, Albumin", "Nutritional and functional status"),
      ],
    });
  }

  // ─── FUNCTIONAL DYSPEPSIA ───
  if (
    (upperAbdoPain || fullnessPain || earlySatiety) &&
    !weightLoss &&
    !anyUpperGIBleed &&
    (stressWorsens || stressAnxiety || fluctuates || allInvestNormal)
  ) {
    differentials.push({
      condition: "Functional Dyspepsia",
      icd10: "K30",
      romeIV: earlySatiety || fullnessPain ? "FD-PDS" : "FD-EPS",
      confirmatoryTest: "Upper endoscopy (to exclude organic disease)",
      confidence:
        allInvestNormal || (stressWorsens && fluctuates) ? "Moderate" : "Low",
      rationale:
        "Upper abdominal discomfort with postprandial fullness or epigastric pain in the absence of alarm features, worsened by stress, meets Rome IV criteria for functional dyspepsia.",
      fits: [
        "Epigastric / upper abdominal discomfort",
        ...(fullnessPain ? ["Postprandial fullness"] : []),
        ...(earlySatiety ? ["Early satiety (PDS subtype)"] : []),
        ...(stressWorsens || stressAnxiety
          ? ["Stress-related exacerbation"]
          : []),
        ...(allInvestNormal ? ["Previous normal investigations"] : []),
      ],
      against: [
        ...(weightLoss
          ? ["Weight loss — organic cause must be excluded"]
          : ["No weight loss"]),
        ...(anyUpperGIBleed ? ["Bleeding — organic required"] : []),
        ...(organicFlag ? ["Organic alarm features present"] : []),
      ],
      treatment:
        "H. pylori test-and-treat. PPI trial 4–8 weeks (EPS subtype). Low-dose TCA (amitriptyline 10–25mg nocte) for refractory cases. Dietary advice: small frequent meals, reduce fat/caffeine. Gut-directed psychotherapy / CBT.",
      classification: "functional",
      icdHint: "K30",
      investigations: [
        urg("Upper GI Endoscopy (OGD)", "Exclude H. pylori, ulcer, malignancy"),
        rtn(
          "H. pylori Urea Breath Test or Stool Antigen",
          "Test-and-treat strategy",
        ),
        rtn("Thyroid Function Tests (TFTs)", "Exclude thyroid cause"),
        rtn("Full Blood Count (FBC) + CRP", "Baseline, exclude organic"),
      ],
    });
  }

  // ─── GASTROPARESIS ───
  if (
    (earlySatiety || nauseaVomiting) &&
    (comorbidDiabThyroid || worseAfterMeal) &&
    !weightLoss
  ) {
    differentials.push({
      condition: "Gastroparesis",
      icd10: "K31.84",
      confirmatoryTest:
        "Gastric emptying scintigraphy (4-hour nuclear medicine)",
      confidence: earlySatiety && comorbidDiabThyroid ? "High" : "Moderate",
      rationale:
        "Early satiety with nausea and vomiting, particularly in the setting of diabetes or prior surgery, suggests delayed gastric emptying.",
      fits: [
        ...(earlySatiety ? ["Early satiety (hallmark of gastroparesis)"] : []),
        ...(nauseaVomiting ? ["Nausea and vomiting"] : []),
        ...(comorbidDiabThyroid ? ["Diabetes / autonomic neuropathy"] : []),
        ...(worseAfterMeal ? ["Worsens after eating"] : []),
      ],
      against: [
        ...(weightLoss
          ? ["Significant weight loss"]
          : ["No significant weight loss"]),
        ...(!comorbidDiabThyroid
          ? ["No known diabetes/autonomic disorder"]
          : []),
      ],
      treatment:
        "Dietary: small frequent low-fat meals, liquid diet during flares. Metoclopramide (10mg TDS) or domperidone (10mg TDS). Erythromycin (prokinetic effect). Gastric electrical stimulation for refractory cases. Optimise glycaemic control.",
      classification: "organic",
      icdHint: "K31.84",
      investigations: [
        urg(
          "Gastric Emptying Scintigraphy (4-hour)",
          "Gold standard for delayed gastric emptying",
        ),
        urg("Upper GI Endoscopy (OGD)", "Exclude structural obstruction"),
        rtn("Blood Glucose / HbA1c", "Diabetes and glycaemic control"),
        rtn("Thyroid Function Tests", "Hypothyroid gastroparesis"),
      ],
    });
  }

  // ─── ACUTE PANCREATITIS ───
  if (
    (epigastricBack || ruqLocation) &&
    (constantPain || crampingPain) &&
    (heavyAlcohol || worseFattyFood || fever)
  ) {
    differentials.push({
      condition: "Acute Pancreatitis",
      icd10: "K85.9",
      confirmatoryTest: "Serum lipase/amylase + CT abdomen with contrast",
      confidence: epigastricBack && fever ? "High" : "Moderate",
      rationale:
        "Severe epigastric pain radiating to the back with nausea, associated with alcohol use or fatty food is the classic presentation of acute pancreatitis.",
      fits: [
        ...(epigastricBack ? ["Epigastric pain radiating to back"] : []),
        ...(constantPain ? ["Constant, severe pain"] : []),
        ...(heavyAlcohol ? ["Heavy alcohol use"] : []),
        ...(worseFattyFood ? ["Fatty food trigger"] : []),
        ...(fever ? ["Fever / systemic inflammation"] : []),
      ],
      against: [
        ...(acuteOnset ? [] : ["No acute onset"]),
        ...(nauseaVomiting ? [] : ["No nausea/vomiting"]),
      ],
      treatment:
        "Acute: IV fluids (aggressive early resuscitation), analgesia (morphine), NBM/NG, monitor for organ failure (Atlanta criteria). ERCP if gallstone pancreatitis with cholangitis. Escalate to HDU/ICU if Ranson ≥3. Chronic: pancreatic enzyme supplements, pain management, alcohol cessation.",
      classification: "organic",
      icdHint: "K85.9",
      investigations: [
        emg("Serum Lipase + Amylase", "Confirm pancreatitis (lipase >3×ULN)"),
        emg(
          "CT Abdomen with contrast (Balthazar)",
          "Severity, necrosis, complications",
        ),
        urg("Liver Function Tests (LFTs)", "Gallstone / biliary aetiology"),
        urg("Abdominal Ultrasound", "Gallstones, biliary dilation"),
        rtn(
          "Endoscopic Ultrasound (EUS)",
          "Suspected chronic pancreatitis, small tumours",
        ),
        rtn(
          "CA 19-9 Tumour Marker",
          "Pancreatic malignancy screen if recurrent",
        ),
      ],
    });
  }

  // ─── CHRONIC PANCREATITIS ───
  if (
    (epigastricBack || ruqLocation) &&
    chronic &&
    (heavyAlcohol || steatorrhoea || steatorrhoeaDia)
  ) {
    differentials.push({
      condition: "Chronic Pancreatitis",
      icd10: "K86.1",
      confirmatoryTest: "CT abdomen + secretin-MRCP or EUS",
      confidence: heavyAlcohol && steatorrhoea ? "High" : "Moderate",
      rationale:
        "Recurrent epigastric-to-back pain with steatorrhoea and heavy alcohol use is the classic presentation of chronic pancreatitis with exocrine insufficiency.",
      fits: [
        ...(epigastricBack ? ["Epigastric pain radiating to back"] : []),
        ...(chronic ? ["Chronic / recurrent course"] : []),
        ...(heavyAlcohol ? ["Heavy alcohol use (leading cause)"] : []),
        ...(steatorrhoea || steatorrhoeaDia
          ? ["Steatorrhoea (exocrine insufficiency)"]
          : []),
      ],
      against: [...(!heavyAlcohol ? ["No heavy alcohol history"] : [])],
      treatment:
        "Alcohol/smoking cessation. Pancreatic enzyme replacement (PERT: creon 25000–50000 units with meals). Fat-soluble vitamin supplementation. Analgesic ladder: NSAIDs → opioids. Coeliac plexus block for refractory pain. ERCP / lithotripsy for ductal stones.",
      classification: "organic",
      icdHint: "K86.1",
      investigations: [
        urg("CT Abdomen", "Calcification, ductal dilation, atrophy"),
        urg("Secretin-MRCP or EUS", "Ductal anatomy, exocrine function"),
        rtn("Faecal Elastase-1", "Exocrine insufficiency screen"),
        rtn(
          "HbA1c + fasting glucose",
          "Endocrine insufficiency (pancreatic diabetes)",
        ),
        rtn("CA 19-9", "Pancreatic malignancy surveillance"),
      ],
    });
  }

  // ─── PANCREATIC ADENOCARCINOMA ───
  if (
    jaundicePainlessProgressive ||
    (epigastricBack && weightLoss && (ageOver55 || newOnsetDiabetes()))
  ) {
    differentials.push({
      condition: "Pancreatic Adenocarcinoma",
      icd10: "C25.9",
      confirmatoryTest: "CT pancreas protocol + CA 19-9 + EUS/FNA",
      confidence: jaundicePainlessProgressive ? "High" : "Moderate",
      rationale:
        "Painless progressive jaundice, weight loss, and new-onset diabetes in a patient >55 is the classic presentation of pancreatic head adenocarcinoma.",
      fits: [
        ...(jaundicePainlessProgressive
          ? ["Painless progressive jaundice (hallmark)"]
          : []),
        ...(weightLoss ? ["Significant weight loss"] : []),
        ...(epigastricBack ? ["Epigastric pain radiating to back"] : []),
        ...(ageOver55 ? ["Age >55"] : []),
      ],
      against: [
        ...(acuteOnset ? ["Acute onset (less typical for pancreatic Ca)"] : []),
        ...(heavyAlcohol
          ? ["Alcohol history (consider ALD / pancreatitis first)"]
          : []),
      ],
      treatment:
        "Urgent staging: CT pancreas protocol + CA 19-9. MDT review. Resectable: Whipple's (pancreaticoduodenectomy) ± adjuvant FOLFIRINOX. Borderline / locally advanced: Neoadjuvant chemotherapy. Metastatic: FOLFIRINOX or gemcitabine/nab-paclitaxel. Biliary stenting for jaundice.",
      classification: "organic",
      icdHint: "C25.9",
      investigations: [
        emg(
          "CT Abdomen/Pelvis (pancreas protocol)",
          "Vascular involvement, resectability",
        ),
        urg("CA 19-9 + CEA Tumour Markers", "Diagnosis and monitoring"),
        urg("MRCP", "Biliary/pancreatic ductal anatomy"),
        urg("Endoscopic Ultrasound + FNA", "Tissue diagnosis"),
        rtn("PET-CT scan", "Distant metastases"),
      ],
    });
  }

  // ─── GALLSTONES / BILIARY COLIC ───
  if (ruqPain && worseFattyFood && !fever) {
    differentials.push({
      condition: "Gallstones / Biliary Colic",
      icd10: "K80.20",
      confirmatoryTest: "Abdominal ultrasound",
      confidence: ruqLocation && worseFattyFood ? "High" : "Moderate",
      rationale:
        "Episodic RUQ pain triggered by fatty food, often radiating to the right shoulder, is the hallmark presentation of symptomatic gallstones.",
      fits: [
        "Right upper quadrant pain",
        ...(worseFattyFood ? ["Worsened by fatty / fried food"] : []),
        ...(ruqLocation ? ["RUQ → right shoulder radiation"] : []),
        ...(nauseaVomiting ? ["Associated nausea/vomiting"] : []),
      ],
      against: [
        ...(fever
          ? ["Fever present — consider acute cholecystitis"]
          : ["No fever (uncomplicated biliary colic)"]),
        ...(hasJaundice ? ["Jaundice — consider choledocholithiasis"] : []),
      ],
      treatment:
        "Elective laparoscopic cholecystectomy (gold standard). Low-fat diet before surgery. ERCP pre-operatively if suspected choledocholithiasis. UDCA (ursodeoxycholic acid) for non-surgical candidates.",
      classification: "organic",
      icdHint: "K80.20",
      investigations: [
        urg(
          "Abdominal Ultrasound",
          "Gallstones, gallbladder wall, biliary dilation",
        ),
        rtn("Liver Function Tests (LFTs)", "Biliary involvement"),
        rtn("Full Blood Count (FBC) + CRP", "Exclude infection"),
        rtn("MRCP", "If biliary duct stones suspected"),
      ],
    });
  }

  // ─── ACUTE CHOLECYSTITIS / CHOLANGITIS ───
  if (ruqPain && fever) {
    differentials.push({
      condition: "Acute Cholecystitis / Ascending Cholangitis",
      icd10: jaundiceSuddenFever ? "K83.0" : "K81.0",
      confirmatoryTest: "Abdominal ultrasound + FBC/CRP/LFTs",
      confidence: ruqLocation && fever && hasJaundice ? "High" : "Moderate",
      rationale:
        "RUQ pain with fever is the hallmark of biliary infection — Charcot's triad (RUQ pain + fever + jaundice) indicates ascending cholangitis requiring emergency ERCP.",
      fits: [
        "Right upper quadrant pain",
        "Fever / systemic infection",
        ...(hasJaundice ? ["Jaundice (Charcot's triad)"] : []),
        ...(ruqLocation ? ["Right shoulder radiation"] : []),
        ...(nauseaVomiting ? ["Nausea/vomiting"] : []),
      ],
      against: [
        ...(!hasJaundice ? ["No jaundice (cholangitis less likely)"] : []),
      ],
      treatment:
        "Cholangitis (EMERGENCY): IV antibiotics (piperacillin/tazobactam), urgent ERCP within 24h. Cholecystitis: IV antibiotics, analgesia, laparoscopic cholecystectomy (elective or index admission).",
      classification: "organic",
      icdHint: "K81.0",
      investigations: [
        emg(
          "Full Blood Count (FBC) + CRP + Blood Cultures",
          "Infection severity",
        ),
        emg("Liver Function Tests (LFTs)", "Cholestasis pattern"),
        urg(
          "Abdominal Ultrasound",
          "Gallstones, wall thickening, biliary dilation",
        ),
        urg("ERCP", "Therapeutic biliary decompression if cholangitis"),
        rtn("HIDA Scan", "If ultrasound equivocal for cholecystitis"),
      ],
    });
  }

  // ─── CHOLEDOCHOLITHIASIS / OBSTRUCTIVE JAUNDICE ───
  if (
    hasJaundice &&
    !jaundiceSuddenFever &&
    (ruqPain || jaundicePainlessProgressive)
  ) {
    differentials.push({
      condition: "Choledocholithiasis / Obstructive Jaundice",
      icd10: "K80.50",
      confirmatoryTest: "MRCP or endoscopic ultrasound (EUS)",
      confidence: hasJaundice && ruqPain ? "High" : "Moderate",
      rationale:
        "Jaundice with RUQ pain, dark urine, and pale stools indicates biliary obstruction — choledocholithiasis and pancreatic head malignancy are the leading causes.",
      fits: [
        "Jaundice",
        ...(ruqPain ? ["RUQ pain"] : []),
        ...(jaundicePainlessProgressive
          ? ["Progressive painless jaundice"]
          : []),
      ],
      against: [...(fever ? ["Fever — consider cholangitis"] : [])],
      treatment:
        "ERCP + stone extraction for choledocholithiasis. Biliary stenting for malignant obstruction. Whipple's procedure if pancreatic head cancer (resectable). Cholecystectomy after resolution of acute episode.",
      classification: "organic",
      icdHint: "K80.50",
      investigations: [
        urg("MRCP", "Ductal anatomy, stone/stricture characterisation"),
        urg("Endoscopic Ultrasound (EUS)", "Small lesions, staging"),
        urg("Liver Function Tests (LFTs)", "Cholestatic pattern"),
        urg("Abdominal Ultrasound", "Biliary dilation, gallstones"),
        urg("CA 19-9", "Pancreatic / cholangiocarcinoma"),
      ],
    });
  }

  // ─── INFLAMMATORY BOWEL DISEASE ───
  if (
    bloodyMucousDia ||
    bloodMixedStool ||
    (hasDiarrhoea &&
      (fever || nocturnalDia || extraIntestinal || knownIBD || famIBD))
  ) {
    const ibdConf: "High" | "Moderate" | "Low" =
      bloodyMucousDia && nocturnalDia
        ? "High"
        : bloodyMucousDia || bloodMixedStool
          ? "High"
          : "Moderate";
    differentials.push({
      condition: "Inflammatory Bowel Disease (Crohn's / Ulcerative Colitis)",
      icd10: bloodMixedStool ? "K51.9" : "K50.9",
      confirmatoryTest: "Ileocolonoscopy + biopsies + faecal calprotectin",
      confidence: ibdConf,
      rationale:
        "Bloody diarrhoea with mucus, nocturnal symptoms, fever, and/or extra-intestinal features (joints, skin, eyes) is the classic presentation of IBD.",
      fits: [
        ...(bloodyMucousDia || bloodMixedStool
          ? ["Bloody diarrhoea with mucus"]
          : ["Diarrhoea"]),
        ...(nocturnalDia ? ["Nocturnal diarrhoea (organic flag)"] : []),
        ...(fever ? ["Fever"] : []),
        ...(extraIntestinal
          ? ["Extra-intestinal features (joints/skin/eyes)"]
          : []),
        ...(knownIBD ? ["Known IBD history (relapse)"] : []),
        ...(famIBD ? ["Family history of IBD"] : []),
      ],
      against: [
        ...(travelDia ? ["Travel history — infectious colitis first"] : []),
        ...(postAntibioticDia
          ? ["Post-antibiotic — C. diff must be excluded"]
          : []),
      ],
      treatment:
        "Active UC: Mesalazine (5-ASA) for mild-moderate. IV corticosteroids for severe. Biologics (infliximab/adalimumab) for steroid-refractory. Crohn's: Budesonide for ileocolonic. Immunomodulators (azathioprine/6-MP). Lifelong surveillance colonoscopy.",
      classification: "organic",
      icdHint: "K50–K51",
      investigations: [
        urg(
          "Ileocolonoscopy + biopsies",
          "Histological confirmation and extent",
        ),
        urg(
          "Faecal Calprotectin",
          "Bowel inflammation screen (>200 μg/g = IBD likely)",
        ),
        urg("CRP, ESR, Full Blood Count (FBC)", "Disease activity"),
        urg("MRI Enterography", "Small bowel Crohn's extent"),
        rtn("ANCA / ASCA serology", "IBD subtype differentiation"),
        rtn("Stool MC&S + C. diff toxin", "Exclude infectious trigger"),
      ],
    });
  }

  // ─── COLORECTAL CANCER ───
  if (
    anyRectalBleed ||
    ribbonStools ||
    (alternatingBowel && (ageOver55 || famCRC))
  ) {
    differentials.push({
      condition: "Colorectal Cancer",
      icd10: "C20",
      confirmatoryTest: "Colonoscopy with biopsy + CT staging",
      confidence:
        ageOver55 && (ribbonStools || bloodMixedStool || weightLoss || famCRC)
          ? "High"
          : "Moderate",
      rationale:
        "Rectal bleeding, change in bowel habit (especially alternating or narrow stools), weight loss, or family history requires urgent exclusion of colorectal carcinoma.",
      fits: [
        ...(anyRectalBleed ? ["Rectal bleeding"] : []),
        ...(ribbonStools ? ["Ribbon-like / narrow stools (mass effect)"] : []),
        ...(bloodMixedStool
          ? ["Blood mixed in stool (left-sided lesion)"]
          : []),
        ...(weightLoss ? ["Unintentional weight loss"] : []),
        ...(famCRC ? ["Family history of colorectal cancer"] : []),
        ...(ageOver55 ? ["Age >55 (risk increases sharply)"] : []),
      ],
      against: [
        ...(acuteOnset ? ["Very acute onset (less typical for CRC)"] : []),
        ...(travelDia ? ["Travel history — exclude infection first"] : []),
      ],
      treatment:
        "2-week wait urgent colonoscopy. CT abdomen/pelvis for staging if cancer confirmed. Surgical resection (laparoscopic colectomy). Adjuvant chemotherapy (FOLFOX/CAPOX) for Stage III/IV. Long-term surveillance colonoscopy. Lynch syndrome screening if early-onset.",
      classification: "organic",
      icdHint: "C18–C20",
      investigations: [
        urg("Colonoscopy + biopsy", "Definitive diagnosis and histology"),
        urg("CT Abdomen/Pelvis with contrast", "TNM staging"),
        urg("CEA Tumour Marker", "Baseline and monitoring"),
        rtn(
          "Full Blood Count (FBC) + Iron Studies",
          "Anaemia from occult bleeding",
        ),
        rtn("CT Colonography", "If colonoscopy contraindicated"),
      ],
    });
  }

  // ─── HAEMORRHOIDS / ANAL FISSURE ───
  if (
    anyRectalBleed &&
    !weightLoss &&
    !ribbonStools &&
    !bloodMixedStool &&
    !alarmMass
  ) {
    differentials.push({
      condition: "Haemorrhoids / Anal Fissure",
      icd10: "K64.9",
      confirmatoryTest: "Proctoscopy / flexible sigmoidoscopy",
      confidence:
        anorectalLocation && !ageOver55 && !famCRC ? "Moderate" : "Low",
      rationale:
        "Bright red blood on toilet paper or surface of stool, especially with anal pain or straining, is more consistent with haemorrhoids or anal fissure.",
      fits: [
        "Anorectal / bright-red rectal bleeding",
        ...(anorectalLocation ? ["Anorectal location"] : []),
        ...(incompleteEvac ? ["Sensation of incomplete evacuation"] : []),
      ],
      against: [
        "Must exclude colorectal neoplasm in patients over 40 or with family history",
        ...(ageOver55 ? ["Age >55 — colonoscopy required regardless"] : []),
      ],
      treatment:
        "Haemorrhoids: High-fibre diet, topical preparations (hydrocortisone/lidocaine). Rubber band ligation or sclerotherapy for persistent Grade II–III. Fissure: GTN 0.4% topical or diltiazem 2% cream. Botulinum toxin or lateral internal sphincterotomy if refractory.",
      classification: "organic",
      icdHint: "K64.9",
      investigations: [
        urg(
          "Proctoscopy / Sigmoidoscopy",
          "Direct visualisation of haemorrhoids/fissure",
        ),
        rtn(
          "Colonoscopy",
          "Exclude proximal colorectal pathology if ≥40 or risk factors",
        ),
      ],
    });
  }

  // ─── INFECTIVE GASTROENTERITIS / TRAVELLER'S DIARRHOEA ───
  if ((travelDia || recentTravel) && hasDiarrhoea && !bloodyMucousDia) {
    differentials.push({
      condition: "Infective Gastroenteritis / Traveller's Diarrhoea",
      icd10: "A09.9",
      confirmatoryTest: "Stool MC&S + ova, cysts & parasites (3 samples)",
      confidence: travelDia && fever ? "High" : "Moderate",
      rationale:
        "Acute diarrhoea following international travel or rural exposure suggests infectious aetiology (bacterial, viral, or parasitic — Giardia, ETEC, Entamoeba).",
      fits: [
        ...(travelDia ? ["Travel to developing country / rural area"] : []),
        ...(recentTravel ? ["Recent international travel history"] : []),
        ...(fever ? ["Fever"] : []),
        ...(wateryLargeVolume ? ["Watery, large-volume diarrhoea"] : []),
      ],
      against: [
        ...(chronic
          ? ["Chronic duration — post-infectious IBS or IBD if prolonged"]
          : []),
      ],
      treatment:
        "Oral rehydration. Most self-limiting in 5–7 days. Azithromycin 500mg OD × 3 days for bacterial. Metronidazole 400mg TDS × 7 days for Giardia/Amoeba. Avoid antidiarrhoeals in bloody diarrhoea. Notify public health if cluster.",
      classification: "organic",
      icdHint: "A09.9",
      investigations: [
        urg(
          "Stool Microscopy, Culture & Sensitivity (×3 samples)",
          "Bacterial and parasitic infection",
        ),
        urg(
          "Stool Ova, Cysts & Parasites",
          "Giardia, Entamoeba, Cryptosporidium",
        ),
        rtn("Full Blood Count (FBC)", "Leucocytosis, eosinophilia"),
        rtn("C. difficile Toxin PCR", "If post-antibiotic component"),
      ],
    });
  }

  // ─── C. DIFFICILE COLITIS ───
  if (postAntibioticDia || (recentAntibiotics && hasDiarrhoea)) {
    differentials.push({
      condition: "Clostridioides difficile Colitis",
      icd10: "A04.7",
      confirmatoryTest: "C. difficile toxin PCR / NAAT (stool)",
      confidence: postAntibioticDia ? "High" : "Moderate",
      rationale:
        "Diarrhoea starting within days to weeks of antibiotic use requires urgent exclusion of C. difficile colitis (pseudomembranous colitis).",
      fits: [
        ...(postAntibioticDia ? ["Diarrhoea started after antibiotics"] : []),
        ...(recentAntibiotics
          ? ["Recent antibiotic use (within 3 months)"]
          : []),
        ...(fever ? ["Fever"] : []),
      ],
      against: [
        ...(!recentAntibiotics ? ["No recent antibiotic exposure"] : []),
      ],
      treatment:
        "Mild-moderate: Oral vancomycin 125mg QDS × 10 days (preferred over metronidazole). Severe: Oral vancomycin 500mg QDS + IV metronidazole 500mg TDS. Fidaxomicin 200mg BD × 10 days for recurrent cases. Faecal microbiota transplantation (FMT) for recurrent C. diff.",
      classification: "organic",
      icdHint: "A04.7",
      investigations: [
        emg(
          "C. difficile Toxin PCR / NAAT (stool)",
          "Confirm diagnosis urgently",
        ),
        urg("Full Blood Count (FBC) + CRP + WBC", "Severity assessment"),
        urg("CT Abdomen (if severe)", "Toxic megacolon, colitis extent"),
        rtn("Sigmoidoscopy", "Pseudomembranous plaques if diagnosis unclear"),
      ],
    });
  }

  // ─── IBS-D ───
  if (
    hasDiarrhoea &&
    (looseUrgency || diarrhoeaPainful) &&
    !bloodyMucousDia &&
    !nocturnalDia &&
    !weightLoss &&
    (stressWorsens || stressAnxiety || reliefDefecation || fluctuates)
  ) {
    differentials.push({
      condition: "Irritable Bowel Syndrome — Diarrhoea Predominant (IBS-D)",
      icd10: "K58.0",
      romeIV: "IBS-D",
      confirmatoryTest:
        "Colonoscopy + faecal calprotectin to exclude IBD/microscopic colitis",
      confidence:
        reliefDefecation && fluctuates && !organicFlag ? "High" : "Moderate",
      rationale:
        "Diarrhoea with urgency, mucus, stress-related exacerbation, and relief with defecation in the absence of alarm features meets Rome IV criteria for IBS-D.",
      fits: [
        "Diarrhoea with urgency",
        ...(mucusStool ? ["Mucus in stool (Rome IV feature)"] : []),
        ...(reliefDefecation
          ? ["Relief with defecation (Rome IV criterion)"]
          : []),
        ...(stressWorsens || stressAnxiety
          ? ["Stress-related exacerbation"]
          : []),
        ...(fluctuates ? ["Fluctuating course — good and bad days"] : []),
        ...(allInvestNormal ? ["Previous normal investigations"] : []),
      ],
      against: [
        ...(nocturnalDia
          ? ["Nocturnal diarrhoea — organic cause more likely"]
          : ["No nocturnal symptoms"]),
        ...(weightLoss
          ? ["Weight loss — organic disease must be excluded"]
          : ["No weight loss"]),
      ],
      treatment:
        "Low-FODMAP diet (dietitian-led). Loperamide for diarrhoea control. Antispasmodics (mebeverine/hyoscine) for cramping. Low-dose TCA or SSRIs for refractory cases. Gut-directed hypnotherapy / CBT. Rifaximin 550mg TDS × 14 days (if SIBO overlap).",
      classification: "functional",
      icdHint: "K58.0",
      investigations: [
        urg(
          "Faecal Calprotectin",
          "Exclude IBD (>200μg/g = investigate further)",
        ),
        rtn("Colonoscopy with biopsies", "Exclude IBD and microscopic colitis"),
        rtn("Anti-TTG IgA / Coeliac Screen", "Exclude coeliac disease"),
        rtn("Thyroid Function Tests (TFTs)", "Exclude hyperthyroidism"),
        rtn("Full Blood Count (FBC) + CRP", "Exclude inflammatory / infective"),
      ],
    });
  }

  // ─── IBS-C ───
  if (
    hasConstipation &&
    (stressWorsens || stressAnxiety || reliefDefecation || fluctuates) &&
    !weightLoss &&
    !ribbonStools &&
    !anyRectalBleed
  ) {
    differentials.push({
      condition: "Irritable Bowel Syndrome — Constipation Predominant (IBS-C)",
      icd10: "K58.2",
      romeIV: "IBS-C",
      confirmatoryTest: "Colonoscopy + colonic transit study",
      confidence:
        reliefDefecation && stressWorsens && !organicFlag ? "Moderate" : "Low",
      rationale:
        "Constipation with mucus passage, stress exacerbation, and relief with defecation is consistent with IBS-C per Rome IV criteria.",
      fits: [
        "Constipation with hard / difficult stools",
        ...(mucusStool ? ["Mucus passage"] : []),
        ...(stressWorsens || stressAnxiety
          ? ["Stress-related exacerbation"]
          : []),
        ...(reliefDefecation ? ["Relief with defecation"] : []),
        ...(fluctuates ? ["Fluctuating course"] : []),
      ],
      against: [
        ...(ribbonStools
          ? ["Ribbon stools — structural obstruction must be excluded"]
          : ["No stool calibre change"]),
        ...(ageOver55 ? ["Age >55 — colonoscopy mandatory"] : []),
      ],
      treatment:
        "Soluble fibre (ispaghula husk). Osmotic laxatives (macrogol/lactulose) 1st line. Linaclotide or prucalopride for refractory IBS-C. Antispasmodics for cramping. Biofeedback for dyssynergic defaecation.",
      classification: "functional",
      icdHint: "K58.2",
      investigations: [
        rtn(
          "Thyroid Function Tests (TFTs)",
          "Hypothyroidism causing constipation",
        ),
        rtn("Full Blood Count (FBC)", "Baseline"),
        rtn("Colonoscopy", "Structural exclusion (age >45 or alarm features)"),
        rtn("Anorectal Manometry", "Dyssynergia / pelvic floor dysfunction"),
      ],
    });
  }

  // ─── IBS-M ───
  if (
    alternatingBowel &&
    !anyRectalBleed &&
    !weightLoss &&
    (fluctuates || stressWorsens || stressAnxiety)
  ) {
    differentials.push({
      condition: "Irritable Bowel Syndrome — Mixed (IBS-M)",
      icd10: "K58.9",
      romeIV: "IBS-M (Mixed)",
      confirmatoryTest:
        "Colonoscopy + faecal calprotectin to exclude IBD/microscopic colitis",
      confidence:
        stressWorsens && fluctuates && !organicFlag ? "Moderate" : "Low",
      rationale:
        "Alternating diarrhoea and constipation without alarm features is consistent with mixed-type IBS (Rome IV).",
      fits: [
        "Alternating diarrhoea and constipation",
        ...(stressWorsens || stressAnxiety
          ? ["Stress-related exacerbation"]
          : []),
        ...(fluctuates ? ["Fluctuating course (good and bad days)"] : []),
        "Absence of bleeding and weight loss",
      ],
      against: [
        ...(famCRC ? ["Family history CRC — colonoscopy mandatory"] : []),
        ...(nocturnalDia ? ["Nocturnal symptoms (organic flag)"] : []),
      ],
      treatment:
        "Treat predominant symptom: laxatives for constipation phases, loperamide for diarrhoea phases. Low-FODMAP diet. Mebeverine for pain. Psychological support and stress management.",
      classification: "functional",
      icdHint: "K58.9",
      investigations: [
        rtn("Faecal Calprotectin", "Exclude IBD"),
        rtn("Thyroid Function Tests (TFTs)", "Exclude thyroid cause"),
        rtn("Full Blood Count (FBC)", "Baseline"),
        rtn("Colonoscopy", "If age >45 or alarm features emerge"),
      ],
    });
  }

  // ─── MICROSCOPIC COLITIS ───
  if (
    hasDiarrhoea &&
    wateryLargeVolume &&
    !bloodyMucousDia &&
    (nocturnalDia || chronic) &&
    !travelDia &&
    !postAntibioticDia
  ) {
    differentials.push({
      condition: "Microscopic Colitis (Collagenous / Lymphocytic)",
      icd10: "K52.8",
      confirmatoryTest: "Colonoscopy with biopsies (right colon essential)",
      confidence:
        nocturnalDia && wateryLargeVolume && !bloodyMucousDia
          ? "High"
          : "Moderate",
      rationale:
        "Chronic, watery, large-volume, non-bloody diarrhoea — particularly nocturnal — with normal colonoscopy appearance but abnormal histology defines microscopic colitis.",
      fits: [
        "Watery, large-volume, non-bloody diarrhoea",
        ...(nocturnalDia ? ["Nocturnal diarrhoea"] : []),
        ...(chronic ? ["Chronic course"] : []),
        ...(nsaidUse || onPPI ? ["NSAID/PPI use (causative agents)"] : []),
        ...(autoimmune ? ["Autoimmune history"] : []),
      ],
      against: [
        ...(bloodyMucousDia
          ? ["Bloody diarrhoea — more typical of IBD"]
          : ["Non-bloody (typical for microscopic colitis)"]),
      ],
      treatment:
        "Budesonide 9mg OD × 8 weeks (1st line). Cease NSAIDs/PPIs if causative. Cholestyramine for bile acid malabsorption subtype. Azathioprine for steroid-dependent cases. Bismuth subsalicylate for mild cases.",
      classification: "organic",
      icdHint: "K52.8",
      investigations: [
        urg(
          "Colonoscopy + random biopsies (including right colon)",
          "Microscopic colitis — normal macroscopy, abnormal histology",
        ),
        rtn("Full Blood Count (FBC)", "Anaemia, eosinophilia"),
        rtn("Anti-TTG IgA / Coeliac Screen", "Associated autoimmune screen"),
        rtn("Thyroid Function Tests", "Associated autoimmune"),
      ],
    });
  }

  // ─── COELIAC DISEASE ───
  if (
    (steatorrhoea || steatorrhoeaDia || malabsorption || worseSpecificFood) &&
    (famCeliac || autoimmune || ironDeficiency)
  ) {
    differentials.push({
      condition: "Coeliac Disease",
      icd10: "K90.0",
      confirmatoryTest:
        "Duodenal biopsies at upper endoscopy (Marsh grade) + IgA anti-tTG",
      confidence:
        famCeliac && (steatorrhoea || steatorrhoeaDia) ? "High" : "Moderate",
      rationale:
        "Steatorrhoea, malabsorption, bloating worsened by gluten-containing foods, and iron deficiency in the context of family history or autoimmune disease suggests coeliac disease.",
      fits: [
        ...(steatorrhoea || steatorrhoeaDia
          ? ["Steatorrhoea / fat malabsorption"]
          : []),
        ...(malabsorption
          ? ["Eating normally but losing weight (malabsorption)"]
          : []),
        ...(worseSpecificFood
          ? ["Symptom correlation with specific foods (gluten)"]
          : []),
        ...(famCeliac ? ["Family history of coeliac disease"] : []),
        ...(ironDeficiency ? ["Iron deficiency anaemia"] : []),
        ...(autoimmune ? ["Associated autoimmune disease"] : []),
      ],
      against: [
        ...(weightGained
          ? ["Weight gain (less typical for active coeliac)"]
          : []),
        ...(!worseSpecificFood && !famCeliac
          ? ["No gluten/food correlation history"]
          : []),
      ],
      treatment:
        "Strict lifelong gluten-free diet (GFD) — dietitian-led. Monitor for nutritional deficiencies (Fe, folate, B12, D, Ca). Annual FBC, iron studies, bone density. Repeat duodenal biopsy at 12 months to confirm mucosal healing. Pneumococcal vaccination (splenic atrophy risk).",
      classification: "organic",
      icdHint: "K90.0",
      investigations: [
        urg(
          "IgA anti-tTG + Total IgA",
          "Coeliac serology (IgA deficiency may give false negative)",
        ),
        urg(
          "Upper GI Endoscopy + duodenal biopsies (×4)",
          "Villous atrophy — Marsh grade",
        ),
        rtn(
          "Full Blood Count + Iron Studies + Ferritin + B12 + Folate",
          "Malabsorption panel",
        ),
        rtn(
          "Bone Density (DEXA scan)",
          "Osteoporosis risk from calcium malabsorption",
        ),
        rtn("HLA-DQ2/DQ8 typing", "Exclude coeliac if both negative"),
      ],
    });
  }

  // ─── SIBO ───
  if (
    (malabsorption || steatorrhoea || hasDiarrhoea) &&
    (prevAbdoSurgery || comorbidDiabThyroid || worseSpecificFood) &&
    !famCeliac
  ) {
    differentials.push({
      condition: "Small Intestinal Bacterial Overgrowth (SIBO)",
      icd10: "K63.9",
      confirmatoryTest: "Glucose/lactulose hydrogen breath test",
      confidence:
        prevAbdoSurgery && (malabsorption || hasDiarrhoea) ? "Moderate" : "Low",
      rationale:
        "Bloating, diarrhoea, and malabsorption — particularly after abdominal surgery, with diabetes, or worsened by carbohydrate-rich food — raises the possibility of SIBO.",
      fits: [
        ...(prevAbdoSurgery
          ? ["Previous abdominal surgery (blind loop risk)"]
          : []),
        ...(malabsorption ? ["Malabsorption despite normal food intake"] : []),
        ...(hasDiarrhoea ? ["Diarrhoea"] : []),
        ...(worseSpecificFood
          ? ["Symptom link to carbohydrate-rich or fermentable foods"]
          : []),
        ...(comorbidDiabThyroid
          ? ["Autonomic neuropathy / dysmotility (diabetes)"]
          : []),
      ],
      against: [
        ...(travelDia ? ["Travel history — infection first"] : []),
        ...(bloodyMucousDia ? ["Bloody diarrhoea — IBD more likely"] : []),
      ],
      treatment:
        "Rifaximin 550mg TDS × 14 days (1st line, non-absorbable antibiotic). Alternative: metronidazole 400mg TDS × 7–10 days. Elemental diet. Address underlying motility disorder. Low-FODMAP diet for ongoing symptom control.",
      classification: "organic",
      icdHint: "K63.9",
      investigations: [
        urg(
          "Glucose or Lactulose Hydrogen Breath Test",
          "SIBO diagnosis (>20ppm rise)",
        ),
        rtn(
          "Duodenal aspirate and culture",
          "Gold standard if breath test equivocal",
        ),
        rtn("Full Blood Count + B12 + Iron studies", "Malabsorption panel"),
        rtn(
          "Upper GI Endoscopy + duodenal biopsies",
          "Exclude coeliac overlap",
        ),
      ],
    });
  }

  // ─── VIRAL HEPATITIS ───
  if (jaundiceFatigue && !heavyAlcohol && !jaundiceSuddenFever) {
    differentials.push({
      condition: "Viral Hepatitis (A / B / C / E)",
      icd10: "B19.9",
      confirmatoryTest:
        "Hepatitis serology panel (HBsAg, anti-HCV, anti-HAV IgM)",
      confidence: recentTravel || acuteOnset ? "Moderate" : "Low",
      rationale:
        "Jaundice with dark urine, fatigue, and nausea without RUQ pain or fever suggests hepatocellular jaundice — viral hepatitis is a common cause.",
      fits: [
        "Hepatocellular jaundice",
        ...(jaundiceFatigue ? ["Fatigue and nausea with jaundice"] : []),
        ...(recentTravel ? ["Recent travel (HAV / HEV risk)"] : []),
        ...(nauseaVomiting ? ["Nausea / vomiting"] : []),
      ],
      against: [
        ...(heavyAlcohol
          ? ["Heavy alcohol — ALD more likely"]
          : ["No heavy alcohol use"]),
        ...(ruqPain ? ["RUQ pain — biliary pathology possible"] : []),
      ],
      treatment:
        "HAV/HEV: Supportive — rest, adequate fluids, avoid hepatotoxins. HBV: Antiviral therapy if HBeAg+ or elevated ALT (tenofovir/entecavir). HCV: Direct-acting antivirals (DAAs — sofosbuvir/ledipasvir or glecaprevir/pibrentasvir) — cure >95%.",
      classification: "organic",
      icdHint: "B19.9",
      investigations: [
        urg(
          "Hepatitis Serology Panel (HBsAg, anti-HCV, anti-HAV IgM, anti-HEV IgM)",
          "Viral hepatitis typing",
        ),
        urg(
          "Liver Function Tests (LFTs) — ALT, AST, ALP, GGT, Bilirubin",
          "Severity and pattern",
        ),
        urg("Coagulation (PT/INR)", "Synthetic liver function"),
        rtn("Abdominal Ultrasound", "Liver echotexture, portal hypertension"),
        rtn("HBV DNA / HCV RNA", "Viral load if serology positive"),
      ],
    });
  }

  // ─── ALCOHOLIC LIVER DISEASE ───
  if (heavyAlcohol && (hasJaundice || jaundiceLiverFlare || jaundiceBloating)) {
    differentials.push({
      condition: "Alcoholic Liver Disease (Hepatitis / Cirrhosis)",
      icd10: "K70.9",
      confirmatoryTest: "AST:ALT >2, GGT, ultrasound + FibroScan",
      confidence: heavyAlcohol && hasJaundice ? "High" : "Moderate",
      rationale:
        "Heavy alcohol consumption with jaundice, tender hepatomegaly, or ascites is characteristic of alcoholic liver disease (hepatitis or cirrhosis).",
      fits: [
        ...(heavyAlcohol ? ["Heavy alcohol use >14 units/week"] : []),
        ...(hasJaundice ? ["Jaundice"] : []),
        ...(jaundiceBloating ? ["Abdominal swelling / ascites"] : []),
        ...(jaundiceLiverFlare ? ["Known liver disease — flare"] : []),
      ],
      against: [...(!heavyAlcohol ? ["No heavy alcohol history"] : [])],
      treatment:
        "Complete alcohol cessation (most critical step). Alcoholic hepatitis: prednisolone 40mg OD × 4 weeks if Maddrey's DF >32. Nutritional support (high-protein diet). Ascites: low-sodium diet + spironolactone ± furosemide. Liver transplant if abstinence maintained ≥6 months.",
      classification: "organic",
      icdHint: "K70.9",
      investigations: [
        urg(
          "Liver Function Tests (AST:ALT ratio, GGT)",
          "ALD pattern (AST:ALT >2:1)",
        ),
        urg("FBC + Coagulation (PT/INR)", "Hypersplenism, coagulopathy"),
        urg("Abdominal Ultrasound", "Liver size, echotexture, spleen, ascites"),
        urg("FibroScan (Transient Elastography)", "Fibrosis staging"),
        rtn("Liver Biopsy", "Histology if diagnosis unclear"),
        rtn(
          "Maddrey's Discriminant Function",
          "Prednisolone decision in alcoholic hepatitis",
        ),
      ],
    });
  }

  // ─── APPENDICITIS ───
  if (periumbilicalRLQ && (fever || constantPain || acuteOnset)) {
    differentials.push({
      condition: "Acute Appendicitis",
      icd10: "K37",
      confirmatoryTest: "CT abdomen/pelvis (or USS in younger patients)",
      confidence: periumbilicalRLQ && fever && acuteOnset ? "High" : "Moderate",
      rationale:
        "Periumbilical pain migrating to the RLQ with fever and acute onset is the classic presentation of acute appendicitis — surgical emergency.",
      fits: [
        "Periumbilical pain → RLQ migration",
        ...(fever ? ["Fever"] : []),
        ...(acuteOnset ? ["Acute onset (<1 week)"] : []),
        ...(constantPain ? ["Constant, progressive pain"] : []),
        ...(nauseaVomiting ? ["Nausea/vomiting"] : []),
      ],
      against: [
        ...(chronic
          ? ["Chronic duration — less typical for acute appendicitis"]
          : []),
      ],
      treatment:
        "URGENT surgical review — laparoscopic appendicectomy. IV antibiotics (piperacillin/tazobactam) preoperatively. Conservative antibiotics (co-amoxiclav) for uncomplicated appendicitis (selected cases). CT/USS for diagnosis prior to surgery.",
      classification: "organic",
      icdHint: "K37",
      investigations: [
        emg("Full Blood Count (FBC) + CRP", "Leucocytosis, elevated CRP"),
        emg("CT Abdomen/Pelvis", "Confirm appendicitis, exclude perforation"),
        urg("Abdominal Ultrasound", "In younger patients / pregnancy"),
        rtn("Alvarado / MANTRELS Score", "Clinical probability scoring"),
      ],
    });
  }

  // ─── CIRRHOSIS / PORTAL HYPERTENSION ───
  if (
    (jaundiceLiverFlare || jaundiceBloating) &&
    (knownLiverDisease || famLiverDisease)
  ) {
    differentials.push({
      condition: "Cirrhosis / Decompensated Liver Disease",
      icd10: "K74.6",
      confirmatoryTest: "FibroScan / liver biopsy + Child-Pugh score",
      confidence: knownLiverDisease && jaundiceLiverFlare ? "High" : "Moderate",
      rationale:
        "Jaundice with abdominal distension (ascites) and known liver disease or heavy alcohol use suggests decompensated cirrhosis — portal hypertension, varices, and HCC surveillance required.",
      fits: [
        ...(knownLiverDisease ? ["Known liver disease history"] : []),
        ...(jaundiceBloating ? ["Abdominal distension (ascites)"] : []),
        ...(hasJaundice ? ["Jaundice"] : []),
        ...(heavyAlcohol ? ["Heavy alcohol use"] : []),
      ],
      against: [
        ...(acuteOnset ? ["Acute onset — acute hepatitis more likely"] : []),
      ],
      treatment:
        "Treat complications: Ascites — spironolactone 100–200mg + furosemide. Varices — non-selective beta-blocker (propranolol/carvedilol) + endoscopic band ligation. HE: lactulose, rifaximin. HCC surveillance: 6-monthly ultrasound + AFP. Liver transplant evaluation.",
      classification: "organic",
      icdHint: "K74.6",
      investigations: [
        urg(
          "FibroScan (Transient Elastography)",
          "Non-invasive fibrosis staging",
        ),
        urg("LFTs + Coagulation + FBC + Albumin", "Child-Pugh / MELD scoring"),
        urg(
          "Abdominal Ultrasound + Doppler",
          "Portal hypertension, ascites, focal lesions",
        ),
        urg("OGD (surveillance)", "Varices assessment and grading"),
        rtn("AFP + ultrasound every 6 months", "HCC surveillance"),
        rtn("Liver Biopsy", "Aetiology / staging if equivocal"),
      ],
    });
  }

  // ─── FUNCTIONAL ABDOMINAL PAIN / CAPS ───
  if (
    (allInvestNormal &&
      (stressAnxiety || stressWorsens || worseWithStress) &&
      diffuseAbdo) ||
    (diffuseAbdo &&
      stressAnxiety &&
      !anyUpperGIBleed &&
      !anyRectalBleed &&
      !weightLoss)
  ) {
    differentials.push({
      condition: "Functional Abdominal Pain / CAPS",
      icd10: "F45.8",
      romeIV: "CAPS",
      confirmatoryTest: "Comprehensive exclusion workup before diagnosis",
      confidence: allInvestNormal && stressAnxiety ? "Moderate" : "Low",
      rationale:
        "Diffuse abdominal pain linked to psychological distress with all investigations normal is consistent with Centrally-Mediated Abdominal Pain Syndrome (CAPS) per Rome IV.",
      fits: [
        ...(diffuseAbdo ? ["Diffuse, poorly localised abdominal pain"] : []),
        ...(stressAnxiety || stressWorsens
          ? ["Psychological stress correlation"]
          : []),
        ...(allInvestNormal ? ["Previous normal investigations"] : []),
      ],
      against: [
        ...(weightLoss
          ? ["Weight loss — organic cause must be excluded first"]
          : []),
        ...(organicFlag ? ["Organic alarm features present"] : []),
      ],
      treatment:
        "Multidisciplinary approach: Gut-directed psychotherapy / CBT (most evidence). Low-dose TCA (amitriptyline 10–25mg) or SNRI (duloxetine). Gabapentin for neuropathic component. Physiotherapy / graded exercise. Avoid repeated investigations once organic disease excluded.",
      classification: "functional",
      icdHint: "F45.8",
      investigations: [
        rtn("Full Blood Count (FBC) + CRP + ESR", "Baseline screen"),
        rtn("LFTs, TFTs, Calcium, Glucose", "Metabolic screen"),
        rtn("CT Abdomen/Pelvis", "Structural exclusion"),
        rtn("Gastroenterology referral", "Diagnosis by exclusion"),
      ],
    });
  }

  // ─── GLOBUS ───
  if (globusSensation && !hasDysphagia && !weightLoss) {
    differentials.push({
      condition: "Globus Pharyngeus (Functional)",
      icd10: "F45.8",
      romeIV: "Globus",
      confirmatoryTest: "Upper endoscopy to exclude structural cause",
      confidence: swallowingNormal ? "Moderate" : "Low",
      rationale:
        "A persistent sensation of a lump in the throat with entirely normal swallowing function is consistent with globus pharyngeus (Rome IV functional oesophageal disorder).",
      fits: [
        "Lump-in-throat sensation",
        ...(swallowingNormal ? ["Swallowing function preserved"] : []),
        ...(stressWorsens || stressAnxiety
          ? ["Stress-related exacerbation"]
          : []),
      ],
      against: [
        ...(hasDysphagia
          ? ["Dysphagia present — organic pathology must be excluded"]
          : ["No dysphagia"]),
        ...(weightLoss ? ["Weight loss"] : []),
      ],
      treatment:
        "Reassurance after structural exclusion. GERD treatment if co-existing (PPI 4–8 weeks). Speech and language therapy. Cognitive behavioural therapy for health anxiety. Avoid throat clearing (worsens symptoms).",
      classification: "functional",
      icdHint: "F45.8",
      investigations: [
        urg("Upper GI Endoscopy (OGD)", "Exclude structural / malignant cause"),
        rtn(
          "Oesophageal Manometry + pH Monitoring",
          "Exclude GERD, motility disorder",
        ),
        rtn(
          "ENT Review / Nasendoscopy",
          "Exclude post-nasal drip, vocal cord pathology",
        ),
      ],
    });
  }

  // ─── DIVERTICULAR DISEASE ───
  if (
    (llqLocation || rlqLocation) &&
    (constipation || alternatingBowel) &&
    (age4055 || ageOver55) &&
    !bloodyMucousDia
  ) {
    differentials.push({
      condition: "Diverticular Disease / Diverticulitis",
      icd10: "K57.30",
      confirmatoryTest: "CT colonography or colonoscopy",
      confidence: llqLocation && (fever || constantPain) ? "Moderate" : "Low",
      rationale:
        "Left lower abdominal pain with altered bowel habit in middle-aged or older patients raises the possibility of diverticular disease or diverticulitis.",
      fits: [
        ...(llqLocation ? ["Left lower quadrant pain"] : []),
        ...(constipation ? ["Constipation"] : []),
        ...(fever ? ["Fever (suggests diverticulitis)"] : []),
        ...(ageOver55 || age4055 ? ["Age 40+ (increasing prevalence)"] : []),
      ],
      against: [
        ...(bloodyMucousDia ? ["Bloody diarrhoea — IBD more likely"] : []),
        ...(weightLoss ? ["Weight loss — exclude malignancy"] : []),
      ],
      treatment:
        "Uncomplicated diverticular disease: High-fibre diet, adequate hydration. Acute diverticulitis (mild): Oral antibiotics (co-amoxiclav × 7 days) + clear fluids. Severe/complicated: IV antibiotics + CT staging. Elective sigmoid colectomy after ≥2 episodes or complications.",
      classification: "organic",
      icdHint: "K57.30",
      investigations: [
        urg(
          "CT Abdomen/Pelvis with contrast",
          "Diverticulitis — pericolic fat stranding, abscess",
        ),
        rtn("Colonoscopy", "After acute episode resolves to exclude CRC"),
        rtn("Full Blood Count + CRP", "Infection severity"),
        rtn("CT Colonography", "Alternative to colonoscopy in elderly"),
      ],
    });
  }

  // ─── MINIMUM 3 DIFFERENTIALS GUARANTEE ───
  if (differentials.length < 3) {
    // Only add these if at least plausible given the symptom profile
    if (
      !differentials.some(
        (d) => d.icd10.startsWith("K58") || d.icd10 === "K59.1",
      )
    ) {
      differentials.push({
        condition: "Functional GI Disorder (Unclassified)",
        icd10: "K59.9",
        romeIV: "Functional Bowel Disorder",
        confirmatoryTest: "Comprehensive exclusion workup",
        confidence: "Low",
        rationale:
          "When no specific structural or organic cause is identified, a functional bowel disorder remains a possible diagnosis pending further clinical evaluation.",
        fits: [
          "Absence of alarm features",
          ...(stressWorsens || stressAnxiety ? ["Stress association"] : []),
        ],
        against: [
          "Organic pathology must be excluded before making this diagnosis",
        ],
        treatment:
          "Investigate appropriately first. Reassurance, dietary modification, antispasmodics, and psychological support. Refer to gastroenterology.",
        classification: "functional",
        icdHint: "K59.9",
        investigations: [
          rtn("Full Blood Count (FBC) + CRP", "Baseline screen"),
          rtn("Thyroid Function Tests (TFTs)", "Exclude metabolic cause"),
          rtn("Coeliac serology (IgA anti-tTG)", "Exclude coeliac disease"),
          rtn("Faecal Calprotectin", "Exclude IBD"),
        ],
      });
    }

    if (
      differentials.length < 3 &&
      !differentials.some((d) => d.icd10 === "K58.9")
    ) {
      differentials.push({
        condition: "Irritable Bowel Syndrome (Unclassified)",
        icd10: "K58.9",
        romeIV: "IBS (Unsubtyped)",
        confirmatoryTest: "Colonoscopy + calprotectin to exclude IBD",
        confidence: "Low",
        rationale:
          "IBS remains the most prevalent functional GI condition and should be considered when organic causes are not identified on initial workup.",
        fits: [
          "GI symptoms without definitive organic cause",
          ...(stressWorsens || stressAnxiety
            ? ["Psychosocial stress correlation"]
            : []),
        ],
        against: ["Organic disease must be excluded before this diagnosis"],
        treatment:
          "Rome IV guided positive diagnosis after exclusion. Low-FODMAP diet, antispasmodics, psychological support.",
        classification: "functional",
        icdHint: "K58.9",
        investigations: [
          rtn("Faecal Calprotectin", "Exclude IBD"),
          rtn("Colonoscopy + biopsies", "Structural exclusion"),
          rtn("Anti-TTG IgA / Coeliac Screen", "Exclude coeliac"),
        ],
      });
    }

    if (
      differentials.length < 3 &&
      !differentials.some((d) => d.icd10 === "K30")
    ) {
      differentials.push({
        condition: "Functional Dyspepsia (Exclusion Diagnosis)",
        icd10: "K30",
        romeIV: "FD-EPS",
        confirmatoryTest: "Upper endoscopy (to exclude organic disease)",
        confidence: "Low",
        rationale:
          "Upper GI symptoms without structural cause on investigation are classified as functional dyspepsia by Rome IV when symptoms meet duration criteria.",
        fits: [
          "Upper GI symptoms",
          ...(stressWorsens ? ["Stress association"] : []),
        ],
        against: ["Organic disease must be excluded first"],
        treatment:
          "H. pylori test-and-treat. PPI trial. Low-dose TCA for refractory cases. Dietary modification.",
        classification: "functional",
        icdHint: "K30",
        investigations: [
          rtn("Upper GI Endoscopy (OGD)", "Exclude organic upper GI pathology"),
          rtn("H. pylori Urea Breath Test", "Test-and-treat"),
        ],
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CLASSIFICATION
  // ═══════════════════════════════════════════════════════════════════════
  const hasCriticalFlag = redFlags.some((f) => f.severity === "critical");
  const hasOrganicSignals =
    anyUpperGIBleed ||
    anyBloodInStool ||
    anyRectalBleed ||
    weightLoss ||
    hasJaundice ||
    fever ||
    nocturnalDia ||
    nocturnalSymp ||
    ribbonStools ||
    hasCriticalFlag ||
    steatorrhoea ||
    steatorrhoeaDia ||
    alarmMass;
  const hasFunctionalSignals =
    !anyUpperGIBleed &&
    !anyBloodInStool &&
    !weightLoss &&
    !hasJaundice &&
    !fever &&
    (stressWorsens ||
      stressAnxiety ||
      worseWithStress ||
      triggeredByStressIllness ||
      reliefDefecation ||
      fluctuates ||
      allInvestNormal ||
      stableNoProg) &&
    redFlags.filter((f) => f.severity === "critical").length === 0;

  let classification: Classification;
  let classificationRationale: string;

  if (hasOrganicSignals) {
    classification = "Organic";
    classificationRationale =
      "Presence of one or more alarm features (rectal bleeding, weight loss, fever, jaundice, nocturnal symptoms, steatorrhoea, or haematemesis) indicates a likely organic aetiology requiring structural investigation (Sleisenger & Fordtran 10th Ed).";
  } else if (hasFunctionalSignals) {
    classification = "Functional";
    classificationRationale =
      "Absence of alarm features combined with psychosocial stressors, fluctuating course, relief with defecation, and/or previous normal investigations suggests a functional GI disorder (IBS or functional dyspepsia) per Rome IV diagnostic criteria.";
  } else {
    classification = "Indeterminate";
    classificationRationale =
      "The symptom pattern does not clearly favour organic or functional aetiology at this stage. Further clinical assessment and targeted investigations are recommended before a definitive classification is made.";
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SAFETY NETTING
  // ═══════════════════════════════════════════════════════════════════════
  const safetyNetting: string[] = [
    "Haematemesis (vomiting fresh blood) or coffee-ground vomit — attend Emergency immediately",
    "Melaena (black, tarry, foul-smelling stools) — attend Emergency immediately",
    "Severe, unremitting abdominal pain not relieved by analgesia",
    "Signs of haemodynamic collapse: pallor, rapid pulse, cold sweats, fainting",
    "Progressive difficulty swallowing over days or weeks",
    "Persistent vomiting preventing any oral fluid intake",
    "New onset of jaundice (yellowing of skin or eyes)",
    "Fever >38.5°C persisting more than 48 hours with abdominal symptoms",
    "New palpable abdominal or rectal mass",
    "Significant unintentional weight loss over a short period",
  ];

  if (progDysphagia || alarmProgDysphagia) {
    safetyNetting.push(
      "Return urgently if swallowing becomes completely blocked or if weight loss accelerates",
    );
  }
  if (weightLoss) {
    safetyNetting.push(
      "Return immediately if weight loss exceeds 10% body weight or accelerates in rate",
    );
  }
  if (hasJaundice) {
    safetyNetting.push(
      "Return immediately if jaundice deepens or is accompanied by confusion, drowsiness, or asterixis (liver failure signs)",
    );
  }
  if (anyRectalBleed || anyBloodInStool) {
    safetyNetting.push(
      "Return immediately if rectal bleeding becomes heavy, fresh, or is accompanied by dizziness or collapse",
    );
  }
  if (hasCriticalFlag) {
    safetyNetting.unshift(
      "⚠️ URGENT: Alarm features were detected in this assessment — urgent investigation should not be delayed",
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LEGACY FLAT INVESTIGATION LIST (for PDF compat)
  // ═══════════════════════════════════════════════════════════════════════
  const suggestedInvestigations = [
    ...new Set(
      differentials.flatMap((d) => d.investigations.map((i) => i.name)),
    ),
  ];

  return {
    redFlags,
    differentials,
    classification,
    classificationRationale,
    suggestedInvestigations,
    safetyNetting,
  };
}

/** Helper placeholder — new-onset diabetes not explicitly in questions but referenced in pancreatic Ca logic */
function newOnsetDiabetes(): boolean {
  return false;
}
