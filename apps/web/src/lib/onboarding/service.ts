import type {
  GetApplicationRequest,
  GetApplicationResponse,
  GetApplicationStatusRequest,
  GetApplicationStatusResponse,
  GetStudentProfileRequest,
  GetStudentProfileResponse,
  ListActiveSchoolsRequest,
  ListActiveSchoolsResponse,
  ListStudentProfilesRequest,
  ListStudentProfilesResponse,
  SaveApplicationDraftRequest,
  SaveApplicationDraftResponse,
  SaveStudentProfileRequest,
  SaveStudentProfileResponse,
  SubmitApplicationRequest,
  SubmitApplicationResponse,
} from '@gt-selection/contracts';

import type { SaveExamSessionAdapterInput, SaveExamSessionResponse } from '@/lib/exam/types';

export interface OnboardingService {
  saveStudentProfile(request: SaveStudentProfileRequest): Promise<SaveStudentProfileResponse>;
  getStudentProfile(request: GetStudentProfileRequest): Promise<GetStudentProfileResponse>;
  listStudentProfiles(request: ListStudentProfilesRequest): Promise<ListStudentProfilesResponse>;
  listActiveSchools(request: ListActiveSchoolsRequest): Promise<ListActiveSchoolsResponse>;
  saveApplicationDraft(request: SaveApplicationDraftRequest): Promise<SaveApplicationDraftResponse>;
  getApplication(request: GetApplicationRequest): Promise<GetApplicationResponse>;
  submitApplication(request: SubmitApplicationRequest): Promise<SubmitApplicationResponse>;
  getApplicationStatus(request: GetApplicationStatusRequest): Promise<GetApplicationStatusResponse>;
  saveExamSession(request: SaveExamSessionAdapterInput): Promise<SaveExamSessionResponse>;
}
