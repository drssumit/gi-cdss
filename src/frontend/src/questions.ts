/**
 * GI-CDSS Question Bank
 * Based on: Sleisenger & Fordtran's Gastrointestinal and Liver Disease, 10th Ed.
 * Prompt version: v3
 *
 * Question ID scheme:
 *   Q1  = 1n    (single-select, always shown)
 *   Q2  = 2n    (multi-select)
 *   Q3  = 3n    (multi-select)
 *   Q4  = 4n    (multi-select)
 *   Q5  = 5n    (multi-select)
 *   Q6  = 6n    (multi-select)
 *   Q7  = 7n    (multi-select)
 *   Q8  = 8n    (multi-select)
 *   Q9  = 9n    (multi-select)
 *   Q10_AI  = 10n  — single-select, diarrhoea branch gate
 *   Q10_AII = 101n — multi-select, diarrhoea deep-dive (after Q10_AI)
 *   Q10_B   = 102n — multi-select, jaundice characterisation
 *   Q11 = 11n   (multi-select)
 *   Q12 = 12n   (multi-select)
 *   Q13 = 13n   (multi-select)
 *   Q14 = 14n   (multi-select)
 *   Q15 = 15n   (multi-select)
 */

export interface Question {
  id: bigint;
  en: string;
  hi: string;
  mr: string;
  type: "yesno" | "choice" | "scale";
  multiSelect?: boolean;
  options?: {
    value: string;
    en: string;
    hi: string;
    mr: string;
    redFlag?: boolean;
  }[];
  /** Default next question ID in the sequential flow. undefined = end of questionnaire. */
  next?: bigint;
  nextMap?: Record<string, bigint>;
  branch?: string;
  showWhen?: (answers: Record<string, string>) => boolean;
}

// ─── Helper predicates ───────────────────────────────────────────────────────

export function isDiarrhoeaFlagged(answers: Record<string, string>): boolean {
  const q1 = answers["1"] ?? "";
  const q7 = answers["7"] ?? "";
  return (
    q1.split(",").includes("D") ||
    ["B", "D", "E"].some((opt) => q7.split(",").includes(opt))
  );
}

export function isJaundiceFlagged(answers: Record<string, string>): boolean {
  const q1 = answers["1"] ?? "";
  const q6 = answers["6"] ?? "";
  return q1.split(",").includes("F") || q6.split(",").includes("G");
}

// ─── Questions ───────────────────────────────────────────────────────────────

export const QUESTIONS: Question[] = [
  // ══════════════════════════════════════════════════════════════════
  // Q1 — Primary Complaint (single-select, always shown)
  // ══════════════════════════════════════════════════════════════════
  {
    id: 1n,
    en: "What is your PRIMARY complaint today?",
    hi: "आज आपकी मुख्य शिकायत क्या है?",
    mr: "आज तुमची मुख्य तक्रार काय आहे?",
    type: "choice",
    multiSelect: false,
    options: [
      {
        value: "A",
        en: "Upper abdominal pain / heartburn / chest discomfort",
        hi: "ऊपरी पेट दर्द / सीने में जलन / छाती की तकलीफ",
        mr: "वरचे पोट दुखणे / छातीत जळजळ / छातीत अस्वस्थता",
      },
      {
        value: "B",
        en: "Difficulty swallowing / food sticking",
        hi: "निगलने में कठिनाई / खाना अटकना",
        mr: "गिळण्यास त्रास / अन्न अडकणे",
      },
      {
        value: "C",
        en: "Nausea or vomiting",
        hi: "मतली या उल्टी",
        mr: "मळमळ किंवा उलटी",
      },
      {
        value: "D",
        en: "Change in bowel habit (diarrhoea / constipation / alternating)",
        hi: "आंत्र की आदत में बदलाव (दस्त / कब्ज / बारी-बारी)",
        mr: "आतड्याच्या सवयीत बदल (जुलाब / बद्धकोष्ठता / आळीपाळीने)",
      },
      {
        value: "E",
        en: "Blood — in vomit or stool",
        hi: "रक्त — उल्टी में या मल में",
        mr: "रक्त — उलटीत किंवा शौचात",
        redFlag: true,
      },
      {
        value: "F",
        en: "Jaundice / dark urine / pale stools",
        hi: "पीलिया / गहरा पेशाब / पीला मल",
        mr: "कावीळ / गडद लघवी / फिकट शौच",
      },
      {
        value: "G",
        en: "Bloating / gas / distension",
        hi: "पेट फूलना / गैस / सूजन",
        mr: "पोट फुगणे / वायू / सूज",
      },
      {
        value: "H",
        en: "Anorectal symptoms / rectal bleeding",
        hi: "गुदा-मलाशय लक्षण / मलाशय से रक्तस्राव",
        mr: "गुदाशय लक्षणे / गुदाशय रक्तस्राव",
      },
      {
        value: "I",
        en: "Unintentional weight loss as the main concern",
        hi: "अनजाने में वजन कम होना मुख्य समस्या",
        mr: "अनावधानाने वजन कमी होणे मुख्य समस्या",
        redFlag: true,
      },
      {
        value: "J",
        en: "Combination of the above / Generalised GI symptoms",
        hi: "उपरोक्त का संयोजन / सामान्यीकृत GI लक्षण",
        mr: "वरीलपैकी एकत्रित / सामान्य GI लक्षणे",
      },
    ],
    next: 2n,
    branch: "gate",
  },

  // ══════════════════════════════════════════════════════════════════
  // Q2 — Duration (multi-select)
  // ══════════════════════════════════════════════════════════════════
  {
    id: 2n,
    en: "How long have you had this problem, and how did it start?",
    hi: "यह समस्या कितने समय से है और यह कैसे शुरू हुई?",
    mr: "ही समस्या किती दिवसांपासून आहे आणि ती कशी सुरू झाली?",
    type: "choice",
    multiSelect: true,
    options: [
      {
        value: "A",
        en: "Less than 1 week — sudden onset",
        hi: "1 सप्ताह से कम — अचानक शुरू",
        mr: "1 आठवड्यापेक्षा कमी — अचानक सुरू",
      },
      {
        value: "B",
        en: "1–4 weeks — came on gradually",
        hi: "1–4 सप्ताह — धीरे-धीरे",
        mr: "1–4 आठवडे — हळूहळू",
      },
      {
        value: "C",
        en: "1–6 months — has been building up slowly",
        hi: "1–6 महीने — धीरे-धीरे बढ़ रहा है",
        mr: "1–6 महिने — हळूहळू वाढत आहे",
      },
      {
        value: "D",
        en: "More than 6 months / years — longstanding",
        hi: "6 महीने से अधिक / वर्षों से — पुरानी",
        mr: "6 महिन्यांपेक्षा जास्त / वर्षे — जुनाट",
      },
      {
        value: "E",
        en: "Recurrent — had it before, went away, now back",
        hi: "बार-बार — पहले था, ठीक हुआ, अब वापस",
        mr: "वारंवार — आधी होते, गेले, आता परत",
      },
    ],
    next: 3n,
    branch: "universal",
  },

  // ══════════════════════════════════════════════════════════════════
  // Q3 — Pain Quality (multi-select)
  // ══════════════════════════════════════════════════════════════════
  {
    id: 3n,
    en: "How would you best describe the quality and pattern of your main symptom?",
    hi: "आप अपने मुख्य लक्षण की गुणवत्ता और पैटर्न का सबसे अच्छा वर्णन कैसे करेंगे?",
    mr: "तुमच्या मुख्य लक्षणाची गुणवत्ता आणि पद्धत कशी वर्णन कराल?",
    type: "choice",
    multiSelect: true,
    options: [
      {
        value: "A",
        en: "Burning / heartburn — rises from stomach toward chest or throat",
        hi: "जलन / सीने में जलन — पेट से छाती या गले की ओर",
        mr: "जळजळ — पोटापासून छातीकडे किंवा घशाकडे",
      },
      {
        value: "B",
        en: "Gnawing / hunger-like ache",
        hi: "चुभन / भूख जैसा दर्द",
        mr: "चुरचुरणे / भूकेसारखे दुखणे",
      },
      {
        value: "C",
        en: "Cramping in waves — severe then releases",
        hi: "लहरों में ऐंठन — तीव्र फिर कम",
        mr: "लाटांमध्ये पेटके — तीव्र मग कमी",
      },
      {
        value: "D",
        en: "Constant, severe, does not relent",
        hi: "लगातार, तीव्र, कम नहीं होता",
        mr: "सतत, तीव्र, कमी होत नाही",
      },
      {
        value: "E",
        en: "Vague, diffuse, hard to localise",
        hi: "अस्पष्ट, फैला हुआ, स्थान बताना मुश्किल",
        mr: "अस्पष्ट, पसरलेले, जागा सांगणे कठीण",
      },
      {
        value: "F",
        en: "Fullness / pressure after eating",
        hi: "खाने के बाद भरापन / दबाव",
        mr: "जेवणानंतर परिपूर्णता / दाब",
      },
      {
        value: "G",
        en: "Urgency — sudden rush to toilet",
        hi: "आवश्यकता — अचानक शौचालय जाना",
        mr: "घाई — अचानक शौचालयात जाण्याची घाई",
      },
      {
        value: "H",
        en: "No pain — my main symptom is bleeding / jaundice / weight loss / vomiting",
        hi: "दर्द नहीं — मुख्य लक्षण रक्तस्राव / पीलिया / वजन कम / उल्टी है",
        mr: "दुखणे नाही — मुख्य लक्षण रक्तस्राव / कावीळ / वजन कमी / उलटी",
      },
    ],
    next: 4n,
    branch: "universal",
  },

  // ══════════════════════════════════════════════════════════════════
  // Q4 — Location + Radiation (multi-select)
  // ══════════════════════════════════════════════════════════════════
  {
    id: 4n,
    en: "Where exactly is the pain or discomfort, and does it go anywhere else?",
    hi: "दर्द या तकलीफ बिल्कुल कहाँ है और क्या यह कहीं और भी फैलता है?",
    mr: "दुखणे किंवा अस्वस्थता नक्की कुठे आहे आणि ते इतरत्र पसरते का?",
    type: "choice",
    multiSelect: true,
    options: [
      {
        value: "A",
        en: "Behind the breastbone / chest — worsens lying down or bending",
        hi: "छाती के पीछे — लेटने या झुकने पर बढ़ता है",
        mr: "छातीच्या मागे — झोपताना किंवा वाकताना वाढते",
      },
      {
        value: "B",
        en: "Right upper abdomen — sometimes goes to right shoulder or back",
        hi: "दाहिना ऊपरी पेट — कभी दाहिने कंधे या पीठ तक",
        mr: "उजवे वरचे पोट — कधी उजव्या खांद्यापर्यंत किंवा पाठीवर",
      },
      {
        value: "C",
        en: "Upper middle / epigastric — goes straight through to the back",
        hi: "ऊपरी मध्य / एपीगैस्ट्रिक — सीधे पीठ तक",
        mr: "वरचा मध्य / एपिगॅस्ट्रिक — थेट पाठीवर",
      },
      {
        value: "D",
        en: "Around the navel — moved to the right lower abdomen",
        hi: "नाभि के आसपास — दाहिने निचले पेट में चला गया",
        mr: "नाभीभोवती — उजव्या खालच्या पोटाकडे गेले",
      },
      {
        value: "E",
        en: "Left lower abdomen",
        hi: "बायाँ निचला पेट",
        mr: "डावे खालचे पोट",
      },
      {
        value: "F",
        en: "Right lower abdomen",
        hi: "दाहिना निचला पेट",
        mr: "उजवे खालचे पोट",
      },
      {
        value: "G",
        en: "Entire abdomen — diffuse, cannot localise",
        hi: "पूरा पेट — फैला हुआ, स्थान नहीं बता सकता",
        mr: "संपूर्ण पोट — पसरलेले, स्थान सांगता येत नाही",
      },
      {
        value: "H",
        en: "Around the back passage / rectum only",
        hi: "केवल गुदा के आसपास",
        mr: "फक्त गुदाशयाभोवती",
      },
      {
        value: "I",
        en: "Throat / swallowing region",
        hi: "गला / निगलने का क्षेत्र",
        mr: "घसा / गिळण्याचे क्षेत्र",
      },
      {
        value: "J",
        en: "Upper left abdomen — spreads to left shoulder or back",
        hi: "ऊपरी बायाँ पेट — बाएं कंधे या पीठ तक",
        mr: "वरचे डावे पोट — डाव्या खांद्यापर्यंत किंवा पाठीवर",
      },
    ],
    next: 5n,
    branch: "universal",
  },

  // ══════════════════════════════════════════════════════════════════
  // Q5 — Aggravating / Relieving Factors (multi-select)
  // ══════════════════════════════════════════════════════════════════
  {
    id: 5n,
    en: "What makes your symptoms BETTER or WORSE?",
    hi: "आपके लक्षण को क्या बेहतर या बदतर बनाता है?",
    mr: "तुमची लक्षणे कशामुळे बरी किंवा वाईट होतात?",
    type: "choice",
    multiSelect: true,
    options: [
      {
        value: "A",
        en: "Worse after eating (any meal)",
        hi: "खाने के बाद बदतर (कोई भी भोजन)",
        mr: "जेवणानंतर वाईट (कोणतेही जेवण)",
      },
      {
        value: "B",
        en: "Better after eating or antacids",
        hi: "खाने या एंटासिड के बाद बेहतर",
        mr: "जेवणानंतर किंवा अँटासिडनंतर बरे",
      },
      {
        value: "C",
        en: "Worse lying down / bending forward",
        hi: "लेटने / आगे झुकने पर बदतर",
        mr: "झोपताना / पुढे वाकताना वाईट",
      },
      {
        value: "D",
        en: "Worse with fatty, spicy, or fried food",
        hi: "चिकना, मसालेदार या तला खाना खाने पर बदतर",
        mr: "तेलकट, मसालेदार किंवा तळलेले खाण्याने वाईट",
      },
      {
        value: "E",
        en: "Better after opening bowels / passing wind",
        hi: "मलत्याग / वायु निकलने के बाद बेहतर",
        mr: "शौच / वायू सुटल्यावर बरे",
      },
      {
        value: "F",
        en: "Worse with specific foods: gluten / dairy / onions",
        hi: "विशेष खाद्य पदार्थों से बदतर: ग्लूटेन / डेयरी / प्याज",
        mr: "विशिष्ट अन्नाने वाईट: ग्लूटेन / दुग्धजन्य / कांदा",
      },
      {
        value: "G",
        en: "Wakes me from sleep",
        hi: "नींद से जगाता है",
        mr: "झोपेतून जागे करते",
        redFlag: true,
      },
      {
        value: "H",
        en: "Related to stress, anxiety, or emotional upsets",
        hi: "तनाव, चिंता या भावनात्मक उथल-पुथल से संबंधित",
        mr: "तणाव, चिंता किंवा भावनिक अस्वस्थतेशी संबंधित",
      },
      {
        value: "I",
        en: "No clear relationship to food, posture, or bowel habit",
        hi: "भोजन, मुद्रा या आंत्र की आदत से कोई स्पष्ट संबंध नहीं",
        mr: "अन्न, आसन किंवा आतड्याच्या सवयीशी स्पष्ट संबंध नाही",
      },
      {
        value: "J",
        en: "Worse with physical exertion or large meals (post-prandial pain)",
        hi: "शारीरिक परिश्रम या भारी भोजन के बाद बदतर",
        mr: "शारीरिक श्रम किंवा मोठ्या जेवणानंतर वाईट",
      },
    ],
    next: 6n,
    branch: "universal",
  },

  // ══════════════════════════════════════════════════════════════════
  // Q6 — Associated Symptoms (multi-select)
  // ══════════════════════════════════════════════════════════════════
  {
    id: 6n,
    en: "Do you have any of these associated symptoms? (Choose the MOST prominent)",
    hi: "क्या आपको इनमें से कोई संबंधित लक्षण हैं? (सबसे प्रमुख चुनें)",
    mr: "तुम्हाला यापैकी कोणती संबंधित लक्षणे आहेत? (सर्वात प्रमुख निवडा)",
    type: "choice",
    multiSelect: true,
    options: [
      {
        value: "A",
        en: "Nausea and/or vomiting",
        hi: "मतली और/या उल्टी",
        mr: "मळमळ आणि/किंवा उलटी",
      },
      {
        value: "B",
        en: "Blood in vomit (red or coffee-ground coloured)",
        hi: "उल्टी में खून (लाल या काफी के मैदान जैसा)",
        mr: "उलटीत रक्त (लाल किंवा कॉफी ग्राउंडसारखे)",
        redFlag: true,
      },
      {
        value: "C",
        en: "Black, tarry, or very dark stools (melaena)",
        hi: "काला, तारकोल जैसा या बहुत गहरा मल (मेलेना)",
        mr: "काळा, डांबरासारखा किंवा अतिशय गडद शौच (मेलेना)",
        redFlag: true,
      },
      {
        value: "D",
        en: "Bright red blood with or on your stools / from back passage",
        hi: "मल के साथ या उस पर चमकीला लाल खून / गुदा से",
        mr: "शौचासोबत किंवा त्यावर चमकदार लाल रक्त / गुदाशयातून",
      },
      {
        value: "E",
        en: "Significant unintentional weight loss (feels like >5 kg)",
        hi: "महत्वपूर्ण अनजाने में वजन कम होना (>5 किग्रा जैसा)",
        mr: "लक्षणीय अनावधाने वजन कमी (>5 किग्रा सारखे)",
        redFlag: true,
      },
      {
        value: "F",
        en: "Fever and/or chills",
        hi: "बुखार और/या ठंड लगना",
        mr: "ताप आणि/किंवा थंडी वाजणे",
      },
      {
        value: "G",
        en: "Yellowing of skin or eyes (jaundice)",
        hi: "त्वचा या आँखों में पीलापन (पीलिया)",
        mr: "त्वचेवर किंवा डोळ्यांत पिवळसरपणा (कावीळ)",
      },
      {
        value: "H",
        en: "Joint pains / skin rash / eye redness alongside GI symptoms",
        hi: "जोड़ों का दर्द / त्वचा पर चकत्ते / आँखों में लालिमा GI लक्षणों के साथ",
        mr: "सांधेदुखी / त्वचेवर पुरळ / डोळे लाल होणे GI लक्षणांसह",
      },
      {
        value: "I",
        en: "Difficulty swallowing food or liquid",
        hi: "खाना या तरल निगलने में कठिनाई",
        mr: "अन्न किंवा द्रव गिळण्यास त्रास",
        redFlag: true,
      },
      {
        value: "J",
        en: "None of the above — my symptoms are isolated",
        hi: "उपरोक्त में से कोई नहीं — मेरे लक्षण अलग हैं",
        mr: "वरीलपैकी काहीही नाही — माझी लक्षणे वेगळी आहेत",
      },
    ],
    next: 7n,
    branch: "universal",
  },

  // ══════════════════════════════════════════════════════════════════
  // Q7 — Bowel Habit (multi-select)
  // ══════════════════════════════════════════════════════════════════
  {
    id: 7n,
    en: "Describe your stool / bowel habit as it is NOW:",
    hi: "अभी आपके मल / आंत्र की आदत का वर्णन करें:",
    mr: "आत्ता तुमचा शौच / आतड्याची सवय सांगा:",
    type: "choice",
    multiSelect: true,
    options: [
      {
        value: "A",
        en: "Normal — no change in my usual bowel habit",
        hi: "सामान्य — आंत्र की सामान्य आदत में कोई बदलाव नहीं",
        mr: "सामान्य — आतड्याच्या सामान्य सवयीत कोणताही बदल नाही",
      },
      {
        value: "B",
        en: "Diarrhoea: loose/watery stools, more than 3 times/day",
        hi: "दस्त: पतले/पानी जैसे मल, दिन में 3 बार से अधिक",
        mr: "जुलाब: पातळ/पाण्यासारखा शौच, दिवसातून 3 पेक्षा जास्त वेळा",
      },
      {
        value: "C",
        en: "Constipation: less than 3 stools/week, hard, difficult to pass",
        hi: "कब्ज: सप्ताह में 3 बार से कम, कठोर, मुश्किल से होता है",
        mr: "बद्धकोष्ठता: आठवड्यातून 3 पेक्षा कमी, कठीण, होण्यास त्रास",
      },
      {
        value: "D",
        en: "Alternating: sometimes diarrhoea, sometimes constipation",
        hi: "बारी-बारी: कभी दस्त, कभी कब्ज",
        mr: "आळीपाळीने: कधी जुलाब, कधी बद्धकोष्ठता",
      },
      {
        value: "E",
        en: "Pale, greasy, difficult to flush, foul-smelling stools (floating)",
        hi: "पीले, चिकने, फ्लश करना मुश्किल, बदबूदार मल (तैरते हुए)",
        mr: "फिकट, तेलकट, फ्लश करण्यास कठीण, दुर्गंधीयुक्त शौच (तरंगणारे)",
        redFlag: true,
      },
      {
        value: "F",
        en: "Stools with blood mixed IN (not just on surface)",
        hi: "मल में खून मिला हुआ (केवल ऊपर नहीं)",
        mr: "शौचात रक्त मिसळलेले (फक्त वर नाही)",
      },
      {
        value: "G",
        en: "Stools with mucus / jelly-like material",
        hi: "मल में बलगम / जेली जैसी सामग्री",
        mr: "शौचात श्लेष्मा / जेलीसारखी सामग्री",
      },
      {
        value: "H",
        en: "Stools very dark / black / tarry",
        hi: "मल बहुत गहरा / काला / तारकोल जैसा",
        mr: "शौच अतिशय गडद / काळा / डांबरासारखा",
        redFlag: true,
      },
      {
        value: "I",
        en: "Very narrow / ribbon-like stools",
        hi: "बहुत पतले / रिबन जैसे मल",
        mr: "अतिशय पातळ / रिबनसारखा शौच",
      },
      {
        value: "J",
        en: "Sense of incomplete evacuation — always feel I haven't fully gone",
        hi: "अधूरे खाली होने का एहसास — हमेशा लगता है पूरी तरह नहीं हुआ",
        mr: "अपूर्ण रिकामेपणाची भावना — नेहमी वाटते पूर्णपणे झाले नाही",
      },
    ],
    next: 8n,
    branch: "universal",
  },

  // ══════════════════════════════════════════════════════════════════
  // Q8 — Weight + Appetite (multi-select)
  // ══════════════════════════════════════════════════════════════════
  {
    id: 8n,
    en: "What has happened to your weight and appetite recently?",
    hi: "हाल ही में आपके वजन और भूख का क्या हुआ?",
    mr: "अलीकडे तुमच्या वजनात आणि भूकेत काय बदल झाला?",
    type: "choice",
    multiSelect: true,
    options: [
      {
        value: "A",
        en: "Weight and appetite completely normal — no change",
        hi: "वजन और भूख पूरी तरह सामान्य — कोई बदलाव नहीं",
        mr: "वजन आणि भूक पूर्णपणे सामान्य — कोणताही बदल नाही",
      },
      {
        value: "B",
        en: "Lost weight without trying — mild loss (<5 kg)",
        hi: "बिना कोशिश के वजन कम हुआ — हल्की कमी (<5 किग्रा)",
        mr: "प्रयत्नाशिवाय वजन कमी — सौम्य कमी (<5 किग्रा)",
      },
      {
        value: "C",
        en: "Lost weight without trying — significant loss (>5 kg or >10% body weight)",
        hi: "बिना कोशिश के वजन कम — महत्वपूर्ण कमी (>5 किग्रा या >10%)",
        mr: "प्रयत्नाशिवाय वजन कमी — लक्षणीय कमी (>5 किग्रा किंवा >10%)",
        redFlag: true,
      },
      {
        value: "D",
        en: "Lost my appetite — cannot eat normal amounts",
        hi: "भूख गई — सामान्य मात्रा में खाना नहीं खा सकता",
        mr: "भूक गेली — सामान्य प्रमाणात खाता येत नाही",
      },
      {
        value: "E",
        en: "Feel full very quickly after just a few bites (early satiety)",
        hi: "कुछ ही बाइट्स में बहुत जल्दी पेट भर जाता है",
        mr: "काही घासातच लगेच पोट भरल्यासारखे वाटते",
        redFlag: true,
      },
      {
        value: "F",
        en: "Gained weight / increased appetite",
        hi: "वजन बढ़ा / भूख बढ़ी",
        mr: "वजन वाढले / भूक वाढली",
      },
      {
        value: "G",
        en: "Eating normally but still losing weight",
        hi: "सामान्य खाना खा रहा हूँ लेकिन फिर भी वजन कम हो रहा है",
        mr: "सामान्य खात आहे पण तरीही वजन कमी होत आहे",
        redFlag: true,
      },
    ],
    next: 9n,
    branch: "universal",
  },

  // ══════════════════════════════════════════════════════════════════
  // Q9 — Swallowing Screen (multi-select)
  // ══════════════════════════════════════════════════════════════════
  {
    id: 9n,
    en: "When you eat or drink, how is your swallowing?",
    hi: "जब आप खाते या पीते हैं, तो निगलना कैसा है?",
    mr: "जेव्हा तुम्ही खाता किंवा पिता, तेव्हा गिळणे कसे आहे?",
    type: "choice",
    multiSelect: true,
    options: [
      {
        value: "A",
        en: "Completely normal — no swallowing difficulties at all",
        hi: "पूरी तरह सामान्य — निगलने में कोई कठिनाई नहीं",
        mr: "पूर्णपणे सामान्य — गिळण्यात कोणतीही अडचण नाही",
      },
      {
        value: "B",
        en: "Food occasionally gets stuck — solids only, not liquids",
        hi: "खाना कभी-कभी अटकता है — केवल ठोस, तरल नहीं",
        mr: "अन्न कधीकधी अडकते — फक्त घन, द्रव नाही",
      },
      {
        value: "C",
        en: "Food always gets stuck — solids, happening more often over time",
        hi: "खाना हमेशा अटकता है — ठोस, समय के साथ अधिक बार",
        mr: "अन्न नेहमी अडकते — घन, कालांतराने अधिक वेळा",
        redFlag: true,
      },
      {
        value: "D",
        en: "Both solids AND liquids are difficult to swallow",
        hi: "ठोस और तरल दोनों निगलना मुश्किल है",
        mr: "घन आणि द्रव दोन्ही गिळणे कठीण",
      },
      {
        value: "E",
        en: "Painful swallowing — hurts every time I swallow",
        hi: "निगलने में दर्द — हर बार निगलने पर दर्द",
        mr: "गिळताना दुखते — प्रत्येक वेळी गिळताना दुखते",
        redFlag: true,
      },
      {
        value: "F",
        en: "Food comes back up effortlessly without nausea (regurgitation)",
        hi: "बिना मतली के खाना वापस आ जाता है (रेगर्गिटेशन)",
        mr: "मळमळाशिवाय अन्न परत येते (रिगर्जिटेशन)",
      },
      {
        value: "G",
        en: "Lump in throat feeling — swallowing is normal",
        hi: "गले में गांठ महसूस होना — निगलना सामान्य है",
        mr: "घशात गाठ असल्यासारखे वाटणे — गिळणे सामान्य",
      },
    ],
    next: 10n,
    branch: "universal",
  },

  // ══════════════════════════════════════════════════════════════════
  // Q10_AI — Diarrhoea: Painful or Painless? (single-select, conditional)
  // ══════════════════════════════════════════════════════════════════
  {
    id: 10n,
    en: "Is your diarrhoea accompanied by abdominal pain or cramping?",
    hi: "क्या आपके दस्त के साथ पेट दर्द या ऐंठन भी है?",
    mr: "तुमच्या जुलाबासोबत पोटदुखी किंवा पेटके येतात का?",
    type: "choice",
    multiSelect: false,
    options: [
      {
        value: "A",
        en: "Yes — the diarrhoea is accompanied by abdominal pain or cramping",
        hi: "हाँ — दस्त के साथ पेट दर्द या ऐंठन है",
        mr: "होय — जुलाबासोबत पोटदुखी किंवा पेटके आहेत",
      },
      {
        value: "B",
        en: "No — the diarrhoea is painless / just urgency",
        hi: "नहीं — दस्त दर्दरहित है / केवल आवश्यकता",
        mr: "नाही — जुलाब वेदनारहित आहे / फक्त घाई",
      },
    ],
    showWhen: (answers) => isDiarrhoeaFlagged(answers),
    next: 101n,
    branch: "diarrhoea",
  },

  // ══════════════════════════════════════════════════════════════════
  // Q10_AII — Diarrhoea Deep-Dive (multi-select, conditional)
  // ══════════════════════════════════════════════════════════════════
  {
    id: 101n,
    en: "Tell me more about your diarrhoea:",
    hi: "अपने दस्त के बारे में और बताएं:",
    mr: "तुमच्या जुलाबाबद्दल अधिक सांगा:",
    type: "choice",
    multiSelect: true,
    options: [
      {
        value: "A",
        en: "Watery / liquid, very large volume, no blood",
        hi: "पानी जैसा / तरल, बहुत बड़ी मात्रा, खून नहीं",
        mr: "पाण्यासारखा / द्रव, खूप मोठ्या प्रमाणात, रक्त नाही",
      },
      {
        value: "B",
        en: "Loose with urgency, small to moderate volume",
        hi: "पतला, आवश्यकता के साथ, छोटी से मध्यम मात्रा",
        mr: "पातळ, घाईसह, लहान ते मध्यम प्रमाण",
      },
      {
        value: "C",
        en: "Bloody and mucousy — blood mixed into the stool",
        hi: "खूनी और बलगम — खून मल में मिला हुआ",
        mr: "रक्तयुक्त आणि श्लेष्मायुक्त — रक्त शौचात मिसळलेले",
        redFlag: true,
      },
      {
        value: "D",
        en: "Pale, greasy, floating, extremely smelly (fatty stools / steatorrhoea)",
        hi: "पीले, चिकने, तैरते, बहुत बदबूदार (चिकने मल / स्टीटोरिया)",
        mr: "फिकट, तेलकट, तरंगणारे, खूप दुर्गंधीयुक्त (स्टेटोरिया)",
        redFlag: true,
      },
      {
        value: "E",
        en: "Wakes me from sleep — nocturnal diarrhoea",
        hi: "नींद से जगाता है — रात में दस्त",
        mr: "झोपेतून जागे करते — रात्री जुलाब",
        redFlag: true,
      },
      {
        value: "F",
        en: "Started within days of taking antibiotics",
        hi: "एंटीबायोटिक लेने के कुछ दिनों बाद शुरू हुआ",
        mr: "प्रतिजैविक घेतल्यानंतर काही दिवसांत सुरू झाले",
      },
      {
        value: "G",
        en: "Started after travel to a developing country or rural area",
        hi: "विकासशील देश या ग्रामीण क्षेत्र की यात्रा के बाद शुरू हुआ",
        mr: "विकसनशील देश किंवा ग्रामीण भागाच्या प्रवासानंतर सुरू झाले",
      },
      {
        value: "H",
        en: "Alternates with constipation — not continuously loose",
        hi: "कब्ज के साथ बारी-बारी — लगातार पतला नहीं",
        mr: "बद्धकोष्ठतेसोबत आळीपाळीने — सतत पातळ नाही",
      },
    ],
    showWhen: (answers) =>
      isDiarrhoeaFlagged(answers) && answers["10"] !== undefined,
    next: 11n,
    branch: "diarrhoea",
  },

  // ══════════════════════════════════════════════════════════════════
  // Q10_B — Jaundice Characterisation (multi-select, conditional)
  // ══════════════════════════════════════════════════════════════════
  {
    id: 102n,
    en: "Describe your jaundice / liver problem:",
    hi: "अपने पीलिया / लिवर की समस्या का वर्णन करें:",
    mr: "तुमच्या कावीळ / यकृत समस्येचे वर्णन करा:",
    type: "choice",
    multiSelect: true,
    options: [
      {
        value: "A",
        en: "Came on suddenly with severe right-sided pain and fever",
        hi: "अचानक आया, दाहिनी ओर तेज दर्द और बुखार के साथ",
        mr: "अचानक आले, उजव्या बाजूला तीव्र दुखणे आणि तापासह",
        redFlag: true,
      },
      {
        value: "B",
        en: "Gradually worsening, no pain, stools have gone pale",
        hi: "धीरे-धीरे बढ़ रहा है, दर्द नहीं, मल पीला हो गया है",
        mr: "हळूहळू वाढत आहे, दुखणे नाही, शौच फिकट झाला",
        redFlag: true,
      },
      {
        value: "C",
        en: "Yellow skin + dark urine + nausea + fatigue",
        hi: "पीली त्वचा + गहरा पेशाब + मतली + थकान",
        mr: "पिवळी त्वचा + गडद लघवी + मळमळ + थकवा",
      },
      {
        value: "D",
        en: "Known liver disease — this is a flare or complication",
        hi: "ज्ञात लिवर रोग — यह एक भड़कना या जटिलता है",
        mr: "ज्ञात यकृत रोग — हे एक भडका किंवा गुंतागुंत आहे",
      },
      {
        value: "E",
        en: "Associated with abdominal swelling / bloating",
        hi: "पेट में सूजन / फूलने के साथ",
        mr: "पोटाच्या सूजाशी / फुगण्याशी संबंधित",
      },
      {
        value: "F",
        en: "Drink alcohol regularly — more than 3-4 drinks daily",
        hi: "नियमित रूप से शराब पीता हूँ — प्रतिदिन 3-4 से अधिक",
        mr: "नियमित दारू पितो — दररोज 3-4 पेक्षा जास्त",
      },
    ],
    showWhen: (answers) => isJaundiceFlagged(answers),
    next: 11n,
    branch: "jaundice",
  },

  // ══════════════════════════════════════════════════════════════════
  // Q11 — Past History + Medications (multi-select)
  // ══════════════════════════════════════════════════════════════════
  {
    id: 11n,
    en: "Have you ever been diagnosed with any of these conditions, or are you taking any of these medications?",
    hi: "क्या आपको इनमें से कोई बीमारी है, या आप इनमें से कोई दवा ले रहे हैं?",
    mr: "तुम्हाला यापैकी कोणता आजार आहे, किंवा तुम्ही यापैकी कोणती औषधे घेत आहात?",
    type: "choice",
    multiSelect: true,
    options: [
      {
        value: "A",
        en: "Known stomach/duodenal ulcer or H. pylori infection previously",
        hi: "पेट/ग्रहणी का अल्सर या H. pylori संक्रमण पहले",
        mr: "पोट/ड्युओडेनमचा अल्सर किंवा H. pylori संसर्ग पूर्वी",
      },
      {
        value: "B",
        en: "Previously diagnosed with IBD (Crohn's disease or Ulcerative Colitis)",
        hi: "IBD (क्रोहन रोग या अल्सरेटिव कोलाइटिस) पहले निदान",
        mr: "IBD (क्रोहन आजार किंवा अल्सरेटिव्ह कोलायटिस) पूर्वी निदान",
      },
      {
        value: "C",
        en: "Previously diagnosed with liver disease / hepatitis / cirrhosis",
        hi: "लिवर रोग / हेपेटाइटिस / सिरोसिस पहले निदान",
        mr: "यकृत रोग / हिपॅटायटिस / सिरोसिस पूर्वी निदान",
      },
      {
        value: "D",
        en: "Regular NSAID use: ibuprofen, diclofenac, naproxen, aspirin",
        hi: "नियमित NSAID उपयोग: आईबुप्रोफेन, डाईक्लोफेनेक, नेप्रोक्सेन, एस्पिरिन",
        mr: "नियमित NSAID वापर: आयबुप्रोफेन, डायक्लोफेनॅक, नेप्रोक्सेन, ऍस्पिरिन",
        redFlag: true,
      },
      {
        value: "E",
        en: "Currently on or recently finished antibiotics (within 3 months)",
        hi: "वर्तमान में एंटीबायोटिक पर या हाल ही में खत्म किया (3 महीने में)",
        mr: "सध्या प्रतिजैविक घेत आहात किंवा नुकतेच संपवले (3 महिन्यांत)",
      },
      {
        value: "F",
        en: "On steroids, immunosuppressants, or biological therapy (infliximab etc.)",
        hi: "स्टेरॉयड, इम्यूनोसप्रेसेंट या जैविक चिकित्सा पर",
        mr: "स्टेरॉइड्स, इम्युनोसप्रेसेंट्स किंवा जैविक थेरपी (इन्फ्लिक्सिमॅब इ.)",
      },
      {
        value: "G",
        en: "Previous abdominal surgery (any type)",
        hi: "पहले पेट की सर्जरी (किसी भी प्रकार की)",
        mr: "पूर्वीची उदर शस्त्रक्रिया (कोणत्याही प्रकारची)",
      },
      {
        value: "H",
        en: "Diabetes / thyroid disease / Parkinson's / connective tissue disease",
        hi: "मधुमेह / थायरॉयड रोग / पार्किंसन / संयोजी ऊतक रोग",
        mr: "मधुमेह / थायरॉइड आजार / पार्किन्सन / संयोजी ऊतक रोग",
      },
      {
        value: "I",
        en: "Already on PPI (omeprazole / pantoprazole)",
        hi: "पहले से PPI (ओमेप्राज़ोल / पैंटोप्राज़ोल) पर",
        mr: "आधीपासून PPI (ओमेप्राझोल / पँटोप्राझोल) घेत आहात",
      },
      {
        value: "J",
        en: "None of the above / No relevant past history",
        hi: "उपरोक्त में से कोई नहीं / कोई प्रासंगिक इतिहास नहीं",
        mr: "वरीलपैकी काहीही नाही / कोणताही संबंधित इतिहास नाही",
      },
    ],
    next: 12n,
    branch: "universal",
  },

  // ══════════════════════════════════════════════════════════════════
  // Q12 — Family History + Lifestyle (multi-select)
  // ══════════════════════════════════════════════════════════════════
  {
    id: 12n,
    en: "Do any blood relatives have these conditions, and what are your lifestyle habits?",
    hi: "क्या किसी रक्त संबंधी को ये बीमारियाँ हैं, और आपकी जीवनशैली की आदतें क्या हैं?",
    mr: "तुमच्या रक्ताच्या नातेवाईकांना हे आजार आहेत का, आणि तुमच्या जीवनशैलीच्या सवयी काय आहेत?",
    type: "choice",
    multiSelect: true,
    options: [
      {
        value: "A",
        en: "Family history of bowel (colorectal) cancer",
        hi: "आंत्र (कोलोरेक्टल) कैंसर का पारिवारिक इतिहास",
        mr: "आतडे (कोलोरेक्टल) कर्करोगाचा कौटुंबिक इतिहास",
        redFlag: true,
      },
      {
        value: "B",
        en: "Family history of stomach cancer",
        hi: "पेट के कैंसर का पारिवारिक इतिहास",
        mr: "पोटाच्या कर्करोगाचा कौटुंबिक इतिहास",
        redFlag: true,
      },
      {
        value: "C",
        en: "Family history of Crohn's disease or Ulcerative Colitis",
        hi: "क्रोहन रोग या अल्सरेटिव कोलाइटिस का पारिवारिक इतिहास",
        mr: "क्रोहन आजार किंवा अल्सरेटिव्ह कोलायटिसचा कौटुंबिक इतिहास",
      },
      {
        value: "D",
        en: "Family history of Celiac disease or gluten intolerance",
        hi: "सीलिएक रोग या ग्लूटेन असहिष्णुता का पारिवारिक इतिहास",
        mr: "सेलिएक आजार किंवा ग्लूटेन असहिष्णुतेचा कौटुंबिक इतिहास",
      },
      {
        value: "E",
        en: "Family history of liver disease / cirrhosis / liver cancer",
        hi: "लिवर रोग / सिरोसिस / लिवर कैंसर का पारिवारिक इतिहास",
        mr: "यकृत रोग / सिरोसिस / यकृत कर्करोगाचा कौटुंबिक इतिहास",
      },
      {
        value: "F",
        en: "I smoke or have smoked significantly (>10 pack-years)",
        hi: "मैं धूम्रपान करता हूँ या काफी धूम्रपान किया है (>10 पैक-वर्ष)",
        mr: "मी धूम्रपान करतो किंवा जास्त धूम्रपान केले आहे (>10 पॅक-वर्षे)",
      },
      {
        value: "G",
        en: "Heavy alcohol use — more than 14 units/week",
        hi: "अत्यधिक शराब — सप्ताह में 14 यूनिट से अधिक",
        mr: "जास्त दारू — आठवड्यातून 14 युनिटपेक्षा जास्त",
        redFlag: true,
      },
      {
        value: "H",
        en: "Significant stress / anxiety / depression — and/or pain in multiple body parts",
        hi: "गंभीर तनाव / चिंता / अवसाद — और/या शरीर के कई हिस्सों में दर्द",
        mr: "गंभीर तणाव / चिंता / नैराश्य — आणि/किंवा शरीराच्या अनेक भागांत दुखणे",
      },
      {
        value: "I",
        en: "Recent major dietary change or significant food restrictions",
        hi: "हाल ही में आहार में बड़ा बदलाव या भोजन प्रतिबंध",
        mr: "अलीकडे आहारात मोठा बदल किंवा अन्न प्रतिबंध",
      },
      {
        value: "J",
        en: "No significant family history; no major lifestyle risk factors",
        hi: "कोई महत्वपूर्ण पारिवारिक इतिहास नहीं; कोई बड़ा जीवनशैली जोखिम नहीं",
        mr: "कोणताही महत्त्वाचा कौटुंबिक इतिहास नाही; कोणताही मोठा जीवनशैली धोका नाही",
      },
    ],
    next: 13n,
    branch: "universal",
  },

  // ══════════════════════════════════════════════════════════════════
  // Q13 — Alarm Feature Screen (multi-select)
  // ══════════════════════════════════════════════════════════════════
  {
    id: 13n,
    en: "Do you have any of these alarm features? (Select all that apply)",
    hi: "क्या आपको इनमें से कोई चेतावनी संकेत हैं? (सभी लागू चुनें)",
    mr: "तुम्हाला यापैकी कोणती धोक्याची चिन्हे आहेत? (सर्व लागू निवडा)",
    type: "choice",
    multiSelect: true,
    options: [
      {
        value: "A",
        en: "None of these",
        hi: "इनमें से कोई नहीं",
        mr: "यापैकी काहीही नाही",
      },
      {
        value: "B",
        en: "Vomited blood (red or coffee-ground)",
        hi: "खून की उल्टी (लाल या काफी के मैदान जैसा)",
        mr: "रक्ताची उलटी (लाल किंवा कॉफी ग्राउंडसारखे)",
        redFlag: true,
      },
      {
        value: "C",
        en: "Black tarry smelly stools (melaena)",
        hi: "काला तारकोल जैसा बदबूदार मल (मेलेना)",
        mr: "काळा डांबरासारखा दुर्गंधीयुक्त शौच (मेलेना)",
        redFlag: true,
      },
      {
        value: "D",
        en: "Bright red blood mixed in stool",
        hi: "मल में चमकीला लाल खून मिला हुआ",
        mr: "शौचात चमकदार लाल रक्त मिसळलेले",
        redFlag: true,
      },
      {
        value: "E",
        en: "Severe unintentional weight loss",
        hi: "गंभीर अनजाने में वजन कम होना",
        mr: "तीव्र अनावधाने वजन कमी",
        redFlag: true,
      },
      {
        value: "F",
        en: "Progressive dysphagia — worse each week",
        hi: "प्रगतिशील निगलने में कठिनाई — हर सप्ताह बदतर",
        mr: "प्रगतिशील गिळण्यास त्रास — प्रत्येक आठवड्याला वाईट",
        redFlag: true,
      },
      {
        value: "G",
        en: "Persistent vomiting — cannot keep fluids down",
        hi: "लगातार उल्टी — तरल भी नहीं रख सकता",
        mr: "सतत उलटी — द्रव पण ठेवता येत नाही",
        redFlag: true,
      },
      {
        value: "H",
        en: "Significant itching with loss of weight or appetite, progressive yellowing",
        hi: "वजन या भूख में कमी के साथ गंभीर खुजली, बढ़ता हुआ पीलापन",
        mr: "वजन किंवा भूक कमी होणे आणि सतत खाज, वाढणारी कावीळ",
        redFlag: true,
      },
      {
        value: "I",
        en: "A lump I can feel in my abdomen",
        hi: "पेट में महसूस होने वाली गांठ",
        mr: "पोटात जाणवणारी गाठ",
        redFlag: true,
      },
      {
        value: "J",
        en: "Severe anaemia confirmed on blood tests",
        hi: "रक्त परीक्षण पर गंभीर रक्ताल्पता की पुष्टि",
        mr: "रक्त तपासणीत गंभीर अॅनेमिया निश्चित",
      },
    ],
    next: 14n,
    branch: "universal",
  },

  // ══════════════════════════════════════════════════════════════════
  // Q14 — Organic vs Functional (multi-select)
  // ══════════════════════════════════════════════════════════════════
  {
    id: 14n,
    en: "Which of these best describes the pattern of your symptoms?",
    hi: "इनमें से कौन सा आपके लक्षणों के पैटर्न को सबसे अच्छे तरह से दर्शाता है?",
    mr: "यापैकी कोणते तुमच्या लक्षणांचे स्वरूप सर्वोत्तम वर्णन करते?",
    type: "choice",
    multiSelect: true,
    options: [
      {
        value: "A",
        en: "Symptoms began after stress, illness, or infection",
        hi: "तनाव, बीमारी या संक्रमण के बाद लक्षण शुरू हुए",
        mr: "तणाव, आजारपण किंवा संसर्गानंतर लक्षणे सुरू झाली",
      },
      {
        value: "B",
        en: "Worse during stress, better when relaxed",
        hi: "तनाव में बदतर, आराम में बेहतर",
        mr: "तणावात वाईट, आराम असताना बरे",
      },
      {
        value: "C",
        en: "Woken from sleep by symptoms",
        hi: "लक्षणों से नींद टूटती है",
        mr: "लक्षणांमुळे झोपेतून जाग येते",
        redFlag: true,
      },
      {
        value: "D",
        en: "Consistently getting worse over weeks/months",
        hi: "हफ्तों/महीनों में लगातार बदतर",
        mr: "आठवडे/महिन्यांत सातत्याने वाईट",
        redFlag: true,
      },
      {
        value: "E",
        en: "Fluctuates — good days and bad days",
        hi: "उतार-चढ़ाव — अच्छे और बुरे दिन",
        mr: "चढ-उतार — चांगले आणि वाईट दिवस",
      },
      {
        value: "F",
        en: "Same for 6–12 months — not progressing",
        hi: "6–12 महीनों के लिए समान — आगे नहीं बढ़ रहा",
        mr: "6–12 महिन्यांपासून तेच — प्रगती नाही",
      },
      {
        value: "G",
        en: "All previous investigations were completely normal",
        hi: "सभी पिछली जाँचें पूरी तरह सामान्य थीं",
        mr: "सर्व पूर्वीच्या तपासण्या पूर्णपणे सामान्य होत्या",
      },
      {
        value: "H",
        en: "Clearly linked to specific foods / meals / bowel habit",
        hi: "विशिष्ट खाद्य पदार्थों / भोजन / आंत्र की आदत से स्पष्ट रूप से जुड़ा",
        mr: "विशिष्ट अन्न / जेवण / आतड्याच्या सवयीशी स्पष्टपणे जोडलेले",
      },
    ],
    next: 15n,
    branch: "universal",
  },

  // ══════════════════════════════════════════════════════════════════
  // Q15 — Demographics (multi-select)
  // ══════════════════════════════════════════════════════════════════
  {
    id: 15n,
    en: "Which of these apply to you? (Select all that apply)",
    hi: "इनमें से कौन सा आप पर लागू होता है? (सभी लागू चुनें)",
    mr: "यापैकी कोणते तुम्हाला लागू आहे? (सर्व लागू निवडा)",
    type: "choice",
    multiSelect: true,
    options: [
      {
        value: "A",
        en: "Male, under 40, no cancer family history",
        hi: "पुरुष, 40 से कम, कोई कैंसर पारिवारिक इतिहास नहीं",
        mr: "पुरुष, 40 पेक्षा कमी, कर्करोगाचा कौटुंबिक इतिहास नाही",
      },
      {
        value: "B",
        en: "Female, under 40, no cancer family history",
        hi: "महिला, 40 से कम, कोई कैंसर पारिवारिक इतिहास नहीं",
        mr: "महिला, 40 पेक्षा कमी, कर्करोगाचा कौटुंबिक इतिहास नाही",
      },
      { value: "C", en: "Age 40–55", hi: "उम्र 40–55", mr: "वय 40–55" },
      {
        value: "D",
        en: "Age over 55",
        hi: "55 से अधिक उम्र",
        mr: "55 पेक्षा जास्त वय",
        redFlag: true,
      },
      {
        value: "E",
        en: "Known iron-deficiency anaemia",
        hi: "ज्ञात आयरन की कमी से होने वाला एनीमिया",
        mr: "ज्ञात लोहाच्या कमतरतेचा अॅनेमिया",
      },
      {
        value: "F",
        en: "Known autoimmune disease (thyroid / lupus / RA / psoriasis)",
        hi: "ज्ञात ऑटोइम्यून रोग (थायरॉयड / ल्यूपस / RA / सोरियासिस)",
        mr: "ज्ञात ऑटोइम्यून आजार (थायरॉइड / ल्युपस / RA / सोरायसिस)",
      },
      {
        value: "G",
        en: "On long-term opioids",
        hi: "दीर्घकालिक ओपिओइड पर",
        mr: "दीर्घकालीन ओपिओइडवर",
      },
      {
        value: "H",
        en: "Recent international travel / contact with unwell person",
        hi: "हाल ही में अंतर्राष्ट्रीय यात्रा / बीमार व्यक्ति के संपर्क में",
        mr: "अलीकडे आंतरराष्ट्रीय प्रवास / आजारी व्यक्तीशी संपर्क",
      },
    ],
    branch: "universal",
  },
];

// ─── Derived maps ─────────────────────────────────────────────────────────────

/** Named exports for the three conditional Q10 branch questions */
export const Q10_AI = QUESTIONS.find((q) => q.id === 10n)!;
export const Q10_AII = QUESTIONS.find((q) => q.id === 101n)!;
export const Q10_B = QUESTIONS.find((q) => q.id === 102n)!;

export const QUESTION_MAP = new Map<bigint, Question>(
  QUESTIONS.map((q) => [q.id, q]),
);

export const TOTAL_QUESTIONS = QUESTIONS.length;

/**
 * Returns the ordered list of questions that should be shown
 * given the current set of answers.
 */
export function getVisibleQuestions(
  answers: Record<string, string>,
): Question[] {
  return QUESTIONS.filter((q) => {
    if (!q.showWhen) return true;
    return q.showWhen(answers);
  });
}

/**
 * Returns the next question ID given the current question and answers.
 * Sequential model — finds next in the visible list.
 */
export function getNextQuestionId(
  currentId: bigint,
  answers: Record<string, string>,
): bigint | undefined {
  const visible = getVisibleQuestions(answers);
  const idx = visible.findIndex((q) => q.id === currentId);
  if (idx === -1 || idx >= visible.length - 1) return undefined;
  return visible[idx + 1].id;
}

// Legacy export kept for backwards compat
export const SCALE_NEXT: Record<string, bigint> = {};
