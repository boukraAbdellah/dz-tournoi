import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Download, FileSpreadsheet, FileDown, AlertTriangle, CheckCircle } from 'lucide-react';
import type { ImportResult } from '../types';
import PageHeader from '../components/PageHeader';

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

export default function ImportExportPage() {
  const { t } = useTranslation();
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const doImport = async (file: File) => {
    setImporting(true);
    setResult(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/import/athletes`, { method: 'POST', body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? res.statusText);
      }
      const data = (await res.json()) as ImportResult;
      setResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setImporting(false);
    }
  };

  const download = (url: string) => {
    const a = document.createElement('a');
    a.href = `${API_BASE}${url}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div>
      <PageHeader title={t('importExport.title')} subtitle={t('importExport.subtitle')} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Import */}
        <div className="card-elevated p-6">
          <div className="mb-4 flex h-13 w-13 items-center justify-center rounded-xl bg-success/10 text-success">
            <Upload size={24} />
          </div>
          <h3 className="mb-1 text-base font-semibold text-ink">{t('importExport.importTitle')}</h3>
          <p className="mb-5 text-sm text-ink-muted leading-relaxed">{t('importExport.importHint')}</p>

          <label className="brand-gradient mb-4 inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all">
            <FileSpreadsheet size={16} />
            {importing ? t('common.loading') : t('importExport.chooseFile')}
            <input
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void doImport(file);
              }}
            />
          </label>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => download('/export/template')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
            >
              <FileDown size={14} /> {t('importExport.template')}
            </button>
            <button
              onClick={() => download('/export/athletes')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
            >
              <FileDown size={14} /> {t('importExport.exportAthletes')}
            </button>
          </div>

          {result && (
            <div className={`mt-5 rounded-lg border p-4 text-sm ${
              result.errors.length
                ? 'border-warning/30 bg-warning-subtle text-warning'
                : 'border-success/30 bg-success-subtle text-success'
            }`}>
              <div className="flex items-center gap-2 font-medium">
                {result.errors.length ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                {t('importExport.importDone', { created: result.created, skipped: result.skipped })}
              </div>
              {result.errors.length > 0 && (
                <div className="mt-2 text-xs opacity-80 whitespace-pre-line">{result.errors.join('\n')}</div>
              )}
            </div>
          )}
        </div>

        {/* Export */}
        <div className="card-elevated p-6">
          <div className="mb-4 flex h-13 w-13 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Download size={24} />
          </div>
          <h3 className="mb-1 text-base font-semibold text-ink">{t('importExport.exportTitle')}</h3>
          <p className="mb-5 text-sm text-ink-muted leading-relaxed">{t('importExport.exportHint')}</p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => download('/export/athletes')}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-bg-subtle transition-colors"
            >
              <FileSpreadsheet size={16} /> {t('importExport.exportAthletes')}
            </button>
            <button
              onClick={() => download('/export/clubs')}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-bg-subtle transition-colors"
            >
              <FileSpreadsheet size={16} /> {t('importExport.exportClubs')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
