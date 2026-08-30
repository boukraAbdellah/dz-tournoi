import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';
import { api } from '../api';
import PageHeader from '../components/PageHeader';
import type { SportTemplate, AgeCategory, WeightDivision } from '../types';

interface TemplateDetail extends SportTemplate {
  ageCategories: AgeCategory[];
  weightDivisions: WeightDivision[];
}

export default function TemplatesPage() {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<SportTemplate[]>([]);
  const [selected, setSelected] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<SportTemplate[]>('/templates').then(setTemplates).catch(console.error).finally(() => setLoading(false));
  }, []);

  const loadDetail = (id: number) => {
    api.get<TemplateDetail>(`/templates/${id}`).then(setSelected).catch(console.error);
  };

  return (
    <div>
      <PageHeader title={t('templates.title')} subtitle={t('templates.subtitle')} />

      {loading ? (
        <div className="card-elevated py-16 text-center text-sm text-ink-muted">{t('common.loading')}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => loadDetail(tpl.id)}
              className={`card-elevated p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                selected?.id === tpl.id ? 'ring-2 ring-primary/40' : ''
              }`}
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileText size={20} />
                </span>
                <div>
                  <div className="text-sm font-semibold text-ink">{tpl.name}</div>
                  {tpl.builtin && (
                    <span className="text-[10px] font-medium text-success bg-success/10 px-1.5 py-0.5 rounded">
                      {t('templates.builtin')}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Age categories */}
          <div className="card-elevated p-5">
            <h3 className="mb-3 text-sm font-semibold text-ink">{t('templates.ageCategories')}</h3>
            <div className="space-y-2">
              {selected.ageCategories.map((ac) => (
                <div key={ac.id} className="flex items-center justify-between rounded-lg border border-border-muted px-3 py-2">
                  <span className="text-sm font-medium text-ink">{ac.name}</span>
                  <span className="text-xs text-ink-muted">
                    {ac.minAge} – {ac.maxAge ?? '∞'} {t('common.years')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Weight divisions */}
          <div className="card-elevated p-5">
            <h3 className="mb-3 text-sm font-semibold text-ink">{t('templates.weightDivisions')}</h3>
            <div className="space-y-3">
              {selected.ageCategories.map((ac) => {
                const weights = selected.weightDivisions.filter((w) => w.ageCategoryId === ac.id);
                if (weights.length === 0) return null;
                return (
                  <div key={ac.id}>
                    <div className="mb-1.5 text-xs font-medium text-ink-muted">{ac.name}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {weights.map((wd) => (
                        <span key={wd.id} className="inline-flex items-center rounded-md border border-border bg-bg-subtle px-2 py-0.5 text-xs text-ink">
                          {wd.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
