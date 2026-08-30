import { useTranslation } from "react-i18next";
import { CheckCircle, AlertTriangle, Zap } from "lucide-react";
import type { Toast } from "./types";

export default function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2"
      style={{ animation: "slideIn 0.2s ease" }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "bg-success text-white"
              : toast.type === "error"
                ? "bg-danger text-white"
                : "bg-info text-white"
          }`}
          onClick={() => onDismiss(toast.id)}
        >
          {toast.type === "success" ? (
            <CheckCircle size={16} />
          ) : toast.type === "error" ? (
            <AlertTriangle size={16} />
          ) : (
            <Zap size={16} />
          )}
          {toast.message}
        </div>
      ))}
    </div>
  );
}
