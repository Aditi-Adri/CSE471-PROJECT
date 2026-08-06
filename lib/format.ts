const bdtNumberFormatter = new Intl.NumberFormat("en-US");

/** Formats a whole-taka amount as "৳1,200" (avoids relying on the "BDT"
 *  currency being available in every runtime's Intl currency data). */
export function formatBdt(amount: number): string {
  return `৳${bdtNumberFormatter.format(Math.round(amount))}`;
}

export function formatRateRange(minBdt: number, maxBdt: number): string {
  return `${formatBdt(minBdt)}–${formatBdt(maxBdt)}/hr`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}
