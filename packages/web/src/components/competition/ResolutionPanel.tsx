import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Zap, AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Users } from "lucide-react";
import { useCompetition } from "./CompetitionHook";
import { useAppSettings } from "../../settings";

export default function ResolutionPanel() {
  const { t } = useTranslation();
  const { rtl } = useAppSettings();
  const { resolution, resolveAll } = useCompetition();

  // Initial state: collapsed by default
  const [expandedUnresolved, setExpandedUnresolved] = useState(false);
  const [expandedResolved, setExpandedResolved] = useState(false);

  if (!resolution) return null;

  return (
    <div className="card-elevated p-5 mb-5">
      {/* Panel Top Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">
            {t("competitions.resolution", "Résolution des inscriptions")} — {resolution.total} {t("registration.athlete", "athlètes")}
          </h3>
          <p className="mt-0.5 text-xs text-ink-muted">
            Affectation automatique des athlètes inscrits dans leurs catégories d'âge et de poids correspondantes.
          </p>
        </div>
        {resolution.unresolved.length > 0 && (
          <button
            onClick={resolveAll}
            className="brand-gradient inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-xs transition-all"
          >
            <Zap size={14} /> {t("competitions.resolve", "Résoudre tout")} ({resolution.unresolved.length})
          </button>
        )}
      </div>

      <div className="space-y-3">
        {/* ── Unresolved Section ──────────────────────────────────── */}
        {resolution.unresolved.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-danger/30 bg-danger-subtle/50 transition-all shadow-xs">
            {/* Clickable Header */}
            <div
              onClick={() => setExpandedUnresolved((prev) => !prev)}
              className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-danger/10 transition-colors select-none"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-danger/15 text-danger">
                  <AlertTriangle size={15} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-danger">
                    {t("competitions.unresolved", "Non résolus")} ({resolution.unresolved.length})
                  </span>
                  <span className="ml-2 text-[11px] text-danger/80 hidden sm:inline">
                    · Catégorie désactivée ou poids non conforme
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-danger">
                <span className="text-[11px] font-medium hidden xs:inline">
                  {expandedUnresolved ? t("common.collapse", "Masquer") : t("common.expand", "Afficher")}
                </span>
                {expandedUnresolved ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} className={rtl ? "rotate-180" : ""} />
                )}
              </div>
            </div>

            {/* Expandable List */}
            {expandedUnresolved && (
              <div className="border-t border-danger/20 bg-surface/80 px-4 py-2.5 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                {resolution.unresolved.map((u) => (
                  <div
                    key={u.regId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-danger/5 px-3 py-2 text-xs text-danger transition-colors hover:bg-danger/10"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink">{u.athleteName}</span>
                      <span className="text-danger/90 font-medium">({u.reason})</span>
                    </div>
                    <span className="text-[11px] font-medium text-ink-muted">
                      {u.weightKg != null ? `${u.weightKg} kg` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Resolved Section ────────────────────────────────────── */}
        {resolution.resolved.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-success/30 bg-success-subtle/50 transition-all shadow-xs">
            {/* Clickable Header */}
            <div
              onClick={() => setExpandedResolved((prev) => !prev)}
              className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-success/10 transition-colors select-none"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
                  <CheckCircle size={15} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-success">
                    {t("competitions.resolved", "Athlètes résolus")} ({resolution.resolved.length})
                  </span>
                  <span className="ml-2 text-[11px] text-success/80 hidden sm:inline">
                    · Prêts pour le tirage au sort
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-success">
                <span className="text-[11px] font-medium hidden xs:inline">
                  {expandedResolved ? t("common.collapse", "Masquer") : t("common.expand", "Afficher")}
                </span>
                {expandedResolved ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} className={rtl ? "rotate-180" : ""} />
                )}
              </div>
            </div>

            {/* Expandable List */}
            {expandedResolved && (
              <div className="border-t border-success/20 bg-surface/80 px-4 py-2.5 max-h-80 overflow-y-auto scrollbar-thin space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                {resolution.resolved.map((r) => (
                  <div
                    key={r.regId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-success/5 px-3 py-2 text-xs transition-colors hover:bg-success/10"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-ink truncate">{r.athleteName}</span>
                      <span className="text-success font-medium text-[11px]">→ {r.categoryName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-ink-muted text-[11px]">
                      {r.clubName && <span className="truncate max-w-[150px]">{r.clubName}</span>}
                      <span className="font-medium">{r.weightKg != null ? `${r.weightKg} kg` : "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Empty State ─────────────────────────────────────────── */}
        {resolution.unresolved.length === 0 && resolution.resolved.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Users size={32} className="mb-2 text-ink-faint" />
            <p className="text-xs text-ink-muted">{t("competitions.noRegistrations", "Aucune inscription pour le moment")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
