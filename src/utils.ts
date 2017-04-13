/**
 * Convert a string to PascalCase
 *
 * @param str string to convert to Pascal case
 */
export function pascalCase(str: string) {
  const bits = str
    .trim()
    .replace(/[^a-zA-Z0-9]+/gm, '_')
    .split('_');

  let out = '';
  for (const bit of bits) {
    out += bit.length < 2
      ? (bit || '').toLocaleUpperCase()
      : bit.charAt(0).toLocaleUpperCase() + bit.slice(1)
  }

  return out;
}