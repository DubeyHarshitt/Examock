import api from "./axios";
import type { LoginResponse, ExamType } from "../types/auth.types";

export const googleLogin = async (idToken: string): Promise<LoginResponse> => {
  const { data } = await api.post("/api/auth/google", { idToken });
  return data;
};

export const selectExamType = async (examTypeId: string) => {
  const { data } = await api.post("/api/auth/exam-type", { examTypeId });
  return data;
};

export const sendOtp = async (mobile: string) => {
  const { data } = await api.post("/api/auth/otp/send", { mobile });
  return data;
};

export const verifyOtp = async (mobile: string, otp: string) => {
  const { data } = await api.post("/api/auth/otp/verify", { mobile, otp });
  return data;
};

export const logout = async () => {
  const { data } = await api.post("/api/auth/logout");
  return data;
};

// Used in onboarding step 1 — show available exam types to pick from
export const getExamTypes = async (): Promise<ExamType[]> => {
  const { data } = await api.get("/api/admin/exam-types");
  return data;
};