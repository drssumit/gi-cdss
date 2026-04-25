/**
 * useActor wrapper for GI-CDSS
 *
 * The generated `backend.d.ts` has an empty `backendInterface` because the
 * canister IDL is currently being regenerated. We bridge the gap by using the
 * core-infrastructure `useActor` with our `createActor` factory and then
 * casting the result to the rich interface defined in `types/`.
 *
 * When `bindgen` is re-run and types are populated in `backend.d.ts`, this
 * file can be simplified to a direct re-export.
 */
import {
  useActor as _useActor,
  createActorWithConfig,
} from "@caffeineai/core-infrastructure";
import { createActor } from "../backend";
import type { Doctor, PatientSession } from "../types";

/** Full backend interface expected by GI-CDSS at runtime */
export interface GIBackend {
  answerQuestion(
    sessionId: bigint,
    questionId: bigint,
    answer: string,
  ): Promise<undefined>;
  completeSession(sessionId: bigint): Promise<undefined>;
  createPatientSession(doctorId: unknown, language: string): Promise<bigint>;
  getAllDoctors(): Promise<Doctor[]>;
  getDoctor(principal: unknown): Promise<Doctor>;
  getPatientSession(sessionId: bigint): Promise<PatientSession>;
  getSessionsByDoctor(doctorId: unknown): Promise<PatientSession[]>;
  registerDoctor(
    name: string,
    clinic: string,
    email: string,
  ): Promise<undefined>;
}

export function useActor(): { actor: GIBackend | null; isFetching: boolean } {
  const result = _useActor(createActor as Parameters<typeof _useActor>[0]);
  return {
    actor: result.actor as unknown as GIBackend | null,
    isFetching: result.isFetching,
  };
}

export { createActorWithConfig };
