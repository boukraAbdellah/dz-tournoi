import type { Athlete, Club } from "../../types";

export interface CompetitionDetail {
  id: number;
  name: string;
  date: string;
  location: string | null;
  description: string | null;
  status: string;
  templateName: string | null;
  bronzeMatchEnabled: boolean;
  clubRankingEnabled: boolean;
  wilayaRankingEnabled: boolean;
  rankPoints: string | null;
  totalRegistrations: number;
  unresolvedCount: number;
  categories: Array<{
    id: number;
    ageCategoryId: number;
    ageCategoryName: string;
    minAge: number;
    maxAge: number | null;
    weightDivisionId: number;
    weightDivisionName: string;
    minKg: number | null;
    maxKg: number | null;
    gender: string;
    enabled: boolean;
    registrationCount: number;
  }>;
}

export interface Reg {
  id: number;
  athleteId: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  weightKg: number | null;
  clubName: string | null;
  subDepartmentId: number | null;
  status: string;
}

export interface Resolution {
  resolved: Array<{
    regId: number;
    athleteName: string;
    categoryId: number;
    categoryName: string;
    weightKg: number | null;
    clubName: string | null;
  }>;
  unresolved: Array<{
    regId: number;
    athleteName: string;
    reason: string;
    weightKg: number | null;
    clubName: string | null;
  }>;
  total: number;
}

export interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

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
  clubA: string | null;
  clubB: string | null;
  sameClub: boolean;
  sameCity: boolean;
  sameWilaya: boolean;
  clubName: string | null;
  cityName: string | null;
  wilayaName: string | null;
}

export interface BracketData {
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
  pointsConfig: { gold: number; silver: number; bronze: number };
}

export type { Athlete, Club };
