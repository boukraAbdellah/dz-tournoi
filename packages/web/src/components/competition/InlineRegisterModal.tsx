import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, CheckCircle, AlertTriangle } from "lucide-react";
import DateInput from "../../components/DateInput";
import { useCompetition, findMatchingCategory } from "./CompetitionHook";

function ageAtDate(birthDate: string, compDate: string): number {
  const birth = new Date(birthDate);
  const comp = new Date(compDate);
  let age = comp.getFullYear() - birth.getFullYear();
  const m = comp.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && comp.getDate() < birth.getDate())) age--;
  return age;
}

function CategoryBadge({
  categories, gender, age, weightKg,
}: { categories: any[]; gender: string; age: number | null; weightKg: number | null }) {
  const { t } = useTranslation();
  if (age == null) return null;
  const matched = findMatchingCategory(categories, gender, age, weightKg);
  if (matched) {
    const cat = categories.find((c: any) => c.id === matched);
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
        <CheckCircle size={10} />{cat ? `${cat.ageCategoryName} · ${cat.weightDivisionName}` : "—"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">
      <AlertTriangle size={10} />{t("competitions.noCategory", "Aucune catégorie")}
    </span>
  );
}

export default function InlineRegisterModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { comp, clubs, registerInline } = useCompetition();
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) setForm({});
  }, [open]);

  const inlineAge = useMemo(() => {
    if (!form.birthDate || !comp) return null;
    return ageAtDate(form.birthDate, comp.date);
  }, [form.birthDate, comp]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="card-elevated w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto scrollbar-thin" style={{ animation: "slideIn 0.2s ease" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-ink">{t("competitions.registerInline")}</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">{t("registration.lastName")} *</label>
              <input value={form.lastName ?? ""} onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">{t("registration.firstName")} *</label>
              <input value={form.firstName ?? ""} onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DateInput label={t("registration.birthDate")} value={form.birthDate ?? ""} onChange={(v) => setForm({ ...form, birthDate: v })} required />
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">{t("registration.gender")} *</label>
              <select value={form.gender ?? ""} onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all">
                <option value="">{t("registration.gender")}</option>
                <option value="M">{t("registration.male")}</option>
                <option value="F">{t("registration.female")}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">{t("registration.weight")}</label>
              <input type="number" step={0.5} value={form.weightKg ?? ""} onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all" placeholder="kg" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">{t("registration.club")}</label>
              <select value={form.clubId ?? ""} onChange={(e) => setForm({ ...form, clubId: e.target.value })}
                className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all">
                <option value="">{t("registration.selectClub")}</option>
                {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          {inlineAge != null && form.gender && (
            <div className="rounded-xl border border-primary/15 bg-primary/[0.035] p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{t("athletes.age", "Âge")}</div>
                  <div className="mt-0.5 text-sm font-bold text-ink">{inlineAge} {t("common.years", "ans")}</div>
                </div>
                {comp && <CategoryBadge categories={comp.categories} gender={form.gender} age={inlineAge} weightKg={form.weightKg ? Number(form.weightKg) : null} />}
              </div>
              <div className="text-[10px] text-ink-muted">La catégorie est déterminée automatiquement à partir de l'âge, du sexe et du poids.</div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-ink-muted hover:bg-bg-subtle transition-colors">{t("common.cancel")}</button>
          <button onClick={() => { registerInline(form); onClose(); }} className="brand-gradient rounded-lg px-4 py-2 text-sm font-semibold transition-all">{t("common.save")}</button>
        </div>
      </div>
    </div>
  );
}
