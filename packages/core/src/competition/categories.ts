/**
 * Competition Category Domain Logic
 * Pure functions and domain interfaces for athlete category matching.
 */

export interface CategoryDefinition {
  id: number;
  gender: string;
  ageCategoryId: number;
  weightDivisionId: number;
  enabled?: boolean;
}

export interface AgeCategoryCriteria {
  minAge: number;
  maxAge: number | null;
}

export interface WeightDivisionCriteria {
  minKg: number | null;
  maxKg: number | null;
}

export interface ResolvableCategory {
  id: number;
  gender: string;
  minAge: number;
  maxAge: number | null;
  minKg: number | null;
  maxKg: number | null;
  enabled?: boolean;
}

/**
 * Finds the first enabled category matching (gender, age, weight)
 * using raw category definitions and lookup maps for age/weight criteria.
 */
export function findCategory(
  cats: CategoryDefinition[],
  ageCatMap: Map<number, AgeCategoryCriteria>,
  weightMap: Map<number, WeightDivisionCriteria>,
  gender: string,
  age: number,
  weightKg: number | null,
): number | null {
  for (const cat of cats) {
    if (cat.enabled === false) continue;
    if (cat.gender !== gender) continue;

    const ageCat = ageCatMap.get(cat.ageCategoryId);
    const weight = weightMap.get(cat.weightDivisionId);
    if (!ageCat || !weight) continue;

    // Check age: [minAge, maxAge] (inclusive both ends)
    if (age < ageCat.minAge) continue;
    if (ageCat.maxAge != null && age > ageCat.maxAge) continue;

    // Check weight: [minKg, maxKg] (inclusive both ends; requires weightKg to be present)
    if (weightKg == null) continue;
    if (weight.minKg != null && weightKg < weight.minKg) continue;
    if (weight.maxKg != null && weightKg > weight.maxKg) continue;

    return cat.id;
  }
  return null;
}

/**
 * Finds the first enabled category matching (gender, age, weight)
 * from a list of pre-joined / flattened categories.
 */
export function findResolvableCategory(
  categories: ResolvableCategory[],
  gender: string,
  age: number,
  weightKg: number | null,
): number | null {
  for (const cat of categories) {
    if (cat.enabled === false) continue;
    if (cat.gender !== gender) continue;

    if (age < cat.minAge) continue;
    if (cat.maxAge != null && age > cat.maxAge) continue;

    if (weightKg == null) continue;
    if (cat.minKg != null && weightKg < cat.minKg) continue;
    if (cat.maxKg != null && weightKg > cat.maxKg) continue;

    return cat.id;
  }
  return null;
}
