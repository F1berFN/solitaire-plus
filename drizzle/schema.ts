import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  float,
  bigint,
  index,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  picture: text("picture"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── User Stats & Preferences ─────────────────────────────────────────────────

export const userStats = mysqlTable("user_stats", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  gamesPlayed: int("gamesPlayed").default(0).notNull(),
  gamesWon: int("gamesWon").default(0).notNull(),
  bestScore: int("bestScore").default(0).notNull(),
  totalTimeSecs: int("totalTimeSecs").default(0).notNull(),
  currentStreak: int("currentStreak").default(0).notNull(),
  bestStreak: int("bestStreak").default(0).notNull(),
  totalHintsUsed: int("totalHintsUsed").default(0).notNull(),
  elo: int("elo").default(1200).notNull(),
  // Preferences
  theme: varchar("theme", { length: 32 }).default("classic").notNull(),
  cardBack: varchar("cardBack", { length: 32 }).default("default").notNull(),
  drawMode: mysqlEnum("drawMode", ["draw1", "draw3"]).default("draw1").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserStats = typeof userStats.$inferSelect;

// ─── Games ────────────────────────────────────────────────────────────────────

export const games = mysqlTable(
  "games",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    mode: mysqlEnum("mode", ["solo", "vsAI", "vsPlayer", "daily"]).notNull(),
    drawMode: mysqlEnum("drawMode", ["draw1", "draw3"]).default("draw1").notNull(),
    seed: varchar("seed", { length: 64 }).notNull(),
    score: int("score").default(0).notNull(),
    durationSecs: int("durationSecs").default(0).notNull(),
    moves: int("moves").default(0).notNull(),
    hintsUsed: int("hintsUsed").default(0).notNull(),
    won: boolean("won").default(false).notNull(),
    theme: varchar("theme", { length: 32 }).default("classic").notNull(),
    // AI-specific
    aiDifficulty: mysqlEnum("aiDifficulty", ["easy", "medium", "hard"]),
    aiScore: int("aiScore"),
    // Multiplayer-specific
    opponentId: int("opponentId"),
    opponentScore: int("opponentScore"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [index("games_userId_idx").on(t.userId), index("games_mode_idx").on(t.mode)]
);

export type Game = typeof games.$inferSelect;
export type InsertGame = typeof games.$inferInsert;

// ─── Daily Challenges ─────────────────────────────────────────────────────────

export const dailyChallenges = mysqlTable("daily_challenges", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull().unique(), // YYYY-MM-DD
  seed: varchar("seed", { length: 64 }).notNull(),
  drawMode: mysqlEnum("drawMode", ["draw1", "draw3"]).default("draw1").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DailyChallenge = typeof dailyChallenges.$inferSelect;

export const dailyChallengeEntries = mysqlTable(
  "daily_challenge_entries",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    challengeId: int("challengeId").notNull(),
    score: int("score").default(0).notNull(),
    durationSecs: int("durationSecs").default(0).notNull(),
    moves: int("moves").default(0).notNull(),
    hintsUsed: int("hintsUsed").default(0).notNull(),
    won: boolean("won").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    index("dce_userId_idx").on(t.userId),
    index("dce_challengeId_idx").on(t.challengeId),
  ]
);

export type DailyChallengeEntry = typeof dailyChallengeEntries.$inferSelect;

// ─── Achievements ─────────────────────────────────────────────────────────────

export const userAchievements = mysqlTable(
  "user_achievements",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    achievementKey: varchar("achievementKey", { length: 64 }).notNull(),
    unlockedAt: timestamp("unlockedAt").defaultNow().notNull(),
  },
  (t) => [index("ua_userId_idx").on(t.userId)]
);

export type UserAchievement = typeof userAchievements.$inferSelect;

// ─── Multiplayer Rooms ────────────────────────────────────────────────────────

export const multiplayerRooms = mysqlTable("multiplayer_rooms", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 8 }).notNull().unique(),
  hostId: int("hostId").notNull(),
  hostIsGuest: boolean("hostIsGuest").default(false).notNull(),
  hostGuestPlayerId: int("hostGuestPlayerId"), // if hostIsGuest = true
  guestId: int("guestId"),
  guestIsGuest: boolean("guestIsGuest").default(false).notNull(),
  guestGuestPlayerId: int("guestGuestPlayerId"), // if guestIsGuest = true
  seed: varchar("seed", { length: 64 }).notNull(),
  drawMode: mysqlEnum("drawMode", ["draw1", "draw3"]).default("draw1").notNull(),
  status: mysqlEnum("status", ["waiting", "playing", "finished"]).default("waiting").notNull(),
  hostScore: int("hostScore"),
  guestScore: int("guestScore"),
  hostWon: boolean("hostWon"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  finishedAt: timestamp("finishedAt"),
});

export type MultiplayerRoom = typeof multiplayerRooms.$inferSelect;
export type InsertMultiplayerRoom = typeof multiplayerRooms.$inferInsert;

// ─── Guest Players ────────────────────────────────────────────────────────────

export const guestPlayers = mysqlTable(
  "guest_players",
  {
    id: int("id").autoincrement().primaryKey(),
    displayName: varchar("displayName", { length: 64 }).notNull(),
    discriminator: int("discriminator").notNull(), // 1-9999
  elo: int("elo").default(1200).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    lastSeenAt: timestamp("lastSeenAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [index("gp_displayName_idx").on(t.displayName)]
);

export type GuestPlayer = typeof guestPlayers.$inferSelect;
export type InsertGuestPlayer = typeof guestPlayers.$inferInsert;
