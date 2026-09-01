import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Edit, Trash2, X, Inbox } from 'lucide-react';
import dayjs from 'dayjs';
import { api } from '../api';
import type { Athlete, Club } from '../types';
import PageHeader from '../components/PageHeader';
import DateInput from '../components/DateInput';
import { useConfirm } from '../components/common/ConfirmDialog';

export default function AthletesPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [editing, setEditing] = useState<Athlete | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = () => {
    api.get<Athlete[]>('/athletes').then(setAthletes).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    api.get<Club[]>('/clubs').then(setClubs).catch(console.error);
  }, []);

  const filtered = useMemo(
    () =>
      athletes.filter(
        (a) =>
          !search ||
          `${a.firstName} ${a.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
          (a.clubName ?? '').toLowerCase().includes(search.toLowerCase()),
      ),
    [athletes, search],
  );

  const age = (birthDate: string) => {
    const b = dayjs(birthDate);
    let years = dayjs().year() - b.year();
    if (dayjs().isBefore(b.add(years, 'year'))) years -= 1;
    return years;
  };

  const openNew = () => {
    setEditing(null);
    setForm({});
    setErrors({});
    setOpen(true);
  };

  const openEdit = (a: Athlete) => {
    setEditing(a);
    setForm({
      lastName: a.lastName,
      firstName: a.firstName,
      birthDate: a.birthDate,
      gender: a.gender,
      weightKg: a.weightKg != null ? String(a.weightKg) : '',
      clubId: a.clubId != null ? String(a.clubId) : '',
      phone: a.phone ?? '',
      notes: a.notes ?? '',
    });
    setErrors({});
    setOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!(form.lastName ?? '').trim()) e.lastName = 'Required';
    if (!(form.firstName ?? '').trim()) e.firstName = 'Required';
    if (!form.birthDate) e.birthDate = 'Required';
    if (!form.gender) e.gender = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        lastName: (form.lastName ?? '').trim(),
        firstName: (form.firstName ?? '').trim(),
        birthDate: form.birthDate ?? '',
        gender: (form.gender ?? '') as 'M' | 'F',
        weightKg: form.weightKg ? Number(form.weightKg) : null,
        clubId: form.clubId ? Number(form.clubId) : null,
        phone: form.phone || null,
        notes: form.notes || null,
      };
      if (editing) {
        await api.put(`/athletes/${editing.id}`, payload);
      } else {
        await api.post('/athletes', payload);
      }
      setOpen(false);
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    const ok = await confirm({
      title: "Supprimer l'athlète",
      message: t('common.confirm', 'Êtes-vous sûr de vouloir supprimer cet athlète ?'),
      confirmLabel: "Supprimer",
      cancelLabel: "Annuler",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.del(`/athletes/${id}`);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <PageHeader
        title={t('athletes.title')}
        subtitle={t('athletes.subtitle')}
        extra={
          <button onClick={openNew} className="brand-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all">
            <Plus size={16} /> {t('athletes.create')}
          </button>
        }
      />

      {/* Table card */}
      <div className="card-elevated overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              placeholder={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-bg-subtle pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
          <span className="text-xs text-ink-muted">{filtered.length} / {athletes.length}</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-subtle">
                <th className="px-5 py-3 text-left text-xs font-semibold text-ink-muted">{t('athletes.lastName')}</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-ink-muted">{t('athletes.gender')}</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-ink-muted">{t('athletes.age')}</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-ink-muted">{t('athletes.weight')}</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-ink-muted">{t('athletes.club')}</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-ink-muted">{t('athletes.phone')}</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-ink-muted">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-sm text-ink-muted">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Inbox size={40} className="mb-3 text-ink-faint" />
                      <p className="text-sm font-medium text-ink">{search ? t('common.noResults') : t('athletes.empty')}</p>
                      {!search && (
                        <button onClick={openNew} className="mt-3 text-sm font-medium text-primary hover:text-primary-hover transition-colors">
                          {t('athletes.create')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="border-b border-border-muted hover:bg-primary/[0.03] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-xs font-bold text-primary">
                          {a.firstName.charAt(0)}{a.lastName.charAt(0)}
                        </span>
                        <span className="font-medium text-ink">{a.firstName} {a.lastName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        a.gender === 'M' ? 'bg-info/10 text-info' : 'bg-warning/10 text-warning'
                      }`}>
                        {a.gender === 'M' ? t('athletes.male') : t('athletes.female')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="rounded-md bg-bg-subtle px-2 py-0.5 text-xs font-medium text-ink-muted">{age(a.birthDate)}</span>
                    </td>
                    <td className="px-5 py-3 text-right text-ink-muted">
                      {a.weightKg != null ? `${a.weightKg} kg` : '—'}
                    </td>
                    <td className="px-5 py-3 text-ink-muted">{a.clubName ?? '—'}</td>
                    <td className="px-5 py-3 text-ink-muted">{a.phone ?? '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => openEdit(a)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-ink-muted hover:bg-bg-subtle hover:text-ink transition-colors"
                        >
                          <Edit size={13} /> {t('common.edit')}
                        </button>
                        <button
                          onClick={() => remove(a.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger-subtle transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="card-elevated w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto scrollbar-thin"
            style={{ animation: 'slideIn 0.2s ease' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold text-ink">
                {editing ? t('athletes.editTitle') : t('athletes.createTitle')}
              </h2>
              <button onClick={() => setOpen(false)} className="text-ink-muted hover:text-ink transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Last name + First name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">{t('athletes.lastName')} *</label>
                  <input
                    value={form.lastName ?? ''}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                  {errors.lastName && <span className="mt-0.5 text-xs text-danger">{errors.lastName}</span>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">{t('athletes.firstName')} *</label>
                  <input
                    value={form.firstName ?? ''}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                  {errors.firstName && <span className="mt-0.5 text-xs text-danger">{errors.firstName}</span>}
                </div>
              </div>

              {/* Birth date + Gender */}
              <div className="grid grid-cols-2 gap-3">
                <DateInput
                  label={t('athletes.birthDate')}
                  value={form.birthDate ?? ''}
                  onChange={(v) => setForm({ ...form, birthDate: v })}
                  required
                  error={errors.birthDate}
                />
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">{t('athletes.gender')} *</label>
                  <select
                    value={form.gender ?? ''}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                  >
                    <option value="">{t('athletes.gender')}</option>
                    <option value="M">{t('athletes.male')}</option>
                    <option value="F">{t('athletes.female')}</option>
                  </select>
                  {errors.gender && <span className="mt-0.5 text-xs text-danger">{errors.gender}</span>}
                </div>
              </div>

              {/* Weight + Club */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">{t('athletes.weight')}</label>
                  <input
                    type="number"
                    min={0}
                    max={250}
                    step={0.5}
                    value={form.weightKg ?? ''}
                    onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                    className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                    placeholder="kg"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">{t('athletes.club')}</label>
                  <select
                    value={form.clubId ?? ''}
                    onChange={(e) => setForm({ ...form, clubId: e.target.value })}
                    className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                  >
                    <option value="">{t('athletes.selectClub')}</option>
                    {clubs.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">{t('athletes.phone')}</label>
                <input
                  value={form.phone ?? ''}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">{t('athletes.notes')}</label>
                <textarea
                  rows={2}
                  value={form.notes ?? ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-ink-muted hover:bg-bg-subtle transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className="brand-gradient rounded-lg px-4 py-2 text-sm font-semibold transition-all disabled:opacity-60"
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
