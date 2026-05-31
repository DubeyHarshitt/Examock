import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuthStore } from "../../store/auth.store";
import {
  getExamTypes,
  selectExamType,
  sendOtp,
  verifyOtp,
} from "../../api/auth.api";

type Step = "exam" | "mobile" | "otp";

export default function OnboardingPage() {
  const navigate = useNavigate();
  // const { onboarding, setOnboarding, user } = useAuthStore();
  const { onboarding, setOnboarding } = useAuthStore();

  // Determine starting step from onboarding state
  const getInitialStep = (): Step => {
    if (onboarding?.needsExamSelection) return "exam";
    if (onboarding?.needsMobileVerification) return "mobile";
    return "mobile";
  };

  const [step, setStep] = useState<Step>(getInitialStep);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Fetch available exam types for step 1
  const { data: examTypes, isLoading: loadingExams } = useQuery({
    queryKey: ["examTypes"],
    queryFn: getExamTypes,
    enabled: step === "exam",
  });

  // Step 1 — select exam type
  const examMutation = useMutation({
    mutationFn: () => selectExamType(selectedExamId),
    onSuccess: () => {
      setOnboarding({
        needsExamSelection: false,
        needsMobileVerification: true,
      });
      setStep("mobile");
      setError(null);
    },
    onError: () => setError("Failed to set exam type. Please try again."),
  });

  // Step 2 — send OTP
  const otpSendMutation = useMutation({
    mutationFn: () => sendOtp(mobile),
    onSuccess: () => {
      setStep("otp");
      setError(null);
    },
    onError: () =>
      setError("Failed to send OTP. Check the number and try again."),
  });

  // Step 3 — verify OTP
  const otpVerifyMutation = useMutation({
    mutationFn: () => verifyOtp(mobile, otp),
    onSuccess: () => {
      setOnboarding({
        needsExamSelection: false,
        needsMobileVerification: false,
      });
      navigate("/", { replace: true });
    },
    onError: () => setError("Incorrect OTP. Please try again."),
  });

  const isLoading =
    examMutation.isPending ||
    otpSendMutation.isPending ||
    otpVerifyMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {step === "exam" && "Choose your exam"}
            {step === "mobile" && "Add your mobile number"}
            {step === "otp" && "Verify your number"}
          </h1>
          <p className="text-sm text-gray-500">
            {step === "exam" && "This cannot be changed later"}
            {step === "mobile" && "We'll send a 6-digit OTP to verify"}
            {step === "otp" && `OTP sent to +91 ${mobile}`}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {(["exam", "mobile", "otp"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold
                ${
                  step === s
                    ? "bg-blue-600 text-white"
                    : i < ["exam", "mobile", "otp"].indexOf(step)
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {i < ["exam", "mobile", "otp"].indexOf(step) ? "✓" : i + 1}
              </div>
              {i < 2 && <div className="flex-1 h-px bg-gray-200 w-8" />}
            </div>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* ── Step 1: Exam Type Selection ────────────────── */}
        {step === "exam" && (
          <div className="flex flex-col gap-4">
            {loadingExams ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {examTypes?.map(
                  (exam: {
                    id: string;
                    name: string;
                    description: string | null;
                  }) => (
                    <button
                      key={exam.id}
                      onClick={() => setSelectedExamId(exam.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all
                      ${
                        selectedExamId === exam.id
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <p className="font-semibold text-gray-900">{exam.name}</p>
                      {exam.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {exam.description}
                        </p>
                      )}
                    </button>
                  ),
                )}
              </div>
            )}

            <button
              onClick={() => examMutation.mutate()}
              disabled={!selectedExamId || isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium
                disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
            >
              {isLoading ? "Saving..." : "Continue"}
            </button>
          </div>
        )}

        {/* ── Step 2: Mobile Number Input ────────────────── */}
        {step === "mobile" && (
          <div className="flex flex-col gap-4">
            <div className="flex rounded-xl border border-gray-300 overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <div className="bg-gray-50 px-4 flex items-center border-r border-gray-300">
                <span className="text-gray-600 text-sm font-medium">+91</span>
              </div>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value.replace(/\D/g, "").slice(0, 10));
                  setError(null);
                }}
                placeholder="Enter 10-digit number"
                className="flex-1 px-4 py-3 text-sm outline-none bg-white"
                maxLength={10}
              />
            </div>

            <button
              onClick={() => otpSendMutation.mutate()}
              disabled={mobile.length !== 10 || isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium
                disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
            >
              {isLoading ? "Sending OTP..." : "Send OTP"}
            </button>
          </div>
        )}

        {/* ── Step 3: OTP Verification ───────────────────── */}
        {step === "otp" && (
          <div className="flex flex-col gap-4">
            <input
              type="text"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                setError(null);
              }}
              placeholder="Enter 6-digit OTP"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-center
                text-xl tracking-widest font-semibold outline-none
                focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              maxLength={6}
            />

            <button
              onClick={() => otpVerifyMutation.mutate()}
              disabled={otp.length !== 6 || isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium
                disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
            >
              {isLoading ? "Verifying..." : "Verify OTP"}
            </button>

            {/* Resend OTP */}
            <button
              onClick={() => {
                setOtp("");
                setError(null);
                setStep("mobile");
              }}
              className="text-sm text-blue-600 hover:underline text-center"
            >
              Change number or resend OTP
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
