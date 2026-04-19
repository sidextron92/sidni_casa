const STOP_WORDS = /\b(the|apartments?|residences?|residency|society|complex|heights|towers?|estate|homes?|greens|gardens?|enclave|villas?|condos?)\b/g

export function normalizeSocietyName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(STOP_WORDS, '')
    .replace(/\s+/g, ' ')
    .trim()
}
