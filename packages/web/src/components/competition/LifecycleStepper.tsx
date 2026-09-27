import { useTranslation } from "react-i18next";
import { Settings, UserPlus, Swords, Flag, Zap, Trophy } from "lucide-react";
import { useCompetition } from "./CompetitionHook";
import { STATUS_LABEL } from "../../utils/statusLabels";

const LIFECYCLE_STEPS = [
  { key: "DRAFT", icon: Settings, labelKey: "step.draft" },
  { key: "REGISTRATION_OPEN", icon: UserPlus, labelKey: "step.regOpen" },
  { key: "REGISTRATION_CLOSED", icon: UserPlus, labelKey: "step.regClosed" },
  { key: "DRAW_GENERATED", icon: Swords, labelKey: "step.drawGenerated" },
  { key: "DRAW_CONFIRMED", icon: Flag, labelKey: "step.drawConfirmed" },
  { key: "IN_PROGRESS", icon: Zap, labelKey: "step.inProgress" },
  { key: "COMPLETED", icon: Trophy, labelKey: "step.completed" },
] as const;

const STEP_INDEX: Record<string, number> = Object.fromEntries(
  LIFECYCLE_STEPS.map((s, i) => [s.key, i]),
);

export default function LifecycleStepper() {
  const { t } = useTranslation();
  const { comp } = useCompetition();
  if (!comp) return null;

  const stepIdx = STEP_INDEX[comp.status] ?? 0;
  const progress = (stepIdx / (LIFECYCLE_STEPS.length - 1)) * 100;

  return (
    <div className="card-elevated mb-5 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">{t("competitions.lifecycle", "Progression")}</h3>
        <span className="text-xs text-ink-muted">{STATUS_LABEL[comp.status] ?? comp.status}</span>
      </div>
      <div className="relative mb-3 h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
        <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex items-start justify-between">
        {LIFECYCLE_STEPS.map((step, i) => {
          const done = i < stepIdx;
          const current = i === stepIdx;
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex flex-1 flex-col items-center text-center">
              <div className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs transition-all ${
                done ? "bg-primary text-white" : current ? "bg-primary/15 text-primary ring-2 ring-primary/30" : "bg-bg-subtle text-ink-faint"
              }`}>
                <Icon size={14} />
              </div>
              <span className={`text-[10px] leading-tight ${done || current ? "text-primary font-semibold" : "text-ink-faint"}`}>
                {t(step.labelKey)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
