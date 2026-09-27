import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Trophy,
  Users,
  Swords,
  Medal,
  Share2,
  Printer,
  Calendar,
  MapPin,
  Check,
  Search,
  ExternalLink,
  Shield,
  Clock,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { api } from '../api';
import { useAppSettings } from '../settings';
import BracketViewer from '../components/BracketViewer';
import StatusBadge from '../components/StatusBadge';
import { STATUS_LABEL } from '../utils/statusLabels';

interface CategoryItem {
  id: number;
  gender: string;
  enabled: boolean;
  format: string;
  drawGeneratedAt: string | null;
  drawLockedAt: string | null;
  ageCatName: string;
  weightDivName: string;
  name: string;
  registrationCount: number;
}

interface CompetitionData {
  id: number;
  name: string;
  date: string;
  location: string;
  description: string | null;
  templateName: string;
  status: string;
  categories: CategoryItem[];
  totalRegistrations: number;
}

interface ParticipantRow {
  id: number;
  firstName: string;
  lastName: string;
  gender: string;
  weightKg: number | null;
  clubName: string | null;
  wilayaNameFr: string | null;
  wilayaNameAr: string | null;
  wilayaCode: number | null;
  subDepartmentId: number | null;
  ageCatName: string | null;
  weightDivName: string | null;
}

interface CategoryRankings {
  categoryId: number;
  categoryName: string;
  first: { athleteName: string; clubName: string } | null;
  second: { athleteName: string; clubName: string } | null;
  bronze1: { athleteName: string; clubName: string } | null;
  bronze2: { athleteName: string; clubName: string } | null;
}

export default function PublicTournamentView() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { lang, setLang, rtl } = useAppSettings();

  const [competition, setCompetition] = useState<CompetitionData | null>(null);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [rankings, setRankings] = useState<CategoryRankings[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [bracketData, setBracketData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [bracketLoading, setBracketLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'bracket' | 'participants' | 'podiums'>('bracket');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchInitial = async () => {
      setLoading(true);
      try {
        const comp = await api.get<CompetitionData>(`/public/competitions/${id}`);
        setCompetition(comp);

        if (comp.categories && comp.categories.length > 0) {
          const firstValid = comp.categories.find((c) => c.drawGeneratedAt) || comp.categories[0];
          if (firstValid) {
            setSelectedCatId(firstValid.id);
          }
        }

        const [parts, rankRes] = await Promise.all([
          api.get<ParticipantRow[]>(`/public/competitions/${id}/participants`).catch(() => []),
          api.get<any>(`/public/competitions/${id}/rankings`).catch(() => null),
        ]);

        setParticipants(parts);
        if (rankRes && rankRes.rankings && rankRes.rankings.individual) {
          setRankings(rankRes.rankings.individual);
        }
      } catch (err) {
        console.error('Failed to load public competition', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitial();
  }, [id]);

  useEffect(() => {
    if (!id || !selectedCatId) return;
    const fetchBracket = async () => {
      setBracketLoading(true);
      try {
        const data = await api.get<any>(`/public/competitions/${id}/bracket/${selectedCatId}`);
        setBracketData(data);
      } catch (err) {
        setBracketData(null);
      } finally {
        setBracketLoading(false);
      }
    };
    fetchBracket();
  }, [id, selectedCatId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🏆 Suivez en direct les résultats et l'arbre des combats de "${competition?.name}": ${window.location.href}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const filteredParticipants = useMemo(() => {
    if (!searchQuery.trim()) return participants;
    const q = searchQuery.toLowerCase();
    return participants.filter(
      (p) =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        (p.clubName && p.clubName.toLowerCase().includes(q)) ||
        (p.wilayaNameFr && p.wilayaNameFr.toLowerCase().includes(q)) ||
        (p.weightDivName && p.weightDivName.toLowerCase().includes(q))
    );
  }, [participants, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-primary border-t-transparent" />
          <span className="text-sm font-medium text-ink-muted">Chargement du tournoi...</span>
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-surface p-8 rounded-2xl border border-border shadow-sm">
          <Trophy size={48} className="mx-auto text-ink-faint mb-4" />
          <h2 className="text-lg font-bold text-ink">Compétition introuvable</h2>
          <p className="text-sm text-ink-muted mt-2">
            Le tournoi demandé n'est pas disponible ou a été déplacé.
          </p>
          <Link
            to="/competitions"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover"
          >
            Voir les compétitions
          </Link>
        </div>
      </div>
    );
  }

  const selectedCategoryObj = competition.categories.find((c) => c.id === selectedCatId);

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col" dir={rtl ? 'rtl' : 'ltr'}>
      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-bold shadow-md shadow-primary/20">
              SC
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {competition.templateName}
                </span>
                <StatusBadge
                  label={STATUS_LABEL[competition.status] ?? competition.status}
                  tone={competition.status === 'COMPLETED' ? 'success' : competition.status === 'IN_PROGRESS' ? 'warning' : 'default'}
                />
              </div>
              <h1 className="text-base sm:text-lg font-bold text-ink leading-tight">
                {competition.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === 'fr' ? 'ar' : 'fr')}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-bg-subtle px-3 text-xs font-semibold hover:bg-surface transition-colors"
            >
              {lang === 'fr' ? 'عربي' : 'FR'}
            </button>

            <button
              onClick={handleCopyLink}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-ink hover:bg-bg-subtle transition-all cursor-pointer"
              title="Copier le lien public"
            >
              {copied ? <Check size={15} className="text-success" /> : <Share2 size={15} />}
              <span className="hidden sm:inline">{copied ? 'Copié !' : 'Partager'}</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-[#25D366] text-white px-3 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
              title="Partager sur WhatsApp"
            >
              <span>WhatsApp</span>
            </button>

            <button
              onClick={() => window.print()}
              className="hidden md:flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-ink hover:bg-bg-subtle transition-colors"
              title="Imprimer cette page"
            >
              <Printer size={15} />
              <span>Imprimer</span>
            </button>

            <Link
              to="/login"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-primary/20 bg-primary-subtle text-primary px-3 text-xs font-semibold hover:bg-primary hover:text-white transition-all ml-1"
            >
              <Shield size={14} />
              <span className="hidden lg:inline">Espace Organisateur</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Tournament Subheader ─────────────────────────────────────────── */}
      <section className="bg-surface border-b border-border py-4 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-ink-muted">
            <div className="flex items-center gap-1.5">
              <Calendar size={15} className="text-ink-faint" />
              <span>{competition.date}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin size={15} className="text-ink-faint" />
              <span>{competition.location}</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium text-ink">
              <Users size={15} className="text-primary" />
              <span>{competition.totalRegistrations} participants inscrits</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 p-1 bg-bg-subtle rounded-xl border border-border text-xs sm:text-sm font-medium">
            <button
              onClick={() => setActiveTab('bracket')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'bracket'
                  ? 'bg-surface text-ink font-semibold shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Swords size={16} />
              <span>Tableau des combats</span>
            </button>
            <button
              onClick={() => setActiveTab('participants')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'participants'
                  ? 'bg-surface text-ink font-semibold shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Users size={16} />
              <span>Participants ({participants.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('podiums')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'podiums'
                  ? 'bg-surface text-ink font-semibold shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Medal size={16} />
              <span>Podiums</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Main Tab Content ─────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6">
        {/* Tab 1: Bracket View */}
        {activeTab === 'bracket' && (
          <div className="space-y-4">
            {/* Category Selector Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3.5 rounded-2xl border border-border shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Catégorie :
                </span>
                <select
                  value={selectedCatId ?? ''}
                  onChange={(e) => setSelectedCatId(Number(e.target.value))}
                  className="rounded-xl border border-border bg-bg-subtle py-1.5 px-3 text-sm font-semibold text-ink focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                >
                  {competition.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.registrationCount} athlètes)
                      {c.drawGeneratedAt ? ' - Tirage prêt' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCategoryObj && (
                <div className="flex items-center gap-2 text-xs text-ink-muted">
                  {selectedCategoryObj.drawGeneratedAt ? (
                    <span className="flex items-center gap-1.5 text-success font-medium bg-success-subtle px-2.5 py-1 rounded-full border border-success/20">
                      <Sparkles size={13} />
                      Tirage au sort officiel
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-warning font-medium bg-warning-subtle px-2.5 py-1 rounded-full border border-warning/20">
                      <Clock size={13} />
                      Tirage non encore généré
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Bracket Render Container */}
            {bracketLoading ? (
              <div className="h-80 flex items-center justify-center bg-surface rounded-2xl border border-border">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
                  <span className="text-xs text-ink-muted">Chargement du tableau...</span>
                </div>
              </div>
            ) : bracketData && bracketData.matches && bracketData.matches.length > 0 ? (
              <div className="bg-surface rounded-2xl border border-border p-4 shadow-sm overflow-hidden">
                <BracketViewer
                  bracket={bracketData}
                  // Read-only mode for public: no enterResult or swap handlers
                />
              </div>
            ) : (
              <div className="h-72 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 p-6 text-center">
                <Swords size={40} className="text-ink-faint mb-3" />
                <h3 className="text-base font-bold text-ink">Tableau non disponible</h3>
                <p className="text-xs sm:text-sm text-ink-muted max-w-md mt-1">
                  Le tirage au sort pour cette catégorie n'a pas encore été validé par la direction du tournoi.
                  Veuillez consulter les participants ou revenir plus tard.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Participants Roster */}
        {activeTab === 'participants' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3.5 rounded-2xl border border-border shadow-xs">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un athlète, un club, une wilaya..."
                  className="w-full rounded-xl border border-border bg-bg-subtle py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
              <span className="text-xs font-semibold text-ink-muted">
                {filteredParticipants.length} athlète(s) affiché(s)
              </span>
            </div>

            <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-bg-subtle text-xs font-semibold uppercase tracking-wider text-ink-muted border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Athlète</th>
                      <th className="px-4 py-3">Sexe</th>
                      <th className="px-4 py-3">Catégorie</th>
                      <th className="px-4 py-3">Poids</th>
                      <th className="px-4 py-3">Club</th>
                      <th className="px-4 py-3">Wilaya</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredParticipants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-ink-muted">
                          Aucun athlète trouvé.
                        </td>
                      </tr>
                    ) : (
                      filteredParticipants.map((p) => (
                        <tr key={p.id} className="hover:bg-bg-subtle/50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-ink">
                            {p.lastName.toUpperCase()} {p.firstName}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              p.gender === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {p.gender === 'F' ? 'Féminin' : 'Masculin'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-ink-muted">
                            {p.ageCatName} - {p.weightDivName}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-ink">
                            {p.weightKg ? `${p.weightKg} kg` : '-'}
                          </td>
                          <td className="px-4 py-3 text-ink font-medium">
                            {p.clubName || '-'}
                          </td>
                          <td className="px-4 py-3">
                            {p.wilayaNameFr ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                                <span className="font-mono font-bold text-ink-faint">
                                  {p.wilayaCode ? String(p.wilayaCode).padStart(2, '0') : ''}
                                </span>
                                {p.wilayaNameFr}
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Podiums and Rankings */}
        {activeTab === 'podiums' && (
          <div className="space-y-4">
            {rankings.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
                <Medal size={40} className="text-ink-faint mb-3" />
                <h3 className="text-base font-bold text-ink">Aucun podium enregistré pour l'instant</h3>
                <p className="text-xs sm:text-sm text-ink-muted max-w-md mt-1">
                  Les classements et médailles apparaîtront au fur et à mesure de la complétion des finales et combats pour le bronze.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rankings.map((catRank) => (
                  <div
                    key={catRank.categoryId}
                    className="bg-surface rounded-2xl border border-border p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-ink border-b border-border pb-2.5 mb-3 flex items-center justify-between">
                        <span>{catRank.categoryName}</span>
                        <Trophy size={16} className="text-warning" />
                      </h4>

                      <div className="space-y-2.5 text-xs">
                        {/* 1st Place */}
                        <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white font-bold text-xs">
                              1
                            </span>
                            <div>
                              <div className="font-bold text-ink">
                                {catRank.first?.athleteName || 'En attente'}
                              </div>
                              <div className="text-[11px] text-ink-muted">
                                {catRank.first?.clubName || '-'}
                              </div>
                            </div>
                          </div>
                          <span className="font-semibold text-amber-700 text-xs">Or</span>
                        </div>

                        {/* 2nd Place */}
                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-500/10 border border-slate-500/20">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-400 text-white font-bold text-xs">
                              2
                            </span>
                            <div>
                              <div className="font-bold text-ink">
                                {catRank.second?.athleteName || 'En attente'}
                              </div>
                              <div className="text-[11px] text-ink-muted">
                                {catRank.second?.clubName || '-'}
                              </div>
                            </div>
                          </div>
                          <span className="font-semibold text-slate-700 text-xs">Argent</span>
                        </div>

                        {/* 3rd Place / Bronze */}
                        {(catRank.bronze1 || catRank.bronze2) && (
                          <div className="flex items-center justify-between p-2 rounded-xl bg-amber-700/10 border border-amber-700/20">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-700 text-white font-bold text-xs">
                                3
                              </span>
                              <div>
                                <div className="font-bold text-ink">
                                  {catRank.bronze1?.athleteName || catRank.bronze2?.athleteName}
                                </div>
                                <div className="text-[11px] text-ink-muted">
                                  {catRank.bronze1?.clubName || catRank.bronze2?.clubName || '-'}
                                </div>
                              </div>
                            </div>
                            <span className="font-semibold text-amber-800 text-xs">Bronze</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-border bg-surface py-4 px-6 text-center text-xs text-ink-muted">
        <span>Plateforme de Gestion des Compétitions Sportives · Algérie</span>
      </footer>
    </div>
  );
}
