import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Pencil, UserPlus } from "lucide-react";
import { useCompetition, catName } from "./CompetitionHook";
import { useConfirm } from "../common/ConfirmDialog";
import type { CompetitionDetail, CompetitionCategory } from "./types";

function CascadeSelect({
  categories, gender, ageCategoryId, weightDivisionId, onGenderChange, onAgeChange, onWeightChange,
}: {
  categories: CompetitionCategory[]; gender: string; ageCategoryId: string; weightDivisionId: string;
  onGenderChange: (g: string) => void; onAgeChange: (id: string) => void; onWeightChange: (id: string) => void;
}) {
  const { t } = useTranslation();
  const genderCats = categories.filter((c) => c.enabled && c.gender === gender);
  const ageGroups = useMemo(() => {
    const map = new Map<number, { id: number; name: string; weights: CompetitionCategory[] }>();
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
        <option value="">{t("step.weightDivision", "Cat. de poids")}</option>
        {weights.map((w) => (
          <option key={w.id} value={w.weightDivisionId}>
            {w.weightDivisionName} {w.minKg != null && w.maxKg != null ? `(${w.minKg}–${w.maxKg} kg)` : w.maxKg != null ? `(-${w.maxKg} kg)` : `(+${w.minKg} kg)`}
          </option>
        ))}
      </select>
    </div>
  );
}

interface Props {
  onOpenRegister: () => void;
  onOpenInline: () => void;
  onOpenBulk: () => void;
}

export default function RegistrationsTable({ onOpenRegister, onOpenInline, onOpenBulk }: Props) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { comp, registrations, isOpen, isClosed, enabledCategories, withdraw, updateWeight, updateCategory } = useCompetition();
  const [editingWeight, setEditingWeight] = useState<{ regId: number; value: string } | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ regId: number; gender: string; ageCategoryId: string; weightDivisionId: string } | null>(null);
  if (!comp) return null;

  return (
    <>
      {/* Registration actions */}
      {isOpen && (
        <div className="mb-5 flex flex-wrap gap-2">
          <button onClick={onOpenRegister} className="brand-gradient inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all">
            <UserPlus size={14} /> {t("competitions.register")}
          </button>
          <button onClick={onOpenInline} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-bg-subtle transition-colors">
            <UserPlus size={14} /> {t("competitions.registerInline")}
          </button>
          <button onClick={onOpenBulk} className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors">
            <UserPlus size={14} /> {t("competitions.registerAll")}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card-elevated overflow-hidden mb-5">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-sm font-semibold text-ink">{t("competitions.registrations")} ({registrations.filter((r) => r.status === "REGISTERED").length})</h3>
        </div>
        {registrations.length === 0 ? (
          <div className="py-12 text-center text-sm text-ink-muted">{t("competitions.noRegistrations")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-subtle">
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-ink-muted">{t("registration.athlete")}</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-ink-muted">{t("registration.gender")}</th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold text-ink-muted">{t("registration.weight")}</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-ink-muted">{t("competitions.category")}</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-ink-muted">{t("registration.club")}</th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold text-ink-muted">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((r) => {
                  const isUnresolved = !r.subDepartmentId;
                  return (
                    <tr key={r.id} className={`border-b border-border-muted transition-colors ${isUnresolved ? "bg-danger/[0.03]" : "hover:bg-primary/[0.03]"}`}>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-[10px] font-bold text-primary">{r.firstName.charAt(0)}{r.lastName.charAt(0)}</span>
                          <span className="font-medium text-ink">{r.firstName} {r.lastName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-2.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${r.gender === "M" ? "bg-info/10 text-info" : "bg-warning/10 text-warning"}`}>
                          {r.gender === "M" ? t("registration.male") : t("registration.female")}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        {editingWeight?.regId === r.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <input type="number" step={0.5} value={editingWeight.value} onChange={(e) => setEditingWeight({ ...editingWeight, value: e.target.value })}
                              className="h-7 w-20 rounded border border-border bg-surface px-2 text-xs text-ink outline-none focus:border-primary/40" autoFocus />
                            <button onClick={() => { updateWeight(r.id, editingWeight.value); setEditingWeight(null); }} className="text-xs text-primary hover:text-primary/80">{t("common.save")}</button>
                            <button onClick={() => setEditingWeight(null)} className="text-xs text-ink-muted hover:text-ink">{t("common.cancel")}</button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-ink-muted hover:text-ink cursor-pointer" onClick={() => setEditingWeight({ regId: r.id, value: r.weightKg?.toString() ?? "" })}>
                            {r.weightKg != null ? `${r.weightKg} kg` : "—"}
                            {isOpen && <Pencil size={10} />}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-2.5">
                        {editingCategory?.regId === r.id ? (
                          <div className="min-w-[300px] max-w-[560px] rounded-xl border border-border bg-bg-subtle/40 p-3">
                            <CascadeSelect categories={enabledCategories} gender={editingCategory.gender} ageCategoryId={editingCategory.ageCategoryId} weightDivisionId={editingCategory.weightDivisionId}
                              onGenderChange={(g) => setEditingCategory({ ...editingCategory, gender: g, ageCategoryId: "", weightDivisionId: "" })}
                              onAgeChange={(a) => setEditingCategory({ ...editingCategory, ageCategoryId: a, weightDivisionId: "" })}
                              onWeightChange={(w) => setEditingCategory({ ...editingCategory, weightDivisionId: w })} />
                            <div className="mt-1 flex gap-2">
                              <button onClick={() => { updateCategory(r.id, editingCategory.gender, editingCategory.ageCategoryId, editingCategory.weightDivisionId); setEditingCategory(null); }} className="text-xs text-primary hover:text-primary/80 font-medium">{t("common.save")}</button>
                              <button onClick={() => setEditingCategory(null)} className="text-xs text-ink-muted hover:text-ink">{t("common.cancel")}</button>
                            </div>
                          </div>
                        ) : (
                          <span className={`inline-flex items-center gap-1 text-xs cursor-pointer ${isUnresolved ? "text-danger font-medium" : "text-ink"}`}
                            onClick={() => {
                              const cat = r.subDepartmentId ? comp.categories.find((c) => c.id === r.subDepartmentId) : null;
                              setEditingCategory({ regId: r.id, gender: cat?.gender ?? r.gender, ageCategoryId: cat ? String(cat.ageCategoryId) : "", weightDivisionId: cat ? String(cat.weightDivisionId) : "" });
                            }}>
                            {isUnresolved ? <><AlertTriangle size={12} /> {t("competitions.unresolved")}</> : catName(comp.categories, r.subDepartmentId)}
                            {(isOpen || isClosed) && <Pencil size={10} />}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-ink-muted">{r.clubName ?? "—"}</td>
                      <td className="px-5 py-2.5 text-right">
                        {r.status === "REGISTERED" && isOpen && (
                          <button
                            onClick={async () => {
                              const ok = await confirm({
                                title: "Retirer l'athlète",
                                message: `Êtes-vous sûr de vouloir retirer ${r.firstName} ${r.lastName} de cette compétition ?`,
                                confirmLabel: "Retirer",
                                cancelLabel: "Annuler",
                                variant: "danger",
                              });
                              if (ok) withdraw(r.id);
                            }}
                            className="text-xs text-danger hover:text-danger/80 transition-colors"
                          >
                            {t("common.delete")}
                          </button>
                        )}
                        {r.status === "WITHDRAWN" && <span className="text-xs text-ink-faint">{t("competitions.withdrawn", "Retiré")}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
