import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  userStats,
  games,
  dailyChallenges,
  dailyChallengeEntries,
  userAchievements,
  multiplayerRooms,
  InsertGame,
  InsertMultiplayerRoom,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── User Stats ───────────────────────────────────────────────────────────────

export async function getOrCreateUserStats(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(userStats).where(eq(userStats.userId, userId)).limit(1);
  if (existing.length > 0) return existing[0];
  await db.insert(userStats).values({ userId }).onDuplicateKeyUpdate({ set: { userId } });
  const created = await db.select().from(userStats).where(eq(userStats.userId, userId)).limit(1);
  return created[0] ?? null;
}

export async function updateUserPreferences(
  userId: number,
  prefs: { theme?: string; cardBack?: string; drawMode?: "draw1" | "draw3" }
) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(userStats)
    .values({ userId, ...prefs })
    .onDuplicateKeyUpdate({ set: prefs });
}

// ─── Games ────────────────────────────────────────────────────────────────────

export async function saveGame(game: InsertGame) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(games).values(game);
  return (result as any).insertId as number;
}

export async function getUserGames(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(games)
    .where(eq(games.userId, userId))
    .orderBy(desc(games.createdAt))
    .limit(limit);
}

export async function updateUserStatsAfterGame(
  userId: number,
  won: boolean,
  score: number,
  durationSecs: number,
  hintsUsed: number
) {
  const db = await getDb();
  if (!db) return;
  const stats = await getOrCreateUserStats(userId);
  if (!stats) return;

  const newPlayed = stats.gamesPlayed + 1;
  const newWon = stats.gamesWon + (won ? 1 : 0);
  const newBest = Math.max(stats.bestScore, score);
  const newTotal = stats.totalTimeSecs + durationSecs;
  const newStreak = won ? stats.currentStreak + 1 : 0;
  const newBestStreak = Math.max(stats.bestStreak, newStreak);
  const newHints = stats.totalHintsUsed + hintsUsed;

  await db
    .update(userStats)
    .set({
      gamesPlayed: newPlayed,
      gamesWon: newWon,
      bestScore: newBest,
      totalTimeSecs: newTotal,
      currentStreak: newStreak,
      bestStreak: newBestStreak,
      totalHintsUsed: newHints,
    })
    .where(eq(userStats.userId, userId));
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export async function getLeaderboard(mode: "solo" | "vsAI" | "vsPlayer", limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      userId: games.userId,
      score: sql<number>`MAX(${games.score})`,
      name: users.name,
      gamesWon: sql<number>`COUNT(CASE WHEN ${games.won} = 1 THEN 1 END)`,
    })
    .from(games)
    .innerJoin(users, eq(games.userId, users.id))
    .where(and(eq(games.mode, mode), eq(games.won, true)))
    .groupBy(games.userId, users.name)
    .orderBy(desc(sql<number>`MAX(${games.score})`))
    .limit(limit);
}

// ─── Daily Challenge ──────────────────────────────────────────────────────────

export async function getOrCreateDailyChallenge(date: string) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db
    .select()
    .from(dailyChallenges)
    .where(eq(dailyChallenges.date, date))
    .limit(1);
  if (existing.length > 0) return existing[0];

  // Create new daily challenge with date-based seed
  const seed = `daily-${date}`;
  await db.insert(dailyChallenges).values({ date, seed, drawMode: "draw1" });
  const created = await db
    .select()
    .from(dailyChallenges)
    .where(eq(dailyChallenges.date, date))
    .limit(1);
  return created[0] ?? null;
}

export async function submitDailyChallenge(
  userId: number,
  challengeId: number,
  data: { score: number; durationSecs: number; moves: number; hintsUsed: number; won: boolean }
) {
  const db = await getDb();
  if (!db) return null;
  // Check if already submitted
  const existing = await db
    .select()
    .from(dailyChallengeEntries)
    .where(
      and(
        eq(dailyChallengeEntries.userId, userId),
        eq(dailyChallengeEntries.challengeId, challengeId)
      )
    )
    .limit(1);
  if (existing.length > 0) return existing[0];
  await db.insert(dailyChallengeEntries).values({ userId, challengeId, ...data });
  return true;
}

export async function getDailyChallengeLeaderboard(challengeId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      userId: dailyChallengeEntries.userId,
      score: dailyChallengeEntries.score,
      durationSecs: dailyChallengeEntries.durationSecs,
      name: users.name,
    })
    .from(dailyChallengeEntries)
    .innerJoin(users, eq(dailyChallengeEntries.userId, users.id))
    .where(eq(dailyChallengeEntries.challengeId, challengeId))
    .orderBy(desc(dailyChallengeEntries.score))
    .limit(limit);
}

export async function getUserDailyChallengeEntry(userId: number, challengeId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(dailyChallengeEntries)
    .where(
      and(
        eq(dailyChallengeEntries.userId, userId),
        eq(dailyChallengeEntries.challengeId, challengeId)
      )
    )
    .limit(1);
  return result[0] ?? null;
}

// ─── Achievements ─────────────────────────────────────────────────────────────

export async function getUserAchievements(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId))
    .orderBy(desc(userAchievements.unlockedAt));
}

export async function unlockAchievement(userId: number, achievementKey: string) {
  const db = await getDb();
  if (!db) return false;
  const existing = await db
    .select()
    .from(userAchievements)
    .where(
      and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementKey, achievementKey)
      )
    )
    .limit(1);
  if (existing.length > 0) return false; // already unlocked
  await db.insert(userAchievements).values({ userId, achievementKey });
  return true;
}

// ─── Multiplayer Rooms ────────────────────────────────────────────────────────

export async function createRoom(data: InsertMultiplayerRoom) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(multiplayerRooms).values(data);
  return db
    .select()
    .from(multiplayerRooms)
    .where(eq(multiplayerRooms.code, data.code))
    .limit(1)
    .then((r) => r[0] ?? null);
}

export async function getRoomByCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(multiplayerRooms)
    .where(eq(multiplayerRooms.code, code))
    .limit(1);
  return result[0] ?? null;
}

export async function updateRoom(
  code: string,
  data: Partial<{
    guestId: number;
    guestIsGuest: boolean;
    guestGuestPlayerId: number;
    status: "waiting" | "playing" | "finished";
    hostScore: number;
    guestScore: number;
    hostWon: boolean;
    finishedAt: Date;
  }>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(multiplayerRooms).set(data).where(eq(multiplayerRooms.code, code));
}

export { getEloLeaderboard } from './eloDb';
