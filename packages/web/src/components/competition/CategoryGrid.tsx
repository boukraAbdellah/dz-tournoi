import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, ToggleLeft, ToggleRight, ChevronDown, ChevronRight, Users, Minus, Sparkles } from "lucide-react";
import { useCompetition, weightLabel } from "./CompetitionHook";
import { useAppSettings } from "../../settings";

export default function CategoryGrid() {
  const { t } = useTranslation();
  const { rtl } = useAppSettings();
  const { comp, enabledCategories, toggleCategory, batchToggle } = useCompetition();

  // Initial state: collapsed by default (gender and age groups)
  const [expandedGenders, setExpandedGenders] = useState<Record<string, boolean>>({ M: false, F: false });
  const [expandedAges, setExpandedAges] = useState<Record<string, boolean>>({});

  if (!comp) return null;

  const toggleGender = (g: string) => {
    setExpandedGenders((prev) => ({ ...prev, [g]: !prev[g] }));
  };

  const toggleAge = (ageKey: string) => {
    setExpandedAges((prev) => ({ ...prev, [ageKey]: !prev[ageKey] }));
  };

  return (
    <div className="card-elevated mb-5 overflow-hidden">
      {/* Card Header */}
      <div className="border-b border-border px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-ink">{t("competitions.categories")}</h3>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                {enabledCategories.length}/{comp.categories.length} actives
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Activez les catégories ouvertes à l'inscription. Cliquez sur une section pour déplier ses catégories d'âge et divisions de poids.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => batchToggle(true, {})}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-success/30 bg-success/8 px-2.5 text-xs font-semibold text-success transition-colors hover:bg-success/15 shadow-xs"
            >
              <CheckCircle size={13} />
              {t("common.all")}
            </button>
            <button
              type="button"
              onClick={() => batchToggle(false, {})}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-bg-subtle shadow-xs"
            >
              <Minus size={13} />
              {t("common.none")}
            </button>
          </div>
        </div>
      </div>

      {/* Gender Accordions */}
      <div className="divide-y divide-border">
        {(["M", "F"] as const).map((g) => {
          const genderCats = comp.categories.filter((c) => c.gender === g);
          const enabledInGender = genderCats.filter((c) => c.enabled).length;
          const allGenderEnabled = genderCats.length > 0 && enabledInGender === genderCats.length;
          const someGenderEnabled = enabledInGender > 0;
          const genderLabel = g === "M" ? t("registration.male", "Hommes") : t("registration.female", "Femmes");
          const isGenderExpanded = !!expandedGenders[g];

          const ageGroups = [...new Set(genderCats.map((c) => c.ageCategoryId))].map((ageId) => {
            const cats = genderCats.filter((c) => c.ageCategoryId === ageId);
            const enabledCount = cats.filter((c) => c.enabled).length;
            const age = cats[0];
            const ageKey = `${g}-${ageId}`;
            return {
              ageId,
              ageKey,
              ageName: age?.ageCategoryName ?? "",
              minAge: age?.minAge ?? 0,
              maxAge: age?.maxAge ?? null,
              cats,
              enabledCount,
              allEnabled: cats.length > 0 && enabledCount === cats.length,
              someEnabled: enabledCount > 0,
            };
          });

          return (
            <div key={g} className="bg-surface transition-colors">
              {/* Gender Header Bar (Clickable row) */}
              <div
                onClick={() => toggleGender(g)}
                className="flex cursor-pointer items-center justify-between px-5 py-3.5 hover:bg-bg-subtle/50 transition-colors select-none"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform ${
                      isGenderExpanded ? "scale-105" : ""
                    } ${g === "M" ? "bg-info/10 text-info" : "bg-warning/10 text-warning"}`}
                  >
                    <Users size={17} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{genderLabel}</span>
                      <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                        {enabledInGender} / {genderCats.length} actives
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-36 overflow-hidden rounded-full bg-bg-subtle">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{
                          width: `${genderCats.length ? (enabledInGender / genderCats.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      batchToggle(!allGenderEnabled, { gender: g });
                    }}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition-all shadow-xs ${
                      allGenderEnabled
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : someGenderEnabled
                          ? "border-primary/20 bg-primary/5 text-primary/80"
                          : "border-border bg-surface text-ink-muted hover:bg-bg-subtle"
                    }`}
                  >
                    {allGenderEnabled ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                    <span>{allGenderEnabled ? "Tout actif" : someGenderEnabled ? "Partiel" : "Tout inactif"}</span>
                  </button>

                  <div className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-bg-subtle hover:text-ink">
                    {isGenderExpanded ? <ChevronDown size={17} /> : <ChevronRight size={17} className={rtl ? "rotate-180" : ""} />}
                  </div>
                </div>
              </div>

              {/* Age Categories (Visible when gender is expanded) */}
              {isGenderExpanded && (
                <div className="space-y-2.5 bg-bg-subtle/40 px-5 py-3 border-t border-border/60 animate-in fade-in slide-in-from-top-1 duration-150">
                  {ageGroups.map(
                    ({
                      ageId,
                      ageKey,
                      ageName,
                      minAge,
                      maxAge,
                      cats,
                      enabledCount,
                      allEnabled,
                      someEnabled,
                    }) => {
                      const isAgeExpanded = !!expandedAges[ageKey];

                      // RTL-safe switch slide calculation
                      const getSwitchTranslate = () => {
                        if (allEnabled) return rtl ? "-translate-x-4" : "translate-x-4";
                        if (someEnabled) return rtl ? "-translate-x-2" : "translate-x-2";
                        return "translate-x-0";
                      };

                      return (
                        <div
                          key={ageId}
                          className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs transition-all"
                        >
                          {/* Age Group Header (Clickable to expand weight divisions) */}
                          <div
                            onClick={() => toggleAge(ageKey)}
                            className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 hover:bg-bg-subtle/50 transition-colors select-none"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              {/* Switch Toggle (with e.stopPropagation) */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  batchToggle(!allEnabled, { gender: g, ageCategoryId: ageId });
                                }}
                                className={`relative flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                                  allEnabled ? "bg-primary" : someEnabled ? "bg-primary/50" : "bg-border"
                                }`}
                                title={allEnabled ? "Désactiver la catégorie" : "Activer la catégorie"}
                              >
                                <span
                                  className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-150 ${getSwitchTranslate()}`}
                                />
                              </button>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-bold text-ink">{ageName}</span>
                                  <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-[9px] font-semibold text-ink-muted">
                                    {maxAge != null ? `${minAge}–${maxAge} ans` : `${minAge}+ ans`}
                                  </span>
                                </div>
                                <div className="mt-0.5 text-[11px] text-ink-muted">
                                  {enabledCount}/{cats.length} poids actifs
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  allEnabled
                                    ? "bg-success/10 text-success"
                                    : someEnabled
                                      ? "bg-primary/10 text-primary"
                                      : "bg-bg-subtle text-ink-faint"
                                }`}
                              >
                                {allEnabled ? "Complet" : someEnabled ? "Partiel" : "Inactif"}
                              </span>

                              <div className="text-ink-muted">
                                {isAgeExpanded ? (
                                  <ChevronDown size={16} />
                                ) : (
                                  <ChevronRight size={16} className={rtl ? "rotate-180" : ""} />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Weight Divisions Grid (Visible when age category is expanded) */}
                          {isAgeExpanded && (
                            <div className="border-t border-border/70 bg-bg-subtle/25 p-3.5 animate-in fade-in slide-in-from-top-1 duration-150">
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                                {cats.map((cat) => (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => toggleCategory(cat.id, !cat.enabled)}
                                    className={`group relative min-h-[58px] rounded-xl border p-2.5 text-left transition-all shadow-xs ${
                                      cat.enabled
                                        ? "border-primary/30 bg-primary/[0.04] hover:border-primary/50 hover:bg-primary/[0.08]"
                                        : "border-border-muted bg-surface opacity-60 hover:opacity-100 hover:border-border"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <span
                                        className={`text-xs font-bold leading-tight ${
                                          cat.enabled ? "text-ink" : "text-ink-muted"
                                        }`}
                                      >
                                        {cat.weightDivisionName}
                                      </span>
                                      <span
                                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                          cat.enabled
                                            ? "border-primary bg-primary text-white"
                                            : "border-border bg-surface text-transparent"
                                        }`}
                                      >
                                        <CheckCircle size={10} />
                                      </span>
                                    </div>
                                    <div className="mt-1 flex items-center justify-between gap-2">
                                      <span className="text-[10px] text-ink-muted">
                                        {weightLabel(cat.minKg, cat.maxKg)}
                                      </span>
                                      {cat.registrationCount > 0 && (
                                        <span
                                          className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                                            cat.enabled
                                              ? "bg-primary/10 text-primary"
                                              : "bg-danger/10 text-danger"
                                          }`}
                                        >
                                          {cat.registrationCount}
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
