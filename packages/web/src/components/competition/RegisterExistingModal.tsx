import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Search, CheckCircle, AlertTriangle } from "lucide-react";
import { api } from "../../api";
import { isoToFr } from "../../utils/dates";
import { useCompetition, findMatchingCategory } from "./CompetitionHook";
import type { Athlete, CompetitionCategory } from "./types";

function ageAtDate(birthDate: string, compDate: string): number {
  const birth = new Date(birthDate);
  const comp = new Date(compDate);
  let age = comp.getFullYear() - birth.getFullYear();
  const m = comp.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && comp.getDate() < birth.getDate())) age--;
  return age;
}

function CategoryBadge({
  categories,
  gender,
  age,
  weightKg,
}: {
  categories: CompetitionCategory[];
  gender: string;
  age: number | null;
  weightKg: number | null;
}) {
  const { t } = useTranslation();
  if (age == null) return null;
  const matched = findMatchingCategory(categories, gender, age, weightKg);
  if (matched) {
    const cat = categories.find((c) => c.id === matched);
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
        <CheckCircle size={10} />
        {cat ? `${cat.ageCategoryName} · ${cat.weightDivisionName}` : "—"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">
      <AlertTriangle size={10} />
      {t("competitions.noCategory", "Aucune catégorie")}
    </span>
  );
}

// Inline cascade select (simplified for modal use)
function CascadeSelect({
  categories,
  gender,
  ageCategoryId,
  weightDivisionId,
  onGenderChange,
  onAgeChange,
  onWeightChange,
}: {
  categories: CompetitionCategory[];
  gender: string;
  ageCategoryId: string;
  weightDivisionId: string;
  onGenderChange: (g: string) => void;
  onAgeChange: (id: string) => void;
  onWeightChange: (id: string) => void;
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
        <option value="">{t("step.weightDiv", "Poids")}</option>
        {weights.map((w) => <option key={w.id} value={w.id}>{w.weightDivisionName}</option>)}
      </select>
    </div>
  );
}

export default function RegisterExistingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { comp, athletes, clubs, enabledCategories, registerExisting } = useCompetition();
  const [form, setForm] = useState<Record<string, string>>({});
  const [athleteSearch, setAthleteSearch] = useState("");

  useEffect(() => {
    if (!open) { setForm({}); setAthleteSearch(""); }
  }, [open]);

  const availableAthletes = useMemo(() => {
    const registeredIds = new Set<string>();
    return athletes.filter((a) => !registeredIds.has(String(a.id)));
  }, [athletes]);

  const filteredAthletes = useMemo(() => {
    if (!athleteSearch.trim()) return availableAthletes;
    const q = athleteSearch.toLowerCase();
    return availableAthletes.filter((a) =>
      `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) || (a.clubName ?? "").toLowerCase().includes(q),
    );
  }, [availableAthletes, athleteSearch]);

  const selectedAthlete = useMemo(() => {
    if (!form.athleteId) return null;
    return athletes.find((a) => a.id === Number(form.athleteId)) ?? null;
  }, [athletes, form.athleteId]);

  const athleteAge = useMemo(() => {
    if (!selectedAthlete || !comp) return null;
    return ageAtDate(selectedAthlete.birthDate, comp.date);
  }, [selectedAthlete, comp]);

  useEffect(() => {
    if (selectedAthlete && !form.weightKg) {
      const w = selectedAthlete.weightKg?.toString() ?? "";
      if (w) setForm((prev) => ({ ...prev, weightKg: w }));
    }
  }, [selectedAthlete?.id]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="card-elevated w-full max-w-lg mx-4" style={{ animation: "slideIn 0.2s ease" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-ink">{t("competitions.register")}</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input type="text" placeholder={t("common.search") + "..."} value={athleteSearch} onChange={(e) => setAthleteSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-bg-subtle pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">{t("registration.athlete")} *</label>
            <select value={form.athleteId ?? ""} onChange={(e) => setForm({ ...form, athleteId: e.target.value })}
              className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all">
              <option value="">{t("registration.selectAthlete")}</option>
              {filteredAthletes.map((a) => (
                <option key={a.id} value={a.id}>{a.firstName} {a.lastName}{a.clubName ? ` (${a.clubName})` : ""}</option>
              ))}
            </select>
          </div>
          {selectedAthlete && (
            <div className="rounded-lg border border-border bg-bg-subtle p-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-xs font-bold text-primary">
                  {selectedAthlete.firstName.charAt(0)}{selectedAthlete.lastName.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink">{selectedAthlete.firstName} {selectedAthlete.lastName}</div>
                  <div className="flex items-center gap-2 text-xs text-ink-muted">
                    <span>{selectedAthlete.gender === "M" ? t("registration.male") : t("registration.female")}</span>
                    <span>·</span>
                    <span>{t("registration.birthDate")}: {isoToFr(selectedAthlete.birthDate)}</span>
                    <span>·</span>
                    <span className="font-medium text-primary">{athleteAge} {t("common.years", "ans")}</span>
                  </div>
                </div>
              </div>
              {comp && athleteAge != null && (
                <div className="mt-2 ml-12">
                  <CategoryBadge categories={comp.categories} gender={selectedAthlete.gender} age={athleteAge}
                    weightKg={form.weightKg ? Number(form.weightKg) : (selectedAthlete.weightKg ?? null)} />
                </div>
              )}
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">{t("registration.weight")} *</label>
            <input type="number" step={0.5} value={form.weightKg ?? ""} onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
              className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all" placeholder="kg" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">{t("competitions.category")}</label>
            <CascadeSelect categories={enabledCategories} gender={form.gender ?? selectedAthlete?.gender ?? "M"}
              ageCategoryId={form.ageCategoryId ?? ""} weightDivisionId={form.subDepartmentId ?? ""}
              onGenderChange={(g) => setForm({ ...form, gender: g, ageCategoryId: "", subDepartmentId: "" })}
              onAgeChange={(a) => setForm({ ...form, ageCategoryId: a, subDepartmentId: "" })}
              onWeightChange={(w) => setForm({ ...form, subDepartmentId: w })} />
            <p className="mt-1 text-[11px] text-ink-faint">{t("competitions.autoAssignHint")}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-ink-muted hover:bg-bg-subtle transition-colors">{t("common.cancel")}</button>
          <button onClick={() => { registerExisting(form); onClose(); }} disabled={!form.athleteId}
            className="brand-gradient rounded-lg px-4 py-2 text-sm font-semibold transition-all disabled:opacity-60">{t("common.save")}</button>
        </div>
      </div>
    </div>
  );
}
