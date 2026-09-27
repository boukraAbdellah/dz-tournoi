import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Trophy } from "lucide-react";
import { useCompetition } from "./CompetitionHook";
import type { BracketMatch } from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  match: BracketMatch | null;
}

export default function MatchResultModal({ open, onClose, match }: Props) {
  const { t } = useTranslation();
  const { enterResult } = useCompetition();
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [resultType, setResultType] = useState("REGULAR");
  const [selectedWinnerId, setSelectedWinnerId] = useState<number | null>(null);

  useEffect(() => {
    if (match) {
      setScoreA(match.scoreA?.toString() ?? "");
      setScoreB(match.scoreB?.toString() ?? "");
      setResultType(match.resultType ?? "REGULAR");
      setSelectedWinnerId(match.winnerRegistrationId ?? null);
    }
  }, [match]);

  // Update suggested winner based on scores if not manually set to a different one
  const handleScoreAChange = (val: string) => {
    setScoreA(val);
    const numA = Number(val);
    const numB = Number(scoreB);
    if (val !== "" && scoreB !== "" && match) {
      if (numA > numB) setSelectedWinnerId(match.competitorAId);
      else if (numB > numA) setSelectedWinnerId(match.competitorBId);
    }
  };

  const handleScoreBChange = (val: string) => {
    setScoreB(val);
    const numA = Number(scoreA);
    const numB = Number(val);
    if (scoreA !== "" && val !== "" && match) {
      if (numA > numB) setSelectedWinnerId(match.competitorAId);
      else if (numB > numA) setSelectedWinnerId(match.competitorBId);
    }
  };

  if (!open || !match) return null;

  const handleSave = () => {
    const numA = Number(scoreA);
    const numB = Number(scoreB);
    let finalWinnerId = selectedWinnerId;
    if (!finalWinnerId) {
      finalWinnerId = numA >= numB ? match.competitorAId : match.competitorBId;
    }

    enterResult(
      match.id,
      numA,
      numB,
      match.isBronze ? "REGULAR" : resultType,
      finalWinnerId,
    );
    onClose();
  };

  const isTie = scoreA !== "" && scoreB !== "" && Number(scoreA) === Number(scoreB);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="card-elevated w-full max-w-md mx-4" style={{ animation: "slideIn 0.2s ease" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-primary" />
            <h2 className="text-base font-semibold text-ink">{match.form} #{match.ordinal}</h2>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Fighter A (Red Corner) */}
          <div
            onClick={() => match.competitorAId && setSelectedWinnerId(match.competitorAId)}
            className={`flex items-center justify-between rounded-xl border p-3.5 cursor-pointer transition-all border-l-4 border-l-red-500 ${
              selectedWinnerId === match.competitorAId
                ? "border-red-500 bg-red-500/10 shadow-sm ring-1 ring-red-500/20"
                : "border-border bg-surface hover:border-red-500/40"
            }`}
          >
            <div className="flex-1 min-w-0 pr-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="rounded bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  {t("bracket.redCorner", "Coin Rouge")}
                </span>
                {selectedWinnerId === match.competitorAId && (
                  <span className="rounded bg-success/20 px-1.5 py-0.5 text-[10px] font-bold text-success">
                    {t("result.winner", "VAINQUEUR")}
                  </span>
                )}
              </div>
              <div className="text-sm font-semibold text-ink truncate">{match.nameA ?? "—"}</div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-ink-muted">
                {match.clubA && <span>{match.clubA}</span>}
                {match.wilayaA && (
                  <span className="rounded bg-bg-muted px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                    {match.wilayaA}
                  </span>
                )}
              </div>
            </div>
            <input
              type="number"
              min={0}
              value={scoreA}
              onChange={(e) => handleScoreAChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="h-10 w-20 rounded-lg border border-border bg-surface px-3 text-center text-lg font-bold text-ink outline-none focus:border-red-500/40"
              placeholder="0"
            />
          </div>

          <div className="text-center text-xs font-bold text-ink-faint">VS</div>

          {/* Fighter B (Blue Corner) */}
          <div
            onClick={() => match.competitorBId && setSelectedWinnerId(match.competitorBId)}
            className={`flex items-center justify-between rounded-xl border p-3.5 cursor-pointer transition-all border-l-4 border-l-blue-500 ${
              selectedWinnerId === match.competitorBId
                ? "border-blue-500 bg-blue-500/10 shadow-sm ring-1 ring-blue-500/20"
                : "border-border bg-surface hover:border-blue-500/40"
            }`}
          >
            <div className="flex-1 min-w-0 pr-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  {t("bracket.blueCorner", "Coin Bleu")}
                </span>
                {selectedWinnerId === match.competitorBId && (
                  <span className="rounded bg-success/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                    {t("result.winner", "VAINQUEUR")}
                  </span>
                )}
              </div>
              <div className="text-sm font-semibold text-ink truncate">{match.nameB ?? "—"}</div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-ink-muted">
                {match.clubB && <span>{match.clubB}</span>}
                {match.wilayaB && (
                  <span className="rounded bg-bg-muted px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                    {match.wilayaB}
                  </span>
                )}
              </div>
            </div>
            <input
              type="number"
              min={0}
              value={scoreB}
              onChange={(e) => handleScoreBChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="h-10 w-20 rounded-lg border border-border bg-surface px-3 text-center text-lg font-bold text-ink outline-none focus:border-primary/40"
              placeholder="0"
            />
          </div>

          {isTie && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-center text-xs font-medium text-amber-500">
              {t("result.tieNotice", "Égalité aux points : Cliquez sur le combattant désigné vainqueur (décision/hantei).")}
            </div>
          )}

          {!match.isBronze && (
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">{t("competitions.resultType", "Type de résultat")}</label>
              <select
                value={resultType}
                onChange={(e) => setResultType(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm text-ink outline-none focus:border-primary/40"
              >
                <option value="REGULAR">{t("result.regular", "Régulier (aux points)")}</option>
                <option value="DECISION">{t("result.decision", "Décision des arbitres")}</option>
                <option value="TKO">TKO / Abandon</option>
                <option value="DQ">{t("result.dq", "Disqualification")}</option>
              </select>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-ink-muted hover:bg-bg-subtle transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={scoreA === "" || scoreB === "" || !selectedWinnerId}
            className="brand-gradient rounded-lg px-4 py-2 text-sm font-semibold transition-all disabled:opacity-60"
          >
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
