import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Doctor {
    clinic: string;
    principal: Principal;
    name: string;
    email: string;
}
export interface PatientSession {
    id: bigint;
    completedAt?: Time;
    doctorId: Principal;
    answers: Array<[bigint, string]>;
    language: string;
}
export type Time = bigint;
export interface backendInterface {
    answerQuestion(sessionId: bigint, questionId: bigint, answer: string): Promise<void>;
    completeSession(sessionId: bigint): Promise<void>;
    createPatientSession(doctorId: Principal, language: string): Promise<bigint>;
    getAllDoctors(): Promise<Array<Doctor>>;
    getDoctor(doctorId: Principal): Promise<Doctor>;
    getPatientSession(sessionId: bigint): Promise<PatientSession>;
    getSessionsByDoctor(doctorId: Principal): Promise<Array<PatientSession>>;
    registerDoctor(name: string, clinic: string, email: string): Promise<void>;
}
