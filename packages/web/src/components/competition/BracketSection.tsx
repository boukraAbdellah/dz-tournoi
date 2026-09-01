import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Swords, Flag, ArrowLeftRight, RefreshCw, ChevronDown, Layers, Sparkles } from "lucide-react";
import { useCompetition } from "./CompetitionHook";
import BracketViewer from "../../components/BracketViewer";
import MatchResultModal from "./MatchResultModal";
import type { BracketMatch } from "./types";

export default function BracketSection() {
  const { t } = useTranslation();
  const {
    comp,
    brackets,
    selectedCatId,
    setSelectedCatId,
    enabledCategories,
    generateDraw,
    generateCategoryDraw,
    lockDraw,
    drawLoading,
    isDrawGenerated,
    isDrawConfirmed,
    isInProgress,
    isCompleted,
    swapAthletes,
  } = useCompetition();

  const [resultModal, setResultModal] = useState<{ matchId: number; match: BracketMatch } | null>(null);
  const [swapMode, setSwapMode] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const regenRef = useRef<HTMLDivElement>(null);

  // Close regen dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (regenRef.current && !regenRef.current.contains(event.target as Node)) {
        setRegenOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!(isDrawGenerated || isDrawConfirmed || isInProgress || isCompleted)) return null;

  const activeCat = comp?.categories.find((c) => c.id === selectedCatId);

  return (
    <div className="mb-5">
      <div className="card-elevated mb-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Swords size={18} className="text-primary" />
            <div>
              <h3 className="text-sm font-semibold text-ink">{t("competitions.bracket", "Tableau")}</h3>
              <p className="text-xs text-ink-muted">{Object.keys(brackets).length} {t("competitions.categoryPlural", "catégories")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isDrawGenerated && (
              <>
                <button
                  onClick={() => setSwapMode(!swapMode)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    swapMode
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-surface text-ink hover:bg-bg-subtle"
                  }`}
                >
                  <ArrowLeftRight size={14} /> {t("bracket.swap", "Échanger")}
                </button>

                {/* Regenerate Dropdown */}
                <div className="relative" ref={regenRef}>
                  <button
                    onClick={() => setRegenOpen(!regenOpen)}
                    disabled={drawLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-bg-subtle transition-colors shadow-xs"
                  >
                    <RefreshCw size={13} className={drawLoading ? "animate-spin text-primary" : "text-ink-muted"} />
                    <span>{drawLoading ? t("common.loading") : t("competitions.regenerate", "Régénérer")}</span>
                    <ChevronDown size={12} className={`text-ink-faint transition-transform duration-150 ${regenOpen ? "rotate-180" : ""}`} />
                  </button>

                  {regenOpen && (
                    <div className="absolute right-0 top-full z-30 mt-1.5 w-64 rounded-xl border border-border bg-surface p-1.5 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
                      {selectedCatId && activeCat && (
                        <button
                          onClick={() => {
                            setRegenOpen(false);
                            generateCategoryDraw(selectedCatId);
                          }}
                          disabled={drawLoading}
                          className="flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-primary/10 hover:text-primary group"
                        >
                          <div className="flex items-center gap-2 font-semibold text-ink group-hover:text-primary">
                            <Sparkles size={13} className="text-primary shrink-0" />
                            <span>Régénérer cette catégorie</span>
                          </div>
                          <span className="text-[11px] text-ink-muted pl-5 truncate">
                            {activeCat.ageCategoryName} · {activeCat.weightDivisionName} ({activeCat.gender})
                          </span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setRegenOpen(false);
                          generateDraw();
                        }}
                        disabled={drawLoading}
                        className="flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-primary/10 hover:text-primary group"
                      >
                        <div className="flex items-center gap-2 font-semibold text-ink group-hover:text-primary">
                          <Layers size={13} className="text-ink-muted group-hover:text-primary shrink-0" />
                          <span>Régénérer tout le tournoi</span>
                        </div>
                        <span className="text-[11px] text-ink-muted pl-5">
                          Toutes les {Object.keys(brackets).length} catégories
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={lockDraw}
                  className="brand-gradient inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shadow-xs"
                >
                  <Flag size={14} /> {t("competitions.lockDraw", "Confirmer le tableau")}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="card-elevated overflow-hidden">
        <div className="flex flex-wrap gap-1 border-b border-border px-4 pt-3">
          {enabledCategories.filter((c) => brackets[c.id]).map((cat) => (
            <button key={cat.id} onClick={() => setSelectedCatId(cat.id)}
              className={`rounded-t-lg px-3 py-1.5 text-xs font-medium transition-colors ${selectedCatId === cat.id ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-ink-muted hover:bg-bg-subtle"}`}>
              {cat.ageCategoryName} · {cat.weightDivisionName} ({cat.gender})
            </button>
          ))}
        </div>

        {selectedCatId && brackets[selectedCatId] ? (
          <div className="p-4">
            <BracketViewer
              bracket={brackets[selectedCatId]}
              enableSwap={swapMode}
              onSwap={swapMode ? swapAthletes : undefined}
              onEnterResult={isInProgress ? (matchId) => {
                const match = brackets[selectedCatId]?.matches.find((m) => m.id === matchId);
                if (match) setResultModal({ matchId, match });
              } : undefined}
            />
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-ink-muted">{t("competitions.selectCategory", "Sélectionner une catégorie")}</div>
        )}
      </div>

      <MatchResultModal open={resultModal !== null} onClose={() => setResultModal(null)} match={resultModal?.match ?? null} />
    </div>
  );
}
