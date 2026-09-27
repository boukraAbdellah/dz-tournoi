import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Printer, Download, Globe, RefreshCw, ExternalLink } from 'lucide-react';

interface Props {
  competitionId: number;
  docKey: string;
  docTitle: string;
  categories?: Array<{ id: number; name: string }>;
  onClose: () => void;
}

export default function DocumentPreviewModal({
  competitionId,
  docKey,
  docTitle,
  categories = [],
  onClose,
}: Props) {
  const { t } = useTranslation();
  const endpoint = docKey.startsWith('certificates') ? 'certificates' : docKey;

  const [lang, setLang] = useState<'fr' | 'ar'>('fr');
  const [selectedCatId, setSelectedCatId] = useState<number | undefined>(
    categories.length > 0 ? categories[0]?.id : undefined,
  );
  const [certType, setCertType] = useState<'participation' | 'winner'>(
    docKey === 'certificates-winner' ? 'winner' : 'participation',
  );
  const [zoom, setZoom] = useState<number>(
    endpoint === 'certificates' || endpoint === 'brackets' ? 0.85 : 1,
  );
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Construct query params
  const effectiveLang = endpoint === 'certificates' ? 'ar' : lang;
  const params = new URLSearchParams();
  params.set('format', 'html');
  params.set('lang', effectiveLang);
  if ((endpoint === 'brackets' || endpoint === 'match-sheets') && selectedCatId) {
    params.set('categoryId', String(selectedCatId));
  }
  if (endpoint === 'certificates') {
    params.set('certType', certType);
  }

  const previewUrl = `/api/competitions/${competitionId}/documents/${endpoint}?${params.toString()}`;

  const downloadPdf = () => {
    const pdfParams = new URLSearchParams(params);
    pdfParams.set('format', 'pdf');
    const pdfUrl = `/api/competitions/${competitionId}/documents/${endpoint}?${pdfParams.toString()}`;
    window.open(pdfUrl, '_blank');
  };

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs">
      <div className="flex h-[94vh] w-[98vw] max-w-[1360px] flex-col rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-bg-subtle px-5 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-ink">{docTitle}</h3>
            <p className="text-xs text-ink-muted">Aperçu officiel avant impression ou export</p>
          </div>

          {/* Controls toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category selector for brackets/sheets */}
            {(endpoint === 'brackets' || endpoint === 'match-sheets') && categories.length > 0 && (
              <select
                value={selectedCatId ?? ''}
                onChange={(e) => {
                  setSelectedCatId(e.target.value ? Number(e.target.value) : undefined);
                  setLoading(true);
                }}
                className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-ink outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Toutes les catégories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            {/* Certificate Type toggle */}
            {endpoint === 'certificates' && (
              <div className="flex rounded-lg border border-border bg-surface p-0.5 text-xs">
                <button
                  onClick={() => { setCertType('participation'); setLoading(true); }}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                    certType === 'participation' ? 'brand-gradient font-bold' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  Participation
                </button>
                <button
                  onClick={() => { setCertType('winner'); setLoading(true); }}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                    certType === 'winner' ? 'brand-gradient font-bold' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  Podium / Vainqueur
                </button>
              </div>
            )}

            {/* Zoom Selector */}
            <div className="flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-xs">
              <span className="text-ink-muted text-[11px]">Zoom:</span>
              {[0.7, 0.85, 1].map((z) => (
                <button
                  key={z}
                  onClick={() => setZoom(z)}
                  className={`rounded px-1.5 py-0.5 text-[11px] font-semibold transition-colors ${
                    zoom === z ? 'bg-primary text-primary-foreground' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {Math.round(z * 100)}%
                </button>
              ))}
            </div>

            {/* Language toggle (certificates are Arabic only for now) */}
            {endpoint === 'certificates' ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary">
                <Globe size={13} />
                العربية
              </span>
            ) : (
              <button
                onClick={() => {
                  setLang(lang === 'fr' ? 'ar' : 'fr');
                  setLoading(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-bg-subtle transition-colors"
              >
                <Globe size={13} />
                {lang === 'fr' ? 'العربية' : 'Français'}
              </button>
            )}

            {/* Print button */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-bg-subtle transition-colors"
              title="Imprimer directement"
            >
              <Printer size={14} />
              Imprimer
            </button>

            {/* Download PDF button */}
            <button
              onClick={downloadPdf}
              className="brand-gradient inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition-all"
            >
              <Download size={14} />
              Télécharger PDF
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-muted hover:bg-bg-subtle hover:text-ink transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Iframe Preview Container */}
        <div className="relative flex-1 bg-neutral-600/70 p-3 sm:p-5 dark:bg-neutral-900/90 overflow-auto flex justify-center items-start">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/60 backdrop-blur-xs">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink shadow-lg">
                <RefreshCw size={16} className="animate-spin text-primary" />
                Chargement du document...
              </div>
            </div>
          )}

          <div
            className="w-full max-w-[1240px] flex-1 flex flex-col rounded-xl bg-white shadow-2xl overflow-hidden min-h-[700px] border border-neutral-300 transition-transform duration-150"
            style={{ zoom }}
          >
            <iframe
              ref={iframeRef}
              src={previewUrl}
              onLoad={() => setLoading(false)}
              className="h-full w-full min-h-[760px] flex-1 border-0"
              title={docTitle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
