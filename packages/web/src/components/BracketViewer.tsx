import { useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle,
  AlertTriangle,
  Trophy,
  ArrowLeftRight,
  X,
} from "lucide-react";

interface BracketMatch {
  id: number;
  round: number;
  form: string;
  ordinal: number;
  isBronze: boolean;
  competitorAId: number | null;
  competitorBId: number | null;
  nameA: string | null;
  nameB: string | null;
  clubA: string | null;
  clubB: string | null;
  scoreA: number | null;
  scoreB: number | null;
  resultType: string;
  winnerRegistrationId: number | null;
  winnerName: string | null;
  status: string;
}

export interface AuditDetail {
  matchId: number;
  ordinal: number;
  nameA: string;
  nameB: string;
  clubA?: string | null;
  clubB?: string | null;
  sameClub: boolean;
  sameCity: boolean;
  sameWilaya: boolean;
  clubName?: string | null;
  cityName?: string | null;
  wilayaName?: string | null;
}

interface BracketData {
  categoryId: number;
  gender: string;
  matches: BracketMatch[];
  audit: {
    sameWilaya: number;
    sameCity: number;
    sameClub: number;
    details?: AuditDetail[];
  };
  rounds: number;
}

interface BracketViewerProps {
  bracket: BracketData;
  onEnterResult?: (matchId: number) => void;
  onSwap?: (matchIdA: number, matchIdB: number) => void;
  enableSwap?: boolean;
}

export default function BracketViewer({
  bracket,
  onEnterResult,
  onSwap,
  enableSwap,
}: BracketViewerProps) {
  const { t } = useTranslation();
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null);
  const [swapFirst, setSwapFirst] = useState<number | null>(null);

  // Map audit issues by matchId for quick lookup in match cards
  const auditByMatchId = useMemo(() => {
    const map = new Map<number, AuditDetail>();
    if (bracket.audit?.details) {
      for (const d of bracket.audit.details) {
        if (d.matchId) map.set(d.matchId, d);
      }
    }
    return map;
  }, [bracket.audit?.details]);

  // Group matches by round
  const rounds = useMemo(() => {
    const map = new Map<number, BracketMatch[]>();
    for (const m of bracket.matches) {
      if (!map.has(m.round)) map.set(m.round, []);
      map.get(m.round)!.push(m);
    }
    return map;
  }, [bracket.matches]);

  const roundCount = bracket.rounds;

  // Round labels (French)
  const roundLabel = (matchesInRound: number): string => {
    const map: Record<number, string> = {
      1: "Finale",
      2: "Demi-finale",
      4: "Quart de finale",
      8: "Huitième de finale",
      7: "Huitième de finale",
      16: "Seizième de finale",
    };
    return (
      map[matchesInRound] ?? `Tour ${Math.round(Math.log2(matchesInRound)) + 1}`
    );
  };

  const handleSwapSelect = useCallback(
    (matchId: number) => {
      if (!onSwap) return;
      if (swapFirst === null) {
        setSwapFirst(matchId);
      } else if (swapFirst !== matchId) {
        onSwap(swapFirst, matchId);
        setSwapFirst(null);
      }
    },
    [swapFirst, onSwap],
  );

  const cancelSwap = useCallback(() => setSwapFirst(null), []);

  // Compute spacing: later rounds have fewer matches
  const matchHeight = 64; // px per match
  const matchGap = 16; // px between matches
  const roundWidth = 224; // px per round column

  const auditTotal =
    (bracket.audit?.sameWilaya ?? 0) +
    (bracket.audit?.sameCity ?? 0) +
    (bracket.audit?.sameClub ?? 0);

  return (
    <div className="overflow-x-auto scrollbar-thin">
      {/* Audit banner */}
      {auditTotal > 0 && (
        <div className="mb-4 rounded-xl border border-warning/30 bg-warning/[0.07] p-3.5 text-xs shadow-sm space-y-2.5 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-bold text-warning text-sm">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{t("bracket.audit", "Appariements audit (Contraintes régionales)")}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {bracket.audit.sameWilaya > 0 && (
                <span className="rounded-full bg-warning/15 px-2.5 py-0.5 font-medium text-warning/90">
                  {bracket.audit.sameWilaya} {t("bracket.sameWilaya", "même wilaya")}
                </span>
              )}
              {bracket.audit.sameCity > 0 && (
                <span className="rounded-full bg-warning/15 px-2.5 py-0.5 font-medium text-warning/90">
                  {bracket.audit.sameCity} {t("bracket.sameCity", "même ville")}
                </span>
              )}
              {bracket.audit.sameClub > 0 && (
                <span className="rounded-full bg-warning/15 px-2.5 py-0.5 font-medium text-warning/90">
                  {bracket.audit.sameClub} {t("bracket.sameClub", "même club")}
                </span>
              )}
            </div>
          </div>

          {/* List of concerned matchups in Round 1 */}
          {bracket.audit.details && bracket.audit.details.length > 0 && (
            <div className="border-t border-warning/20 pt-2 space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-warning/80">
                {t("bracket.concernedMatches", "Combattants concernés au 1er tour :")}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {bracket.audit.details.map((d, i) => (
                  <div
                    key={d.matchId ?? i}
                    className="flex flex-col gap-1 rounded-lg border border-warning/25 bg-surface/90 px-3 py-2 text-ink shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-1 text-[11px]">
                      <span className="rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-bold text-warning shrink-0">
                        Match #{d.ordinal}
                      </span>
                      <div className="flex items-center gap-1 font-semibold text-ink truncate">
                        <span className="truncate">{d.nameA}</span>
                        <span className="text-ink-muted text-[10px] font-normal shrink-0">vs</span>
                        <span className="truncate">{d.nameB}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 text-[10px]">
                      {d.sameClub && (
                        <span className="rounded bg-danger/10 px-1.5 py-0.5 font-medium text-danger">
                          Même club {d.clubName ? `(${d.clubName})` : ""}
                        </span>
                      )}
                      {d.sameCity && !d.sameClub && (
                        <span className="rounded bg-warning/15 px-1.5 py-0.5 font-medium text-warning">
                          Même ville {d.cityName ? `(${d.cityName})` : ""}
                        </span>
                      )}
                      {d.sameWilaya && !d.sameClub && (
                        <span className="rounded bg-warning/15 px-1.5 py-0.5 font-medium text-warning/90">
                          Même wilaya {d.wilayaName ? `(${d.wilayaName})` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Swap mode banner */}
      {enableSwap && swapFirst !== null && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/[0.06] px-4 py-3 text-xs shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15">
            <ArrowLeftRight size={12} className="text-primary" />
          </span>
          <span className="font-semibold text-primary">
            {t(
              "bracket.swapMode",
              "Mode échange — sélectionnez un deuxième match",
            )}
          </span>
          <button
            onClick={cancelSwap}
            className="ml-auto rounded-md p-1 text-ink-muted transition-colors hover:bg-primary/10 hover:text-ink"
            aria-label={t("bracket.cancel", "Annuler")}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Bracket grid */}
      <div className="inline-flex gap-0 min-w-max pb-4">
        {Array.from({ length: roundCount }, (_, ri) => {
          const roundNum = ri + 1;
          const matchesInRound = rounds.get(roundNum)?.length ?? 0;
          const roundMatches = rounds.get(roundNum) ?? [];
          const isFinalRound = roundNum === roundCount;

          return (
            <div
              key={roundNum}
              className="flex flex-col"
              style={{ width: roundWidth }}
            >
              {/* Round header */}
              <div className="mb-1 px-3 pb-2.5 text-center">
                <div
                  className={`text-[11px] font-bold uppercase tracking-wide ${
                    isFinalRound ? "text-primary" : "text-ink-muted"
                  }`}
                >
                  {roundLabel(matchesInRound)}
                </div>
                <div className="mt-0.5 text-[10px] text-ink-faint">
                  {matchesInRound}{" "}
                  {matchesInRound > 1
                    ? t("bracket.matchesPlural", "matchs")
                    : t("bracket.matchSingular", "match")}
                </div>
                <div
                  className={`mx-auto mt-2 h-px w-8 rounded-full ${
                    isFinalRound ? "bg-primary/50" : "bg-border-muted"
                  }`}
                />
              </div>

              {/* Matches */}
              <div
                className="flex flex-col justify-around"
                style={{
                  minHeight:
                    ((matchHeight + matchGap) * 2 ** (roundCount - 1)) / 2,
                }}
              >
                {roundMatches.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    auditIssue={roundNum === 1 ? auditByMatchId.get(m.id) : undefined}
                    isSelected={selectedMatch === m.id}
                    isSwapTarget={
                      enableSwap &&
                      roundNum === 1 &&
                      !m.isBronze &&
                      swapFirst !== null &&
                      swapFirst !== m.id
                    }
                    isSwapFirst={swapFirst === m.id}
                    enableSwap={enableSwap && roundNum === 1 && !m.isBronze}
                    onSelect={() => {
                      if (enableSwap && roundNum === 1 && !m.isBronze) {
                        handleSwapSelect(m.id);
                      } else {
                        setSelectedMatch(selectedMatch === m.id ? null : m.id);
                      }
                    }}
                    onSwapClick={
                      enableSwap && roundNum === 1 && !m.isBronze
                        ? () => handleSwapSelect(m.id)
                        : undefined
                    }
                    onEnterResult={onEnterResult}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Champion column */}
        <div className="flex flex-col" style={{ width: 160 }}>
          <div className="mb-1 px-3 pb-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wide text-primary">
              <Trophy size={12} />
              {t("bracket.champion", "Champion")}
            </div>
            <div className="mx-auto mt-2 h-px w-8 rounded-full bg-primary/50" />
          </div>
          <div
            className="flex items-center justify-center"
            style={{
              minHeight: ((matchHeight + matchGap) * 2 ** (roundCount - 1)) / 2,
            }}
          >
            {bracket.matches.find(
              (m) =>
                m.status === "COMPLETED" &&
                m.round === roundCount &&
                !m.isBronze,
            )?.winnerName ? (
              <div className="relative flex flex-col items-center gap-2 rounded-2xl border-2 border-primary/40 bg-gradient-to-b from-primary/10 to-primary/[0.03] px-5 py-4 shadow-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15">
                  <Trophy size={18} className="text-primary" />
                </span>
                <span className="text-center text-sm font-bold leading-tight text-primary">
                  {
                    bracket.matches.find(
                      (m) =>
                        m.status === "COMPLETED" &&
                        m.round === roundCount &&
                        !m.isBronze,
                    )?.winnerName
                  }
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border-muted bg-bg-faint px-5 py-4">
                <Trophy size={18} className="text-ink-faint/60" />
                <span className="text-center text-xs text-ink-faint">
                  {t("bracket.pending", "En attente")}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected match detail */}
      {selectedMatch && (() => {
        const match = bracket.matches.find((m) => m.id === selectedMatch);
        if (!match) { setSelectedMatch(null); return null; }
        return (
          <MatchDetail
            match={match}
            onClose={() => setSelectedMatch(null)}
            onEnterResult={onEnterResult}
          />
        );
      })()}
    </div>
  );
}

// ── Match Card ────────────────────────────────────────────────────────

function MatchCard({
  match,
  auditIssue,
  isSelected,
  onSelect,
  onEnterResult,
  isSwapTarget,
  isSwapFirst,
  onSwapClick,
  enableSwap,
}: {
  match: BracketMatch;
  auditIssue?: AuditDetail;
  isSelected: boolean;
  onSelect: () => void;
  onEnterResult?: (matchId: number) => void;
  isSwapTarget?: boolean;
  isSwapFirst?: boolean;
  onSwapClick?: () => void;
  enableSwap?: boolean;
}) {
  const { t } = useTranslation();
  const isCompleted = match.status === "COMPLETED";
  const isBye = match.status === "BYE";
  const isWinnerA =
    isCompleted && match.winnerRegistrationId === match.competitorAId;
  const isWinnerB =
    isCompleted && match.winnerRegistrationId === match.competitorBId;

  let borderColor = isSelected
    ? "border-primary"
    : isCompleted
      ? "border-success/25"
      : isBye
        ? "border-border-muted"
        : auditIssue
          ? "border-warning/60"
          : "border-border";
  let bgColor = isSelected
    ? "bg-primary/5"
    : isBye
      ? "bg-bg-faint"
      : auditIssue
        ? "bg-warning/[0.04]"
        : "bg-surface";
  let ring = isSelected ? "ring-2 ring-primary/20" : "";

  if (isSwapFirst) {
    borderColor = "border-primary";
    bgColor = "bg-primary/10";
    ring = "ring-2 ring-primary/30";
  } else if (isSwapTarget) {
    borderColor = "border-primary/50";
    bgColor = "bg-primary/5";
  }

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group relative mx-1.5 mb-1.5 overflow-hidden rounded-xl border ${borderColor} ${bgColor} ${ring} cursor-pointer shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        match.isBronze ? "border-l-[3px] border-l-warning" : ""
      }`}
      style={{ minHeight: 56 }}
    >
      {/* Player A */}
      <div
        className={`flex items-center gap-2 px-3 py-2 text-xs ${
          isWinnerA
            ? "font-bold text-success"
            : isBye && !match.nameA
              ? "text-ink-faint italic"
              : "text-ink"
        }`}
      >
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
            isWinnerA ? "bg-success/15 text-success" : ""
          }`}
        >
          {isWinnerA ? "✓" : ""}
        </span>
        <span className="flex-1 truncate">{match.nameA ?? "—"}</span>
        {match.scoreA != null && (
          <span
            className={`min-w-[1.25rem] text-center font-bold tabular-nums ${isWinnerA ? "text-success" : "text-ink"}`}
          >
            {match.scoreA}
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="mx-2.5 h-px bg-border-muted" />

      {/* Player B */}
      <div
        className={`flex items-center gap-2 px-3 py-2 text-xs ${
          isWinnerB
            ? "font-bold text-success"
            : isBye && !match.nameB
              ? "text-ink-faint italic"
              : "text-ink"
        }`}
      >
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
            isWinnerB ? "bg-success/15 text-success" : ""
          }`}
        >
          {isWinnerB ? "✓" : ""}
        </span>
        <span className="flex-1 truncate">{match.nameB ?? "—"}</span>
        {match.scoreB != null && (
          <span
            className={`min-w-[1.25rem] text-center font-bold tabular-nums ${isWinnerB ? "text-success" : "text-ink"}`}
          >
            {match.scoreB}
          </span>
        )}
      </div>

      {/* Status bar */}
      {isCompleted && (
        <div className="flex items-center gap-1 border-t border-success/15 bg-success/[0.06] px-3 py-1 text-[10px] font-medium text-success/80">
          <CheckCircle size={10} />
          {match.resultType !== "REGULAR"
            ? match.resultType
            : t("bracket.completed", "Terminé")}
        </div>
      )}
      {isBye && (
        <div className="flex items-center gap-1 border-t border-border-muted px-3 py-1 text-[10px] text-ink-faint">
          Bye
        </div>
      )}
      {auditIssue && !isCompleted && !isBye && (
        <div className="flex items-center gap-1 border-t border-warning/25 bg-warning/[0.09] px-3 py-1 text-[10px] font-semibold text-warning">
          <AlertTriangle size={10} className="shrink-0" />
          <span>
            {auditIssue.sameClub
              ? t("bracket.sameClubBadge", "Même club")
              : auditIssue.sameCity
                ? t("bracket.sameCityBadge", "Même ville")
                : t("bracket.sameWilayaBadge", "Même wilaya")}
          </span>
        </div>
      )}
      {isSwapTarget && !isSwapFirst && (
        <div className="flex items-center gap-1 border-t border-primary/20 bg-primary/[0.06] px-3 py-1 text-[10px] font-medium text-primary">
          <ArrowLeftRight size={10} />
          {t("bracket.swap", "Échanger")}
        </div>
      )}
      {enableSwap && !isSwapTarget && !isSwapFirst && !isBye && !auditIssue && (
        <div className="flex items-center gap-1 border-t border-transparent px-3 py-1 text-[10px] text-primary/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <ArrowLeftRight size={10} />
          {t("bracket.swapHint", "Cliquer pour échanger")}
        </div>
      )}
      {match.isBronze && (
        <span className="pointer-events-none absolute right-1.5 top-1.5 rounded-full bg-warning/15 px-1.5 py-[1px] text-[8px] font-bold uppercase tracking-wide text-warning">
          {t("bracket.bronze", "3e place")}
        </span>
      )}
    </div>
  );
}

// ── Match Detail Panel ────────────────────────────────────────────────

function MatchDetail({
  match,
  onClose,
  onEnterResult,
}: {
  match: BracketMatch;
  onClose: () => void;
  onEnterResult?: (matchId: number) => void;
}) {
  const { t } = useTranslation();
  const isCompleted = match.status === "COMPLETED";
  const isWinnerA =
    isCompleted && match.winnerRegistrationId === match.competitorAId;
  const isWinnerB =
    isCompleted && match.winnerRegistrationId === match.competitorBId;

  return (
    <div className="mt-4 animate-in fade-in slide-in-from-bottom-1 duration-200 overflow-hidden rounded-2xl border border-border bg-surface shadow-md">
      <div className="flex items-center justify-between border-b border-border-muted bg-bg-faint px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-ink">
            {match.form} #{match.ordinal}
          </span>
          {match.isBronze && (
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warning">
              {t("bracket.bronze", "3e place")}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-border-muted hover:text-ink"
          aria-label={t("bracket.close", "Fermer")}
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div
            className={`rounded-xl border px-3.5 py-3 ${
              isWinnerA
                ? "border-success/30 bg-success/[0.06]"
                : "border-border-muted bg-bg-faint"
            }`}
          >
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
              {t("bracket.competitorA", "A")}
              {isWinnerA && <CheckCircle size={11} className="text-success" />}
            </div>
            <div
              className={`font-semibold ${isWinnerA ? "text-success" : "text-ink"}`}
            >
              {match.nameA ?? "—"}
            </div>
            {match.clubA && (
              <div className="mt-0.5 text-xs text-ink-faint">{match.clubA}</div>
            )}
          </div>
          <div
            className={`rounded-xl border px-3.5 py-3 ${
              isWinnerB
                ? "border-success/30 bg-success/[0.06]"
                : "border-border-muted bg-bg-faint"
            }`}
          >
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
              {t("bracket.competitorB", "B")}
              {isWinnerB && <CheckCircle size={11} className="text-success" />}
            </div>
            <div
              className={`font-semibold ${isWinnerB ? "text-success" : "text-ink"}`}
            >
              {match.nameB ?? "—"}
            </div>
            {match.clubB && (
              <div className="mt-0.5 text-xs text-ink-faint">{match.clubB}</div>
            )}
          </div>
        </div>

        {isCompleted && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-success/20 bg-success/[0.05] px-4 py-3 text-xs">
            <div className="flex items-center gap-2 text-success/90">
              <CheckCircle size={13} />
              <span className="font-medium">
                {t("bracket.result", "Résultat")}:{" "}
                <span className="font-bold tabular-nums">
                  {match.scoreA} - {match.scoreB}
                </span>{" "}
                ({match.resultType})
              </span>
            </div>
            {match.winnerName && (
              <span className="flex items-center gap-1 font-bold text-success">
                <Trophy size={12} />
                {match.winnerName}
              </span>
            )}
          </div>
        )}

        {match.status !== "COMPLETED" &&
          match.competitorAId &&
          match.competitorBId &&
          onEnterResult && (
            <button
              onClick={() => onEnterResult(match.id)}
              className="brand-gradient mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99]"
            >
              {t("bracket.enterResult", "Entrer le résultat")}
            </button>
          )}
      </div>
    </div>
  );
}
