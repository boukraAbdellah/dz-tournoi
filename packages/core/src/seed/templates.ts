// Seed definitions for the built-in sport templates.

export interface SeedAgeCategory {
  name: string;
  minAge: number;
  maxAge: number | null;
}

export interface SeedWeightDivision {
  ageName: string;
  name: string;
  minKg: number | null;
  maxKg: number | null;
}

export interface SeedTemplate {
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  ageCategories: SeedAgeCategory[];
  weightDivisions: SeedWeightDivision[];
}

export const SEED_TEMPLATES: SeedTemplate[] = [
  {
    name: 'Karate',
    slug: 'karate',
    settings: {
      defaultBronze: true,
      resultTypes: ['REGULAR', 'DECISION', 'TKO', 'DQ'],
    },
    ageCategories: [
      { name: 'Poussins', minAge: 10, maxAge: 11 },
      { name: 'Minimes', minAge: 12, maxAge: 13 },
      { name: 'Cadets', minAge: 14, maxAge: 15 },
      { name: 'Juniors', minAge: 16, maxAge: 17 },
      { name: 'Espoirs', minAge: 18, maxAge: 20 },
      { name: 'Seniors', minAge: 21, maxAge: null },
    ],
    weightDivisions: [
      // Minimes
      { ageName: 'Minimes', name: '-35 kg', minKg: null, maxKg: 35 },
      { ageName: 'Minimes', name: '-40 kg', minKg: 35, maxKg: 40 },
      { ageName: 'Minimes', name: '-45 kg', minKg: 40, maxKg: 45 },
      { ageName: 'Minimes', name: '-50 kg', minKg: 45, maxKg: 50 },
      { ageName: 'Minimes', name: '-55 kg', minKg: 50, maxKg: 55 },
      { ageName: 'Minimes', name: '+55 kg', minKg: 55, maxKg: null },
      // Cadets
      { ageName: 'Cadets', name: '-45 kg', minKg: null, maxKg: 45 },
      { ageName: 'Cadets', name: '-50 kg', minKg: 45, maxKg: 50 },
      { ageName: 'Cadets', name: '-55 kg', minKg: 50, maxKg: 55 },
      { ageName: 'Cadets', name: '-60 kg', minKg: 55, maxKg: 60 },
      { ageName: 'Cadets', name: '+60 kg', minKg: 60, maxKg: null },
      // Juniors
      { ageName: 'Juniors', name: '-55 kg', minKg: null, maxKg: 55 },
      { ageName: 'Juniors', name: '-61 kg', minKg: 55, maxKg: 61 },
      { ageName: 'Juniors', name: '-68 kg', minKg: 61, maxKg: 68 },
      { ageName: 'Juniors', name: '+68 kg', minKg: 68, maxKg: null },
      // Espoirs
      { ageName: 'Espoirs', name: '-55 kg', minKg: null, maxKg: 55 },
      { ageName: 'Espoirs', name: '-61 kg', minKg: 55, maxKg: 61 },
      { ageName: 'Espoirs', name: '-68 kg', minKg: 61, maxKg: 68 },
      { ageName: 'Espoirs', name: '-75 kg', minKg: 68, maxKg: 75 },
      { ageName: 'Espoirs', name: '+75 kg', minKg: 75, maxKg: null },
      // Seniors
      { ageName: 'Seniors', name: '-55 kg', minKg: null, maxKg: 55 },
      { ageName: 'Seniors', name: '-61 kg', minKg: 55, maxKg: 61 },
      { ageName: 'Seniors', name: '-68 kg', minKg: 61, maxKg: 68 },
      { ageName: 'Seniors', name: '-75 kg', minKg: 68, maxKg: 75 },
      { ageName: 'Seniors', name: '-84 kg', minKg: 75, maxKg: 84 },
      { ageName: 'Seniors', name: '+84 kg', minKg: 84, maxKg: null },
    ],
  },
  {
    name: 'MMA',
    slug: 'mma',
    settings: {
      defaultBronze: true,
      resultTypes: ['DECISION', 'TKO', 'SUB', 'DQ'],
    },
    ageCategories: [
      { name: 'Juniores', minAge: 14, maxAge: 15 },
      { name: 'Pre-Kids', minAge: 15, maxAge: 17 },
      { name: 'Amateurs', minAge: 18, maxAge: 39 },
      { name: 'Vétérans', minAge: 40, maxAge: null },
    ],
    weightDivisions: [
      { ageName: 'Juniores', name: 'Poux', minKg: null, maxKg: 40 },
      { ageName: 'Juniores', name: 'Léger', minKg: 40, maxKg: 45 },
      { ageName: 'Juniores', name: 'Moyen', minKg: 45, maxKg: 50 },
      { ageName: 'Juniores', name: 'Lourd', minKg: 50, maxKg: null },
      { ageName: 'Pre-Kids', name: '-50 kg', minKg: null, maxKg: 50 },
      { ageName: 'Pre-Kids', name: '-55 kg', minKg: 50, maxKg: 55 },
      { ageName: 'Pre-Kids', name: '-60 kg', minKg: 55, maxKg: 60 },
      { ageName: 'Pre-Kids', name: '+60 kg', minKg: 60, maxKg: null },
      { ageName: 'Amateurs', name: '-57 kg', minKg: null, maxKg: 57 },
      { ageName: 'Amateurs', name: '-61 kg', minKg: 57, maxKg: 61 },
      { ageName: 'Amateurs', name: '-66 kg', minKg: 61, maxKg: 66 },
      { ageName: 'Amateurs', name: '-70 kg', minKg: 66, maxKg: 70 },
      { ageName: 'Amateurs', name: '-77 kg', minKg: 70, maxKg: 77 },
      { ageName: 'Amateurs', name: '-84 kg', minKg: 77, maxKg: 84 },
      { ageName: 'Amateurs', name: '-93 kg', minKg: 84, maxKg: 93 },
      { ageName: 'Amateurs', name: '+93 kg', minKg: 93, maxKg: null },
    ],
  },
  {
    name: 'Jeet Kune Do',
    slug: 'jkd',
    settings: {
      defaultBronze: true,
      resultTypes: ['REGULAR', 'DECISION', 'TKO', 'DQ'],
    },
    ageCategories: [
      { name: 'Enfants', minAge: 8, maxAge: 11 },
      { name: 'Adolescents', minAge: 12, maxAge: 15 },
      { name: 'Juniors', minAge: 16, maxAge: 17 },
      { name: 'Adultes', minAge: 18, maxAge: null },
    ],
    weightDivisions: [
      { ageName: 'Enfants', name: '-30 kg', minKg: null, maxKg: 30 },
      { ageName: 'Enfants', name: '-35 kg', minKg: 30, maxKg: 35 },
      { ageName: 'Enfants', name: '+35 kg', minKg: 35, maxKg: null },
      { ageName: 'Adolescents', name: '-45 kg', minKg: null, maxKg: 45 },
      { ageName: 'Adolescents', name: '-55 kg', minKg: 45, maxKg: 55 },
      { ageName: 'Adolescents', name: '+55 kg', minKg: 55, maxKg: null },
      { ageName: 'Juniors', name: '-60 kg', minKg: null, maxKg: 60 },
      { ageName: 'Juniors', name: '-70 kg', minKg: 60, maxKg: 70 },
      { ageName: 'Juniors', name: '+70 kg', minKg: 70, maxKg: null },
      { ageName: 'Adultes', name: '-70 kg', minKg: null, maxKg: 70 },
      { ageName: 'Adultes', name: '-80 kg', minKg: 70, maxKg: 80 },
      { ageName: 'Adultes', name: '-90 kg', minKg: 80, maxKg: 90 },
      { ageName: 'Adultes', name: '+90 kg', minKg: 90, maxKg: null },
    ],
  },
];