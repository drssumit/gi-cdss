import type { Principal } from "@icp-sdk/core/principal";

export type Time = bigint;

export interface Doctor {
  clinic: string;
  principal: Principal;
  name: string;
  email: string;
}

export interface PatientSession {
  id: bigint;
  completedAt: [] | [Time];
  doctorId: Principal;
  answers: Array<[bigint, string]>;
  language: string;
  createdAt?: bigint;
}
