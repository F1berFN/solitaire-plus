import { eq, desc, sql } from "drizzle-orm";
import { getDb } from "./db";
import { userStats, users, games, guestPlayers } from "../drizzle/schema";
import { calculateNewElo } from "@shared/elo";

/**
 * Get user ELO rating
 */
export async function getUserElo(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 1200;
  const result = await db
    .select({ elo: userStats.elo })
    .from(userStats)
    .where(eq(userStats.userId, userId))
    .limit(1);
  return result[0]?.elo ?? 1200;
}

/**
 * Get guest ELO rating
 */
export async function getGuestElo(guestId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 1200;
  const result = await db
    .select({ elo: guestPlayers.elo })
    .from(guestPlayers)
    .where(eq(guestPlayers.id, guestId))
    .limit(1);
  return result[0]?.elo ?? 1200;
}

/**
 * Update user ELO after game
 */
export async function updateUserElo(
  userId: number,
  newElo: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(userStats)
    .set({ elo: newElo })
    .where(eq(userStats.userId, userId));
}

/**
 * Update guest ELO after game
 */
export async function updateGuestElo(
  guestId: number,
  newElo: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(guestPlayers)
    .set({ elo: newElo })
    .where(eq(guestPlayers.id, guestId));
}

/**
 * Get ELO leaderboard (top 50) - includes both auth users and guests
 */
export async function getEloLeaderboard(limit = 50) {
  const db = await getDb();
  if (!db) return [];

  // Get auth users with ELO
  const authUsers = await db
    .select({
      userId: userStats.userId,
      elo: userStats.elo,
      name: users.name,
      gamesWon: sql<number>`COUNT(CASE WHEN ${games.won} = 1 THEN 1 END)`,
      type: sql<"auth">`'auth'`,
    })
    .from(userStats)
    .innerJoin(users, eq(userStats.userId, users.id))
    .leftJoin(games, eq(games.userId, userStats.userId))
    .groupBy(userStats.userId, users.name, userStats.elo)
    .orderBy(desc(userStats.elo))
    .limit(limit);

  // Get guest players with ELO
  const guestUsers = await db
    .select({
      id: guestPlayers.id,
      elo: guestPlayers.elo,
      displayName: guestPlayers.displayName,
      discriminator: guestPlayers.discriminator,
      type: sql<"guest">`'guest'`,
    })
    .from(guestPlayers)
    .orderBy(desc(guestPlayers.elo))
    .limit(limit);

  // Combine and sort by ELO
  const combined = [
    ...authUsers.map((entry) => ({
      id: entry.userId,
      name: entry.name,
      elo: entry.elo,
      gamesWon: entry.gamesWon ?? 0,
      type: "auth" as const,
    })),
    ...guestUsers.map((entry) => ({
      id: entry.id,
      name: `${entry.displayName} #${String(entry.discriminator).padStart(4, "0")}`,
      elo: entry.elo,
      gamesWon: 0,
      type: "guest" as const,
    })),
  ];

  return combined.sort((a, b) => b.elo - a.elo).slice(0, limit);
}

/**
 * Get user's ELO rank
 */
export async function getUserEloRank(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const userElo = await getUserElo(userId);
  const result = await db
    .select({
      rank: sql<number>`COUNT(*) + 1`,
    })
    .from(userStats)
    .where(sql`${userStats.elo} > ${userElo}`);

  return result[0]?.rank ?? 1;
}

/**
 * Calculate and apply ELO changes for game result
 */
export async function applyGameElo(
  winnerId: number | null,
  loserId: number | null,
  isGuest: boolean
): Promise<{ winnerEloChange: number; loserEloChange: number } | null> {
  if (!winnerId || !loserId) return null;

  const getEloFn = isGuest ? getGuestElo : getUserElo;
  const updateEloFn = isGuest ? updateGuestElo : updateUserElo;

  const winnerElo = await getEloFn(winnerId);
  const loserElo = await getEloFn(loserId);

  const newWinnerElo = calculateNewElo(winnerElo, loserElo, 1);
  const newLoserElo = calculateNewElo(loserElo, winnerElo, 0);

  const winnerChange = newWinnerElo - winnerElo;
  const loserChange = newLoserElo - loserElo;

  await updateEloFn(winnerId, newWinnerElo);
  await updateEloFn(loserId, newLoserElo);

  return {
    winnerEloChange: winnerChange,
    loserEloChange: loserChange,
  };
}
