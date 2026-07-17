/** Normalize typed digits for MM / DD / YYYY segments (rancher-friendly overwrite). */
export function parseSegmentDigits(
  raw: string,
  maxLength: number,
  previous: string,
  selectionStart: number,
  selectionEnd: number,
): string {
  const digits = raw.replace(/\D/g, "");
  const hadFullSelection =
    previous.length > 0 && selectionStart === 0 && selectionEnd === previous.length;

  if (hadFullSelection) {
    return digits.slice(0, maxLength);
  }

  if (
    previous.length === maxLength &&
    selectionStart === maxLength &&
    selectionEnd === maxLength &&
    digits.length === previous.length + 1
  ) {
    return (previous.slice(0, -1) + digits.slice(-1)).slice(0, maxLength);
  }

  if (previous.length === maxLength && digits.length > maxLength) {
    return digits.slice(-maxLength);
  }

  return digits.slice(0, maxLength);
}
