export interface RankPointsConfig {
  gold: number;
  silver: number;
  bronze: number;
}

export const DEFAULT_RANK_POINTS: RankPointsConfig = {
  gold: 5,
  silver: 3,
  bronze: 1,
};

export interface MatchInput {
  id: number;
  competitionCategoryId: number;
  round: number;
  ordinal: number;
  isBronze: boolean;
  competitorAId: number | null;
  competitorBId: number | null;
  winnerRegistrationId: number | null;
  status: string; // PENDING | COMPLETED | BYE
}

export interface RegistrationInput {
  id: number;
  athleteId: number;
  athleteName: string;
  clubId: number | null;
  clubName: string | null;
  wilayaId: number | null;
  wilayaName: string | null;
  subDepartmentId: number | null; // competitionCategoryId
  status: string;
}

export interface CategoryInput {
  id: number;
  name: string; // e.g. "Cadets - -55 kg (M)"
  gender: string;
}

export interface RankedAthlete {
  rank: number;
  medal: 'gold' | 'silver' | 'bronze' | null;
  registrationId: number;
  athleteId: number;
  athleteName: string;
  clubId: number | null;
  clubName: string | null;
  wilayaId: number | null;
  wilayaName: string | null;
  points: number;
}

export interface CategoryRanking {
  categoryId: number;
  categoryName: string;
  gender: string;
  podium: RankedAthlete[];
}

export interface IndividualRankingRow {
  rank: number;
  athleteId: number;
  athleteName: string;
  clubId: number | null;
  clubName: string | null;
  wilayaId: number | null;
  wilayaName: string | null;
  gold: number;
  silver: number;
  bronze: number;
  points: number;
}

export interface ClubRankingRow {
  rank: number;
  clubId: number;
  clubName: string;
  wilayaId: number | null;
  wilayaName: string | null;
  gold: number;
  silver: number;
  bronze: number;
  points: number;
  athleteCount: number;
}

export interface WilayaRankingRow {
  rank: number;
  wilayaId: number;
  wilayaName: string;
  gold: number;
  silver: number;
  bronze: number;
  points: number;
  clubCount: number;
}

export interface CompetitionRankingsResult {
  categories: CategoryRanking[];
  individuals: IndividualRankingRow[];
  clubs: ClubRankingRow[];
  wilayas: WilayaRankingRow[];
  pointsConfig: RankPointsConfig;
}

/**
 * Pure function to compute all rankings for a competition.
 */
export function computeCompetitionRankings(
  categories: CategoryInput[],
  registrations: RegistrationInput[],
  matches: MatchInput[],
  options: {
    bronzeMatchEnabled: boolean;
    pointsConfig?: Partial<RankPointsConfig>;
  },
): CompetitionRankingsResult {
  const pointsConfig: RankPointsConfig = {
    ...DEFAULT_RANK_POINTS,
    ...options.pointsConfig,
  };

  const regMap = new Map<number, RegistrationInput>();
  for (const r of registrations) {
    regMap.set(r.id, r);
  }

  const categoryRankings: CategoryRanking[] = [];

  // Group matches by category
  const matchesByCat = new Map<number, MatchInput[]>();
  for (const m of matches) {
    if (!matchesByCat.has(m.competitionCategoryId)) {
      matchesByCat.set(m.competitionCategoryId, []);
    }
    matchesByCat.get(m.competitionCategoryId)!.push(m);
  }

  // Track medals per athlete registration
  const athleteMedals = new Map<
    number,
    { athleteId: number; athleteName: string; clubId: number | null; clubName: string | null; wilayaId: number | null; wilayaName: string | null; gold: number; silver: number; bronze: number; points: number }
  >();

  const getOrCreateAthleteStats = (reg: RegistrationInput) => {
    if (!athleteMedals.has(reg.athleteId)) {
      athleteMedals.set(reg.athleteId, {
        athleteId: reg.athleteId,
        athleteName: reg.athleteName,
        clubId: reg.clubId,
        clubName: reg.clubName,
        wilayaId: reg.wilayaId,
        wilayaName: reg.wilayaName,
        gold: 0,
        silver: 0,
        bronze: 0,
        points: 0,
      });
    }
    return athleteMedals.get(reg.athleteId)!;
  };

  for (const cat of categories) {
    const catMatches = matchesByCat.get(cat.id) ?? [];
    if (catMatches.length === 0) {
      categoryRankings.push({
        categoryId: cat.id,
        categoryName: cat.name,
        gender: cat.gender,
        podium: [],
      });
      continue;
    }

    const podium: RankedAthlete[] = [];
    const maxRound = Math.max(...catMatches.map((m) => m.round));
    const finalMatch = catMatches.find((m) => m.round === maxRound && !m.isBronze);
    const bronzeMatch = catMatches.find((m) => m.isBronze);

    // 1. Gold & Silver from Final
    if (finalMatch && finalMatch.status === 'COMPLETED' && finalMatch.winnerRegistrationId) {
      const winnerReg = regMap.get(finalMatch.winnerRegistrationId);
      const loserId =
        finalMatch.winnerRegistrationId === finalMatch.competitorAId
          ? finalMatch.competitorBId
          : finalMatch.competitorAId;
      const loserReg = loserId ? regMap.get(loserId) : null;

      if (winnerReg) {
        podium.push({
          rank: 1,
          medal: 'gold',
          registrationId: winnerReg.id,
          athleteId: winnerReg.athleteId,
          athleteName: winnerReg.athleteName,
          clubId: winnerReg.clubId,
          clubName: winnerReg.clubName,
          wilayaId: winnerReg.wilayaId,
          wilayaName: winnerReg.wilayaName,
          points: pointsConfig.gold,
        });
        const ast = getOrCreateAthleteStats(winnerReg);
        ast.gold++;
        ast.points += pointsConfig.gold;
      }

      if (loserReg) {
        podium.push({
          rank: 2,
          medal: 'silver',
          registrationId: loserReg.id,
          athleteId: loserReg.athleteId,
          athleteName: loserReg.athleteName,
          clubId: loserReg.clubId,
          clubName: loserReg.clubName,
          wilayaId: loserReg.wilayaId,
          wilayaName: loserReg.wilayaName,
          points: pointsConfig.silver,
        });
        const ast = getOrCreateAthleteStats(loserReg);
        ast.silver++;
        ast.points += pointsConfig.silver;
      }
    }

    // 2. Bronze
    if (options.bronzeMatchEnabled) {
      if (bronzeMatch && bronzeMatch.status === 'COMPLETED' && bronzeMatch.winnerRegistrationId) {
        const bronzeWinnerReg = regMap.get(bronzeMatch.winnerRegistrationId);
        const bronzeLoserId =
          bronzeMatch.winnerRegistrationId === bronzeMatch.competitorAId
            ? bronzeMatch.competitorBId
            : bronzeMatch.competitorAId;
        const bronzeLoserReg = bronzeLoserId ? regMap.get(bronzeLoserId) : null;

        if (bronzeWinnerReg) {
          podium.push({
            rank: 3,
            medal: 'bronze',
            registrationId: bronzeWinnerReg.id,
            athleteId: bronzeWinnerReg.athleteId,
            athleteName: bronzeWinnerReg.athleteName,
            clubId: bronzeWinnerReg.clubId,
            clubName: bronzeWinnerReg.clubName,
            wilayaId: bronzeWinnerReg.wilayaId,
            wilayaName: bronzeWinnerReg.wilayaName,
            points: pointsConfig.bronze,
          });
          const ast = getOrCreateAthleteStats(bronzeWinnerReg);
          ast.bronze++;
          ast.points += pointsConfig.bronze;
        }

        if (bronzeLoserReg) {
          podium.push({
            rank: 4,
            medal: null,
            registrationId: bronzeLoserReg.id,
            athleteId: bronzeLoserReg.athleteId,
            athleteName: bronzeLoserReg.athleteName,
            clubId: bronzeLoserReg.clubId,
            clubName: bronzeLoserReg.clubName,
            wilayaId: bronzeLoserReg.wilayaId,
            wilayaName: bronzeLoserReg.wilayaName,
            points: 0,
          });
        }
      }
    } else {
      // Both semi-final losers get bronze automatically
      const semiRound = maxRound - 1;
      if (semiRound >= 1) {
        const semiMatches = catMatches.filter((m) => m.round === semiRound && !m.isBronze);
        for (const sm of semiMatches) {
          if (sm.status === 'COMPLETED' && sm.winnerRegistrationId) {
            const loserId =
              sm.winnerRegistrationId === sm.competitorAId ? sm.competitorBId : sm.competitorAId;
            const loserReg = loserId ? regMap.get(loserId) : null;
            if (loserReg) {
              podium.push({
                rank: 3,
                medal: 'bronze',
                registrationId: loserReg.id,
                athleteId: loserReg.athleteId,
                athleteName: loserReg.athleteName,
                clubId: loserReg.clubId,
                clubName: loserReg.clubName,
                wilayaId: loserReg.wilayaId,
                wilayaName: loserReg.wilayaName,
                points: pointsConfig.bronze,
              });
              const ast = getOrCreateAthleteStats(loserReg);
              ast.bronze++;
              ast.points += pointsConfig.bronze;
            }
          }
        }
      }
    }

    categoryRankings.push({
      categoryId: cat.id,
      categoryName: cat.name,
      gender: cat.gender,
      podium,
    });
  }

  // 3. Overall Individual Standings
  const individualList = Array.from(athleteMedals.values())
    .filter((a) => a.gold > 0 || a.silver > 0 || a.bronze > 0)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gold !== a.gold) return b.gold - a.gold;
      if (b.silver !== a.silver) return b.silver - a.silver;
      return b.bronze - a.bronze;
    });

  const individuals: IndividualRankingRow[] = individualList.map((row, idx) => ({
    rank: idx + 1,
    ...row,
  }));

  // 4. Club Standings
  const clubStats = new Map<
    number,
    { clubId: number; clubName: string; wilayaId: number | null; wilayaName: string | null; gold: number; silver: number; bronze: number; points: number; athleteIds: Set<number> }
  >();

  for (const reg of registrations) {
    if (reg.clubId != null) {
      if (!clubStats.has(reg.clubId)) {
        clubStats.set(reg.clubId, {
          clubId: reg.clubId,
          clubName: reg.clubName ?? 'Club inconnu',
          wilayaId: reg.wilayaId,
          wilayaName: reg.wilayaName,
          gold: 0,
          silver: 0,
          bronze: 0,
          points: 0,
          athleteIds: new Set(),
        });
      }
      clubStats.get(reg.clubId)!.athleteIds.add(reg.athleteId);
    }
  }

  for (const catRank of categoryRankings) {
    for (const p of catRank.podium) {
      if (p.clubId != null && clubStats.has(p.clubId)) {
        const cst = clubStats.get(p.clubId)!;
        if (p.medal === 'gold') {
          cst.gold++;
          cst.points += pointsConfig.gold;
        } else if (p.medal === 'silver') {
          cst.silver++;
          cst.points += pointsConfig.silver;
        } else if (p.medal === 'bronze') {
          cst.bronze++;
          cst.points += pointsConfig.bronze;
        }
      }
    }
  }

  const sortedClubs = Array.from(clubStats.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gold !== a.gold) return b.gold - a.gold;
    if (b.silver !== a.silver) return b.silver - a.silver;
    return b.bronze - a.bronze;
  });

  const clubs: ClubRankingRow[] = sortedClubs.map((c, idx) => ({
    rank: idx + 1,
    clubId: c.clubId,
    clubName: c.clubName,
    wilayaId: c.wilayaId,
    wilayaName: c.wilayaName,
    gold: c.gold,
    silver: c.silver,
    bronze: c.bronze,
    points: c.points,
    athleteCount: c.athleteIds.size,
  }));

  // 5. Wilaya Standings
  const wilayaStats = new Map<
    number,
    { wilayaId: number; wilayaName: string; gold: number; silver: number; bronze: number; points: number; clubIds: Set<number> }
  >();

  for (const c of clubs) {
    if (c.wilayaId != null) {
      if (!wilayaStats.has(c.wilayaId)) {
        wilayaStats.set(c.wilayaId, {
          wilayaId: c.wilayaId,
          wilayaName: c.wilayaName ?? 'Wilaya inconnue',
          gold: 0,
          silver: 0,
          bronze: 0,
          points: 0,
          clubIds: new Set(),
        });
      }
      const wst = wilayaStats.get(c.wilayaId)!;
      wst.gold += c.gold;
      wst.silver += c.silver;
      wst.bronze += c.bronze;
      wst.points += c.points;
      wst.clubIds.add(c.clubId);
    }
  }

  const sortedWilayas = Array.from(wilayaStats.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gold !== a.gold) return b.gold - a.gold;
    if (b.silver !== a.silver) return b.silver - a.silver;
    return b.bronze - a.bronze;
  });

  const wilayas: WilayaRankingRow[] = sortedWilayas.map((w, idx) => ({
    rank: idx + 1,
    wilayaId: w.wilayaId,
    wilayaName: w.wilayaName,
    gold: w.gold,
    silver: w.silver,
    bronze: w.bronze,
    points: w.points,
    clubCount: w.clubIds.size,
  }));

  return {
    categories: categoryRankings,
    individuals,
    clubs,
    wilayas,
    pointsConfig,
  };
}
