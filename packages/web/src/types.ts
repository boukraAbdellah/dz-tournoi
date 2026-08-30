export interface Wilaya {
  id: number;
  code: number;
  nameAr: string;
  nameFr: string;
}

export interface City {
  id: number;
  wilayaId: number;
  nameAr: string;
  nameFr: string;
}

export interface Club {
  id: number;
  name: string;
  wilayaId: number;
  cityId: number;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  wilayaName?: string;
  cityName?: string;
}

export interface Athlete {
  id: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: 'M' | 'F';
  weightKg?: number | null;
  clubId?: number | null;
  phone?: string | null;
  notes?: string | null;
  clubName?: string;
}

export interface Stats {
  clubs: number;
  athletes: number;
  competitions: number;
}

export interface SportTemplate {
  id: number;
  name: string;
  builtin: boolean;
}

export interface AgeCategory {
  id: number;
  sportTemplateId: number;
  name: string;
  minAge: number;
  maxAge: number | null;
}

export interface WeightDivision {
  id: number;
  ageCategoryId: number;
  name: string;
  maxWeight: number | null;
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
}