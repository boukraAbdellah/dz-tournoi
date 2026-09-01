import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Trophy, MapPin, Calendar, X } from 'lucide-react';
import { api } from '../api';
import { isoToFr } from '../utils/dates';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import DateInput from '../components/DateInput';
import { useConfirm } from '../components/common/ConfirmDialog';
import type { SportTemplate } from '../types';

interface Competition {
  id: number;
  name: string;
  date: string;
  location: string | null;
  status: string;
  sportTemplateId: number;
  templateName: string | null;
}

const STATUS_TONE: Record<string, 'default' | 'success' | 'warning' | 'info' | 'danger'> = {
  DRAFT: 'default',
  REGISTRATION_OPEN: 'success',
  REGISTRATION_CLOSED: 'warning',
  DRAW_GENERATED: 'info',
  DRAW_CONFIRMED: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
};

export default function CompetitionsPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [templates, setTemplates] = useState<SportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const load = () => {
    api.get<Competition[]>('/competitions').then(setCompetitions).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    api.get<SportTemplate[]>('/templates').then(setTemplates).catch(console.error);
  }, []);

  const create = async () => {
    if (!form.name || !form.date || !form.sportTemplateId) return;
    setSaving(true);
    try {
      await api.post('/competitions', {
        name: form.name,
        date: form.date,
        location: form.location || null,
        description: form.description || null,
        sportTemplateId: Number(form.sportTemplateId),
      });
      setOpen(false);
      setForm({});
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    const ok = await confirm({
      title: "Supprimer la compétition",
      message: t('competitions.confirmDelete', 'Êtes-vous sûr de vouloir supprimer cette compétition ?'),
      confirmLabel: "Supprimer",
      cancelLabel: "Annuler",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.del(`/competitions/${id}`);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      DRAFT: 'Brouillon',
      REGISTRATION_OPEN: 'Inscriptions ouvertes',
      REGISTRATION_CLOSED: 'Inscriptions fermées',
      DRAW_GENERATED: 'Tableau généré',
      DRAW_CONFIRMED: 'Tableau confirmé',
      IN_PROGRESS: 'En cours',
      COMPLETED: 'Terminé',
    };
    return map[s] ?? s;
  };

  return (
    <div>
      <PageHeader
        title={t('competitions.title')}
        subtitle={t('competitions.subtitle')}
        extra={
          <button onClick={() => { setOpen(true); setForm({}); }} className="brand-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all">
            <Plus size={16} /> {t('competitions.create')}
          </button>
        }
      />

      {loading ? (
        <div className="card-elevated py-16 text-center text-sm text-ink-muted">{t('common.loading')}</div>
      ) : competitions.length === 0 ? (
        <div className="card-elevated flex flex-col items-center justify-center py-16 text-center">
          <Trophy size={40} className="mb-3 text-ink-faint" />
          <p className="text-sm font-medium text-ink">{t('competitions.noRegistrations')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {competitions.map((c) => (
            <Link
              key={c.id}
              to={`/competitions/${c.id}`}
              className="card-elevated group relative overflow-hidden bg-surface transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="h-1 w-full bg-gradient-to-r from-primary/40 via-primary/70 to-primary/40" />
              <div className="p-5">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink group-hover:text-primary transition-colors">{c.name}</div>
                    {c.templateName && (
                      <div className="mt-0.5 text-xs text-ink-muted">{c.templateName}</div>
                    )}
                  </div>
                  <StatusBadge label={statusLabel(c.status)} tone={STATUS_TONE[c.status]} />
                </div>
                <div className="flex flex-col gap-1 text-xs text-ink-muted">
                  <span className="flex items-center gap-1.5"><Calendar size={12} /> {isoToFr(c.date)}</span>
                  {c.location && <span className="flex items-center gap-1.5"><MapPin size={12} /> {c.location}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="card-elevated w-full max-w-lg mx-4" style={{ animation: 'slideIn 0.2s ease' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold text-ink">{t('competitions.createTitle')}</h2>
              <button onClick={() => setOpen(false)} className="text-ink-muted hover:text-ink transition-colors"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">{t('competitions.name')} *</label>
                <input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                  placeholder={t('competitions.namePlaceholder')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DateInput
                  label={t('competitions.date')}
                  value={form.date ?? ''}
                  onChange={(v) => setForm({ ...form, date: v })}
                  required
                />
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">{t('competitions.location')}</label>
                  <input value={form.location ?? ''} onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                    placeholder={t('competitions.locationPlaceholder')} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">{t('competitions.template')} *</label>
                <select value={form.sportTemplateId ?? ''} onChange={(e) => setForm({ ...form, sportTemplateId: e.target.value })}
                  className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all">
                  <option value="">{t('competitions.selectTemplate')}</option>
                  {templates.map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">{t('competitions.description')}</label>
                <textarea rows={2} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all resize-none" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
              <button onClick={() => setOpen(false)} className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-ink-muted hover:bg-bg-subtle transition-colors">{t('common.cancel')}</button>
              <button onClick={create} disabled={saving} className="brand-gradient rounded-lg px-4 py-2 text-sm font-semibold transition-all disabled:opacity-60">{t('common.save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
