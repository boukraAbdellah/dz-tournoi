import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Swords, Flag, ArrowLeftRight } from "lucide-react";
import { useCompetition } from "./CompetitionHook";
import BracketViewer from "../../components/BracketViewer";
import MatchResultModal from "./MatchResultModal";
import type { BracketMatch } from "./types";

export default function BracketSection() {
  const { t } = useTranslation();
  const { comp, brackets, selectedCatId, setSelectedCatId, enabledCategories, generateDraw, lockDraw, drawLoading, isDrawGenerated, isDrawConfirmed, isInProgress, isCompleted, swapAthletes } = useCompetition();
  const [resultModal, setResultModal] = useState<{ matchId: number; match: BracketMatch } | null>(null);
  const [swapMode, setSwapMode] = useState(false);

  if (!(isDrawGenerated || isDrawConfirmed || isInProgress || isCompleted)) return null;

  return (
    <div className="mb-5">
      <div className="card-elevated mb-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Swords size={18} className="text-primary" />
            <div>
              <h3 className="text-sm font-semibold text-ink">{t("competitions.bracket", "Tableau")}</h3>
              <p className="text-xs text-ink-muted">{Object.keys(brackets).length} {t("competitions.categoryPlural", "catégories")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isDrawGenerated && (
              <>
                <button onClick={() => setSwapMode(!swapMode)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    swapMode
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-surface text-ink hover:bg-bg-subtle"
                  }`}>
                  <ArrowLeftRight size={14} /> {t("bracket.swap", "Échanger")}
                </button>
                <button onClick={generateDraw} disabled={drawLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-bg-subtle transition-colors">
                  {drawLoading ? t("common.loading") : t("competitions.regenerate", "Régénérer")}
                </button>
                <button onClick={lockDraw} className="brand-gradient inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all">
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
