import { useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle,
  AlertTriangle,
  Trophy,
  ArrowLeftRight,
  X,
} from "lucide-react";

export interface BracketMatch {
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
  wilayaA?: string | null;
  wilayaB?: string | null;
  wilayaCodeA?: number | null;
  wilayaCodeB?: number | null;
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

/**
 * Shorten / abbreviate Algerian wilaya names in French only (as requested).
 * Common long wilayas are abbreviated to standard tournament acronyms (B.B.A, S.B.A, O.E.B, etc.).
 */
export function formatWilayaShortFr(
  wilayaName?: string | null,
  _wilayaCode?: number | null,
): string {
  if (!wilayaName) return "";
  const trimmed = wilayaName.trim();

  const abbrevs: Record<string, string> = {
    "Bordj Bou Arréridj": "B.B.A",
    "Bordj Bou Arreridj": "B.B.A",
    "Sidi Bel Abbès": "S.B.A",
    "Sidi Bel Abbes": "S.B.A",
    "Oum El Bouaghi": "O.E.B",
    "Bordj Badji Mokhtar": "B.B.M",
    "Aïn Témouchent": "A.Témouch",
    "Ain Temouchent": "A.Témouch",
    "Aïn Defla": "A.Defla",
    "Ain Defla": "A.Defla",
    "Constantine": "Const.",
    "Mostaganem": "Mosta.",
    "Tamanrasset": "Tam.",
    "Tissemsilt": "Tissems.",
    "Ouled Djellal": "O.Djellal",
    "Souk Ahras": "S.Ahras",
    "Tizi Ouzou": "T.Ouzou",
    "El M'Ghair": "M'Ghair",
    "In Guezzam": "I.Guezzam",
    "El Bayadh": "El Bayadh",
    "El Oued": "El Oued",
    "El Tarf": "El Tarf",
  };

  if (abbrevs[trimmed]) return abbrevs[trimmed];
  if (trimmed.length > 8) {
    return trimmed.slice(0, 7) + "…";
  }
  return trimmed;
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

  // Separate regular elimination tree matches from bronze match
  const bronzeMatch = useMemo(() => {
    return bracket.matches.find((m) => m.isBronze);
  }, [bracket.matches]);

  const treeMatches = useMemo(() => {
    return bracket.matches.filter((m) => !m.isBronze);
  }, [bracket.matches]);

  // Group tree matches by round
  const rounds = useMemo(() => {
    const map = new Map<number, BracketMatch[]>();
    for (const m of treeMatches) {
      if (!map.has(m.round)) map.set(m.round, []);
      map.get(m.round)!.push(m);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.ordinal - b.ordinal);
    }
    return map;
  }, [treeMatches]);

  const roundCount = Math.max(bracket.rounds, 1);

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

  // Compute spacing & exact tree height
  const roundWidth = 244; // px per round column
  const connectorWidth = 28; // px between round columns
  const baseSlotHeight = 84; // base px per match slot in Round 1
  const round1Slots = Math.max(
    rounds.get(1)?.length ?? 1,
    2 ** Math.max(roundCount - 1, 0),
  );
  const totalTreeHeight = Math.max(280, round1Slots * baseSlotHeight);

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

      {/* Bracket tree grid */}
      <div className="inline-flex items-stretch min-w-max pb-4">
        {Array.from({ length: roundCount }, (_, ri) => {
          const roundNum = ri + 1;
          const slotsInRound = Math.max(
            1,
            Math.floor(2 ** (roundCount - roundNum)),
          );
          const roundMatches = rounds.get(roundNum) ?? [];
          const isFinalRound = roundNum === roundCount;

          return (
            <div key={roundNum} className="inline-flex items-stretch">
              {/* Connector from previous round */}
              {ri > 0 && (
                <div
                  className="flex flex-col shrink-0"
                  style={{ width: connectorWidth }}
                >
                  {/* Empty header matching column header height */}
                  <div className="h-[52px]" />

                  {/* SVG connector branches */}
                  <div
                    className="relative w-full shrink-0 rtl:scale-x-[-1]"
                    style={{ height: totalTreeHeight }}
                  >
                    <svg
                      className="w-full h-full pointer-events-none"
                      viewBox={`0 0 ${connectorWidth} ${totalTreeHeight}`}
                      fill="none"
                    >
                      {Array.from({ length: slotsInRound }, (_, k) => {
                        const yTop =
                          ((2 * k + 0.5) / (slotsInRound * 2)) * totalTreeHeight;
                        const yBottom =
                          ((2 * k + 1.5) / (slotsInRound * 2)) * totalTreeHeight;
                        const yMid =
                          ((k + 0.5) / slotsInRound) * totalTreeHeight;
                        const midX = connectorWidth / 2;

                        return (
                          <g
                            key={k}
                            stroke="currentColor"
                            className="text-border-muted"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            {/* Feeder from top previous match */}
                            <path d={`M 0 ${yTop} H ${midX} V ${yMid} H ${connectorWidth}`} />
                            {/* Feeder from bottom previous match */}
                            <path d={`M 0 ${yBottom} H ${midX} V ${yMid}`} />
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              )}

              {/* Round match column */}
              <div
                className="flex flex-col"
                style={{ width: roundWidth }}
              >
                {/* Round header */}
                <div className="h-[52px] px-3 pb-2 text-center flex flex-col justify-end">
                  <div
                    className={`text-[11px] font-bold uppercase tracking-wide ${
                      isFinalRound ? "text-primary" : "text-ink-muted"
                    }`}
                  >
                    {roundLabel(slotsInRound)}
                  </div>
                  <div className="mt-0.5 text-[10px] text-ink-faint">
                    {slotsInRound}{" "}
                    {slotsInRound > 1
                      ? t("bracket.matchesPlural", "matchs")
                      : t("bracket.matchSingular", "match")}
                  </div>
                  <div
                    className={`mx-auto mt-1.5 h-px w-8 rounded-full ${
                      isFinalRound ? "bg-primary/50" : "bg-border-muted"
                    }`}
                  />
                </div>

                {/* Match slots container: exact height, perfectly centered slots */}
                <div
                  className="flex flex-col"
                  style={{ height: totalTreeHeight }}
                >
                  {Array.from({ length: slotsInRound }, (_, k) => {
                    const match = roundMatches.find((m) => m.ordinal === k + 1);
                    return (
                      <div
                        key={k}
                        className="flex-1 flex flex-col justify-center px-1 py-1 min-h-0 relative"
                      >
                        {match ? (
                          <MatchCard
                            match={match}
                            auditIssue={
                              roundNum === 1
                                ? auditByMatchId.get(match.id)
                                : undefined
                            }
                            isSelected={selectedMatch === match.id}
                            isSwapTarget={
                              enableSwap &&
                              roundNum === 1 &&
                              !match.isBronze &&
                              swapFirst !== null &&
                              swapFirst !== match.id
                            }
                            isSwapFirst={swapFirst === match.id}
                            enableSwap={enableSwap && roundNum === 1 && !match.isBronze}
                            onSelect={() => {
                              if (enableSwap && roundNum === 1 && !match.isBronze) {
                                handleSwapSelect(match.id);
                              } else {
                                setSelectedMatch(
                                  selectedMatch === match.id ? null : match.id,
                                );
                              }
                            }}
                            onSwapClick={
                              enableSwap && roundNum === 1 && !match.isBronze
                                ? () => handleSwapSelect(match.id)
                                : undefined
                            }
                            onEnterResult={onEnterResult}
                          />
                        ) : (
                          <div className="mx-1 rounded-xl border border-dashed border-border-muted/60 bg-bg-faint/30 p-3 text-center text-xs text-ink-faint">
                            —
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Final-to-Champion Connector */}
        <div
          className="flex flex-col shrink-0"
          style={{ width: connectorWidth }}
        >
          <div className="h-[52px]" />
          <div
            className="relative w-full shrink-0 rtl:scale-x-[-1]"
            style={{ height: totalTreeHeight }}
          >
            <svg
              className="w-full h-full pointer-events-none"
              viewBox={`0 0 ${connectorWidth} ${totalTreeHeight}`}
              fill="none"
            >
              <line
                x1={0}
                y1={totalTreeHeight / 2}
                x2={connectorWidth}
                y2={totalTreeHeight / 2}
                stroke="currentColor"
                className="text-border-muted"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
            </svg>
          </div>
        </div>

        {/* Champion column */}
        <div className="flex flex-col" style={{ width: 170 }}>
          <div className="h-[52px] px-3 pb-2 text-center flex flex-col justify-end">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wide text-primary">
              <Trophy size={12} />
              {t("bracket.champion", "Champion")}
            </div>
            <div className="mt-0.5 text-[10px] text-ink-faint">&nbsp;</div>
            <div className="mx-auto mt-1.5 h-px w-8 rounded-full bg-primary/50" />
          </div>
          <div
            className="flex flex-col justify-center items-center px-1"
            style={{ height: totalTreeHeight }}
          >
            {bracket.matches.find(
              (m) =>
                m.status === "COMPLETED" &&
                m.round === roundCount &&
                !m.isBronze,
            )?.winnerName ? (
              <div className="relative flex flex-col items-center gap-2 rounded-2xl border-2 border-primary/40 bg-gradient-to-b from-primary/10 to-primary/[0.03] px-5 py-4 shadow-sm w-full">
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
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border-muted bg-bg-faint px-5 py-4 w-full">
                <Trophy size={18} className="text-ink-faint/60" />
                <span className="text-center text-xs text-ink-faint">
                  {t("bracket.pending", "En attente")}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dedicated Bronze (3rd Place) Match Section */}
      {bronzeMatch && (
        <div className="mt-5 border-t border-border-muted pt-4">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-warning">
            <Trophy size={14} className="text-warning shrink-0" />
            <span>
              {t(
                "bracket.bronzeMatchTitle",
                "Petite Finale — Match pour la 3e place (Médaille de Bronze)",
              )}
            </span>
          </div>
          <div style={{ width: roundWidth }}>
            <MatchCard
              match={bronzeMatch}
              isSelected={selectedMatch === bronzeMatch.id}
              onSelect={() =>
                setSelectedMatch(
                  selectedMatch === bronzeMatch.id ? null : bronzeMatch.id,
                )
              }
              onEnterResult={onEnterResult}
            />
          </div>
        </div>
      )}

      {/* Selected match detail */}
      {selectedMatch && (() => {
        const match = bracket.matches.find((m) => m.id === selectedMatch);
        if (!match) {
          setSelectedMatch(null);
          return null;
        }
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
  onEnterResult: _onEnterResult,
  isSwapTarget,
  isSwapFirst,
  onSwapClick: _onSwapClick,
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

  const shortWilayaA = formatWilayaShortFr(match.wilayaA, match.wilayaCodeA);
  const shortWilayaB = formatWilayaShortFr(match.wilayaB, match.wilayaCodeB);
  const fullWilayaA = match.wilayaA
    ? `${match.wilayaA}${match.wilayaCodeA ? ` (${match.wilayaCodeA})` : ""}`
    : undefined;
  const fullWilayaB = match.wilayaB
    ? `${match.wilayaB}${match.wilayaCodeB ? ` (${match.wilayaCodeB})` : ""}`
    : undefined;

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
      className={`group relative overflow-hidden rounded-xl border ${borderColor} ${bgColor} ${ring} cursor-pointer shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        match.isBronze ? "border-l-[3px] border-l-warning" : ""
      }`}
    >
      {/* Player A (Red Corner / Coin Rouge) */}
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors border-l-[3px] border-l-red-500/80 bg-red-500/[0.02] ${
          isWinnerA
            ? "font-bold text-success bg-success/[0.05]"
            : isBye && !match.nameA
              ? "text-ink-faint italic"
              : "text-ink"
        }`}
      >
        {/* Red Corner Indicator */}
        <span
          className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-red-500/15 ring-1 ring-red-500/30"
          title={t("bracket.redCorner", "Coin Rouge")}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
        </span>

        {/* Winner Checkmark if completed */}
        {isWinnerA && (
          <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-success/20 text-[9px] font-bold text-success">
            ✓
          </span>
        )}

        {/* Competitor Name */}
        <span
          className="truncate font-medium text-xs max-w-[110px]"
          title={match.nameA ?? "—"}
        >
          {match.nameA ?? "—"}
        </span>

        {/* Spacer pushing Wilaya to the end of field */}
        <div className="flex-1 min-w-[4px]" />

        {/* Shortened Wilaya in French */}
        {shortWilayaA && (
          <span
            className="shrink-0 rounded bg-bg-muted/90 px-1 py-[1px] text-[9px] font-semibold text-ink-muted border border-border-subtle tracking-tight uppercase"
            title={fullWilayaA}
          >
            {shortWilayaA}
          </span>
        )}

        {/* Score */}
        {match.scoreA != null && (
          <span
            className={`min-w-[1.25rem] text-right font-bold tabular-nums ${
              isWinnerA ? "text-success" : "text-ink"
            }`}
          >
            {match.scoreA}
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-border-muted/70" />

      {/* Player B (Blue Corner / Coin Bleu) */}
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors border-l-[3px] border-l-blue-500/80 bg-blue-500/[0.02] ${
          isWinnerB
            ? "font-bold text-success bg-success/[0.05]"
            : isBye && !match.nameB
              ? "text-ink-faint italic"
              : "text-ink"
        }`}
      >
        {/* Blue Corner Indicator */}
        <span
          className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-blue-500/15 ring-1 ring-blue-500/30"
          title={t("bracket.blueCorner", "Coin Bleu")}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
        </span>

        {/* Winner Checkmark if completed */}
        {isWinnerB && (
          <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-success/20 text-[9px] font-bold text-success">
            ✓
          </span>
        )}

        {/* Competitor Name */}
        <span
          className="truncate font-medium text-xs max-w-[110px]"
          title={match.nameB ?? "—"}
        >
          {match.nameB ?? "—"}
        </span>

        {/* Spacer pushing Wilaya to the end of field */}
        <div className="flex-1 min-w-[4px]" />

        {/* Shortened Wilaya in French */}
        {shortWilayaB && (
          <span
            className="shrink-0 rounded bg-bg-muted/90 px-1 py-[1px] text-[9px] font-semibold text-ink-muted border border-border-subtle tracking-tight uppercase"
            title={fullWilayaB}
          >
            {shortWilayaB}
          </span>
        )}

        {/* Score */}
        {match.scoreB != null && (
          <span
            className={`min-w-[1.25rem] text-right font-bold tabular-nums ${
              isWinnerB ? "text-success" : "text-ink"
            }`}
          >
            {match.scoreB}
          </span>
        )}
      </div>

      {/* Status bar */}
      {isCompleted && (
        <div className="flex items-center gap-1 border-t border-success/15 bg-success/[0.06] px-2.5 py-1 text-[10px] font-medium text-success/80">
          <CheckCircle size={10} />
          {match.resultType !== "REGULAR"
            ? match.resultType
            : t("bracket.completed", "Terminé")}
        </div>
      )}
      {isBye && (
        <div className="flex items-center gap-1 border-t border-border-muted px-2.5 py-0.5 text-[10px] text-ink-faint">
          Bye
        </div>
      )}
      {auditIssue && !isCompleted && !isBye && (
        <div className="flex items-center gap-1 border-t border-warning/25 bg-warning/[0.09] px-2.5 py-0.5 text-[10px] font-semibold text-warning">
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
        <div className="flex items-center gap-1 border-t border-primary/20 bg-primary/[0.06] px-2.5 py-0.5 text-[10px] font-medium text-primary">
          <ArrowLeftRight size={10} />
          {t("bracket.swap", "Échanger")}
        </div>
      )}
      {enableSwap && !isSwapTarget && !isSwapFirst && !isBye && !auditIssue && (
        <div className="flex items-center gap-1 border-t border-transparent px-2.5 py-0.5 text-[10px] text-primary/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
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
          {/* Competitor A (Coin Rouge) */}
          <div
            className={`rounded-xl border p-3.5 border-l-4 border-l-red-500 ${
              isWinnerA
                ? "border-success/30 bg-success/[0.06]"
                : "border-border-muted bg-bg-faint"
            }`}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="rounded bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                {t("bracket.redCorner", "Coin Rouge")}
              </span>
              {isWinnerA && <CheckCircle size={13} className="text-success" />}
            </div>
            <div
              className={`font-semibold text-base mt-1 ${
                isWinnerA ? "text-success" : "text-ink"
              }`}
            >
              {match.nameA ?? "—"}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              {match.clubA && <span>{match.clubA}</span>}
              {match.wilayaA && (
                <span className="rounded bg-bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">
                  {match.wilayaA}
                  {match.wilayaCodeA ? ` (${match.wilayaCodeA})` : ""}
                </span>
              )}
            </div>
          </div>

          {/* Competitor B (Coin Bleu) */}
          <div
            className={`rounded-xl border p-3.5 border-l-4 border-l-blue-500 ${
              isWinnerB
                ? "border-success/30 bg-success/[0.06]"
                : "border-border-muted bg-bg-faint"
            }`}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                {t("bracket.blueCorner", "Coin Bleu")}
              </span>
              {isWinnerB && <CheckCircle size={13} className="text-success" />}
            </div>
            <div
              className={`font-semibold text-base mt-1 ${
                isWinnerB ? "text-success" : "text-ink"
              }`}
            >
              {match.nameB ?? "—"}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              {match.clubB && <span>{match.clubB}</span>}
              {match.wilayaB && (
                <span className="rounded bg-bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">
                  {match.wilayaB}
                  {match.wilayaCodeB ? ` (${match.wilayaCodeB})` : ""}
                </span>
              )}
            </div>
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
