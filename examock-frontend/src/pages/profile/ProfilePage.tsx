// src/pages/profile/ProfilePage.tsx
//
// Read + edit account page. Shows avatar/name/email/exam type/role and lets
// the user re-pick their exam type (with a destructive-confirm) and log out.
//
// "Re-pick exam" is the only write path here — the backend
// (POST /student/me/exam-type) deletes `UserTopicProgress` rows for
// subjects outside the new exam. The confirm dialog copy states this.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, LogOut } from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import {
  PageHeader,
  Card,
  Select,
  ConfirmDialog,
  EmptyState,
} from "../../components/ui";
import { useAuthStore } from "../../store/auth.store";
import { useExamTypes } from "../../hooks/useExamTypes";
import { useChangeExamType } from "../../hooks/student/useStudentData";
import { logout } from "../../api/auth.api";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout: clearAuth, setAuth } = useAuthStore();
  const { data: examTypes = [], isLoading: examTypesLoading } = useExamTypes();
  const { mutateAsync: changeExam, isPending: changing } = useChangeExamType();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingExamTypeId, setPendingExamTypeId] = useState<string | null>(null);

  const currentExamType =
    user?.examTypeId != null
      ? examTypes.find((e) => e.id === user.examTypeId) ?? null
      : null;

  const startChange = () => {
    setPendingExamTypeId(user?.examTypeId ?? null);
    setPickerOpen(true);
  };

  const handleConfirmChange = async () => {
    if (!pendingExamTypeId) return;
    try {
      const updated = await changeExam({ examTypeId: pendingExamTypeId });
      // Patch the auth store so dependent guards (e.g. dashboard) pick up
      // the new examTypeId without waiting for a hard reload. We don't have
      // a fresh access token here, so we only update the user record;
      // the existing token is still valid.
      setAuth("", updated, {
        needsExamSelection: false,
        needsEmailVerification: false,
      });
    } catch {
      // The mutation's error is surfaced by the hook; for V1 we just close
      // the picker so the user can retry.
    } finally {
      setPickerOpen(false);
      setPendingExamTypeId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore — clear locally regardless
    } finally {
      clearAuth();
      navigate("/login", { replace: true });
    }
  };

  if (!user) {
    return (
      <AppShell section="student">
        <EmptyState
          title="Not signed in"
          description="Please log in to view your profile."
          icon={<GraduationCap className="w-6 h-6 text-slate-400" />}
        />
      </AppShell>
    );
  }

  const otherExamTypes = examTypes.filter((e) => e.id !== user.examTypeId);

  return (
    <AppShell section="student">
      <PageHeader title="Profile" subtitle="Manage your account" />

      <Card className="mt-6 max-w-2xl">
        <div className="flex items-start gap-4">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="w-24 h-24 rounded-full ring-2 ring-brand-100"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center text-2xl font-bold uppercase">
              {user.name?.[0] ?? "U"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold text-slate-900 truncate">
              {user.name ?? "User"}
            </h2>
            <p className="text-sm text-slate-500 truncate">{user.email}</p>
            <p className="text-xs text-slate-400 mt-1">
              Role:{" "}
              <span className="font-semibold text-slate-700">{user.role}</span>
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <Row label="Exam type">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-700">
                {currentExamType?.name ?? "Not set"}
              </span>
              <button
                onClick={startChange}
                disabled={examTypesLoading || examTypes.length === 0}
                className="text-xs font-semibold text-brand-700 hover:text-brand-900 disabled:opacity-50"
              >
                Change
              </button>
            </div>
          </Row>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </Card>

      <ConfirmDialog
        open={pickerOpen}
        title="Change exam type?"
        message="Switching your exam will keep your account but reset progress for subjects that don't exist in the new exam. Continue?"
        confirmLabel={changing ? "Saving…" : "Switch exam"}
        cancelLabel="Cancel"
        danger
        loading={changing}
        onConfirm={handleConfirmChange}
        onCancel={() => {
          setPickerOpen(false);
          setPendingExamTypeId(null);
        }}
      />

      {pickerOpen && (
        <Card className="mt-4 max-w-2xl">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Pick a new exam
          </h3>
          <Select
            value={pendingExamTypeId ?? ""}
            onChange={(e) => setPendingExamTypeId(e.target.value || null)}
            options={otherExamTypes.map((e) => ({
              value: e.id,
              label: e.name,
            }))}
            disabled={changing}
          />
          {otherExamTypes.length === 0 && (
            <p className="mt-2 text-xs text-slate-400">
              No other exams available.
            </p>
          )}
        </Card>
      )}
    </AppShell>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 shrink-0 mt-1">
        {label}
      </span>
      <div className="flex-1 text-right">{children}</div>
    </div>
  );
}