import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  FileDown,
  FlaskConical,
  Loader2,
  Printer,
  ShieldAlert,
  Stethoscope,
  User,
  XCircle,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import {
  type ClinicalReport as ClinicalReportType,
  type Differential,
  type TieredInvestigation,
  analyzeSession,
} from "../clinicalEngine";
import { useGetPatientSession } from "../hooks/useQueries";
import { QUESTION_MAP } from "../questions";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normalize an investigation item: old sessions stored plain strings;
 * new sessions store TieredInvestigation objects. Always return an object.
 */
function normInv(inv: TieredInvestigation | string): TieredInvestigation {
  if (typeof inv === "string") {
    return { tier: "routine", name: inv };
  }
  return inv;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ConfidenceBar({ confidence }: { confidence: string }) {
  const pct = confidence === "High" ? 85 : confidence === "Moderate" ? 55 : 25;
  const color =
    confidence === "High"
      ? "bg-destructive"
      : confidence === "Moderate"
        ? "bg-warning"
        : "bg-muted-foreground";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        />
      </div>
      <span
        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          confidence === "High"
            ? "bg-destructive/12 text-destructive"
            : confidence === "Moderate"
              ? "bg-warning/12 text-warning"
              : "bg-muted/50 text-muted-foreground"
        }`}
      >
        {confidence}
      </span>
    </div>
  );
}

function ClassificationBadge({ classification }: { classification: string }) {
  if (classification === "Organic") {
    return (
      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-destructive/10 text-destructive border border-destructive/25">
        <XCircle className="w-4 h-4" />
        Organic
      </span>
    );
  }
  if (classification === "Functional") {
    return (
      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-success/10 text-success border border-success/25">
        <CheckCircle2 className="w-4 h-4" />
        Functional
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-warning/10 text-warning border border-warning/25">
      <AlertTriangle className="w-4 h-4" />
      Indeterminate
    </span>
  );
}

/** Rome IV badge — emerald/green, only shown when romeIV is defined */
function RomeIVBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/12 text-emerald-400 border border-emerald-500/25">
      Rome IV · {label}
    </span>
  );
}

/** ICD-10 inline monospace chip next to condition name */
function ICD10Chip({ code }: { code: string }) {
  return (
    <span className="ml-1.5 text-[11px] font-mono text-muted-foreground/55 tracking-tight">
      {code}
    </span>
  );
}

/** Patient demographics banner — shown at the very top of the report */
function DemographicsBanner({
  session,
}: {
  session: {
    answers: [bigint, string][];
    language?: string;
    createdAt?: bigint;
  };
}) {
  // Demographics stored in answers using negative/high bigint keys (9000n+) or read from string answers
  const getAns = (id: bigint) =>
    session.answers.find(([q]) => q === id)?.[1] ?? "";

  // Standard demographic question IDs used by the questionnaire
  const name = getAns(9001n) || getAns(100n);
  const age = getAns(9002n) || getAns(101n);
  const gender = getAns(9003n) || getAns(102n);
  const address = getAns(9004n) || getAns(103n);
  const occupation = getAns(9005n) || getAns(104n);

  const hasAnyDemo = name || age || gender || address || occupation;
  if (!hasAnyDemo) return null;

  const createdDate = session.createdAt
    ? new Date(Number(session.createdAt / 1_000_000n)).toLocaleDateString(
        "en-IN",
        { day: "numeric", month: "long", year: "numeric" },
      )
    : null;

  return (
    <div className="rounded-2xl border border-primary/20 bg-card/60 overflow-hidden border-l-4 border-l-primary/50 print-section">
      <div className="px-5 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-bold text-foreground text-sm leading-tight">
              Patient Demographics
            </h3>
            {createdDate && (
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                Session recorded {createdDate}
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { label: "Name", value: name },
            { label: "Age", value: age },
            { label: "Gender", value: gender },
            { label: "Occupation", value: occupation },
            { label: "Address", value: address },
          ]
            .filter((d) => d.value)
            .map((d) => (
              <div key={d.label} className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">
                  {d.label}
                </p>
                <p className="text-xs font-semibold text-foreground/80 truncate capitalize">
                  {d.value}
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

/** Tiered investigation group — renders one tier bucket */
function TierSection({
  tier,
  items,
}: {
  tier: "emergency" | "urgent" | "routine";
  items: TieredInvestigation[];
}) {
  if (items.length === 0) return null;

  const config = {
    emergency: {
      label: "🚨 Emergency — within 24 hours",
      borderClass: "border-red-500/40 border-l-red-500",
      bgClass: "bg-red-500/6",
      headerClass: "text-red-400",
      badgeClass: "bg-red-500/15 text-red-400 border-red-500/30",
      itemClass: "bg-red-500/5 border-red-500/15 text-red-300/90",
    },
    urgent: {
      label: "⚡ Urgent — within 1 week",
      borderClass: "border-amber-500/40 border-l-amber-500",
      bgClass: "bg-amber-500/5",
      headerClass: "text-amber-400",
      badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      itemClass: "bg-amber-500/5 border-amber-500/15 text-amber-300/80",
    },
    routine: {
      label: "📋 Routine",
      borderClass: "border-primary/25 border-l-primary/50",
      bgClass: "bg-primary/4",
      headerClass: "text-primary/80",
      badgeClass: "bg-primary/12 text-primary/70 border-primary/20",
      itemClass: "bg-primary/5 border-primary/12 text-foreground/70",
    },
  };

  const c = config[tier];

  return (
    <div
      className={`rounded-xl border border-l-4 ${c.borderClass} ${c.bgClass} overflow-hidden`}
    >
      <div className="px-4 py-2.5 flex items-center gap-2">
        <span
          className={`text-xs font-bold uppercase tracking-wider ${c.headerClass}`}
        >
          {c.label}
        </span>
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${c.badgeClass}`}
        >
          {items.length}
        </span>
      </div>
      <div className="px-4 pb-3 space-y-1.5">
        {items.map((inv, i) => (
          <div
            key={`${inv.name}-${i}`}
            className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border ${c.itemClass}`}
          >
            <span className="text-[10px] font-bold w-5 h-5 rounded-md bg-current/10 flex items-center justify-center flex-shrink-0 mt-0.5 opacity-60">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold leading-tight">{inv.name}</p>
              {inv.indication && (
                <p className="text-[10px] opacity-60 mt-0.5 leading-tight">
                  {inv.indication}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Per-differential card with all inline fields */
function DifferentialCard({
  diff,
  index,
}: {
  diff: Differential;
  index: number;
}) {
  // Normalize investigations to always be TieredInvestigation objects
  const normalizedInvs: TieredInvestigation[] = (diff.investigations ?? []).map(
    normInv,
  );

  const emergencyInvs = normalizedInvs.filter((i) => i.tier === "emergency");
  const urgentInvs = normalizedInvs.filter((i) => i.tier === "urgent");
  const routineInvs = normalizedInvs.filter((i) => i.tier === "routine");

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      className="px-6 py-5 hover:bg-muted/15 transition-colors border-b border-border/20 last:border-0"
    >
      {/* Header row */}
      <div className="flex items-start gap-3 mb-3">
        <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="font-semibold text-sm leading-tight">
              {diff.condition}
            </span>
            {diff.icd10 && <ICD10Chip code={diff.icd10} />}
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                diff.classification === "organic"
                  ? "bg-destructive/8 text-destructive/80 border-destructive/20"
                  : "bg-success/8 text-success/80 border-success/20"
              }`}
            >
              {diff.classification === "organic" ? "Organic" : "Functional"}
            </span>
          </div>

          {/* Rome IV badge — only when romeIV field is defined */}
          {diff.romeIV && (
            <div className="mt-1.5">
              <RomeIVBadge label={diff.romeIV} />
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            {diff.rationale}
          </p>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="pl-9 mb-3">
        <ConfidenceBar confidence={diff.confidence} />
      </div>

      {/* Fits / Against */}
      {((diff.fits && diff.fits.length > 0) ||
        (diff.against && diff.against.length > 0)) && (
        <div className="pl-9 grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {diff.fits && diff.fits.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-success/70 mb-1.5">
                ✔ Fits
              </p>
              <ul className="space-y-1">
                {diff.fits.map((f) => (
                  <li
                    key={f}
                    className="text-[11px] text-foreground/70 flex items-start gap-1.5"
                  >
                    <span className="text-success/60 mt-0.5 flex-shrink-0">
                      ●
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {diff.against && diff.against.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1.5">
                ✗ Against
              </p>
              <ul className="space-y-1">
                {diff.against.map((a) => (
                  <li
                    key={a}
                    className="text-[11px] text-muted-foreground/60 flex items-start gap-1.5"
                  >
                    <span className="text-muted-foreground/40 mt-0.5 flex-shrink-0">
                      ●
                    </span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Confirmatory test — shown when field is present */}
      {diff.confirmatoryTest && (
        <div className="pl-9 mb-3">
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-indigo-500/6 border border-indigo-500/18">
            <span className="text-sm flex-shrink-0">🔬</span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400/80">
                Confirmatory Test
              </span>
              <p className="text-xs text-indigo-300/80 mt-0.5">
                {diff.confirmatoryTest}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Treatment */}
      {diff.treatment && (
        <div className="pl-9 mb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary/60 mb-1">
            Rx — First-line Treatment
          </p>
          <p className="text-xs text-foreground/65 leading-relaxed">
            {diff.treatment}
          </p>
        </div>
      )}

      {/* Per-differential tiered investigations */}
      {normalizedInvs.length > 0 && (
        <div className="pl-9 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-2">
            Investigations
          </p>
          {emergencyInvs.length > 0 && (
            <TierSection tier="emergency" items={emergencyInvs} />
          )}
          {urgentInvs.length > 0 && (
            <TierSection tier="urgent" items={urgentInvs} />
          )}
          {routineInvs.length > 0 && (
            <TierSection tier="routine" items={routineInvs} />
          )}
        </div>
      )}
    </motion.div>
  );
}

/** Global deduped investigations panel — grouped by tier */
function GlobalInvestigationsPanel({
  differentials,
}: {
  differentials: Differential[];
}) {
  const byTier = useMemo(() => {
    const seen = new Set<string>();
    const emergency: TieredInvestigation[] = [];
    const urgent: TieredInvestigation[] = [];
    const routine: TieredInvestigation[] = [];

    for (const diff of differentials) {
      for (const rawInv of diff.investigations ?? []) {
        const inv = normInv(rawInv);
        // Deduplicate by tier+name
        const key = `${inv.tier}::${inv.name}`;
        if (!seen.has(key)) {
          seen.add(key);
          if (inv.tier === "emergency") emergency.push(inv);
          else if (inv.tier === "urgent") urgent.push(inv);
          else routine.push(inv);
        }
      }
    }

    return { emergency, urgent, routine };
  }, [differentials]);

  const hasEmergency = byTier.emergency.length > 0;

  return (
    <Card
      className={`border-border/40 rounded-2xl overflow-hidden transition-all duration-300 ${
        hasEmergency
          ? "border-red-500/35 hover:border-red-500/50 hover:shadow-[0_0_20px_oklch(0.5_0.2_25/0.15)]"
          : "hover:border-primary/30 hover:shadow-glow-teal"
      }`}
    >
      <div
        className={`h-[1.5px] ${hasEmergency ? "bg-gradient-to-r from-transparent via-red-500/60 to-transparent" : "bg-gradient-to-r from-transparent via-primary/50 to-transparent"}`}
      />
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2.5 font-display text-base">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              hasEmergency
                ? "bg-red-500/10 border border-red-500/25"
                : "bg-primary/10 border border-primary/20"
            }`}
          >
            <FlaskConical
              className={`w-4 h-4 ${hasEmergency ? "text-red-400" : "text-primary"}`}
            />
          </div>
          Suggested Investigations — Prioritised by Urgency
          {hasEmergency && (
            <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">
              <Zap className="w-3 h-3" />
              Emergency
            </span>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Deduplicated across all differentials. Emergency investigations must
          be ordered immediately.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {byTier.emergency.length === 0 &&
        byTier.urgent.length === 0 &&
        byTier.routine.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No investigations suggested based on current answers.
          </p>
        ) : (
          <>
            <TierSection tier="emergency" items={byTier.emergency} />
            <TierSection tier="urgent" items={byTier.urgent} />
            <TierSection tier="routine" items={byTier.routine} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Safety netting warning box — rendered at the end of the report */
function SafetyNettingPanel({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="rounded-2xl border-2 border-amber-500/45 bg-amber-500/6 overflow-hidden border-l-4 border-l-amber-500/70">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-display font-bold text-amber-300 text-base leading-tight">
              ⚠️ Safety Netting — Return Immediately If:
            </h3>
            <p className="text-xs text-amber-400/60 mt-0.5">
              Advise patient to seek urgent medical attention if any of the
              following occur
            </p>
          </div>
        </div>
        <ul className="space-y-2">
          {items.map((item, i) => (
            <motion.li
              key={`safety-${i}-${item.slice(0, 20)}`}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.35 }}
              className={`flex items-start gap-3 px-4 py-2.5 rounded-xl ${
                item.startsWith("⚠️ URGENT")
                  ? "bg-red-500/12 border border-red-500/25"
                  : "bg-amber-500/7 border border-amber-500/18"
              }`}
            >
              <span
                className={`text-sm flex-shrink-0 mt-0.5 ${
                  item.startsWith("⚠️ URGENT")
                    ? "text-red-400"
                    : "text-amber-400"
                }`}
              >
                {item.startsWith("⚠️ URGENT") ? "🚨" : "→"}
              </span>
              <p
                className={`text-xs leading-relaxed ${
                  item.startsWith("⚠️ URGENT")
                    ? "text-red-300 font-semibold"
                    : "text-amber-200/80"
                }`}
              >
                {item}
              </p>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClinicalReportPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { sessionId?: string };
  const sessionId = search.sessionId ? BigInt(search.sessionId) : undefined;
  const mainRef = useRef<HTMLDivElement>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const { data: session, isLoading, isError } = useGetPatientSession(sessionId);

  const report: ClinicalReportType | null = useMemo(() => {
    if (!session) return null;
    return analyzeSession(session.answers);
  }, [session]);

  // Compute whether any emergency-tier investigation exists (for header badge)
  const hasEmergencyGlobal = useMemo(() => {
    if (!report) return false;
    return report.differentials.some((d) =>
      (d.investigations ?? []).some((inv) => normInv(inv).tier === "emergency"),
    );
  }, [report]);

  const handleBack = () => navigate({ to: "/dashboard" });
  const handlePrint = () => window.print();

  const handleExportPDF = () => {
    setIsExportingPDF(true);
    const style = document.createElement("style");
    style.id = "gi-pdf-print-style";
    style.textContent = `
      @media print {
        body { background: #060812 !important; color: #eaecf5 !important;
               -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        header, footer, .no-print { display: none !important; }
        .print-section { break-inside: avoid; }
        @page { size: A4; margin: 12mm; }
      }
    `;
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      const el = document.getElementById("gi-pdf-print-style");
      if (el) document.head.removeChild(el);
      setIsExportingPDF(false);
    }, 150);
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">No session ID provided.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <style>{`
        @media print {
          header, footer, .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-section { break-inside: avoid; }
        }
      `}</style>

      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <header className="relative border-b border-border/40 bg-card/60 backdrop-blur-md sticky top-0 z-20 no-print">
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              data-ocid="report.back_button"
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="gap-2 text-muted-foreground hover:text-foreground rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Stethoscope className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="font-display font-bold text-base text-gradient-teal">
                Clinical Report
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasEmergencyGlobal && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/12 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                <Zap className="w-3 h-3" />
                Emergency Investigations Required
              </span>
            )}
            <Badge
              className="text-xs uppercase tracking-wider px-3 py-1 font-bold"
              style={{
                background: "oklch(0.78 0.14 65 / 0.90)",
                color: "oklch(0.10 0.015 240)",
                borderColor: "oklch(0.78 0.14 65 / 0.40)",
                border: "1px solid",
              }}
            >
              &#128274; Doctor Confidential
            </Badge>
            <Button
              data-ocid="report.export_pdf_button"
              size="sm"
              onClick={handleExportPDF}
              disabled={isExportingPDF || isLoading || !report}
              className="gap-2 btn-gradient rounded-xl h-9 px-4 text-xs font-bold"
            >
              {isExportingPDF ? (
                <>
                  <Loader2
                    data-ocid="report.pdf_loading_state"
                    className="w-3.5 h-3.5 animate-spin"
                  />
                  Preparing...
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5" />
                  Export PDF
                </>
              )}
            </Button>
            <Button
              data-ocid="report.print_button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-2 border-border/50 rounded-xl hover:border-primary/30 h-9"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </Button>
          </div>
        </div>
      </header>

      <main
        ref={mainRef}
        className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-5"
      >
        {isLoading && (
          <div data-ocid="report.loading_state" className="space-y-4">
            {[1, 2, 3, 4].map((n) => (
              <Skeleton key={n} className="h-36 w-full rounded-2xl" />
            ))}
          </div>
        )}

        {isError && !isLoading && (
          <div
            data-ocid="report.error_state"
            className="text-center py-20 text-muted-foreground"
          >
            <XCircle className="w-12 h-12 mx-auto mb-4 text-destructive opacity-50" />
            <p className="font-semibold text-base">Session not found</p>
            <p className="text-sm mt-2">
              This session may have been removed or the ID is invalid.
            </p>
          </div>
        )}

        {!isLoading && !isError && report && session && (
          <>
            {/* ── Patient Demographics ──────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              data-ocid="report.demographics_panel"
            >
              <DemographicsBanner session={session} />
            </motion.div>

            {/* ── Red Flags ─────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              data-ocid="report.red_flags_panel"
              className="print-section"
            >
              {report.redFlags.length > 0 ? (
                <div className="rounded-2xl border border-destructive/35 bg-destructive/7 overflow-hidden border-l-4 border-l-destructive/70">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-xl bg-destructive/15 border border-destructive/30 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-destructive text-lg">
                          Alarm Features Detected
                        </h3>
                        <p className="text-xs text-destructive/65 mt-0.5">
                          {report.redFlags.length} alarm feature
                          {report.redFlags.length !== 1 ? "s" : ""} require
                          immediate clinical attention
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {report.redFlags.map((flag, idx) => (
                        <motion.div
                          key={flag.label}
                          initial={{ opacity: 0, x: -16 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: idx * 0.08, duration: 0.4 }}
                          className={`flex items-start gap-3 p-4 rounded-xl border ${
                            flag.severity === "critical"
                              ? "bg-destructive/10 border-destructive/30"
                              : "bg-warning/8 border-warning/25"
                          }`}
                        >
                          <AlertTriangle
                            className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                              flag.severity === "critical"
                                ? "text-destructive"
                                : "text-warning"
                            }`}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p
                                className={`text-sm font-semibold ${
                                  flag.severity === "critical"
                                    ? "text-destructive"
                                    : "text-warning"
                                }`}
                              >
                                {flag.label}
                              </p>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase tracking-wide ${
                                  flag.severity === "critical"
                                    ? "bg-destructive/15 text-destructive"
                                    : "bg-warning/15 text-warning"
                                }`}
                              >
                                {flag.severity}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {flag.rationale}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-success/30 bg-success/6 p-5 flex items-center gap-4 border-l-4 border-l-success/50">
                  <div className="w-10 h-10 rounded-xl bg-success/10 border border-success/25 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="font-semibold text-success">
                      No Alarm Features Detected
                    </p>
                    <p className="text-xs text-success/65 mt-0.5">
                      No red flag symptoms identified in this session
                    </p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* ── Classification ────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.07 }}
              data-ocid="report.classification_card"
              className="print-section"
            >
              <Card className="border-border/40 rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-glow-teal transition-all duration-300">
                <div className="h-[1.5px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2.5 font-display text-base">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <ClipboardList className="w-4 h-4 text-primary" />
                    </div>
                    Organic vs Functional Classification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ClassificationBadge classification={report.classification} />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {report.classificationRationale}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* ── Ranked Differentials ──────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              data-ocid="report.differentials_table"
              className="print-section"
            >
              <Card className="border-border/40 rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-glow-teal transition-all duration-300">
                <div className="h-[1.5px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2.5 font-display text-base">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Stethoscope className="w-4 h-4 text-primary" />
                    </div>
                    Ranked Differential Diagnoses
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    All plausible conditions based on symptom profile — ICD-10
                    codes, Rome IV criteria, and per-condition investigations
                    shown inline.
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  {report.differentials.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground px-6">
                      <p className="text-sm">
                        Insufficient data to generate differentials.
                      </p>
                    </div>
                  ) : (
                    <div>
                      {report.differentials.map((diff, idx) => (
                        <DifferentialCard
                          key={diff.condition}
                          diff={diff}
                          index={idx}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* ── Global Tiered Investigations ─────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.12 }}
              data-ocid="report.investigations_panel"
              className="print-section"
            >
              <GlobalInvestigationsPanel differentials={report.differentials} />
            </motion.div>

            {/* ── Patient Answers ───────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.14 }}
              data-ocid="report.answers_panel"
              className="print-section"
            >
              <Card className="border-border/40 rounded-2xl overflow-hidden hover:border-border/50 transition-all duration-300">
                <div className="h-[1.5px] bg-gradient-to-r from-transparent via-border/50 to-transparent" />
                <CardHeader className="pb-4">
                  <CardTitle className="font-display text-base">
                    Patient Answers Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {session.answers.map(([qid, answer]) => {
                      const question = QUESTION_MAP.get(qid);
                      return (
                        <div
                          key={String(qid)}
                          className="flex items-start justify-between gap-4 py-2.5 border-b border-border/20 last:border-0"
                        >
                          <span className="text-sm text-muted-foreground flex-1 leading-relaxed">
                            {question?.en ?? `Question ${String(qid)}`}
                          </span>
                          <span className="text-sm font-semibold capitalize flex-shrink-0 text-foreground/80">
                            {answer}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* ── Safety Netting ────────────────────────────────────── */}
            {report.safetyNetting && report.safetyNetting.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.16 }}
                data-ocid="report.safety_netting_panel"
                className="print-section"
              >
                <SafetyNettingPanel items={report.safetyNetting} />
              </motion.div>
            )}
          </>
        )}
      </main>

      <footer className="text-center text-xs text-muted-foreground/40 py-8 no-print">
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
