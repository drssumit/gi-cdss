import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  FlaskConical,
  Link2,
  Loader2,
  LogOut,
  MapPin,
  RefreshCw,
  Search,
  Stethoscope,
  TrendingUp,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { analyzeSession } from "../clinicalEngine";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAnswerQuestion,
  useCompleteSession,
  useCreatePatientSession,
  useGetDoctor,
  useGetSessionsByDoctor,
} from "../hooks/useQueries";
import type { PatientSession } from "../types";
import {
  type LocalSession,
  clearLocalSession,
  loadLocalSession,
} from "../utils/localSession";
import { DEMO_Q } from "./Questionnaire";

const LANG_LABEL: Record<string, string> = {
  en: "English",
  hi: "\u0939\u093f\u0902\u0926\u0940",
  mr: "\u092e\u0930\u093e\u0920\u0940",
};

function formatDate(timestamp?: bigint | [] | [bigint]) {
  const ts: bigint | undefined = Array.isArray(timestamp)
    ? (timestamp as [bigint] | [])[0]
    : timestamp;
  if (!ts) return "\u2014";
  const ms = Number(ts / 1_000_000n);
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDemo(session: PatientSession, key: bigint): string {
  const entry = session.answers.find(([qId]) => qId === key);
  return entry?.[1] ?? "\u2014";
}

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);
  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - (1 - progress) ** 3;
      setValue(Math.round(ease * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);
  return value;
}

/**
 * Consolidated horizontal stats bar — one card, four columns with dividers.
 */
function StatsBar({
  total,
  completed,
  active,
  rate,
}: { total: number; completed: number; active: number; rate: number }) {
  const animTotal = useCountUp(total);
  const animCompleted = useCountUp(completed);
  const animActive = useCountUp(active);
  const animRate = useCountUp(rate);

  const stats = [
    {
      label: "Total",
      value: animTotal,
      suffix: "",
      accent: "border-border/60 text-foreground",
      labelCls: "text-muted-foreground",
      icon: Users,
    },
    {
      label: "Completed",
      value: animCompleted,
      suffix: "",
      accent: "border-primary/40 text-primary",
      labelCls: "text-primary/60",
      icon: CheckCircle2,
    },
    {
      label: "Active",
      value: animActive,
      suffix: "",
      accent: "border-warning/40 text-warning",
      labelCls: "text-warning/60",
      icon: Activity,
    },
    {
      label: "Rate",
      value: animRate,
      suffix: "%",
      accent: "border-success/40 text-success",
      labelCls: "text-success/60",
      icon: TrendingUp,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="border-border/40 rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border/40">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className={`relative flex flex-col gap-1 px-6 py-5 border-l-2 ${
                  i === 0
                    ? "border-l-border/40"
                    : i === 1
                      ? "border-l-primary/40"
                      : i === 2
                        ? "border-l-warning/40"
                        : "border-l-success/40"
                } border-t-0 border-r-0 border-b-0`}
              >
                <div className="flex items-center justify-between">
                  <p
                    className={`text-xs font-medium uppercase tracking-wider ${stat.labelCls}`}
                  >
                    {stat.label}
                  </p>
                  <stat.icon className={`w-3.5 h-3.5 ${stat.labelCls}`} />
                </div>
                <p
                  className={`text-2xl sm:text-3xl font-bold font-display ${stat.accent.split(" ")[1]}`}
                >
                  {stat.value}
                  {stat.suffix}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ConfidenceBadge({
  confidence,
}: { confidence: "High" | "Moderate" | "Low" }) {
  const cls =
    confidence === "High"
      ? "text-destructive bg-destructive/10 border-destructive/20"
      : confidence === "Moderate"
        ? "text-warning bg-warning/10 border-warning/20"
        : "text-muted-foreground bg-muted/20 border-border/30";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${cls} leading-none`}
    >
      {confidence}
    </span>
  );
}

function SessionRow({
  session,
  index,
}: { session: PatientSession; index: number }) {
  const navigate = useNavigate();
  const isComplete = session.completedAt !== undefined;
  const ocid = `dashboard.session.item.${index}` as const;

  const ptName = getDemo(session, DEMO_Q.name);
  const ptAge = getDemo(session, DEMO_Q.age);
  const ptGender = getDemo(session, DEMO_Q.gender);
  const ptAddr = getDemo(session, DEMO_Q.address);
  const ptOcc = getDemo(session, DEMO_Q.occupation);

  const hasDemo = ptName !== "\u2014";
  const initials = hasDemo
    ? ptName
        .split(" ")
        .slice(0, 2)
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
    : `#${String(session.id)}`;

  // Clinical summary — only for completed sessions
  const clinicalSummary =
    isComplete && session.answers.length > 0
      ? analyzeSession(session.answers)
      : null;
  const topDiff = clinicalSummary?.differentials[0] ?? null;
  const topInvestigations =
    clinicalSummary?.suggestedInvestigations.slice(0, 3) ?? [];
  const extraCount = (clinicalSummary?.suggestedInvestigations.length ?? 0) - 3;

  const handleViewReport = () => {
    if (!isComplete) return;
    navigate({ to: "/report", search: { sessionId: String(session.id) } });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{
        delay: index * 0.06,
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1],
      }}
      data-ocid={ocid}
      onClick={handleViewReport}
      className={`relative group rounded-xl border transition-all duration-200 overflow-hidden ${
        isComplete
          ? "border-border/40 hover:border-primary/40 hover:shadow-glow-teal cursor-pointer bg-card/60 hover:bg-card/80 border-l-2 border-l-primary/30"
          : "border-border/30 cursor-default bg-card/40 border-l-2 border-l-warning/30"
      }`}
    >
      {/* Scan shimmer on hover */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="pl-5 pr-4 py-4 flex items-start gap-4">
        {/* Avatar */}
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center font-display font-bold text-sm flex-shrink-0 mt-0.5 ${
            isComplete
              ? "bg-primary/12 text-primary border border-primary/20"
              : "bg-warning/10 text-warning border border-warning/20"
          }`}
        >
          {initials}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          {/* Demographics */}
          {hasDemo ? (
            <>
              <p className="font-semibold text-sm truncate">{ptName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {ptAge} yrs &middot; {ptGender}
                {ptOcc !== "\u2014" && <> &middot; {ptOcc}</>}
              </p>
              {ptAddr !== "\u2014" && (
                <p className="text-xs text-muted-foreground/60 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{ptAddr}</span>
                </p>
              )}
            </>
          ) : (
            <p className="font-semibold text-sm">
              Session #{String(session.id)}
            </p>
          )}
          <p className="text-xs text-muted-foreground/50 mt-1">
            {LANG_LABEL[session.language] ?? session.language} &middot;{" "}
            {formatDate(session.completedAt)}
          </p>

          {/* Clinical summary — completed sessions only */}
          {isComplete && (topDiff || topInvestigations.length > 0) && (
            <div className="mt-2.5 pt-2.5 border-t border-border/20 space-y-1.5">
              {/* Top differential */}
              {topDiff && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Stethoscope className="w-3 h-3 text-primary/50 flex-shrink-0" />
                  <span className="text-xs text-muted-foreground/70 font-medium truncate max-w-[220px]">
                    {topDiff.condition}
                  </span>
                  <ConfidenceBadge confidence={topDiff.confidence} />
                </div>
              )}

              {/* Top investigations */}
              {topInvestigations.length > 0 && (
                <div className="flex items-start gap-1.5 flex-wrap">
                  <FlaskConical className="w-3 h-3 text-primary/40 flex-shrink-0 mt-0.5" />
                  <div className="flex flex-wrap gap-1">
                    {topInvestigations.map((inv) => (
                      <span
                        key={inv}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-primary/5 border border-primary/12 text-muted-foreground/80 leading-none"
                      >
                        {inv}
                      </span>
                    ))}
                    {extraCount > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-muted/20 border border-border/30 text-muted-foreground/60 leading-none">
                        +{extraCount} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status pill — prominent, on the right */}
        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              isComplete
                ? "bg-success/15 text-success border border-success/25"
                : "bg-warning/10 text-warning border border-warning/25"
            }`}
          >
            {isComplete ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <Clock className="w-3 h-3" />
            )}
            {isComplete ? "Completed" : "In Progress"}
          </span>
          {isComplete && (
            <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { identity, clear, isLoginSuccess, isLoginIdle } =
    useInternetIdentity();
  const { data: doctor, isLoading: isDoctorLoading } = useGetDoctor();
  const { data: sessions, isLoading: isSessionsLoading } =
    useGetSessionsByDoctor();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingLocalSession, setPendingLocalSession] =
    useState<LocalSession | null>(null);

  const createSession = useCreatePatientSession();
  const answerQuestion = useAnswerQuestion();
  const completeSession = useCompleteSession();
  const { refetch: refetchSessions } = useGetSessionsByDoctor();

  // Check localStorage for pending (unsynced) sessions on mount + after sync
  const checkPending = useCallback(() => {
    if (!identity) return;
    const doctorId = identity.getPrincipal().toString();
    const session = loadLocalSession(doctorId);
    if (session?.completed && !session.syncedSessionId) {
      setPendingLocalSession(session!);
    } else {
      setPendingLocalSession(null);
    }
  }, [identity]);

  useEffect(() => {
    checkPending();
  }, [checkPending]);

  const handleSyncPending = async () => {
    if (!identity || !pendingLocalSession) return;
    setIsSyncing(true);
    try {
      const doctorId = identity.getPrincipal().toString();
      // Create session on canister
      const sessionId = await createSession.mutateAsync({
        doctorId: identity.getPrincipal() as any,
        language: pendingLocalSession.language,
      });
      const sidStr = sessionId.toString();
      // Push all answers
      for (const [qIdStr, answer] of Object.entries(
        pendingLocalSession.answers,
      )) {
        await answerQuestion.mutateAsync({
          sessionId: BigInt(sidStr),
          questionId: BigInt(qIdStr),
          answer,
        });
      }
      // Complete the session
      await completeSession.mutateAsync({ sessionId: BigInt(sidStr) });
      // Clear from localStorage
      clearLocalSession(doctorId);
      setPendingLocalSession(null);
      await refetchSessions();
      toast.success("Session synced to dashboard!", {
        description: "Patient data is now available in your session list.",
      });
    } catch {
      toast.error("Sync failed — try again", {
        description: "The server may be temporarily unavailable. Please retry.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if ((isLoginIdle || isLoginSuccess) && !identity) {
      navigate({ to: "/login" });
    }
  }, [identity, isLoginIdle, isLoginSuccess, navigate]);

  const handleCopyLink = () => {
    if (!identity) return;
    const principal = identity.getPrincipal().toString();
    const link = `${window.location.origin}/questionnaire?doctorId=${principal}`;
    navigator.clipboard.writeText(link).then(() => {
      toast.success("Patient link copied!", {
        description:
          "Share this link with your patient to start the questionnaire.",
      });
    });
  };

  const handleLogout = () => {
    clear();
    navigate({ to: "/login" });
  };

  const completedCount =
    sessions?.filter((s) => s.completedAt !== undefined).length ?? 0;
  const totalCount = sessions?.length ?? 0;
  const pendingCount = totalCount - completedCount;
  const completionRate =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const lastActivity = sessions
    ?.filter((s) => s.completedAt !== undefined)
    .sort((a, b) => {
      const aTs = Array.isArray(a.completedAt)
        ? ((a.completedAt as [bigint] | [])[0] ?? 0n)
        : 0n;
      const bTs = Array.isArray(b.completedAt)
        ? ((b.completedAt as [bigint] | [])[0] ?? 0n)
        : 0n;
      return Number(bTs - aTs);
    })[0];
  const filteredSessions =
    sessions?.filter((s) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = getDemo(s, DEMO_Q.name).toLowerCase();
      return name.includes(q);
    }) ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header — distinct identity with left accent bar */}
      <header className="relative border-b border-border/40 bg-card/70 backdrop-blur-md sticky top-0 z-20">
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        {/* Subtle left accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-primary/70 via-primary/40 to-transparent" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between relative pl-6">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center"
              whileHover={{ scale: 1.08 }}
            >
              <Stethoscope className="w-4 h-4 text-primary" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-xl tracking-tight text-gradient-teal leading-none">
                  GI-CDSS
                </span>
                <Badge className="text-[9px] px-1.5 py-0 h-4 rounded-sm bg-muted/80 text-muted-foreground border-border/60 font-semibold tracking-widest">
                  CDSS
                </Badge>
              </div>
              {!isDoctorLoading && doctor && (
                <span className="text-[11px] text-muted-foreground/70 leading-none">
                  {doctor.clinic}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingLocalSession && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Button
                  data-ocid="dashboard.sync_button"
                  variant="outline"
                  size="sm"
                  onClick={handleSyncPending}
                  disabled={isSyncing}
                  className="relative gap-2 rounded-xl border-primary/40 text-primary hover:bg-primary/10 hover:border-primary/60"
                >
                  {isSyncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">
                    {isSyncing ? "Syncing…" : "Sync Pending"}
                  </span>
                  {!isSyncing && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-500 text-[9px] font-bold text-black flex items-center justify-center leading-none">
                      1
                    </span>
                  )}
                </Button>
              </motion.div>
            )}
            <Button
              data-ocid="dashboard.logout_button"
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/50 gap-2 rounded-xl"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Welcome + CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative rounded-2xl border border-border/40 bg-card/60 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/6 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-primary/50 via-primary/30 to-transparent" />
            <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div>
                {isDoctorLoading ? (
                  <>
                    <Skeleton className="h-8 w-56 mb-2" />
                    <Skeleton className="h-4 w-40" />
                  </>
                ) : (
                  <>
                    <motion.h2
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="font-display text-2xl sm:text-3xl font-bold"
                    >
                      Welcome back,{" "}
                      <span className="text-gradient-teal">
                        {doctor?.name ?? "Doctor"}
                      </span>
                    </motion.h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {doctor?.clinic ?? ""}
                    </p>
                    <p className="text-xs text-muted-foreground/50 mt-2 flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3 text-primary/50" />
                      <span>
                        {completedCount} completed session
                        {completedCount !== 1 ? "s" : ""}
                      </span>
                      {lastActivity && (
                        <>
                          <span className="text-muted-foreground/30">
                            &bull;
                          </span>
                          <span>
                            Last activity:{" "}
                            {formatDate(lastActivity.completedAt)}
                          </span>
                        </>
                      )}
                    </p>
                  </>
                )}
              </div>
              {/* Amber CTA — distinct from the primary brand color */}
              <Button
                data-ocid="dashboard.copy_link_button"
                onClick={handleCopyLink}
                className="btn-accent gap-2.5 px-6 h-11 rounded-xl font-semibold shrink-0"
              >
                <Link2 className="w-4 h-4" />
                Copy Patient Link
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats bar — single consolidated card */}
        <StatsBar
          total={totalCount}
          completed={completedCount}
          active={pendingCount}
          rate={completionRate}
        />

        {/* Sessions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28 }}
        >
          <Card className="border-border/40 rounded-2xl overflow-hidden">
            <div className="h-[1.5px] bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
            <CardHeader className="pb-4 border-b border-border/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-display text-base">
                    Patient Sessions
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Click a completed session to view the full clinical report
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {/* Search */}
              {sessions && sessions.length > 0 && (
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                  <Input
                    data-ocid="dashboard.search_input"
                    placeholder="Search by patient name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm bg-background/40 border-border/40 rounded-xl focus-visible:ring-primary/20"
                  />
                </div>
              )}
              {isSessionsLoading ? (
                <div className="space-y-3" data-ocid="dashboard.loading_state">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
                  ))}
                </div>
              ) : sessions && sessions.length > 0 ? (
                <div className="space-y-2.5" data-ocid="dashboard.session_list">
                  {filteredSessions.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground/60">
                      No patients match &ldquo;{searchQuery}&rdquo;
                    </div>
                  ) : (
                    <AnimatePresence>
                      {filteredSessions.map((session, i) => (
                        <SessionRow
                          key={String(session.id)}
                          session={session}
                          index={i + 1}
                        />
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              ) : (
                <div data-ocid="dashboard.session_list" className="py-16">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    data-ocid="dashboard.session.empty_state"
                    className="text-center"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-muted/30 border border-border/40 flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                    <p className="font-display font-semibold text-foreground/60">
                      No sessions yet
                    </p>
                    <p className="text-sm text-muted-foreground/50 mt-1.5 max-w-xs mx-auto leading-relaxed">
                      Copy your patient link and share it to start collecting
                      questionnaire responses.
                    </p>
                    <Button
                      onClick={handleCopyLink}
                      className="mt-5 btn-accent gap-2 h-10 px-5 rounded-xl"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Link Now
                    </Button>
                  </motion.div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <footer className="text-center text-xs text-muted-foreground/40 py-8">
        &copy; {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary/50 hover:text-primary transition-colors"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
