// src/components/ui/ConfirmDialog.tsx
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation dialog (wraps Modal) for destructive or important actions. */
export function ConfirmDialog({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={message}
      footer={
        <>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={
              "flex-1 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50 " +
              (danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-indigo-600 hover:bg-indigo-700")
            }
          >
            {loading ? "Please wait…" : confirmLabel}
          </button>
        </>
      }
    />
  );
}

export default ConfirmDialog;
