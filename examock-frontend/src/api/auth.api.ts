import api from "./axios";
import type {
  LoginResponse,
  SelectExamTypeResponse,
} from "../types/auth.types";
import type { ExamType } from "../types/exam.types";

export const googleLogin = async (idToken: string): Promise<LoginResponse> => {
  const { data } = await api.post("/auth/google", { idToken });
  return data;
};

export const selectExamType = async (
  examTypeId: string,
): Promise<SelectExamTypeResponse> => {
  const { data } = await api.post("/auth/exam-type", { examTypeId });
  return data;
};

export const sendOtp = async () => {
  const { data } = await api.post("/auth/otp/send", {});
  return data;
};

export const verifyOtp = async (otp: string) => {
  const { data } = await api.post("/auth/otp/verify", { otp });
  return data;
};

export const logout = async () => {
  const { data } = await api.post("/auth/logout");
  return data;
};

// Used in onboarding step 1 — show available exam types to pick from.
// The backend response shape is `{ success, examTypes: ExamType[] }`; we hand
// back the inner array.
export const getExamTypes = async (): Promise<ExamType[]> => {
  const { data } = await api.get<{ success: boolean; examTypes: ExamType[] }>(
    "/auth/exam-types",
  );

  return data.examTypes;
};