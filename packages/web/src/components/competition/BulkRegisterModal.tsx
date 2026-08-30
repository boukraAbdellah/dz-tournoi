import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useCompetition } from "./CompetitionHook";

function CascadeSelect({
  categories, gender, ageCategoryId, weightDivisionId, onGenderChange, onAgeChange, onWeightChange,
}: {
  categories: any[]; gender: string; ageCategoryId: string; weightDivisionId: string;
  onGenderChange: (g: string) => void; onAgeChange: (id: string) => void; onWeightChange: (id: string) => void;
}) {
  const { t } = useTranslation();
  const genderCats = categories.filter((c: any) => c.enabled && c.gender === gender);
  const ageGroups = useMemo(() => {
    const map = new Map<number, { id: number; name: string; weights: any[] }>();
    for (const c of genderCats) {
      if (!map.has(c.ageCategoryId)) map.set(c.ageCategoryId, { id: c.ageCategoryId, name: c.ageCategoryName, weights: [] });
      map.get(c.ageCategoryId)!.weights.push(c);
    }
    return [...map.values()];
  }, [genderCats]);
  const selectedAge = ageGroups.find((a) => a.id === Number(ageCategoryId));
  const weights = selectedAge?.weights ?? [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-bg-subtle p-1">
        {[{ value: "M", label: t("registration.male") }, { value: "F", label: t("registration.female") }].map((opt) => (
          <button key={opt.value} type="button" onClick={() => { onGenderChange(opt.value); onAgeChange(""); onWeightChange(""); }}
            className={`flex h-8 items-center justify-center rounded-lg text-xs font-semibold transition-all ${gender === opt.value ? "bg-surface text-ink shadow-sm ring-1 ring-border" : "text-ink-muted hover:text-ink"}`}>
            {opt.label}
          </button>
        ))}
      </div>
      <select value={ageCategoryId} onChange={(e) => { onAgeChange(e.target.value); onWeightChange(""); }}
        className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm text-ink outline-none focus:border-primary/40">
        <option value="">{t("step.ageCategory", "Cat. d'âge")}</option>
        {ageGroups.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <select value={weightDivisionId} onChange={(e) => onWeightChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm text-ink outline-none focus:border-primary/40">
        <option value="">{t("step.weightDiv", "Poids")}</option>
        {weights.map((w: any) => <option key={w.id} value={w.id}>{w.weightDivisionName}</option>)}
      </select>
    </div>
  );
}

export default function BulkRegisterModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { enabledCategories, loadBulkPreview, bulkPreview, executeBulkRegister, bulkLoading } = useCompetition();
  const [bulkCatId, setBulkCatId] = useState("");
  const [bulkGender, setBulkGender] = useState("M");
  const [bulkAgeId, setBulkAgeId] = useState("");

  useEffect(() => {
    if (!open) { setBulkCatId(""); setBulkGender("M"); setBulkAgeId(""); }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="card-elevated w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto scrollbar-thin" style={{ animation: "slideIn 0.2s ease" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-ink">{t("competitions.registerAll")}</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">{t("competitions.category")} *</label>
            <CascadeSelect categories={enabledCategories} gender={bulkGender} ageCategoryId={bulkAgeId} weightDivisionId={bulkCatId}
              onGenderChange={(g) => { setBulkGender(g); setBulkAgeId(""); setBulkCatId(""); }}
              onAgeChange={(a) => { setBulkAgeId(a); setBulkCatId(""); }}
              onWeightChange={(w) => { setBulkCatId(w); if (w) loadBulkPreview(w); }} />
          </div>
          {bulkPreview && (
            <div className="rounded-lg border border-border bg-bg-subtle p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-ink">{bulkPreview.categoryName}</span>
                <span className="text-xs font-bold text-primary">{bulkPreview.total} {t("common.athletes")}</span>
              </div>
              {bulkPreview.athletes.length === 0 ? (
                <p className="text-xs text-ink-muted">{t("competitions.noMatchingAthletes")}</p>
              ) : (
                <div className="max-h-48 overflow-y-auto scrollbar-thin space-y-1">
                  {bulkPreview.athletes.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-md bg-surface px-2.5 py-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-[9px] font-bold text-primary">{a.firstName.charAt(0)}{a.lastName.charAt(0)}</span>
                        <span className="font-medium text-ink">{a.firstName} {a.lastName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-ink-muted">
                        {a.weightKg != null && <span>{a.weightKg} kg</span>}
                        {a.clubName && <span>· {a.clubName}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-ink-muted hover:bg-bg-subtle transition-colors">{t("common.cancel")}</button>
          <button onClick={() => { executeBulkRegister(bulkCatId); onClose(); }} disabled={!bulkCatId || bulkLoading || (bulkPreview?.total ?? 0) === 0}
            className="brand-gradient rounded-lg px-4 py-2 text-sm font-semibold transition-all disabled:opacity-60">
            {bulkLoading ? t("common.loading") : `${t("common.register")} ${bulkPreview?.total ?? 0} ${t("common.athletes")}`}
          </button>
        </div>
      </div>
    </div>
  );
}
