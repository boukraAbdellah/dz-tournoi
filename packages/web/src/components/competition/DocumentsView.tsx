import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Printer,
  Sparkles,
  Users,
  Grid,
  Swords,
  Trophy,
  Award,
} from 'lucide-react';
import DocumentPreviewModal from './DocumentPreviewModal';
import { api, API_BASE } from '../../api';

interface Props {
  competitionId: number;
}

interface CatalogDoc {
  key: string;
  titleFr: string;
  titleAr: string;
  ready: boolean;
  itemCount: number;
}

type FilterCategory = 'all' | 'lists' | 'draws' | 'matches' | 'rankings' | 'certificates';

export default function DocumentsView({ competitionId }: Props) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const [catalog, setCatalog] = useState<CatalogDoc[]>([]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [previewDoc, setPreviewDoc] = useState<{ key: string; title: string } | null>(null);

  useEffect(() => {
    api
      .get<{ catalog?: CatalogDoc[]; categories?: Array<{ id: number; name: string }> }>(
        `/competitions/${competitionId}/documents`,
      )
      .then((data) => {
        if (data.catalog) setCatalog(data.catalog);
        if (data.categories) setCategories(data.categories);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load documents catalog', err);
        setLoading(false);
      });
  }, [competitionId]);

  const getDocIcon = (key: string) => {
    switch (key) {
      case 'participants':
        return Users;
      case 'categories':
        return Grid;
      case 'brackets':
        return Swords;
      case 'match-sheets':
        return FileText;
      case 'rankings':
        return Trophy;
      default:
        return Award;
    }
  };

  const getDocSubtitle = (doc: CatalogDoc) => {
    switch (doc.key) {
      case 'participants':
        return `${doc.itemCount} ${t('common.athletes', 'athlètes')} · A4 Portrait`;
      case 'categories':
        return `${doc.itemCount} ${t('common.categories', 'catégories')} · A4 Portrait`;
      case 'brackets':
        return `${doc.itemCount} ${t('common.brackets', 'tableaux')} · A4 Paysage`;
      case 'match-sheets':
        return `${doc.itemCount} ${t('common.divisions', 'divisions')} · A4 Portrait`;
      case 'rankings':
        return `Podiums & Clubs · A4 Portrait`;
      case 'certificates-participation':
        return `${doc.itemCount} ${t('documents.certificates', 'attestations')} · A4 Paysage`;
      case 'certificates-winner':
        return `Podiums (Or, Argent, Bronze) · A4 Paysage`;
      default:
        return 'Document officiel';
    }
  };

  const handleDownloadDirect = (key: string) => {
    let endpoint = key;
    let extra = '';
    if (key === 'certificates-participation') {
      endpoint = 'certificates';
      extra = '&certType=participation';
    } else if (key === 'certificates-winner') {
      endpoint = 'certificates';
      extra = '&certType=winner';
    }

    const lang = endpoint === 'certificates' ? 'ar' : isArabic ? 'ar' : 'fr';
    const url = `${API_BASE}/competitions/${competitionId}/documents/${endpoint}?format=pdf&lang=${lang}${extra}`;
    window.open(url, '_blank');
  };

  const filteredCatalog = catalog.filter((doc) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'lists') return doc.key === 'participants' || doc.key === 'categories';
    if (activeFilter === 'draws') return doc.key === 'brackets';
    if (activeFilter === 'matches') return doc.key === 'match-sheets';
    if (activeFilter === 'rankings') return doc.key === 'rankings';
    if (activeFilter === 'certificates') return doc.key.startsWith('certificates');
    return true;
  });

  if (loading) {
    return (
      <div className="card-elevated flex items-center justify-center py-20 text-sm text-ink-muted">
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Subtitle and Filters ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-xl bg-bg-subtle p-1 border border-border">
          <button
            onClick={() => setActiveFilter('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeFilter === 'all'
                ? 'bg-surface text-ink shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {t('common.all', 'Tous')} ({catalog.length})
          </button>
          <button
            onClick={() => setActiveFilter('lists')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeFilter === 'lists'
                ? 'bg-surface text-ink shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {t('documents.filterLists', 'Listes')}
          </button>
          <button
            onClick={() => setActiveFilter('draws')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeFilter === 'draws'
                ? 'bg-surface text-ink shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {t('documents.filterBrackets', 'Tableaux')}
          </button>
          <button
            onClick={() => setActiveFilter('matches')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeFilter === 'matches'
                ? 'bg-surface text-ink shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {t('documents.filterSheets', 'Feuilles')}
          </button>
          <button
            onClick={() => setActiveFilter('rankings')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeFilter === 'rankings'
                ? 'bg-surface text-ink shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {t('documents.filterRankings', 'Classement')}
          </button>
          <button
            onClick={() => setActiveFilter('certificates')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeFilter === 'certificates'
                ? 'bg-surface text-ink shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {t('documents.filterCertificates', 'Diplômes')}
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <span className="flex h-2 w-2 rounded-full bg-success"></span>
          <span>{t('documents.printReady', 'Génération PDF vectorielle & Impression')}</span>
        </div>
      </div>

      {/* ── Document Cards Grid ────────────────────────────────────────── */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filteredCatalog.map((doc) => {
          const Icon = getDocIcon(doc.key);
          const title = isArabic ? doc.titleAr : doc.titleFr;
          const isReady = doc.ready;

          return (
            <article
              key={doc.key}
              className="card-elevated group relative flex flex-col overflow-hidden transition-all duration-200 hover:shadow-md"
            >
              {/* Faux PDF Thumbnail Stage (per UI style guide section 16) */}
              <div className="relative grid h-40 place-items-center bg-secondary/60 dark:bg-neutral-800/40 border-b border-border">
                <div className="relative h-28 w-20 rounded-md border border-border bg-surface shadow-md transition-transform duration-200 group-hover:scale-105">
                  <div className="absolute inset-x-3 top-4 space-y-1.5">
                    <div className="h-1 rounded bg-border" style={{ width: '100%' }} />
                    <div className="h-1 rounded bg-border" style={{ width: '80%' }} />
                    <div className="h-1 rounded bg-border" style={{ width: '90%' }} />
                    <div className="h-1 rounded bg-border" style={{ width: '60%' }} />
                    <div className="h-1 rounded bg-border" style={{ width: '75%' }} />
                  </div>
                  <span className="absolute bottom-1 end-1 rounded bg-primary px-1 text-[8px] font-bold text-primary-foreground">
                    PDF
                  </span>
                </div>

                {/* Readiness indicator */}
                <div className="absolute top-2.5 end-2.5">
                  {isReady ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
                      <CheckCircle2 size={11} /> {t('documents.ready', 'Prêt')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
                      <Clock size={11} /> {t('documents.pending', 'En attente')}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Meta & Actions */}
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary">
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-bold text-ink" title={title}>
                      {title}
                    </h4>
                    <p className="text-xs text-ink-muted">{getDocSubtitle(doc)}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 flex gap-2 pt-2 border-t border-border/60">
                  <button
                    onClick={() => setPreviewDoc({ key: doc.key, title })}
                    disabled={!isReady}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink hover:bg-bg-subtle hover:text-primary transition-colors disabled:opacity-50"
                  >
                    <Eye size={13} />
                    {t('documents.preview', 'Aperçu')}
                  </button>

                  <button
                    onClick={() => handleDownloadDirect(doc.key)}
                    disabled={!isReady}
                    className="brand-gradient inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
                  >
                    <Download size={13} />
                    {t('documents.download', 'Télécharger')}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* ── Preview Modal ──────────────────────────────────────────────── */}
      {previewDoc && (
        <DocumentPreviewModal
          competitionId={competitionId}
          docKey={previewDoc.key}
          docTitle={previewDoc.title}
          categories={categories}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}
