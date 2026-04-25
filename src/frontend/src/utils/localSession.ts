export interface LocalSession {
  sessionKey: string;
  doctorId: string;
  language: string;
  demographics: {
    name: string;
    age: string;
    gender: string;
    address: string;
    occupation: string;
  };
  answers: Record<string, string>; // questionId (string) → answer
  phase: "demographics" | "questions" | "complete";
  completed: boolean;
  syncedSessionId?: string; // bigint as string once synced to canister
  createdAt: number;
}

function storageKey(doctorId: string): string {
  return `gi_cdss_session_${doctorId}`;
}

export function saveLocalSession(session: LocalSession): void {
  try {
    localStorage.setItem(storageKey(session.doctorId), JSON.stringify(session));
  } catch {
    // Silently ignore storage errors (private browsing, quota exceeded)
  }
}

export function loadLocalSession(doctorId: string): LocalSession | null {
  try {
    const raw = localStorage.getItem(storageKey(doctorId));
    if (!raw) return null;
    return JSON.parse(raw) as LocalSession;
  } catch {
    return null;
  }
}

export function clearLocalSession(doctorId: string): void {
  try {
    localStorage.removeItem(storageKey(doctorId));
  } catch {
    // Silently ignore
  }
}

export function createLocalSession(
  doctorId: string,
  language: string,
  demographics: LocalSession["demographics"],
): LocalSession {
  return {
    sessionKey: crypto.randomUUID(),
    doctorId,
    language,
    demographics,
    answers: {},
    phase: "questions",
    completed: false,
    createdAt: Date.now(),
  };
}
