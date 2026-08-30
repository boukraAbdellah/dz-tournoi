import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, MapPin, Phone, Mail, Edit, Trash2, X, Inbox } from 'lucide-react';
import { api } from '../api';
import { useAppSettings } from '../settings';
import type { City, Club, Wilaya } from '../types';
import PageHeader from '../components/PageHeader';

export default function ClubsPage() {
  const { t } = useTranslation();
  const { lang } = useAppSettings();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [editing, setEditing] = useState<Club | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = () => {
    api.get<Club[]>('/clubs').then(setClubs).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    api.get<Wilaya[]>('/wilayas').then(setWilayas).catch(console.error);
    api.get<City[]>('/cities').then(setCities).catch(console.error);
  }, []);

  const wilayaName = (w: Wilaya) => (lang === 'ar' ? w.nameAr : w.nameFr);
  const cityName = (c: City) => (lang === 'ar' ? c.nameAr : c.nameFr);

  const availableCities = useMemo(
    () => cities.filter((c) => c.wilayaId === Number(form.wilayaId)),
    [cities, form.wilayaId],
  );

  const filtered = useMemo(
    () =>
      clubs.filter(
        (c) =>
          !search ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.wilayaName ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (c.cityName ?? '').toLowerCase().includes(search.toLowerCase()),
      ),
    [clubs, search],
  );

  const openNew = () => {
    setEditing(null);
    setForm({});
    setErrors({});
    setOpen(true);
  };

  const openEdit = (club: Club) => {
    setEditing(club);
    setForm({
      name: club.name,
      wilayaId: String(club.wilayaId),
      cityId: String(club.cityId),
      phone: club.phone ?? '',
      email: club.email ?? '',
      address: club.address ?? '',
      notes: club.notes ?? '',
    });
    setErrors({});
    setOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!(form.name ?? '').trim()) e.name = 'Required';
    if (!form.wilayaId) e.wilayaId = 'Required';
    if (!form.cityId) e.cityId = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: (form.name ?? '').trim(),
        wilayaId: Number(form.wilayaId),
        cityId: Number(form.cityId),
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        notes: form.notes || null,
      };
      if (editing) {
        await api.put(`/clubs/${editing.id}`, payload);
      } else {
        await api.post('/clubs', payload);
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
    if (!window.confirm(t('common.confirm'))) return;
    try {
      await api.del(`/clubs/${id}`);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <PageHeader
        title={t('clubs.title')}
        subtitle={t('clubs.subtitle')}
        extra={
          <button onClick={openNew} className="brand-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all">
            <Plus size={16} /> {t('clubs.create')}
          </button>
        }
      />

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>
        <span className="text-xs text-ink-muted">{filtered.length} / {clubs.length}</span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="card-elevated py-16 text-center text-sm text-ink-muted">{t('common.loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="card-elevated flex flex-col items-center justify-center py-16 text-center">
          <Inbox size={40} className="mb-3 text-ink-faint" />
          <p className="text-sm font-medium text-ink">{search ? t('common.noResults') : t('clubs.empty')}</p>
          {!search && (
            <button onClick={openNew} className="mt-3 text-sm font-medium text-primary hover:text-primary-hover transition-colors">
              {t('clubs.create')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((club) => (
            <div key={club.id} className="card-elevated group relative overflow-hidden bg-surface transition-all hover:-translate-y-0.5 hover:shadow-md">
              {/* Accent top */}
              <div className="h-1 w-full bg-gradient-to-r from-primary/40 via-primary/70 to-primary/40" />

              <div className="p-5">
                {/* Header */}
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-sm font-bold text-primary">
                      {club.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink">{club.name}</div>
                      <div className="flex items-center gap-1 text-xs text-ink-muted">
                        <MapPin size={12} />
                        {club.cityName ?? '—'}, {club.wilayaName ?? '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                {(club.phone || club.email) && (
                  <div className="mb-3 flex flex-col gap-1 text-xs text-ink-muted">
                    {club.phone && (
                      <span className="flex items-center gap-1.5"><Phone size={12} /> {club.phone}</span>
                    )}
                    {club.email && (
                      <span className="flex items-center gap-1.5"><Mail size={12} /> {club.email}</span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-border-muted">
                  <button
                    onClick={() => openEdit(club)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-bg-subtle hover:text-ink transition-colors"
                  >
                    <Edit size={13} /> {t('common.edit')}
                  </button>
                  <button
                    onClick={() => remove(club.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger-subtle transition-colors"
                  >
                    <Trash2 size={13} /> {t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
                {editing ? t('clubs.editTitle') : t('clubs.createTitle')}
              </h2>
              <button onClick={() => setOpen(false)} className="text-ink-muted hover:text-ink transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Name */}
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">{t('clubs.name')} *</label>
                <input
                  value={form.name ?? ''}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                  placeholder={t('clubs.namePlaceholder')}
                />
                {errors.name && <span className="mt-0.5 text-xs text-danger">{errors.name}</span>}
              </div>

              {/* Wilaya + City */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">{t('clubs.wilaya')} *</label>
                  <select
                    value={form.wilayaId ?? ''}
                    onChange={(e) => {
                      const firstCity = cities.find((c) => c.wilayaId === Number(e.target.value))?.id;
                      setForm({ ...form, wilayaId: e.target.value, cityId: firstCity ? String(firstCity) : '' });
                    }}
                    className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                  >
                    <option value="">{t('clubs.selectWilaya')}</option>
                    {wilayas.map((w) => (
                      <option key={w.id} value={w.id}>{w.code} - {wilayaName(w)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">{t('clubs.city')} *</label>
                  <select
                    value={form.cityId ?? ''}
                    onChange={(e) => setForm({ ...form, cityId: e.target.value })}
                    className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                    disabled={!form.wilayaId}
                  >
                    <option value="">{t('clubs.selectCity')}</option>
                    {availableCities.map((c) => (
                      <option key={c.id} value={c.id}>{cityName(c)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Phone + Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">{t('clubs.phone')}</label>
                  <input
                    value={form.phone ?? ''}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">{t('clubs.email')}</label>
                  <input
                    type="email"
                    value={form.email ?? ''}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">{t('clubs.address')}</label>
                <input
                  value={form.address ?? ''}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">{t('clubs.notes')}</label>
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
