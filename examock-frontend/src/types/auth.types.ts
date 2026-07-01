export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: "STUDENT" | "ADMIN";
  examTypeId: string | null;
}

export interface Onboarding {
  needsExamSelection: boolean;
  needsMobileVerification: boolean;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
  onboarding: Onboarding;
}

// export interface ExamType {
//   id: string;
//   name: string;
//   slug: string;
//   description: string | null;
// }