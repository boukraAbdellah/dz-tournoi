export type DocumentLanguage = 'fr' | 'ar';
export type DocumentFormat = 'html' | 'pdf';

export type DocumentType =
  | 'participants'
  | 'categories'
  | 'brackets'
  | 'match-sheets'
  | 'rankings'
  | 'certificates';

export interface CompetitionDocMeta {
  id: number;
  name: string;
  date: string;
  location: string | null;
  sportName: string;
  organizer?: string;
}

export interface ParticipantDocItem {
  id: number;
  athleteId: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  age: number;
  gender: 'M' | 'F';
  weightKg: number | null;
  clubName: string;
  wilayaName: string;
  categoryName: string;
  status: string;
}

export interface CategoryDocItem {
  id: number;
  name: string;
  gender: 'M' | 'F';
  minAge: number;
  maxAge: number | null;
  minKg: number | null;
  maxKg: number | null;
  participantCount: number;
  matchesCount: number;
  format: string;
}

export interface BracketDocMatch {
  id: number;
  round: number;
  ordinal: number;
  form: string;
  isBronze: boolean;
  competitorA?: {
    name: string;
    club: string;
    wilaya?: string;
  } | null;
  competitorB?: {
    name: string;
    club: string;
    wilaya?: string;
  } | null;
  scoreA?: number | null;
  scoreB?: number | null;
  winnerRegistrationId?: number | null;
  winnerName?: string | null;
  status: string;
}

export interface BracketDocCategory {
  id: number;
  name: string;
  gender: 'M' | 'F';
  matches: BracketDocMatch[];
  roundsCount: number;
}

export interface MatchSheetDocItem {
  matchId: number;
  round: number;
  form: string;
  ordinal: number;
  isBronze: boolean;
  categoryName: string;
  gender: 'M' | 'F';
  tatami?: string;
  competitorA?: {
    name: string;
    club: string;
    wilaya?: string;
    weightKg?: number | null;
  } | null;
  competitorB?: {
    name: string;
    club: string;
    wilaya?: string;
    weightKg?: number | null;
  } | null;
}

export interface CertificateDocItem {
  type: 'participation' | 'winner';
  athleteName: string;
  clubName: string;
  wilayaName: string;
  categoryName: string;
  gender: 'M' | 'F';
  rank?: number; // 1, 2, 3
  medal?: 'gold' | 'silver' | 'bronze';
  competitionName: string;
  competitionDate: string;
  competitionLocation?: string | null;
  sportName: string;
}
