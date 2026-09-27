/**
 * Shared API Utilities
 */

/**
 * Calculate age in full years at competition date
 * @param birthDate Athlete date of birth (ISO YYYY-MM-DD)
 * @param compDate Competition date (ISO YYYY-MM-DD)
 */
export function ageAtDate(birthDate: string, compDate: string): number {
  const birth = new Date(birthDate);
  const comp = new Date(compDate);
  let age = comp.getFullYear() - birth.getFullYear();
  const m = comp.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && comp.getDate() < birth.getDate())) age--;
  return age;
}
