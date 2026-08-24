/** Text helpers shared by the money rules and the search boxes. */

/**
 * Lowercase, accent-free, whitespace-trimmed.
 * Used for every comparison where "Móvil" must equal "Movil".
 */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/** Digits only. Lets a phone search match regardless of spaces or "+34". */
export function digitsOnly(value: string): string {
  return value.replace(/\D+/g, '');
}
