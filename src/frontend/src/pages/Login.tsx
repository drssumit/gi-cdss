import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Lock, Shield, Stethoscope, UserPlus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetDoctor, useRegisterDoctor } from "../hooks/useQueries";

const TITLE_LETTERS = "GI-CDSS".split("");

/* ── Constellation particle canvas ── */
function ConstellationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const N = 60;
    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
    };
    const particles: Particle[] = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      r: Math.random() * 1.5 + 0.5,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
      }
      // Draw connections — refined sapphire-teal
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            // Use a cool sapphire blue for the constellation lines
            ctx.strokeStyle = `rgba(96,165,220,${((1 - dist / 120) * 0.22).toFixed(3)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      // Draw dots
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(96,165,220,0.45)";
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.35 }}
    />
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const {
    login,
    clear,
    isLoggingIn,
    isLoginSuccess,
    identity,
    isInitializing,
  } = useInternetIdentity();
  const { data: doctor, isLoading: isDoctorLoading } = useGetDoctor();
  const registerMutation = useRegisterDoctor();

  const [showRegister, setShowRegister] = useState(false);
  const [name, setName] = useState("");
  const [clinic, setClinic] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (identity && !isDoctorLoading) {
      if (doctor) {
        navigate({ to: "/dashboard" });
      } else if (isLoginSuccess) {
        setShowRegister(true);
      }
    }
  }, [identity, doctor, isDoctorLoading, isLoginSuccess, navigate]);

  const handleRegister = async () => {
    setError("");
    if (!name.trim() || !clinic.trim() || !email.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    try {
      await registerMutation.mutateAsync({ name, clinic, email });
      navigate({ to: "/dashboard" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed.");
    }
  };

  const handleLogout = () => {
    clear();
    setShowRegister(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      <ConstellationCanvas />

      {/* Subtle radial glows — more restrained */}
      <div
        className="absolute top-[-15%] left-[-8%] w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, oklch(0.68 0.15 210 / 0.06) 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute bottom-[-10%] right-[-8%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, oklch(0.60 0.16 225 / 0.04) 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute top-[45%] right-[18%] w-[280px] h-[280px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, oklch(0.78 0.14 65 / 0.03) 0%, transparent 65%)",
        }}
      />

      {/* Fine grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, oklch(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 36 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md z-10"
      >
        {/* Logo area */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.1,
            }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/8 border border-primary/25 mb-5 animate-glow-pulse"
          >
            <Stethoscope className="w-10 h-10 text-primary" />
          </motion.div>

          {/* Letter-by-letter stagger — slower and more authoritative */}
          <div
            className="flex items-center justify-center gap-[1px] mb-2"
            aria-label="GI-CDSS"
          >
            {TITLE_LETTERS.map((letter, i) => (
              <motion.span
                // biome-ignore lint/suspicious/noArrayIndexKey: stable letter array
                key={`${letter}-${i}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.2 + i * 0.06,
                  duration: 0.5,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="font-display text-5xl font-bold text-gradient-teal tracking-tight"
              >
                {letter === "-" ? (
                  <span className="text-primary/50 mx-0.5">&mdash;</span>
                ) : (
                  letter
                )}
              </motion.span>
            ))}
          </div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="text-xs font-medium tracking-[0.15em] uppercase text-muted-foreground/55 mt-1"
          >
            Clinical Decision Support System
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="text-muted-foreground/35 text-xs mt-1.5"
          >
            Based on Sleisenger &amp; Fordtran&apos;s 10th Edition
          </motion.p>
        </div>

        {/* Card — refined border and inner shadow */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="rounded-2xl border border-border/60 bg-card/85 backdrop-blur-xl shadow-elevated overflow-hidden"
          style={{
            boxShadow:
              "0 8px 40px -8px oklch(0 0 0 / 0.7), 0 0 0 1px oklch(0.18 0.018 250 / 0.6), inset 0 1px 0 oklch(0.92 0.010 240 / 0.04)",
          }}
        >
          {/* Scanline shimmer on top */}
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent relative overflow-hidden">
            <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-scanline" />
          </div>

          <div className="p-8">
            <AnimatePresence mode="wait">
              {!showRegister ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6">
                    <h2 className="font-display text-xl font-bold">
                      Doctor Login
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                      Secure access for registered gastroenterologists
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground bg-primary/5 border border-primary/12 rounded-xl p-4 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-4 h-4 text-primary" />
                    </div>
                    <span className="leading-relaxed">
                      Passwordless login via Internet Identity &mdash; your
                      credentials stay completely private.
                    </span>
                  </div>

                  <Button
                    data-ocid="login.primary_button"
                    onClick={login}
                    disabled={isLoggingIn || isInitializing}
                    className="w-full h-12 rounded-xl font-semibold text-base gap-2.5 btn-gradient"
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        Login with Internet Identity
                      </>
                    )}
                  </Button>

                  {isDoctorLoading && identity && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying credentials...
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold">
                        Create Profile
                      </h2>
                      <p className="text-muted-foreground text-sm">
                        Set up your doctor account
                      </p>
                    </div>
                  </div>

                  {error && (
                    <Alert
                      variant="destructive"
                      className="mb-5"
                      data-ocid="login.error_state"
                    >
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-4">
                    {[
                      {
                        id: "name",
                        label: "Full Name",
                        ph: "Dr. Rahul Sharma",
                        val: name,
                        set: setName,
                      },
                      {
                        id: "clinic",
                        label: "Clinic / Hospital",
                        ph: "Apollo Gastro Clinic, Mumbai",
                        val: clinic,
                        set: setClinic,
                      },
                      {
                        id: "email",
                        label: "Email Address",
                        ph: "doctor@example.com",
                        val: email,
                        set: setEmail,
                      },
                    ].map((field, i) => (
                      <motion.div
                        key={field.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07, duration: 0.35 }}
                        className="space-y-1.5"
                      >
                        <Label
                          htmlFor={field.id}
                          className="text-sm font-medium"
                        >
                          {field.label}
                        </Label>
                        <Input
                          id={field.id}
                          data-ocid="login.input"
                          type={field.id === "email" ? "email" : "text"}
                          placeholder={field.ph}
                          value={field.val}
                          onChange={(e) => field.set(e.target.value)}
                          className="h-11 bg-input/50 border-border/60 focus:border-primary/60 focus:ring-primary/20 rounded-xl"
                        />
                      </motion.div>
                    ))}
                  </div>

                  <div className="space-y-3 mt-6">
                    <Button
                      data-ocid="login.submit_button"
                      onClick={handleRegister}
                      disabled={registerMutation.isPending}
                      className="w-full h-12 rounded-xl font-semibold text-base gap-2 btn-gradient"
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating profile...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          Create Doctor Profile
                        </>
                      )}
                    </Button>
                    <Button
                      data-ocid="login.cancel_button"
                      variant="ghost"
                      onClick={handleLogout}
                      className="w-full h-10 rounded-xl text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground/35 mt-8">
          &copy; {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary/50 hover:text-primary transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </motion.div>
    </div>
  );
}
