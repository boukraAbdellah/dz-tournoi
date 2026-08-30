import { useTranslation } from "react-i18next";
import { Zap, AlertTriangle, CheckCircle } from "lucide-react";
import { useCompetition } from "./CompetitionHook";

export default function ResolutionPanel() {
  const { t } = useTranslation();
  const { resolution, resolveAll } = useCompetition();
  if (!resolution) return null;

  return (
    <div className="card-elevated p-5 mb-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">{t("competitions.resolution")} — {resolution.total} {t("registration.athlete")}</h3>
        {resolution.unresolved.length > 0 && (
          <button onClick={resolveAll} className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors">
            <Zap size={14} /> {t("competitions.resolve")} tout ({resolution.unresolved.length})
          </button>
        )}
      </div>
      {resolution.unresolved.length > 0 && (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger-subtle p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-danger mb-2">
            <AlertTriangle size={16} /> {t("competitions.unresolved")} ({resolution.unresolved.length})
          </div>
          {resolution.unresolved.map((u) => (
            <div key={u.regId} className="flex items-center justify-between text-xs text-danger/80 ml-6 py-0.5">
              <span>{u.athleteName} — {u.reason}</span>
              <span className="text-ink-faint">{u.weightKg != null ? `${u.weightKg} kg` : "—"}</span>
            </div>
          ))}
        </div>
      )}
      {resolution.resolved.length > 0 && (
        <div className="rounded-lg border border-success/30 bg-success-subtle p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-success mb-2">
            <CheckCircle size={16} /> {t("competitions.resolved")} ({resolution.resolved.length})
          </div>
          {resolution.resolved.map((r) => (
            <div key={r.regId} className="flex items-center justify-between text-xs text-success/80 ml-6 py-0.5">
              <span>{r.athleteName} → {r.categoryName}</span>
              <span className="text-ink-faint">{r.weightKg != null ? `${r.weightKg} kg` : "—"}{r.clubName ? ` · ${r.clubName}` : ""}</span>
            </div>
          ))}
        </div>
      )}
      {resolution.unresolved.length === 0 && resolution.resolved.length === 0 && (
        <p className="text-xs text-ink-muted text-center py-4">{t("competitions.noRegistrations")}</p>
      )}
    </div>
  );
}
