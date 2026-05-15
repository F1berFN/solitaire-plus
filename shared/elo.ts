/**
 * ELO Rating System for Solitaire+
 * Standard chess ELO with K-factor of 32
 */

const K_FACTOR = 32;
const BASE_RATING = 1200;

/**
 * Calculate expected score (probability of winning)
 */
export function calculateExpectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

/**
 * Calculate new ELO rating after a game
 * @param currentRating - Player's current ELO rating
 * @param opponentRating - Opponent's ELO rating
 * @param result - 1 for win, 0 for loss, 0.5 for draw
 * @returns New ELO rating (rounded to nearest integer)
 */
export function calculateNewElo(
  currentRating: number,
  opponentRating: number,
  result: 0 | 0.5 | 1
): number {
  const expectedScore = calculateExpectedScore(currentRating, opponentRating);
  const newRating = currentRating + K_FACTOR * (result - expectedScore);
  return Math.round(newRating);
}

/**
 * Calculate ELO change
 */
export function calculateEloChange(
  currentRating: number,
  opponentRating: number,
  result: 0 | 0.5 | 1
): number {
  const newRating = calculateNewElo(currentRating, opponentRating, result);
  return newRating - currentRating;
}

/**
 * Get ELO tier/rank name
 */
export function getEloTier(elo: number): string {
  if (elo >= 2400) return "Legendary";
  if (elo >= 2000) return "Master";
  if (elo >= 1800) return "Expert";
  if (elo >= 1600) return "Advanced";
  if (elo >= 1400) return "Intermediate";
  if (elo >= 1200) return "Novice";
  return "Beginner";
}

/**
 * Get ELO tier color (for UI)
 */
export function getEloTierColor(elo: number): string {
  if (elo >= 2400) return "from-purple-600 to-pink-600";
  if (elo >= 2000) return "from-red-600 to-orange-600";
  if (elo >= 1800) return "from-orange-500 to-yellow-500";
  if (elo >= 1600) return "from-yellow-500 to-green-500";
  if (elo >= 1400) return "from-green-500 to-blue-500";
  if (elo >= 1200) return "from-blue-500 to-cyan-500";
  return "from-gray-500 to-slate-500";
}

/**
 * Format ELO change for display (+15, -8, etc.)
 */
export function formatEloChange(change: number): string {
  if (change > 0) return `+${change}`;
  if (change < 0) return `${change}`;
  return "±0";
}
