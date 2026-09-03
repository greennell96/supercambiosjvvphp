/**
 * Turns a stored or typed phone into a comparable key, so "612 345 678" and
 * "+34612345678" are recognised as the same number without ever normalising
 * either one for display.
 *
 * Pure module, no database. Used to find a client who may already be on file
 * under a differently-punctuated version of the same phone.
 */

/**
 * Rule validated against the real 664 imported clients:
 *  - strip everything but digits (spaces, dashes, parentheses, "+");
 *  - drop a leading "0034" (the dialling prefix some rows were typed with);
 *  - drop a leading "34" ONLY when the digit string BEFORE that drop is 11
 *    digits long, because that is exactly the shape of a Spanish mobile
 *    written as country-code-plus-nine-digits with no "00" or "+" in front
 *    ("34612345678"). A shorter or longer string that happens to start with
 *    "34" is left alone instead of guessed at;
 *  - fewer than 6 digits left means there is no usable phone at all, so this
 *    returns null rather than a short string that could coincidentally match
 *    someone else's.
 *
 * This does NOT strip "58" (Venezuela) or any other country code: 21 of the
 * 664 rows normalize to 10 digits and 5 to 12, i.e. real Venezuelan numbers
 * and prefixes this rule has not been validated against. Stripping one would
 * invent matches nobody asked for, so those numbers are compared with their
 * prefix intact.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D+/g, '');
  if (digits.startsWith('0034')) {
    digits = digits.slice(4);
  } else if (digits.startsWith('34') && digits.length === 11) {
    digits = digits.slice(2);
  }
  return digits.length >= 6 ? digits : null;
}
