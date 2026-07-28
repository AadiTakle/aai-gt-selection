import type { Json } from './database.generated';

/**
 * HAND-AUTHORED, HELD FOR REVIEW — format-agnostic exam data model (AX-03/AX-04,
 * D-016; R9/D-006).
 *
 * The `db:types` generator (`supabase gen types typescript --schema api`) only
 * emits the exposed `api` schema. These exam tables live in the PRIVATE `app`
 * schema and are therefore never produced by the generator. This module
 * provides matching TypeScript row/insert/update shapes for the tables defined
 * in the held migration `supabase/migrations/20260727120000_exam_data_model.sql`
 * so server-side adapters can be typed before the migration is applied.
 *
 * Every table is born-synthetic (`synthetic_only = true`). Once the migration
 * has been reviewed and applied to a database, regenerate/replace these shapes
 * from the live schema. This file is NOT part of `database.generated.ts` and
 * must not be overwritten by the generator.
 */

export interface ExamAppSchema {
  Tables: {
    exam_policy: {
      Row: {
        policy_version: string;
        delivery_structure: string;
        config: Json;
        synthetic_only: boolean;
        validated: boolean;
        created_at: string;
      };
      Insert: {
        policy_version: string;
        delivery_structure: string;
        config: Json;
        synthetic_only?: boolean;
        validated?: boolean;
        created_at?: string;
      };
      Update: {
        policy_version?: string;
        delivery_structure?: string;
        config?: Json;
        synthetic_only?: boolean;
        validated?: boolean;
        created_at?: string;
      };
      Relationships: [];
    };
    exam_question_type: {
      Row: {
        type_code: string;
        domain: string;
        name: string;
        demo_path: string;
        scoring_model: string;
        synthetic_only: boolean;
      };
      Insert: {
        type_code: string;
        domain: string;
        name: string;
        demo_path: string;
        scoring_model?: string;
        synthetic_only?: boolean;
      };
      Update: {
        type_code?: string;
        domain?: string;
        name?: string;
        demo_path?: string;
        scoring_model?: string;
        synthetic_only?: boolean;
      };
      Relationships: [];
    };
    exam_item: {
      Row: {
        item_id: string;
        type_code: string;
        domain: string;
        difficulty_level: number | null;
        scoring_model: string;
        irt_a: number | null;
        irt_b: number | null;
        irt_c: number | null;
        irt_model: string | null;
        age_bands: string[];
        params: Json;
        synthetic_only: boolean;
      };
      Insert: {
        item_id: string;
        type_code: string;
        domain: string;
        difficulty_level?: number | null;
        scoring_model?: string;
        irt_a?: number | null;
        irt_b?: number | null;
        irt_c?: number | null;
        irt_model?: string | null;
        age_bands: string[];
        params?: Json;
        synthetic_only?: boolean;
      };
      Update: {
        item_id?: string;
        type_code?: string;
        domain?: string;
        difficulty_level?: number | null;
        scoring_model?: string;
        irt_a?: number | null;
        irt_b?: number | null;
        irt_c?: number | null;
        irt_model?: string | null;
        age_bands?: string[];
        params?: Json;
        synthetic_only?: boolean;
      };
      Relationships: [
        {
          foreignKeyName: 'exam_item_type_code_fkey';
          columns: ['type_code'];
          referencedRelation: 'exam_question_type';
          referencedColumns: ['type_code'];
        },
      ];
    };
    exam_participant: {
      Row: {
        participant_id: string;
        owner_user_id: string;
        pseudonym_code: string;
        age_band: string;
        synthetic_only: boolean;
        created_at: string;
      };
      Insert: {
        participant_id: string;
        owner_user_id: string;
        pseudonym_code: string;
        age_band: string;
        synthetic_only?: boolean;
        created_at?: string;
      };
      Update: {
        participant_id?: string;
        owner_user_id?: string;
        pseudonym_code?: string;
        age_band?: string;
        synthetic_only?: boolean;
        created_at?: string;
      };
      Relationships: [];
    };
    exam_session: {
      Row: {
        session_id: string;
        owner_user_id: string;
        participant_id: string;
        policy_version: string;
        delivery_structure: string;
        age_band: string;
        status: string;
        structure_state: Json | null;
        synthetic_only: boolean;
        started_at: string;
        completed_at: string | null;
      };
      Insert: {
        session_id: string;
        owner_user_id: string;
        participant_id: string;
        policy_version: string;
        delivery_structure: string;
        age_band: string;
        status?: string;
        structure_state?: Json | null;
        synthetic_only?: boolean;
        started_at?: string;
        completed_at?: string | null;
      };
      Update: {
        session_id?: string;
        owner_user_id?: string;
        participant_id?: string;
        policy_version?: string;
        delivery_structure?: string;
        age_band?: string;
        status?: string;
        structure_state?: Json | null;
        synthetic_only?: boolean;
        started_at?: string;
        completed_at?: string | null;
      };
      Relationships: [
        {
          foreignKeyName: 'exam_session_participant_id_fkey';
          columns: ['participant_id'];
          referencedRelation: 'exam_participant';
          referencedColumns: ['participant_id'];
        },
        {
          foreignKeyName: 'exam_session_policy_version_fkey';
          columns: ['policy_version'];
          referencedRelation: 'exam_policy';
          referencedColumns: ['policy_version'];
        },
      ];
    };
    exam_session_progress: {
      Row: {
        session_id: string;
        owner_user_id: string;
        domain: string;
        items_administered: number;
        done: boolean;
        state: Json;
        synthetic_only: boolean;
      };
      Insert: {
        session_id: string;
        owner_user_id: string;
        domain: string;
        items_administered?: number;
        done?: boolean;
        state?: Json;
        synthetic_only?: boolean;
      };
      Update: {
        session_id?: string;
        owner_user_id?: string;
        domain?: string;
        items_administered?: number;
        done?: boolean;
        state?: Json;
        synthetic_only?: boolean;
      };
      Relationships: [
        {
          foreignKeyName: 'exam_session_progress_session_id_fkey';
          columns: ['session_id'];
          referencedRelation: 'exam_session';
          referencedColumns: ['session_id'];
        },
      ];
    };
    exam_item_response: {
      Row: {
        response_id: string;
        session_id: string;
        owner_user_id: string;
        item_id: string;
        domain: string;
        order_no: number;
        correct: boolean;
        score: number;
        rt_ms: number;
        first_action_ms: number | null;
        revisions: number;
        engaged: boolean;
        measurements: Json;
        synthetic_only: boolean;
        created_at: string;
      };
      Insert: {
        response_id: string;
        session_id: string;
        owner_user_id: string;
        item_id: string;
        domain: string;
        order_no: number;
        correct: boolean;
        score: number;
        rt_ms: number;
        first_action_ms?: number | null;
        revisions?: number;
        engaged?: boolean;
        measurements?: Json;
        synthetic_only?: boolean;
        created_at?: string;
      };
      Update: {
        response_id?: string;
        session_id?: string;
        owner_user_id?: string;
        item_id?: string;
        domain?: string;
        order_no?: number;
        correct?: boolean;
        score?: number;
        rt_ms?: number;
        first_action_ms?: number | null;
        revisions?: number;
        engaged?: boolean;
        measurements?: Json;
        synthetic_only?: boolean;
        created_at?: string;
      };
      Relationships: [
        {
          foreignKeyName: 'exam_item_response_session_id_fkey';
          columns: ['session_id'];
          referencedRelation: 'exam_session';
          referencedColumns: ['session_id'];
        },
        {
          foreignKeyName: 'exam_item_response_item_id_fkey';
          columns: ['item_id'];
          referencedRelation: 'exam_item';
          referencedColumns: ['item_id'];
        },
      ];
    };
    exam_telemetry_event: {
      Row: {
        event_id: string;
        session_id: string;
        owner_user_id: string;
        item_id: string | null;
        kind: string;
        t_offset_ms: number;
        payload: Json;
        synthetic_only: boolean;
        created_at: string;
      };
      Insert: {
        event_id: string;
        session_id: string;
        owner_user_id: string;
        item_id?: string | null;
        kind: string;
        t_offset_ms: number;
        payload?: Json;
        synthetic_only?: boolean;
        created_at?: string;
      };
      Update: {
        event_id?: string;
        session_id?: string;
        owner_user_id?: string;
        item_id?: string | null;
        kind?: string;
        t_offset_ms?: number;
        payload?: Json;
        synthetic_only?: boolean;
        created_at?: string;
      };
      Relationships: [
        {
          foreignKeyName: 'exam_telemetry_event_session_id_fkey';
          columns: ['session_id'];
          referencedRelation: 'exam_session';
          referencedColumns: ['session_id'];
        },
      ];
    };
    exam_session_outcome: {
      Row: {
        session_id: string;
        owner_user_id: string;
        composite: number;
        composite_scale: string;
        decision: string;
        engagement_valid: boolean;
        domain_scores: Json;
        metrics: Json;
        policy_version: string;
        claim_boundary: string;
        synthetic_only: boolean;
        validated: boolean;
        created_at: string;
      };
      Insert: {
        session_id: string;
        owner_user_id: string;
        composite: number;
        composite_scale: string;
        decision: string;
        engagement_valid: boolean;
        domain_scores: Json;
        metrics?: Json;
        policy_version: string;
        claim_boundary: string;
        synthetic_only?: boolean;
        validated?: boolean;
        created_at?: string;
      };
      Update: {
        session_id?: string;
        owner_user_id?: string;
        composite?: number;
        composite_scale?: string;
        decision?: string;
        engagement_valid?: boolean;
        domain_scores?: Json;
        metrics?: Json;
        policy_version?: string;
        claim_boundary?: string;
        synthetic_only?: boolean;
        validated?: boolean;
        created_at?: string;
      };
      Relationships: [
        {
          foreignKeyName: 'exam_session_outcome_session_id_fkey';
          columns: ['session_id'];
          referencedRelation: 'exam_session';
          referencedColumns: ['session_id'];
        },
      ];
    };
  };
}

export type ExamPolicyRow = ExamAppSchema['Tables']['exam_policy']['Row'];
export type ExamQuestionTypeRow = ExamAppSchema['Tables']['exam_question_type']['Row'];
export type ExamItemRow = ExamAppSchema['Tables']['exam_item']['Row'];
export type ExamParticipantRow = ExamAppSchema['Tables']['exam_participant']['Row'];
export type ExamSessionRow = ExamAppSchema['Tables']['exam_session']['Row'];
export type ExamSessionProgressRow = ExamAppSchema['Tables']['exam_session_progress']['Row'];
export type ExamItemResponseRow = ExamAppSchema['Tables']['exam_item_response']['Row'];
export type ExamTelemetryEventRow = ExamAppSchema['Tables']['exam_telemetry_event']['Row'];
export type ExamSessionOutcomeRow = ExamAppSchema['Tables']['exam_session_outcome']['Row'];
