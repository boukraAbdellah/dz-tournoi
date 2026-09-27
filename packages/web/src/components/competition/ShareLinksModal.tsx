import React, { useEffect, useState } from 'react';
import {
  X,
  Share2,
  ExternalLink,
  Copy,
  Check,
  Building2,
  Calendar,
  Sparkles,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { api } from '../../api';

interface WilayaOption {
  id: number;
  code: number;
  nameFr: string;
  nameAr: string;
}

interface GeneratedToken {
  id: number;
  token: string;
  competitionId: number;
  wilayaId: number;
  expiresAt: string;
  createdAt: string;
  wilayaNameFr: string;
  wilayaNameAr: string;
  wilayaCode: number;
}

interface ShareLinksModalProps {
  competitionId: number;
  competitionName: string;
  open: boolean;
  onClose: () => void;
}

export default function ShareLinksModal({
  competitionId,
  competitionName,
  open,
  onClose,
}: ShareLinksModalProps) {
  const [wilayas, setWilayas] = useState<WilayaOption[]>([]);
  const [activeTokens, setActiveTokens] = useState<GeneratedToken[]>([]);
  const [selectedWilayaId, setSelectedWilayaId] = useState<string>('');
  const [expiresInDays, setExpiresInDays] = useState<number>(7);
  const [generating, setGenerating] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [lastGeneratedUrl, setLastGeneratedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const publicUrl = `${window.location.origin}/public/competitions/${competitionId}`;

  useEffect(() => {
    if (!open) return;

    // Load wilayas and existing tokens
    api.get<WilayaOption[]>('/wilayas')
      .then((data) => {
        setWilayas(data);
        if (data.length > 0 && !selectedWilayaId && data[0]) {
          setSelectedWilayaId(String(data[0].id));
        }
      })
      .catch(() => {});

    loadTokens();
  }, [open, competitionId]);

  const loadTokens = async () => {
    try {
      const data = await api.get<GeneratedToken[]>(`/league/tokens/${competitionId}`);
      setActiveTokens(data);
    } catch {
      // not admin or error
    }
  };

  const handleCopy = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(identifier);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWilayaId) return;

    setGenerating(true);
    setError(null);
    try {
      const res = await api.post<{ token: string; url: string; expiresAt: string; wilayaName: string }>(
        '/league/generate-token',
        {
          competitionId,
          wilayaId: Number(selectedWilayaId),
          expiresInDays,
        }
      );
      const fullUrl = `${window.location.origin}${res.url}`;
      setLastGeneratedUrl(fullUrl);
      await loadTokens();
    } catch (err: any) {
      setError(err.message || 'Échec de la génération du lien');
    } finally {
      setGenerating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-surface rounded-2xl border border-border shadow-xl p-6 space-y-6 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm">
              <Share2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">
                Partage & Liens d'Inscription de Ligues
              </h2>
              <p className="text-xs text-ink-muted">
                {competitionName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-bg-subtle hover:text-ink transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Section 1: Public View Link ───────────────────────────────── */}
        <div className="rounded-xl border border-border bg-bg-subtle p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
              <Sparkles size={14} className="text-primary" />
              Lien Public du Tournoi (Accessible à tous)
            </span>
            <span className="text-[11px] text-success font-medium bg-success-subtle px-2 py-0.5 rounded-full border border-success/20">
              Sans mot de passe
            </span>
          </div>

          <p className="text-xs text-ink-muted leading-relaxed">
            Partagez ce lien avec les athlètes, entraîneurs et supporters pour suivre les tableaux de combat,
            la liste des participants et les podiums en temps réel.
          </p>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={publicUrl}
              className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-mono text-ink outline-none select-all"
            />
            <button
              onClick={() => handleCopy(publicUrl, 'public')}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-hover transition-colors cursor-pointer"
            >
              {copiedLink === 'public' ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedLink === 'public' ? 'Copié' : 'Copier'}</span>
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-ink hover:bg-bg-subtle transition-colors"
            >
              <ExternalLink size={14} />
              <span>Ouvrir</span>
            </a>
          </div>
        </div>

        {/* ── Section 2: Generate Wilaya League Link ─────────────────────── */}
        <div className="space-y-4">
          <div className="border-b border-border pb-2">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <ShieldCheck size={16} className="text-primary" />
              Générer un Lien d'Inscription de Ligue (Wilaya)
            </h3>
            <p className="text-xs text-ink-muted">
              Le responsable de la ligue recevant ce lien pourra inscrire exclusivement les combattants affiliés aux clubs de sa wilaya.
            </p>
          </div>

          {error && (
            <div className="text-xs text-danger bg-danger-subtle p-2.5 rounded-xl border border-danger/20">
              {error}
            </div>
          )}

          <form onSubmit={handleGenerate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
                Ligue de Wilaya
              </label>
              <select
                value={selectedWilayaId}
                onChange={(e) => setSelectedWilayaId(e.target.value)}
                className="w-full rounded-xl border border-border bg-bg-subtle py-2 px-3 text-xs text-ink focus:border-primary focus:bg-surface focus:outline-none transition-all cursor-pointer"
              >
                {wilayas.map((w) => (
                  <option key={w.id} value={w.id}>
                    {String(w.code).padStart(2, '0')} - {w.nameFr} ({w.nameAr})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
                Validité du lien
              </label>
              <select
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-bg-subtle py-2 px-3 text-xs text-ink focus:border-primary focus:bg-surface focus:outline-none transition-all cursor-pointer"
              >
                <option value={1}>24 Heures</option>
                <option value={3}>3 Jours</option>
                <option value={7}>7 Jours (Recommandé)</option>
                <option value={14}>14 Jours</option>
                <option value={30}>30 Jours</option>
              </select>
            </div>

            <div className="sm:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={generating || !selectedWilayaId}
                className="flex items-center gap-2 rounded-xl bg-ink text-white px-4 py-2 text-xs font-semibold hover:bg-ink/85 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {generating ? 'Génération...' : 'Créer le lien sécurisé'}
              </button>
            </div>
          </form>

          {lastGeneratedUrl && (
            <div className="rounded-xl border border-success/30 bg-success-subtle p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-success">
                <span>Nouveau lien généré avec succès !</span>
                <button
                  type="button"
                  onClick={() => {
                    const text = encodeURIComponent(
                      `Bonjour, voici votre lien officiel pour inscrire les athlètes de votre wilaya à la compétition "${competitionName}": ${lastGeneratedUrl}`
                    );
                    window.open(`https://wa.me/?text=${text}`, '_blank');
                  }}
                  className="rounded-lg bg-[#25D366] text-white px-2 py-0.5 text-[11px] font-semibold hover:opacity-90"
                >
                  Envoyer par WhatsApp
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={lastGeneratedUrl}
                  className="flex-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-mono text-ink outline-none select-all"
                />
                <button
                  onClick={() => handleCopy(lastGeneratedUrl, 'last-gen')}
                  className="rounded-lg bg-surface border border-border px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-bg-subtle transition-colors cursor-pointer"
                >
                  {copiedLink === 'last-gen' ? 'Copié !' : 'Copier'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Section 3: Active Generated Tokens List ─────────────────────── */}
        {activeTokens.length > 0 && (
          <div className="space-y-2 border-t border-border pt-4">
            <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
              Liens de Ligues Actifs ({activeTokens.length})
            </h4>

            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {activeTokens.map((t) => {
                const tokenUrl = `${window.location.origin}/register/${competitionId}?token=${t.token}`;
                const isExpired = new Date(t.expiresAt).getTime() < Date.now();
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border bg-bg-subtle text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-ink flex items-center gap-2">
                        <span className="font-mono text-ink-faint">
                          {String(t.wilayaCode).padStart(2, '0')}
                        </span>
                        <span>{t.wilayaNameFr}</span>
                        {isExpired ? (
                          <span className="text-[10px] text-danger bg-danger-subtle px-1.5 py-0.5 rounded">
                            Expiré
                          </span>
                        ) : (
                          <span className="text-[10px] text-ink-muted">
                            Expire le {new Date(t.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleCopy(tokenUrl, `tok-${t.id}`)}
                        className="rounded-lg bg-surface border border-border px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-bg-subtle transition-colors cursor-pointer"
                      >
                        {copiedLink === `tok-${t.id}` ? 'Copié !' : 'Copier'}
                      </button>
                      <a
                        href={tokenUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-ink-muted hover:text-ink p-1"
                        title="Ouvrir le portail"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-border">
          <button
            onClick={onClose}
            className="rounded-xl border border-border bg-bg-subtle px-4 py-2 text-xs font-semibold text-ink hover:bg-surface transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
