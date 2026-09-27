import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  Trophy,
  Users,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  Building2,
  UserPlus,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { api } from '../api';
import { useAppSettings } from '../settings';

interface TokenInfoData {
  competition: {
    id: number;
    name: string;
    date: string;
    location: string;
    status: string;
  };
  wilaya: {
    id: number;
    code: number;
    nameFr: string;
    nameAr: string;
  };
  clubs: Array<{
    id: number;
    name: string;
    shortName: string | null;
  }>;
  athletes: Array<{
    id: number;
    firstName: string;
    lastName: string;
    gender: 'M' | 'F';
    birthDate: string;
    clubId: number;
    weightKg: number | null;
  }>;
  categories: Array<{
    id: number;
    name: string;
    gender: string;
    minAge: number;
    maxAge: number;
    minKg: number | null;
    maxKg: number | null;
  }>;
  existingRegistrations: Array<{
    id: number;
    athleteId: number;
    firstName: string;
    lastName: string;
    gender: string;
    weightKg: number | null;
    clubName: string;
    clubId: number;
    subDepartmentId: number | null;
    status: string;
  }>;
  expiresAt: string;
}

export default function LeagueRegistrationPortal() {
  const { competitionId } = useParams<{ competitionId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const { t } = useTranslation();
  const { rtl } = useAppSettings();

  const [data, setData] = useState<TokenInfoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [registrationMode, setRegistrationMode] = useState<'existing' | 'new'>('existing');
  const [submitting, setSubmitting] = useState(false);

  // Existing athlete form
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [existingWeight, setExistingWeight] = useState<string>('');
  const [existingCatId, setExistingCatId] = useState<string>('');

  // New inline athlete form
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newGender, setNewGender] = useState<'M' | 'F'>('M');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newClubId, setNewClubId] = useState<string>('');
  const [newWeight, setNewWeight] = useState<string>('');
  const [newPhone, setNewPhone] = useState('');
  const [newCatId, setNewCatId] = useState<string>('');

  const loadData = async () => {
    if (!token) {
      setError(
        rtl
          ? 'رمز التسجيل غير موجود في الرابط. يرجى مراجعة الرابط الممنوح من قبل إدارة البطولة.'
          : 'Jeton d’inscription absent. Veuillez utiliser le lien complet fourni par les organisateurs.'
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.get<TokenInfoData>(`/league/token-info?token=${encodeURIComponent(token)}`);
      setData(res);
      if (res.clubs.length > 0 && res.clubs[0]) {
        setNewClubId(String(res.clubs[0].id));
      }
    } catch (err: any) {
      setError(
        err.message ||
          (rtl
            ? 'رابط التسجيل غير صالح أو منتهي الصلاحية.'
            : 'Ce lien d’inscription est invalide ou a expiré.')
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token, competitionId]);

  const handleRegisterExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAthleteId) {
      setError(rtl ? 'يرجى اختيار الرياضي' : 'Veuillez sélectionner un athlète');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await api.post('/league/register-with-token', {
        token,
        athleteId: Number(selectedAthleteId),
        weightKg: existingWeight ? Number(existingWeight) : null,
        subDepartmentId: existingCatId ? Number(existingCatId) : null,
      });

      setSuccessMsg(rtl ? 'تم تسجيل الرياضي بنجاح' : 'Athlète inscrit avec succès !');
      setSelectedAthleteId('');
      setExistingWeight('');
      setExistingCatId('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l’inscription');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName || !newLastName || !newBirthDate || !newClubId) {
      setError(rtl ? 'يرجى ملء جميع الحقول الإلزامية' : 'Veuillez renseigner tous les champs obligatoires');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await api.post('/league/register-with-token', {
        token,
        inlineAthlete: {
          firstName: newFirstName,
          lastName: newLastName,
          gender: newGender,
          birthDate: newBirthDate,
          clubId: Number(newClubId),
          phone: newPhone || undefined,
        },
        weightKg: newWeight ? Number(newWeight) : null,
        subDepartmentId: newCatId ? Number(newCatId) : null,
      });

      setSuccessMsg(rtl ? 'Nouvel athlète créé et inscrit avec succès !' : 'Nouvel athlète créé et inscrit avec succès !');
      setNewFirstName('');
      setNewLastName('');
      setNewBirthDate('');
      setNewWeight('');
      setNewPhone('');
      setNewCatId('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création et inscription');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (registrationId: number, athleteName: string) => {
    if (!window.confirm(`Confirmez-vous le retrait de l'athlète ${athleteName} de la compétition ?`)) {
      return;
    }

    try {
      await api.post('/league/withdraw-with-token', {
        token,
        registrationId,
      });
      setSuccessMsg(`Athlète ${athleteName} retiré de la compétition.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors du retrait de l’athlète');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-primary border-t-transparent" />
          <span className="text-sm font-medium text-ink-muted">
            Vérification de l’autorisation de la ligue...
          </span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4" dir={rtl ? 'rtl' : 'ltr'}>
        <div className="max-w-md w-full bg-surface p-8 rounded-2xl border border-border shadow-sm text-center">
          <AlertCircle size={44} className="mx-auto text-danger mb-4" />
          <h2 className="text-lg font-bold text-ink">
            {rtl ? 'تعذر فتح بوابة التسجيل' : 'Accès au portail non autorisé'}
          </h2>
          <p className="text-sm text-ink-muted mt-2">{error}</p>
          <div className="mt-6">
            <Link
              to="/competitions"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover"
            >
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isRegistrationOpen = data.competition.status === 'REGISTRATION_OPEN';

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col" dir={rtl ? 'rtl' : 'ltr'}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-bold shadow-md shadow-primary/20">
              {String(data.wilaya.code).padStart(2, '0')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  Ligue de Wilaya ({data.wilaya.nameFr})
                </span>
                <span className="text-xs font-arabic text-ink-muted">
                  {data.wilaya.nameAr}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-ink leading-tight">
                Portail d'Inscription · {data.competition.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-ink-muted bg-bg-subtle px-3 py-1.5 rounded-xl border border-border">
              <Clock size={14} className="text-primary" />
              <span>Valable jusqu'au {new Date(data.expiresAt).toLocaleDateString()}</span>
            </div>
            <Link
              to={`/public/competitions/${data.competition.id}`}
              className="text-xs font-semibold text-primary hover:underline"
              target="_blank"
            >
              Voir l'arbre public →
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Status Banners */}
        {!isRegistrationOpen && (
          <div className="flex items-center gap-3 rounded-2xl bg-warning-subtle p-4 border border-warning/30 text-sm text-warning">
            <AlertCircle size={20} className="shrink-0" />
            <div>
              <strong>Inscriptions closes :</strong> La phase d'inscription pour cette compétition est
              actuellement terminée (Statut: {data.competition.status}). Les modifications ne sont plus acceptées.
            </div>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-3 rounded-2xl bg-success-subtle p-4 border border-success/30 text-sm text-success">
            <CheckCircle2 size={20} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 rounded-2xl bg-danger-subtle p-4 border border-danger/30 text-sm text-danger">
            <AlertCircle size={20} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface p-4 rounded-2xl border border-border shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-ink-muted uppercase">
              <Building2 size={16} className="text-primary" />
              <span>Clubs de la Wilaya</span>
            </div>
            <div className="text-2xl font-bold text-ink mt-1">
              {data.clubs.length}
            </div>
            <div className="text-xs text-ink-muted mt-0.5">
              enregistrés pour Wilaya {data.wilaya.code}
            </div>
          </div>

          <div className="bg-surface p-4 rounded-2xl border border-border shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-ink-muted uppercase">
              <Users size={16} className="text-primary" />
              <span>Athlètes de la Wilaya</span>
            </div>
            <div className="text-2xl font-bold text-ink mt-1">
              {data.athletes.length}
            </div>
            <div className="text-xs text-ink-muted mt-0.5">
              disponibles dans la base
            </div>
          </div>

          <div className="bg-surface p-4 rounded-2xl border border-border shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-ink-muted uppercase">
              <Trophy size={16} className="text-primary" />
              <span>Athlètes Inscrits</span>
            </div>
            <div className="text-2xl font-bold text-primary mt-1">
              {data.existingRegistrations.length}
            </div>
            <div className="text-xs text-ink-muted mt-0.5">
              au tournoi officiel
            </div>
          </div>
        </div>

        {/* ── Inscription Form Section ───────────────────────────────────── */}
        {isRegistrationOpen && (
          <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-border shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold text-ink">Inscrire un Athlète</h3>
                <p className="text-xs text-ink-muted">
                  Sélectionnez un athlète existant ou saisissez les informations d'un nouvel athlète de votre wilaya.
                </p>
              </div>

              <div className="flex rounded-xl bg-bg-subtle p-1 border border-border text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setRegistrationMode('existing')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    registrationMode === 'existing'
                      ? 'bg-surface text-ink shadow-xs'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  Athlète Existant
                </button>
                <button
                  type="button"
                  onClick={() => setRegistrationMode('new')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    registrationMode === 'new'
                      ? 'bg-surface text-ink shadow-xs'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  Nouvel Athlète
                </button>
              </div>
            </div>

            {registrationMode === 'existing' ? (
              <form onSubmit={handleRegisterExisting} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                    Sélectionner l'athlète *
                  </label>
                  <select
                    value={selectedAthleteId}
                    onChange={(e) => {
                      setSelectedAthleteId(e.target.value);
                      const ath = data.athletes.find((a) => a.id === Number(e.target.value));
                      if (ath && ath.weightKg) {
                        setExistingWeight(String(ath.weightKg));
                      }
                    }}
                    required
                    className="w-full rounded-xl border border-border bg-bg-subtle py-2.5 px-3 text-sm text-ink focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                  >
                    <option value="">-- Choisir un athlète de la wilaya ({data.athletes.length}) --</option>
                    {data.athletes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.lastName.toUpperCase()} {a.firstName} ({a.gender === 'F' ? 'F' : 'M'}, né(e) en {a.birthDate?.slice(0, 4) || '?'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                    Poids (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={existingWeight}
                    onChange={(e) => setExistingWeight(e.target.value)}
                    placeholder="Ex: 68.5"
                    className="w-full rounded-xl border border-border bg-bg-subtle py-2 px-3 text-sm text-ink focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                    Catégorie ciblée (Optionnel - Résolution auto par défaut)
                  </label>
                  <select
                    value={existingCatId}
                    onChange={(e) => setExistingCatId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-bg-subtle py-2 px-3 text-sm text-ink focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                  >
                    <option value="">Résolution automatique selon âge & poids</option>
                    {data.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={submitting || !selectedAthleteId}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {submitting ? 'Inscription en cours...' : 'Valider l’inscription'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegisterNew} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                      Nom *
                    </label>
                    <input
                      type="text"
                      value={newLastName}
                      onChange={(e) => setNewLastName(e.target.value)}
                      placeholder="BENALI"
                      required
                      className="w-full rounded-xl border border-border bg-bg-subtle py-2 px-3 text-sm text-ink focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                      Prénom *
                    </label>
                    <input
                      type="text"
                      value={newFirstName}
                      onChange={(e) => setNewFirstName(e.target.value)}
                      placeholder="Amine"
                      required
                      className="w-full rounded-xl border border-border bg-bg-subtle py-2 px-3 text-sm text-ink focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                      Date de Naissance *
                    </label>
                    <input
                      type="date"
                      value={newBirthDate}
                      onChange={(e) => setNewBirthDate(e.target.value)}
                      required
                      className="w-full rounded-xl border border-border bg-bg-subtle py-2 px-3 text-sm text-ink focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                      Sexe *
                    </label>
                    <select
                      value={newGender}
                      onChange={(e) => setNewGender(e.target.value as 'M' | 'F')}
                      className="w-full rounded-xl border border-border bg-bg-subtle py-2 px-3 text-sm text-ink focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                    >
                      <option value="M">Masculin (M)</option>
                      <option value="F">Féminin (F)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                      Club de Wilaya *
                    </label>
                    <select
                      value={newClubId}
                      onChange={(e) => setNewClubId(e.target.value)}
                      required
                      className="w-full rounded-xl border border-border bg-bg-subtle py-2 px-3 text-sm text-ink focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                    >
                      {data.clubs.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                      Poids (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={newWeight}
                      onChange={(e) => setNewWeight(e.target.value)}
                      placeholder="67.5"
                      className="w-full rounded-xl border border-border bg-bg-subtle py-2 px-3 text-sm text-ink focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="0555..."
                      className="w-full rounded-xl border border-border bg-bg-subtle py-2 px-3 text-sm text-ink focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2 px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {submitting ? 'Enregistrement...' : 'Créer & Inscrire'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── Registered Roster Table ────────────────────────────────────── */}
        <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-xs">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink">
              Roster Inscrit de la Wilaya ({data.existingRegistrations.length})
            </h3>
            <span className="text-xs text-ink-muted font-medium">
              Statut : Validé pour le tirage
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-subtle text-xs font-semibold uppercase tracking-wider text-ink-muted border-b border-border">
                <tr>
                  <th className="px-4 py-3">Athlète</th>
                  <th className="px-4 py-3">Sexe</th>
                  <th className="px-4 py-3">Poids</th>
                  <th className="px-4 py-3">Club</th>
                  <th className="px-4 py-3">Statut</th>
                  {isRegistrationOpen && <th className="px-4 py-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.existingRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-ink-muted">
                      Aucun athlète de la wilaya inscrit pour le moment.
                    </td>
                  </tr>
                ) : (
                  data.existingRegistrations.map((r) => (
                    <tr key={r.id} className="hover:bg-bg-subtle/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-ink">
                        {r.lastName.toUpperCase()} {r.firstName}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          r.gender === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {r.gender === 'F' ? 'F' : 'M'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {r.weightKg ? `${r.weightKg} kg` : '-'}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink">
                        {r.clubName}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-success font-medium">
                          <CheckCircle2 size={14} />
                          Inscrit
                        </span>
                      </td>
                      {isRegistrationOpen && (
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleWithdraw(r.id, `${r.firstName} ${r.lastName}`)}
                            className="inline-flex items-center gap-1 rounded-lg border border-danger/20 bg-danger-subtle px-2.5 py-1 text-xs font-semibold text-danger hover:bg-danger hover:text-white transition-colors cursor-pointer"
                            title="Retirer cet athlète"
                          >
                            <Trash2 size={13} />
                            <span>Retirer</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-border bg-surface py-4 px-6 text-center text-xs text-ink-muted">
        <span>Portail officiel des Ligues Régionales et de Wilayas · Sport Compétition Algérie</span>
      </footer>
    </div>
  );
}
