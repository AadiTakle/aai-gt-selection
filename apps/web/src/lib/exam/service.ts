import type { AgeBand, ExamStep, ItemResponse, Participant, TelemetryEvent } from '@gt-selection/contracts';

/** Exam delivery service surface (AX-05). Implemented by the local synthetic adapter. */

export interface CreateParticipantInput {
  pseudonymCode: string;
  ageBand: AgeBand;
}

export interface StartSessionInput {
  participantId: string;
  policyVersion: string;
}

export interface SubmitResponseInput {
  sessionId: string;
  response: ItemResponse;
  telemetry: TelemetryEvent[];
}

export interface ExamService {
  createParticipant(input: CreateParticipantInput): Promise<Participant>;
  startSession(input: StartSessionInput): Promise<ExamStep>;
  submitResponse(input: SubmitResponseInput): Promise<ExamStep>;
  getSession(sessionId: string): Promise<ExamStep>;
}
