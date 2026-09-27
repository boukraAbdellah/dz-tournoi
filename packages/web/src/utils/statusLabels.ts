/**
 * Competition status display labels (French default)
 */

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  REGISTRATION_OPEN: "Inscriptions ouvertes",
  REGISTRATION_CLOSED: "Inscriptions fermées",
  DRAW_GENERATED: "Tableau généré",
  DRAW_CONFIRMED: "Tableau confirmé",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminé",
};

/**
 * Get human-readable status label with fallback to raw status key
 */
export function getStatusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}
