/** ISO (YYYY-MM-DD) → French (DD/MM/YYYY) for display */
export function isoToFr(iso: string | null | undefined): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2] ?? ''}/${parts[1] ?? ''}/${parts[0] ?? ''}`;
}

/** French (DD/MM/YYYY) → ISO (YYYY-MM-DD) for storage */
export function frToIso(fr: string): string {
  const parts = fr.split('/');
  if (parts.length !== 3) return '';
  return `${parts[2] ?? ''}-${parts[1] ?? ''}-${parts[0] ?? ''}`;
}
