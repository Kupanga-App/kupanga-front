/** « 1 an », « 18 mois », « 2 ans ». */
export function libelleDuree(mois: number | null | undefined): string {
  const n = Number(mois);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n % 12 === 0) return n === 12 ? '1 an' : `${n / 12} ans`;
  return `${n} mois`;
}
