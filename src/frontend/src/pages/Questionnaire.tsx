import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Principal as PrincipalClass } from "@dfinity/principal";
import type { Principal } from "@icp-sdk/core/principal";
import { useSearch } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CloudUpload,
  Globe,
  Loader2,
  RefreshCw,
  Stethoscope,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useActor } from "../hooks/useActor";
import {
  useAnswerQuestion,
  useCompleteSession,
  useCreatePatientSession,
} from "../hooks/useQueries";
import {
  Q10_AI,
  Q10_AII,
  Q10_B,
  QUESTIONS,
  QUESTION_MAP,
  isDiarrhoeaFlagged,
  isJaundiceFlagged,
} from "../questions";
import {
  type LocalSession,
  clearLocalSession,
  createLocalSession,
  loadLocalSession,
  saveLocalSession,
} from "../utils/localSession";
import { withCanisterRetry } from "../utils/retryCanister";

export const DEMO_Q = {
  name: 900n,
  age: 901n,
  gender: 902n,
  address: 903n,
  occupation: 904n,
} as const;

type Language = "en" | "hi" | "mr";
type SyncStatus = "idle" | "syncing" | "synced" | "offline";

const LANGUAGES = [
  {
    code: "en" as Language,
    label: "English",
    native: "English",
    flag: "🇬🇧",
    desc: "Proceed in English",
  },
  {
    code: "hi" as Language,
    label: "Hindi",
    native: "हिंदी",
    flag: "🇮🇳",
    desc: "हिंदी में जारी रखें",
  },
  {
    code: "mr" as Language,
    label: "Marathi",
    native: "मराठी",
    flag: "🇮🇳",
    desc: "मराठीत पुढे जा",
  },
];

const UI: Record<
  Language,
  {
    title: string;
    subtitle: string;
    selectLang: string;
    startBtn: string;
    yes: string;
    no: string;
    next: string;
    progress: string;
    thankYou: string;
    thankYouMsg: string;
    loading: string;
    demoTitle: string;
    demoSubtitle: string;
    demoBtn: string;
    nameLabel: string;
    namePh: string;
    ageLabel: string;
    agePh: string;
    genderLabel: string;
    addressLabel: string;
    addressPh: string;
    occLabel: string;
    occPh: string;
    male: string;
    female: string;
    other: string;
    resumeTitle: string;
    resumeMsg: string;
    resumeBtn: string;
    restartBtn: string;
  }
> = {
  en: {
    title: "GI-CDSS",
    subtitle: "Gastroenterology Symptom Questionnaire",
    selectLang: "Select your language",
    startBtn: "Begin Questionnaire",
    yes: "Yes",
    no: "No",
    next: "Next",
    progress: "Question",
    thankYou: "Thank You!",
    thankYouMsg:
      "Your responses have been submitted. Your doctor will review your answers shortly.",
    loading: "Loading...",
    demoTitle: "Patient Details",
    demoSubtitle:
      "Please fill in your details before starting the questionnaire.",
    demoBtn: "Continue to Questionnaire",
    nameLabel: "Full Name",
    namePh: "Enter your full name",
    ageLabel: "Age",
    agePh: "Enter your age",
    genderLabel: "Gender",
    addressLabel: "Address / City",
    addressPh: "Enter your address or city",
    occLabel: "Occupation",
    occPh: "Enter your occupation",
    male: "Male",
    female: "Female",
    other: "Other",
    resumeTitle: "Welcome back!",
    resumeMsg:
      "You have an unfinished questionnaire. Would you like to continue where you left off?",
    resumeBtn: "Continue",
    restartBtn: "Start fresh",
  },
  hi: {
    title: "GI-CDSS",
    subtitle: "जठरांत्र लक्षण प्रश्नावली",
    selectLang: "अपनी भाषा चुनें",
    startBtn: "प्रश्नावली शुरू करें",
    yes: "हाँ",
    no: "नहीं",
    next: "अगला",
    progress: "प्रश्न",
    thankYou: "धन्यवाद!",
    thankYouMsg:
      "आपके उत्तर सबमिट हो गए हैं। आपके डॉक्टर जल्द ही उत्तरों की समीक्षा करेंगे।",
    loading: "लोड हो रहा है...",
    demoTitle: "रोगी की जानकारी",
    demoSubtitle: "प्रश्नावली शुरू करने से पहले कृपया अपनी जानकारी भरें।",
    demoBtn: "प्रश्नावली की ओर जारी रखें",
    nameLabel: "पूरा नाम",
    namePh: "अपना पूरा नाम दर्ज करें",
    ageLabel: "आयु",
    agePh: "अपनी आयु दर्ज करें",
    genderLabel: "लिंग",
    addressLabel: "पता / शहर",
    addressPh: "अपना पता या शहर दर्ज करें",
    occLabel: "व्यवसाय",
    occPh: "अपना व्यवसाय दर्ज करें",
    male: "पुरुष",
    female: "महिला",
    other: "अन्य",
    resumeTitle: "स्वागत है!",
    resumeMsg: "आपकी अधूरी प्रश्नावली है। क्या आप जारी रखना चाहते हैं?",
    resumeBtn: "जारी रखें",
    restartBtn: "नए सिरे शुरू करें",
  },
  mr: {
    title: "GI-CDSS",
    subtitle: "जठरांत्र लक्षण प्रश्नावली",
    selectLang: "तुमची भाषा निवडा",
    startBtn: "प्रश्नावली सुरू करा",
    yes: "होय",
    no: "नाही",
    next: "पुढे",
    progress: "प्रश्न",
    thankYou: "धन्यवाद!",
    thankYouMsg:
      "तुमचे उत्तर सबमिट केले गेले आहेत. तुमचे डॉक्टर लवकरच तुमच्या उत्तरांचे पुनरावलोकन करतील.",
    loading: "लोड होत आहे...",
    demoTitle: "रुग्णाची माहिती",
    demoSubtitle: "प्रश्नावली सुरू करण्यापूर्वी कृपया तुमची माहिती भरा.",
    demoBtn: "प्रश्नावली पुढे चालू ठेवा",
    nameLabel: "पूर्ण नाव",
    namePh: "तुमचे पूर्ण नाव टाका",
    ageLabel: "वय",
    agePh: "तुमचे वय टाका",
    genderLabel: "लिंग",
    addressLabel: "पत्ता / शहर",
    addressPh: "तुमचा पत्ता किंवा शहर टाका",
    occLabel: "व्यवसाय",
    occPh: "तुमचा व्यवसाय टाका",
    male: "पुरुष",
    female: "स्त्री",
    other: "इतर",
    resumeTitle: "परत स्वागत!",
    resumeMsg: "तुमची अपूर्ण प्रश्नावली आहे. तुम्ही पुढे जायचे आहे का?",
    resumeBtn: "पुढे चालू ठेवा",
    restartBtn: "नव्याने सुरू करा",
  },
};

type Phase = "language" | "resume" | "demographics" | "questions" | "complete";

interface Demographics {
  name: string;
  age: string;
  gender: string;
  address: string;
  occupation: string;
}

/* ── Sync status bar (top 3px) ── */
function SyncBar({ status }: { status: SyncStatus }) {
  const color =
    status === "synced"
      ? "oklch(0.73 0.17 148)"
      : status === "syncing"
        ? "oklch(0.74 0.17 178)"
        : "oklch(0.82 0.15 72)";

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] z-50 pointer-events-none overflow-hidden"
      animate={{ opacity: status === "idle" ? 0 : 1 }}
      transition={{ duration: 0.4 }}
    >
      {status === "syncing" ? (
        <motion.div
          className="absolute top-0 h-full rounded-full w-[40%]"
          style={{ background: color }}
          animate={{ left: ["-40%", "140%"] }}
          transition={{
            duration: 1.8,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
      ) : (
        <div className="h-full w-full" style={{ background: color }} />
      )}
    </motion.div>
  );
}

/* ── Floating particle for complete screen ── */
function Particle({ delay, x, y }: { delay: number; x: number; y: number }) {
  return (
    <motion.div
      className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        background: `oklch(${0.7 + Math.random() * 0.15} ${0.14 + Math.random() * 0.06} ${170 + Math.random() * 30})`,
      }}
      initial={{ opacity: 0, scale: 0, y: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0, 1, 1, 0],
        y: [0, -60 - Math.random() * 40],
      }}
      transition={{
        duration: 2.5,
        delay,
        repeat: Number.POSITIVE_INFINITY,
        repeatDelay: 1.5 + Math.random() * 2,
        ease: "easeOut",
      }}
    />
  );
}

/* ── Scale helpers ── */
function scaleColor(val: number): string {
  if (val <= 3) return "oklch(0.73 0.17 148)";
  if (val <= 6) return "oklch(0.82 0.15 72)";
  return "oklch(0.62 0.22 22)";
}
function scaleLabel(val: number): string {
  if (val <= 3) return "Mild";
  if (val <= 6) return "Moderate";
  if (val <= 8) return "Severe";
  return "Very Severe";
}

function ScaleSlider({
  value,
  onChange,
}: { value: number; onChange: (v: number) => void }) {
  const pct = ((value - 1) / 9) * 100;
  const color = scaleColor(value);
  return (
    <div className="relative">
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{
          background: `linear-gradient(to right, ${color} ${pct}%, oklch(var(--border)) ${pct}%)`,
        }}
      />
      <div className="flex justify-between mt-1 px-0.5">
        {Array.from({ length: 10 }, (_, i) => (
          <button
            type="button"
            key={`scale-btn-${i + 1}`}
            onClick={() => onChange(i + 1)}
            className="w-5 h-5 text-[10px] font-bold rounded-full transition-all duration-150"
            style={{
              background: i + 1 <= value ? color : "oklch(var(--muted))",
              color:
                i + 1 <= value
                  ? "oklch(var(--primary-foreground))"
                  : "oklch(var(--muted-foreground))",
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function QuestionnairePage() {
  const search = useSearch({ strict: false }) as { doctorId?: string };
  const doctorId = search.doctorId ?? "";

  const { actor, isFetching: isActorFetching } = useActor();
  const createSession = useCreatePatientSession();
  const answerQuestion = useAnswerQuestion();
  const completeSession = useCompleteSession();

  const [phase, setPhase] = useState<Phase>("language");
  const [language, setLanguage] = useState<Language>("en");
  const [demo, setDemo] = useState<Demographics>({
    name: "",
    age: "",
    gender: "Male",
    address: "",
    occupation: "",
  });
  const [demoError, setDemoError] = useState("");
  const [currentQuestionId, setCurrentQuestionId] = useState<bigint>(1n);
  const [answeredIds, setAnsweredIds] = useState<bigint[]>([]);
  const [scaleValue, setScaleValue] = useState<number>(5);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  // Multi-select state: tracks checked option values for the current question
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(
    new Set(),
  );

  const localSession = useRef<LocalSession | null>(null);

  const particles = useRef(
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      delay: i * 0.18,
      x: 10 + Math.random() * 80,
      y: 20 + Math.random() * 60,
    })),
  );

  const ui = UI[language];
  const currentQuestion = QUESTION_MAP.get(currentQuestionId);

  // Dynamic total steps: base questions + Q10 branches based on current answers
  const currentAnswers = localSession.current?.answers ?? {};
  const showQ10AI = isDiarrhoeaFlagged(currentAnswers);
  const showQ10AII = showQ10AI; // always after Q10A-i
  const showQ10B = isJaundiceFlagged(currentAnswers);
  const q10Steps =
    (showQ10AI ? 1 : 0) + (showQ10AII ? 1 : 0) + (showQ10B ? 1 : 0);
  const totalSteps = QUESTIONS.length + q10Steps;
  const progressPct = Math.round((answeredIds.length / totalSteps) * 100);
  const questionNum = answeredIds.length + 1;

  // On mount: check for saved local session
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
  useEffect(() => {
    if (!doctorId) return;
    const saved = loadLocalSession(doctorId);
    if (saved && !saved.completed) {
      localSession.current = saved;
      setLanguage(saved.language as Language);
      setPhase("resume");
    }
  }, []);

  // Scroll to top on phase/question change
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on navigation
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [phase, answeredIds.length]);

  /* ── Full background sync of entire session ── */
  const syncSessionToCanister = useCallback(
    async (session: LocalSession) => {
      if (!actor || !doctorId) return;
      setSyncStatus("syncing");
      try {
        let principal: Principal;
        try {
          principal = PrincipalClass.fromText(doctorId) as unknown as Principal;
        } catch {
          setSyncStatus("offline");
          return;
        }

        const sid = await withCanisterRetry(
          () =>
            createSession.mutateAsync({
              doctorId: principal,
              language: session.language,
            }),
          10,
        );

        const sidStr = String(sid);

        const demoEntries: Array<{ questionId: bigint; answer: string }> = [
          { questionId: DEMO_Q.name, answer: session.demographics.name },
          { questionId: DEMO_Q.age, answer: session.demographics.age },
          { questionId: DEMO_Q.gender, answer: session.demographics.gender },
          {
            questionId: DEMO_Q.address,
            answer: session.demographics.address || "—",
          },
          {
            questionId: DEMO_Q.occupation,
            answer: session.demographics.occupation || "—",
          },
        ];

        for (const { questionId, answer } of demoEntries) {
          await withCanisterRetry(
            () =>
              answerQuestion.mutateAsync({
                sessionId: BigInt(sidStr),
                questionId,
                answer,
              }),
            10,
          );
        }

        for (const [qIdStr, answer] of Object.entries(session.answers)) {
          await withCanisterRetry(
            () =>
              answerQuestion.mutateAsync({
                sessionId: BigInt(sidStr),
                questionId: BigInt(qIdStr),
                answer,
              }),
            10,
          );
        }

        if (session.completed) {
          await withCanisterRetry(
            () => completeSession.mutateAsync({ sessionId: BigInt(sidStr) }),
            10,
          );
        }

        const updated = { ...session, syncedSessionId: sidStr };
        localSession.current = updated;
        saveLocalSession(updated);
        setSyncStatus("synced");
        setTimeout(() => setSyncStatus("idle"), 3000);
      } catch {
        setSyncStatus("offline");
        setTimeout(() => setSyncStatus("idle"), 4000);
      }
    },
    [actor, doctorId, createSession, answerQuestion, completeSession],
  );

  /* ── Background sync single answer ── */
  const bgSyncAnswer = useCallback(
    async (session: LocalSession, questionId: bigint, answer: string) => {
      if (!session.syncedSessionId) return;
      try {
        setSyncStatus("syncing");
        await withCanisterRetry(
          () =>
            answerQuestion.mutateAsync({
              sessionId: BigInt(session.syncedSessionId as string),
              questionId,
              answer,
            }),
          10,
        );
        setSyncStatus("synced");
        setTimeout(() => setSyncStatus("idle"), 2000);
      } catch {
        setSyncStatus("offline");
        setTimeout(() => setSyncStatus("idle"), 3000);
      }
    },
    [answerQuestion],
  );

  /* ── Resume handlers ── */
  const handleResume = () => {
    const saved = localSession.current;
    if (!saved) return;
    setDemo(saved.demographics as Demographics);
    const answeredQIds = Object.keys(saved.answers)
      .map((k) => BigInt(k))
      .filter((id) => id < 900n);
    setAnsweredIds(answeredQIds);

    if (answeredQIds.length > 0) {
      const lastAnswered = answeredQIds[answeredQIds.length - 1];
      const lastQ = QUESTION_MAP.get(lastAnswered);

      if (lastQ) {
        const updatedAnswers = saved.answers;

        // Determine next question using the same logic as submitAnswer
        let nextId: bigint | undefined;

        if (lastAnswered === Q10_AI.id) {
          nextId = Q10_AII.id;
        } else if (lastAnswered === Q10_AII.id) {
          nextId = isJaundiceFlagged(updatedAnswers) ? Q10_B.id : 11n;
        } else if (lastAnswered === Q10_B.id) {
          nextId = 11n;
        } else if (lastAnswered === 9n) {
          const alreadyDoneQ10AI =
            updatedAnswers[String(Q10_AI.id)] !== undefined;
          if (!alreadyDoneQ10AI && isDiarrhoeaFlagged(updatedAnswers)) {
            nextId = Q10_AI.id;
          } else {
            const alreadyDoneQ10B =
              updatedAnswers[String(Q10_B.id)] !== undefined;
            if (!alreadyDoneQ10B && isJaundiceFlagged(updatedAnswers)) {
              nextId = Q10_B.id;
            } else {
              nextId = 11n;
            }
          }
        } else {
          nextId = lastQ.next;
        }

        if (nextId !== undefined) {
          setCurrentQuestionId(nextId);
          // Restore multi-select state if the resumed question is multi-select
          const nextQ = QUESTION_MAP.get(nextId);
          if (nextQ?.multiSelect && saved.answers[String(nextId)]) {
            const parts = saved.answers[String(nextId)].split(",");
            setSelectedOptions(new Set(parts));
          }
        } else {
          // Already completed all questions
          setPhase("complete");
          return;
        }
      }
    } else {
      setCurrentQuestionId(1n);
    }

    setPhase("questions");
  };

  const handleRestartFresh = () => {
    if (doctorId) clearLocalSession(doctorId);
    localSession.current = null;
    setPhase("language");
    setAnsweredIds([]);
    setCurrentQuestionId(1n);
    setDemo({ name: "", age: "", gender: "Male", address: "", occupation: "" });
  };

  /* ── Language → Demographics ── */
  const handleLanguageNext = () => {
    setPhase("demographics");
  };

  /* ── Demographics submit (LOCAL FIRST) ── */
  const handleDemoSubmit = () => {
    if (!demo.name.trim()) {
      setDemoError("Please enter your name.");
      return;
    }
    if (
      !demo.age.trim() ||
      Number.isNaN(Number(demo.age)) ||
      Number(demo.age) < 1 ||
      Number(demo.age) > 120
    ) {
      setDemoError("Please enter a valid age (1–120).");
      return;
    }
    if (!doctorId) {
      setDemoError(
        "Invalid link. Please ask your doctor for a valid questionnaire link.",
      );
      return;
    }

    setDemoError("");

    // Save locally FIRST — instant, no waiting for server
    const session = createLocalSession(doctorId, language, {
      name: demo.name.trim(),
      age: demo.age.trim(),
      gender: demo.gender,
      address: demo.address.trim(),
      occupation: demo.occupation.trim(),
    });
    localSession.current = session;
    saveLocalSession(session);

    // Move forward immediately
    setCurrentQuestionId(1n);
    setAnsweredIds([]);
    setPhase("questions");

    // Background sync (fire and forget)
    if (actor) {
      syncSessionToCanister(session);
    }
  };

  /* ── Answer submit (LOCAL FIRST) ── */
  const submitAnswer = useCallback(
    (answer: string) => {
      if (!currentQuestion) return;

      // Save to localStorage FIRST — instant
      const session = localSession.current;
      if (session) {
        const updated: LocalSession = {
          ...session,
          answers: { ...session.answers, [String(currentQuestion.id)]: answer },
        };
        localSession.current = updated;
        saveLocalSession(updated);
        // Background sync this answer
        bgSyncAnswer(updated, currentQuestion.id, answer);
      }

      // Advance UI immediately
      setAnsweredIds((prev) => [...prev, currentQuestion.id]);
      // Clear multi-select state for next question
      setSelectedOptions(new Set());

      const updatedAnswers = localSession.current?.answers ?? {};

      // ── Q10 inter-branch navigation (highest priority) ──────────────────────
      // Q10_AI (10n) → Q10_AII (101n) always
      if (currentQuestion.id === Q10_AI.id) {
        setCurrentQuestionId(Q10_AII.id);
        setScaleValue(5);
        return;
      }
      // Q10_AII (101n) → Q10_B (102n) if jaundice flagged, else → Q11 (11n)
      if (currentQuestion.id === Q10_AII.id) {
        if (isJaundiceFlagged(updatedAnswers)) {
          setCurrentQuestionId(Q10_B.id);
        } else {
          setCurrentQuestionId(11n);
        }
        setScaleValue(5);
        return;
      }
      // Q10_B (102n) → Q11 (11n) always
      if (currentQuestion.id === Q10_B.id) {
        setCurrentQuestionId(11n);
        setScaleValue(5);
        return;
      }

      // ── Q9 special case: decide whether to enter Q10 branch ─────────────────
      // After Q9 (id 9n), check if Q10 branches are needed before going to Q10
      if (currentQuestion.id === 9n) {
        const alreadyDoneQ10AI =
          updatedAnswers[String(Q10_AI.id)] !== undefined;
        if (!alreadyDoneQ10AI && isDiarrhoeaFlagged(updatedAnswers)) {
          // Diarrhoea flagged — enter diarrhoea branch at Q10_AI
          setCurrentQuestionId(Q10_AI.id);
          setScaleValue(5);
          return;
        }
        const alreadyDoneQ10B = updatedAnswers[String(Q10_B.id)] !== undefined;
        if (!alreadyDoneQ10B && isJaundiceFlagged(updatedAnswers)) {
          // Only jaundice (no diarrhoea) — go directly to Q10_B
          setCurrentQuestionId(Q10_B.id);
          setScaleValue(5);
          return;
        }
        // Neither flagged — skip Q10 entirely, go straight to Q11
        setCurrentQuestionId(11n);
        setScaleValue(5);
        return;
      }

      // ── Default sequential routing via `next` property ──────────────────────
      const nextId = currentQuestion.next;

      if (nextId !== undefined) {
        setCurrentQuestionId(nextId);
        setScaleValue(5);
      } else {
        // nextId === undefined means Q15 was just answered → complete
        const session2 = localSession.current;
        if (session2) {
          const completed: LocalSession = {
            ...session2,
            completed: true,
            phase: "complete",
          };
          localSession.current = completed;
          saveLocalSession(completed);

          if (completed.syncedSessionId) {
            setSyncStatus("syncing");
            withCanisterRetry(
              () =>
                completeSession.mutateAsync({
                  sessionId: BigInt(completed.syncedSessionId as string),
                }),
              10,
            )
              .then(() => {
                setSyncStatus("synced");
                setTimeout(() => setSyncStatus("idle"), 2000);
              })
              .catch(() => {
                setSyncStatus("offline");
                setTimeout(() => setSyncStatus("idle"), 3000);
              });
          }
        }
        setPhase("complete");
      }
    },
    [currentQuestion, bgSyncAnswer, completeSession],
  );

  /* ── Multi-select: submit selected options as comma-separated values ── */
  const submitMultiSelect = useCallback(() => {
    const joined = Array.from(selectedOptions).sort().join(",");
    submitAnswer(joined || "none");
  }, [selectedOptions, submitAnswer]);

  const toggleOption = useCallback((value: string) => {
    setSelectedOptions((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }, []);

  const handleScaleSubmit = () => {
    submitAnswer(String(scaleValue));
  };

  // When actor becomes available and we have an unsynced local session, try syncing
  // biome-ignore lint/correctness/useExhaustiveDependencies: sync when actor ready
  useEffect(() => {
    if (!actor || !localSession.current) return;
    const session = localSession.current;
    if (!session.syncedSessionId) {
      syncSessionToCanister(session);
    }
  }, [actor]);

  if (!doctorId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center"
        >
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
          <p className="text-lg font-semibold text-destructive">Invalid Link</p>
          <p className="text-muted-foreground mt-2 text-sm">
            This link is missing a doctor ID. Please ask your doctor for a valid
            questionnaire link.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-x-hidden">
      {/* Sync status bar */}
      <SyncBar status={syncStatus} />

      {/* Ambient orbs */}
      <div
        className="fixed top-0 left-0 w-[600px] h-[600px] rounded-full pointer-events-none opacity-[0.06]"
        style={{
          background:
            "radial-gradient(circle, oklch(0.74 0.17 178) 0%, transparent 65%)",
          transform: "translate(-30%, -30%)",
        }}
      />
      <div
        className="fixed bottom-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none opacity-[0.05]"
        style={{
          background:
            "radial-gradient(circle, oklch(0.82 0.15 72) 0%, transparent 65%)",
          transform: "translate(30%, 30%)",
        }}
      />

      {/* Header */}
      <header className="relative border-b border-border/40 py-3 px-4 bg-card/60 backdrop-blur-md sticky top-0 z-20">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center"
            >
              <Stethoscope className="w-4 h-4 text-primary" />
            </motion.div>
            <div>
              <h1 className="font-display font-extrabold text-lg text-gradient-teal leading-none tracking-tight">
                {ui.title}
              </h1>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5 tracking-wide uppercase">
                {ui.subtitle}
              </p>
            </div>
          </div>

          {phase === "questions" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-full px-3 py-1"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-semibold text-primary">
                Q {questionNum} / {totalSteps}
              </span>
            </motion.div>
          )}

          {phase === "language" && (
            <div className="flex items-center gap-1.5 text-muted-foreground/60">
              <Globe className="w-4 h-4" />
              <span className="text-xs">Multi-lingual</span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {/* ══════════════════════════════
                RESUME PROMPT
            ══════════════════════════════ */}
            {phase === "resume" && (
              <motion.div
                key="resume"
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -16 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-md shadow-elevated overflow-hidden">
                  <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
                  <div className="p-8 sm:p-12 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 220,
                        damping: 14,
                        delay: 0.1,
                      }}
                      className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center mx-auto mb-6"
                    >
                      <CheckCircle2 className="w-10 h-10 text-primary" />
                    </motion.div>
                    <h2 className="font-display text-2xl font-extrabold text-gradient-teal mb-2">
                      {ui.resumeTitle}
                    </h2>
                    <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                      {ui.resumeMsg}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button
                        onClick={handleResume}
                        data-ocid="questionnaire.resume_button"
                        className="h-12 px-8 rounded-xl btn-gradient font-bold text-primary-foreground"
                      >
                        {ui.resumeBtn}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      <Button
                        onClick={handleRestartFresh}
                        data-ocid="questionnaire.restart_button"
                        variant="outline"
                        className="h-12 px-8 rounded-xl font-semibold"
                      >
                        {ui.restartBtn}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══════════════════════════════
                LANGUAGE SELECTION
            ══════════════════════════════ */}
            {phase === "language" && (
              <motion.div
                key="language"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-center mb-8"
                >
                  <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
                    <Stethoscope className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-primary tracking-wider uppercase">
                      GI-CDSS Patient Portal
                    </span>
                  </div>
                  <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gradient-teal mb-2 tracking-tight">
                    {ui.selectLang}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Choose your preferred language to begin the questionnaire
                  </p>
                </motion.div>

                <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-md shadow-elevated overflow-hidden">
                  <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
                  <div className="p-6 sm:p-8">
                    <div
                      className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
                      data-ocid="questionnaire.language_select"
                    >
                      {LANGUAGES.map((lang, i) => (
                        <motion.button
                          type="button"
                          key={lang.code}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 + i * 0.08 }}
                          whileHover={{ y: -3, scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setLanguage(lang.code)}
                          className={`relative p-6 rounded-2xl border-2 text-center transition-all duration-200 group ${
                            language === lang.code
                              ? "border-primary bg-primary/10 shadow-glow-teal"
                              : "border-border/40 hover:border-primary/50 hover:bg-muted/30"
                          }`}
                        >
                          {language === lang.code && (
                            <motion.div
                              layoutId="lang-active"
                              className="absolute inset-0 rounded-2xl bg-primary/5"
                            />
                          )}
                          <div className="relative z-10">
                            <div className="text-4xl mb-3">{lang.flag}</div>
                            <p
                              className={`text-2xl font-extrabold font-display mb-1.5 transition-colors ${
                                language === lang.code
                                  ? "text-gradient-teal"
                                  : "text-foreground group-hover:text-primary/80"
                              }`}
                            >
                              {lang.native}
                            </p>
                            <p className="text-xs text-muted-foreground mb-3">
                              {lang.label}
                            </p>
                            <p
                              className={`text-[11px] italic transition-colors ${
                                language === lang.code
                                  ? "text-primary/70"
                                  : "text-muted-foreground/60"
                              }`}
                            >
                              {lang.desc}
                            </p>
                          </div>
                          {language === lang.code && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                            >
                              <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                            </motion.div>
                          )}
                        </motion.button>
                      ))}
                    </div>

                    <Button
                      onClick={handleLanguageNext}
                      disabled={isActorFetching}
                      className="w-full h-14 rounded-2xl btn-gradient font-bold text-base gap-2.5 text-primary-foreground"
                      data-ocid="questionnaire.primary_button"
                    >
                      {isActorFetching ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />{" "}
                          {ui.loading}
                        </>
                      ) : (
                        <>
                          {ui.startBtn}
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══════════════════════════════
                DEMOGRAPHICS
            ══════════════════════════════ */}
            {phase === "demographics" && (
              <motion.div
                key="demographics"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 mb-6"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                      1
                    </div>
                    <span className="text-sm font-semibold text-primary">
                      Patient Details
                    </span>
                  </div>
                  <div className="flex-1 h-[2px] bg-gradient-to-r from-primary/40 to-border/30 rounded-full" />
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-border/40 flex items-center justify-center text-xs font-semibold text-muted-foreground">
                      2
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Questionnaire
                    </span>
                  </div>
                </motion.div>

                <div
                  className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-md shadow-elevated overflow-hidden"
                  data-ocid="questionnaire.demographics_card"
                >
                  <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/70 to-transparent" />

                  <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-border/30 bg-primary/[0.03]">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-primary/12 border border-primary/25 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold font-display">
                          {ui.demoTitle}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {ui.demoSubtitle}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 sm:p-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2 sm:col-span-2">
                        <Label
                          htmlFor="pt-name"
                          className="text-sm font-semibold text-foreground/90"
                        >
                          {ui.nameLabel}{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="pt-name"
                          data-ocid="questionnaire.name.input"
                          placeholder={ui.namePh}
                          value={demo.name}
                          onChange={(e) =>
                            setDemo((d) => ({ ...d, name: e.target.value }))
                          }
                          className="h-12 bg-input/60 border-border/60 focus:border-primary/70 focus:ring-2 focus:ring-primary/20 rounded-xl text-base transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="pt-age"
                          className="text-sm font-semibold text-foreground/90"
                        >
                          {ui.ageLabel}{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="pt-age"
                          data-ocid="questionnaire.age.input"
                          type="number"
                          min={1}
                          max={120}
                          placeholder={ui.agePh}
                          value={demo.age}
                          onChange={(e) =>
                            setDemo((d) => ({ ...d, age: e.target.value }))
                          }
                          className="h-12 bg-input/60 border-border/60 focus:border-primary/70 focus:ring-2 focus:ring-primary/20 rounded-xl text-base transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-foreground/90">
                          {ui.genderLabel}
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                          {(["Male", "Female", "Other"] as const).map((g) => (
                            <button
                              type="button"
                              key={g}
                              data-ocid={`questionnaire.gender.item.${g.toLowerCase()}`}
                              onClick={() =>
                                setDemo((d) => ({ ...d, gender: g }))
                              }
                              className={`h-12 rounded-xl border-2 text-sm font-semibold transition-all duration-150 ${
                                demo.gender === g
                                  ? "border-primary bg-primary/12 text-primary"
                                  : "border-border/40 hover:border-primary/40 text-muted-foreground hover:text-foreground hover:bg-muted/30"
                              }`}
                            >
                              {g === "Male"
                                ? ui.male
                                : g === "Female"
                                  ? ui.female
                                  : ui.other}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="pt-addr"
                          className="text-sm font-semibold text-foreground/90"
                        >
                          {ui.addressLabel}
                        </Label>
                        <Input
                          id="pt-addr"
                          data-ocid="questionnaire.address.input"
                          placeholder={ui.addressPh}
                          value={demo.address}
                          onChange={(e) =>
                            setDemo((d) => ({
                              ...d,
                              address: e.target.value,
                            }))
                          }
                          className="h-12 bg-input/60 border-border/60 focus:border-primary/70 focus:ring-2 focus:ring-primary/20 rounded-xl text-base transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="pt-occ"
                          className="text-sm font-semibold text-foreground/90"
                        >
                          {ui.occLabel}
                        </Label>
                        <Input
                          id="pt-occ"
                          data-ocid="questionnaire.occupation.input"
                          placeholder={ui.occPh}
                          value={demo.occupation}
                          onChange={(e) =>
                            setDemo((d) => ({
                              ...d,
                              occupation: e.target.value,
                            }))
                          }
                          className="h-12 bg-input/60 border-border/60 focus:border-primary/70 focus:ring-2 focus:ring-primary/20 rounded-xl text-base transition-all"
                        />
                      </div>
                    </div>

                    <AnimatePresence>
                      {demoError && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{
                            opacity: 1,
                            height: "auto",
                            marginTop: 16,
                          }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          className="flex items-start gap-2.5 bg-destructive/8 border border-destructive/25 rounded-xl px-4 py-3"
                          data-ocid="questionnaire.form.error_state"
                        >
                          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-destructive">
                            {demoError}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Button
                      onClick={handleDemoSubmit}
                      className="w-full h-14 rounded-2xl btn-gradient font-bold text-base gap-2.5 mt-6 text-primary-foreground"
                      data-ocid="questionnaire.submit_button"
                    >
                      {ui.demoBtn}
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══════════════════════════════
                QUESTIONS
            ══════════════════════════════ */}
            {phase === "questions" && currentQuestion && (
              <motion.div
                key={`q-${String(currentQuestionId)}`}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Progress */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/25 rounded-full px-3 py-1">
                      <span className="text-xs font-bold text-primary">
                        {ui.progress} {questionNum}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        / {totalSteps}
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-semibold tabular-nums"
                        style={{
                          color: scaleColor(Math.ceil(progressPct / 10)),
                        }}
                      >
                        {progressPct}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        complete
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {Array.from(
                      { length: Math.min(totalSteps, 20) },
                      (_, idx) => {
                        const segKey = `seg-${idx}-of-${Math.min(totalSteps, 20)}`;
                        return (
                          <motion.div
                            key={segKey}
                            className="flex-1 h-2 rounded-full"
                            style={{
                              background:
                                idx < answeredIds.length
                                  ? "oklch(0.74 0.17 178)"
                                  : idx === answeredIds.length
                                    ? "oklch(0.74 0.17 178 / 0.4)"
                                    : "oklch(var(--border))",
                            }}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ delay: idx * 0.02, duration: 0.2 }}
                          />
                        );
                      },
                    )}
                  </div>
                </div>

                {/* Question Card */}
                <div
                  className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-md shadow-elevated overflow-hidden"
                  data-ocid="questionnaire.question_card"
                >
                  <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
                  <div className="p-6 sm:p-8">
                    <div className="flex items-start gap-3 mb-6">
                      <div
                        className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold font-display border"
                        style={{
                          background: "oklch(0.74 0.17 178 / 0.12)",
                          borderColor: "oklch(0.74 0.17 178 / 0.3)",
                          color: "oklch(0.74 0.17 178)",
                        }}
                      >
                        {questionNum}
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold leading-snug flex-1 pt-0.5">
                        {currentQuestion[language]}
                      </h2>
                    </div>

                    {/* Yes / No */}
                    {currentQuestion.type === "yesno" && (
                      <div className="grid grid-cols-2 gap-4">
                        <motion.button
                          type="button"
                          data-ocid="questionnaire.yes_button"
                          onClick={() => submitAnswer("yes")}
                          whileHover={{ scale: 1.03, y: -2 }}
                          whileTap={{ scale: 0.97 }}
                          className="h-20 rounded-2xl font-extrabold text-xl transition-all duration-200 flex flex-col items-center justify-center gap-1"
                          style={{
                            background:
                              "linear-gradient(135deg, oklch(0.74 0.17 178), oklch(0.68 0.18 196))",
                            color: "oklch(0.08 0.01 240)",
                            boxShadow:
                              "0 6px 24px oklch(0.74 0.17 178 / 0.35), 0 2px 8px oklch(0 0 0 / 0.2)",
                          }}
                        >
                          <CheckCircle2 className="w-6 h-6" />
                          <span>{ui.yes}</span>
                        </motion.button>

                        <motion.button
                          type="button"
                          data-ocid="questionnaire.no_button"
                          onClick={() => submitAnswer("no")}
                          whileHover={{ scale: 1.03, y: -2 }}
                          whileTap={{ scale: 0.97 }}
                          className="h-20 rounded-2xl border-2 border-border/60 bg-muted/30 hover:bg-muted/50 hover:border-border font-extrabold text-xl transition-all duration-200 flex flex-col items-center justify-center gap-1 text-foreground/80"
                        >
                          {ui.no}
                        </motion.button>
                      </div>
                    )}

                    {/* Choice — single-select (auto-advance) */}
                    {currentQuestion.type === "choice" &&
                      currentQuestion.options &&
                      !currentQuestion.multiSelect && (
                        <motion.div
                          className="space-y-3"
                          initial="hidden"
                          animate="visible"
                          variants={{
                            visible: { transition: { staggerChildren: 0.06 } },
                          }}
                        >
                          {currentQuestion.options.map((opt, idx) => (
                            <motion.button
                              type="button"
                              key={opt.value}
                              data-ocid={`questionnaire.choice.item.${idx + 1}`}
                              onClick={() => submitAnswer(opt.value)}
                              variants={{
                                hidden: { opacity: 0, x: 12 },
                                visible: { opacity: 1, x: 0 },
                              }}
                              whileHover={{ x: 4 }}
                              whileTap={{ scale: 0.99 }}
                              className="w-full text-left px-5 py-4 rounded-2xl border-2 border-border/40 bg-muted/15 hover:border-primary/60 hover:bg-primary/5 font-medium text-base transition-all duration-150 group"
                            >
                              <span className="flex items-center gap-4">
                                <span className="w-8 h-8 rounded-xl border-2 border-border/60 group-hover:border-primary/70 flex items-center justify-center text-sm font-extrabold text-muted-foreground group-hover:text-primary group-hover:bg-primary/8 transition-all flex-shrink-0 font-display">
                                  {String.fromCharCode(65 + idx)}
                                </span>
                                <span className="flex-1">{opt[language]}</span>
                                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary/60 transition-colors flex-shrink-0" />
                              </span>
                            </motion.button>
                          ))}
                        </motion.div>
                      )}

                    {/* Choice — multi-select (checkboxes + Next button) */}
                    {currentQuestion.type === "choice" &&
                      currentQuestion.options &&
                      currentQuestion.multiSelect && (
                        <div className="space-y-4">
                          <p className="text-xs text-muted-foreground/70 italic mb-1">
                            Select all that apply, then press Next
                          </p>
                          <motion.div
                            className="space-y-3"
                            initial="hidden"
                            animate="visible"
                            variants={{
                              visible: {
                                transition: { staggerChildren: 0.05 },
                              },
                            }}
                          >
                            {currentQuestion.options.map((opt, idx) => {
                              const isChecked = selectedOptions.has(opt.value);
                              return (
                                <motion.button
                                  type="button"
                                  key={opt.value}
                                  data-ocid={`questionnaire.multiselect.item.${idx + 1}`}
                                  onClick={() => toggleOption(opt.value)}
                                  variants={{
                                    hidden: { opacity: 0, x: 12 },
                                    visible: { opacity: 1, x: 0 },
                                  }}
                                  whileHover={{ x: 2 }}
                                  whileTap={{ scale: 0.99 }}
                                  className={`w-full text-left px-5 py-4 rounded-2xl border-2 font-medium text-base transition-all duration-150 group ${
                                    isChecked
                                      ? "border-primary bg-primary/10 shadow-[0_0_0_1px_oklch(0.74_0.17_178/0.3)]"
                                      : "border-border/40 bg-muted/15 hover:border-primary/50 hover:bg-primary/5"
                                  }`}
                                >
                                  <span className="flex items-center gap-4">
                                    {/* Custom checkbox indicator */}
                                    <span
                                      className={`w-8 h-8 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
                                        isChecked
                                          ? "bg-primary border-primary"
                                          : "border-border/60 group-hover:border-primary/60 bg-background/60"
                                      }`}
                                    >
                                      {isChecked ? (
                                        <motion.span
                                          initial={{ scale: 0, rotate: -10 }}
                                          animate={{ scale: 1, rotate: 0 }}
                                          transition={{
                                            type: "spring",
                                            stiffness: 400,
                                            damping: 18,
                                          }}
                                        >
                                          <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
                                        </motion.span>
                                      ) : (
                                        <span className="text-xs font-extrabold text-muted-foreground group-hover:text-primary/70 font-display transition-colors">
                                          {String.fromCharCode(65 + idx)}
                                        </span>
                                      )}
                                    </span>
                                    <span
                                      className={`flex-1 transition-colors ${
                                        isChecked
                                          ? "text-foreground font-semibold"
                                          : "text-foreground/80"
                                      }`}
                                    >
                                      {opt[language]}
                                    </span>
                                  </span>
                                </motion.button>
                              );
                            })}
                          </motion.div>

                          {/* Next button — amber CTA, disabled until at least one selected */}
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="pt-2"
                          >
                            <Button
                              data-ocid="questionnaire.multiselect.next_button"
                              onClick={submitMultiSelect}
                              disabled={selectedOptions.size === 0}
                              title={
                                selectedOptions.size === 0
                                  ? "Please select at least one option"
                                  : undefined
                              }
                              className="w-full h-14 rounded-2xl font-bold text-base gap-2.5 transition-all duration-200"
                              style={
                                selectedOptions.size > 0
                                  ? {
                                      background:
                                        "linear-gradient(135deg, oklch(0.82 0.15 72), oklch(0.76 0.16 55))",
                                      color: "oklch(0.12 0.02 240)",
                                      boxShadow:
                                        "0 4px 20px oklch(0.82 0.15 72 / 0.4), 0 2px 6px oklch(0 0 0 / 0.2)",
                                    }
                                  : {
                                      background: "oklch(var(--muted))",
                                      color: "oklch(var(--muted-foreground))",
                                      cursor: "not-allowed",
                                    }
                              }
                            >
                              {ui.next}
                              <ArrowRight className="w-5 h-5" />
                            </Button>
                            {selectedOptions.size === 0 && (
                              <p className="text-center text-xs text-muted-foreground/60 mt-2">
                                Please select at least one option
                              </p>
                            )}
                          </motion.div>
                        </div>
                      )}

                    {/* Scale */}
                    {currentQuestion.type === "scale" && (
                      <div className="space-y-6">
                        <div className="flex flex-col items-center gap-2 py-4">
                          <motion.div
                            key={scaleValue}
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 20,
                            }}
                            className="w-24 h-24 rounded-3xl border-4 flex flex-col items-center justify-center"
                            style={{
                              background: `${scaleColor(scaleValue)}22`,
                              borderColor: scaleColor(scaleValue),
                              boxShadow: `0 0 32px ${scaleColor(scaleValue)}50`,
                            }}
                          >
                            <span
                              className="text-5xl font-extrabold font-display"
                              style={{ color: scaleColor(scaleValue) }}
                            >
                              {scaleValue}
                            </span>
                          </motion.div>
                          <span
                            className="text-sm font-semibold tracking-wider uppercase px-4 py-1.5 rounded-full"
                            style={{
                              background: `${scaleColor(scaleValue)}18`,
                              color: scaleColor(scaleValue),
                            }}
                          >
                            {scaleLabel(scaleValue)}
                          </span>
                        </div>

                        <ScaleSlider
                          value={scaleValue}
                          onChange={setScaleValue}
                        />

                        <div className="flex justify-between text-xs text-muted-foreground px-1">
                          <span className="bg-muted/50 px-3 py-1 rounded-full">
                            1 — Mild
                          </span>
                          <span className="bg-muted/50 px-3 py-1 rounded-full">
                            10 — Severe
                          </span>
                        </div>

                        <Button
                          data-ocid="questionnaire.next_button"
                          onClick={handleScaleSubmit}
                          className="w-full h-14 rounded-2xl btn-gradient font-bold text-base gap-2.5 text-primary-foreground"
                        >
                          {ui.next}
                          <ArrowRight className="w-5 h-5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══════════════════════════════
                COMPLETE
            ══════════════════════════════ */}
            {phase === "complete" && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <div
                  className="relative rounded-2xl border border-primary/30 bg-card/80 backdrop-blur-md shadow-elevated text-center overflow-hidden"
                  data-ocid="questionnaire.complete_card"
                >
                  <div className="h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {particles.current.map((p) => (
                      <Particle key={p.id} delay={p.delay} x={p.x} y={p.y} />
                    ))}
                  </div>

                  <div
                    className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
                    style={{
                      background:
                        "radial-gradient(ellipse at 50% 100%, oklch(0.74 0.17 178 / 0.15) 0%, transparent 70%)",
                    }}
                  />

                  <div className="relative z-10 p-10 sm:p-14">
                    <motion.div
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        delay: 0.15,
                        type: "spring",
                        stiffness: 220,
                        damping: 14,
                      }}
                      className="relative mx-auto mb-8 w-28 h-28"
                    >
                      <motion.div
                        animate={{
                          scale: [1, 1.25, 1],
                          opacity: [0.5, 0, 0.5],
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "easeInOut",
                        }}
                        className="absolute inset-0 rounded-full"
                        style={{
                          background:
                            "radial-gradient(circle, oklch(0.74 0.17 178 / 0.4) 0%, transparent 70%)",
                        }}
                      />
                      <div
                        className="w-28 h-28 rounded-3xl flex items-center justify-center"
                        style={{
                          background:
                            "linear-gradient(135deg, oklch(0.74 0.17 178 / 0.2), oklch(0.68 0.18 196 / 0.1))",
                          border: "2px solid oklch(0.74 0.17 178 / 0.4)",
                          boxShadow:
                            "0 0 40px oklch(0.74 0.17 178 / 0.4), 0 0 80px oklch(0.74 0.17 178 / 0.15)",
                        }}
                      >
                        <CheckCircle2
                          className="w-14 h-14"
                          style={{ color: "oklch(0.74 0.17 178)" }}
                        />
                      </div>
                    </motion.div>

                    <motion.h2
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                      className="font-display text-5xl font-extrabold text-gradient-teal mb-4"
                    >
                      {ui.thankYou}
                    </motion.h2>

                    <motion.p
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="text-muted-foreground leading-relaxed max-w-sm mx-auto text-base"
                    >
                      {ui.thankYouMsg}
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.65 }}
                      className="mt-8 inline-flex items-center gap-2 bg-primary/8 border border-primary/20 rounded-full px-5 py-2.5"
                    >
                      <Stethoscope className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-primary/80">
                        GI-CDSS · Clinical Decision Support
                      </span>
                    </motion.div>

                    {/* Manual Sync Button */}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 }}
                      className="mt-6 flex flex-col items-center gap-3"
                    >
                      {syncStatus !== "synced" ? (
                        <Button
                          data-ocid="questionnaire.sync_button"
                          onClick={() => {
                            if (localSession.current)
                              syncSessionToCanister(localSession.current);
                          }}
                          disabled={syncStatus === "syncing"}
                          className="relative gap-2 px-8 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-primary/40 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {syncStatus === "syncing" ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Sending to Dashboard...
                            </>
                          ) : (
                            <>
                              <CloudUpload className="w-4 h-4" />
                              Send to Dashboard
                            </>
                          )}
                        </Button>
                      ) : (
                        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl px-6 py-3">
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          <span className="text-sm font-semibold text-green-400">
                            Synced to Dashboard
                          </span>
                        </div>
                      )}
                      {syncStatus === "offline" && (
                        <p className="text-xs text-amber-400/70 max-w-xs text-center">
                          Could not reach the server. Your data is saved locally
                          — tap above to retry.
                        </p>
                      )}
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="text-center text-xs text-muted-foreground/50 py-6 relative z-10">
        © {new Date().getFullYear()}. Built with ❤ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary/60 hover:text-primary transition-colors"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
