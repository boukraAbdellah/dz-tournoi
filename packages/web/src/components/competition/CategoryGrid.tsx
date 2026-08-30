import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, ToggleLeft, ToggleRight, ChevronDown, ChevronRight, Users, Minus } from "lucide-react";
import { useCompetition, weightLabel } from "./CompetitionHook";

export default function CategoryGrid() {
  const { t } = useTranslation();
  const { comp, enabledCategories, toggleCategory, batchToggle } = useCompetition();
  const [expandedAgeGroups, setExpandedAgeGroups] = useState<Record<string, boolean>>({ M: true, F: true });
  if (!comp) return null;

  return (
    <div className="card-elevated mb-5 overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-ink">{t("competitions.categories")}</h3>
              <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-[10px] font-semibold text-ink-muted">{enabledCategories.length}/{comp.categories.length} actives</span>
            </div>
            <p className="mt-1 text-xs text-ink-muted">Activez les catégories ouvertes à l'inscription. Les divisions sont regroupées par sexe et âge.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => batchToggle(true, {})} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-success/30 bg-success/8 px-2.5 text-xs font-semibold text-success transition-colors hover:bg-success/15">
              <CheckCircle size={13} />{t("common.all")}
            </button>
            <button type="button" onClick={() => batchToggle(false, {})} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-bg-subtle">
              <Minus size={13} />{t("common.none")}
            </button>
          </div>
        </div>
      </div>
      <div className="divide-y divide-border">
        {(["M", "F"] as const).map((g) => {
          const genderCats = comp.categories.filter((c) => c.gender === g);
          const enabledInGender = genderCats.filter((c) => c.enabled).length;
          const allGenderEnabled = genderCats.length > 0 && enabledInGender === genderCats.length;
          const someGenderEnabled = enabledInGender > 0;
          const genderLabel = g === "M" ? t("registration.male") : t("registration.female");
          const expanded = expandedAgeGroups[g] ?? true;

          const ageGroups = [...new Set(genderCats.map((c) => c.ageCategoryId))].map((ageId) => {
            const cats = genderCats.filter((c) => c.ageCategoryId === ageId);
            const enabledCount = cats.filter((c) => c.enabled).length;
            const age = cats[0];
            return { ageId, ageName: age?.ageCategoryName ?? "", minAge: age?.minAge ?? 0, maxAge: age?.maxAge ?? null, cats, enabledCount, allEnabled: cats.length > 0 && enabledCount === cats.length, someEnabled: enabledCount > 0 };
          });

          return (
            <div key={g} className="bg-surface">
              <div className="flex items-center justify-between px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${g === "M" ? "bg-info/10 text-info" : "bg-warning/10 text-warning"}`}>
                    <Users size={17} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{genderLabel}</span>
                      <span className="text-[10px] font-medium text-ink-faint">{enabledInGender} / {genderCats.length} divisions</span>
                    </div>
                    <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-bg-subtle">
                      <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${genderCats.length ? (enabledInGender / genderCats.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => batchToggle(!allGenderEnabled, { gender: g })}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition-all ${allGenderEnabled ? "border-primary/30 bg-primary/8 text-primary" : someGenderEnabled ? "border-primary/20 bg-primary/5 text-primary/80" : "border-border bg-surface text-ink-muted hover:bg-bg-subtle"}`}>
                    {allGenderEnabled ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                    {allGenderEnabled ? "Tout actif" : someGenderEnabled ? "Partiel" : "Tout inactif"}
                  </button>
                  <button type="button" onClick={() => setExpandedAgeGroups((prev) => ({ ...prev, [g]: !expanded }))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-bg-subtle hover:text-ink">
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                </div>
              </div>
              {expanded && (
                <div className="space-y-2 bg-bg-subtle/35 px-5 pb-4">
                  {ageGroups.map(({ ageId, ageName, minAge, maxAge, cats, enabledCount, allEnabled, someEnabled }) => (
                    <div key={ageId} className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
                      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-3.5 py-2.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <button type="button" onClick={() => batchToggle(!allEnabled, { gender: g, ageCategoryId: ageId })}
                            className={`relative flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${allEnabled ? "bg-primary" : someEnabled ? "bg-primary/45" : "bg-border"}`}>
                            <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${allEnabled ? "translate-x-4" : someEnabled ? "translate-x-2" : "translate-x-0"}`} />
                          </button>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-xs font-semibold text-ink">{ageName}</span>
                              <span className="rounded-full bg-bg-subtle px-1.5 py-0.5 text-[9px] font-medium text-ink-faint">{maxAge != null ? `${minAge}–${maxAge} ans` : `${minAge}+ ans`}</span>
                            </div>
                            <div className="mt-0.5 text-[10px] text-ink-faint">{enabledCount}/{cats.length} poids actifs</div>
                          </div>
                        </div>
                        <span className={`shrink-0 text-[10px] font-semibold ${allEnabled ? "text-success" : someEnabled ? "text-primary" : "text-ink-faint"}`}>
                          {allEnabled ? "Complet" : someEnabled ? "Partiel" : "Inactif"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-4">
                        {cats.map((cat) => (
                          <button key={cat.id} type="button" onClick={() => toggleCategory(cat.id, !cat.enabled)}
                            className={`group relative min-h-[58px] rounded-lg border px-3 py-2 text-left transition-all ${cat.enabled ? "border-primary/25 bg-primary/[0.035] hover:border-primary/45 hover:bg-primary/[0.07]" : "border-border-muted bg-bg-subtle/60 opacity-65 hover:opacity-100"}`}>
                            <div className="flex items-start justify-between gap-2">
                              <span className={`text-xs font-semibold leading-tight ${cat.enabled ? "text-ink" : "text-ink-muted"}`}>{cat.weightDivisionName}</span>
                              <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${cat.enabled ? "border-primary bg-primary text-white" : "border-border bg-surface text-transparent"}`}><CheckCircle size={10} /></span>
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <span className="text-[10px] text-ink-faint">{weightLabel(cat.minKg, cat.maxKg)}</span>
                              {cat.registrationCount > 0 && (
                                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${cat.enabled ? "bg-primary/10 text-primary" : "bg-danger/10 text-danger"}`}>{cat.registrationCount}</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
