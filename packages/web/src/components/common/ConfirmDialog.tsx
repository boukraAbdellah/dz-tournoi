import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, AlertOctagon, Info, CheckCircle2, X } from "lucide-react";

export type ConfirmVariant = "danger" | "warning" | "primary" | "info";

export interface ConfirmOptions {
  title?: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context.confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setDialogState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleClose = useCallback((result: boolean) => {
    if (dialogState) {
      dialogState.resolve(result);
      setDialogState(null);
    }
  }, [dialogState]);

  // Focus confirm button when opened, handle ESC key
  useEffect(() => {
    if (dialogState?.isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          handleClose(false);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      const timer = setTimeout(() => confirmButtonRef.current?.focus(), 50);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        clearTimeout(timer);
      };
    }
  }, [dialogState?.isOpen, handleClose]);

  const variant = dialogState?.options.variant ?? "primary";

  const getVariantStyles = (v: ConfirmVariant) => {
    switch (v) {
      case "danger":
        return {
          icon: AlertOctagon,
          iconBg: "bg-danger/15 text-danger border-danger/20",
          button: "bg-danger text-white hover:bg-danger/90 focus-visible:ring-danger/40 shadow-danger/20",
          badge: "text-danger bg-danger/10",
        };
      case "warning":
        return {
          icon: AlertTriangle,
          iconBg: "bg-warning/15 text-warning border-warning/20",
          button: "bg-warning text-white hover:bg-warning/90 focus-visible:ring-warning/40 shadow-warning/20",
          badge: "text-warning bg-warning/10",
        };
      case "info":
        return {
          icon: Info,
          iconBg: "bg-info/15 text-info border-info/20",
          button: "bg-info text-white hover:bg-info/90 focus-visible:ring-info/40 shadow-info/20",
          badge: "text-info bg-info/10",
        };
      case "primary":
      default:
        return {
          icon: CheckCircle2,
          iconBg: "bg-primary/15 text-primary border-primary/20",
          button: "brand-gradient focus-visible:ring-primary/40",
          badge: "text-primary bg-primary/10",
        };
    }
  };

  const currentStyles = getVariantStyles(variant);
  const IconComponent = dialogState?.options.icon ?? currentStyles.icon;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {dialogState?.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => handleClose(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div
            className="card-elevated relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => handleClose(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-ink-muted hover:bg-bg-subtle hover:text-ink transition-colors"
              aria-label={t("common.close", "Fermer")}
            >
              <X size={16} />
            </button>

            <div className="flex items-start gap-4">
              {/* Icon badge */}
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${currentStyles.iconBg} shadow-xs`}
              >
                <IconComponent size={22} />
              </div>

              {/* Content */}
              <div className="flex-1 pt-0.5">
                <h3
                  id="confirm-dialog-title"
                  className="text-base font-semibold text-ink leading-snug"
                >
                  {dialogState.options.title ?? t("common.confirmTitle", "Confirmation")}
                </h3>
                <div className="mt-2 text-xs text-ink-muted leading-relaxed">
                  {dialogState.options.message}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-2.5 pt-2 border-t border-border-muted">
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-medium text-ink hover:bg-bg-subtle active:scale-[0.98] transition-all shadow-xs"
              >
                {dialogState.options.cancelLabel ?? t("common.cancel", "Annuler")}
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                onClick={() => handleClose(true)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold shadow-sm active:scale-[0.98] transition-all ${currentStyles.button}`}
              >
                {dialogState.options.confirmLabel ?? t("common.confirm", "Confirmer")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export default ConfirmProvider;
