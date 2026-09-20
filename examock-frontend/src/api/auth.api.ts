import api from "./axios";
import type {
  LoginResponse,
  SelectExamTypeResponse,
} from "../types/auth.types";

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

// Used in onboarding step 1 — show available exam types to pick from
export const getExamTypes = async () => {
  const { data } = await api.get("/auth/exam-types");

  return data.examTypes;
};