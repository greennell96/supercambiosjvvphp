/** Pure display calculations for the statistics page. */

export function marginPercent(profitEur: number, revenueEur: number): number | null {
  if (!(revenueEur > 0)) return null;
  return (profitEur / revenueEur) * 100;
}

export function averagePerItem(total: number, count: number): number | null {
  if (!(count > 0)) return null;
  return total / count;
}
