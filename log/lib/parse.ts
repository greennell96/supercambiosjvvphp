/** Form-input parsing. Tolerant of how numbers are actually typed in Spain. */

/**
 * "1070,5" and "1070.5" and "1.070,5" all mean the same number here.
 * Returns null when the field is blank or not a number.
 */
export function parseDecimal(raw: FormDataEntryValue | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  let text = String(raw).trim();
  if (!text) return null;

  // If both separators are present, the last one is the decimal separator.
  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSep = lastComma > lastDot ? ',' : '.';
    const thousandsSep = decimalSep === ',' ? '.' : ',';
    text = text.split(thousandsSep).join('');
    text = text.replace(decimalSep, '.');
  } else if (lastComma >= 0) {
    text = text.replace(',', '.');
  }

  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

export function parseId(raw: FormDataEntryValue | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const value = Number(String(raw).trim());
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function textOrNull(raw: FormDataEntryValue | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  return text ? text : null;
}

export function text(raw: FormDataEntryValue | null | undefined): string {
  return raw === null || raw === undefined ? '' : String(raw).trim();
}
