/** Unreviewed providers have no earned stars, even with a legacy default rating. */
export function providerRating(rating: unknown, reviewCount?: unknown): number {
  if (reviewCount != null && Number(reviewCount) <= 0) return 0;
  const value = Number(rating);
  return Number.isFinite(value) ? Math.min(5, Math.max(0, value)) : 0;
}
