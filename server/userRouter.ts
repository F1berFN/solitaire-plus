import { eq } from "drizzle-orm";
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { userStats, users, games, userAchievements, dailyChallengeEntries } from "../drizzle/schema";
import { getUserEloRank } from "./eloDb";

const userRouter = router({
  /**
   * Get current user stats (protected)
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    const result = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, ctx.user.id))
      .limit(1);

    if (result.length === 0) return null;

    const stats = result[0];
    const rank = await getUserEloRank(ctx.user.id);

    return {
      ...stats,
      rank,
      winRate: stats.gamesPlayed > 0 ? (stats.gamesWon / stats.gamesPlayed) * 100 : 0,
    };
  }),

  /**
   * Update user preferences
   */
  updatePreferences: protectedProcedure
    .input(
      z.object({
        theme: z.string().optional(),
        cardBack: z.string().optional(),
        drawMode: z.enum(["draw1", "draw3"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;

      const updates: Record<string, any> = {};
      if (input.theme) updates.theme = input.theme;
      if (input.cardBack) updates.cardBack = input.cardBack;
      if (input.drawMode) updates.drawMode = input.drawMode;

      if (Object.keys(updates).length === 0) return null;

      await db
        .update(userStats)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(userStats.userId, ctx.user.id));

      const result = await db
        .select()
        .from(userStats)
        .where(eq(userStats.userId, ctx.user.id))
        .limit(1);

      return result[0] || null;
    }),

  /**
   * Get public user profile
   */
  getProfile: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const result = await db
        .select()
        .from(userStats)
        .where(eq(userStats.userId, input.userId))
        .limit(1);

      if (result.length === 0) return null;

      const stats = result[0];
      const rank = await getUserEloRank(input.userId);

      return {
        ...stats,
        rank,
        winRate: stats.gamesPlayed > 0 ? (stats.gamesWon / stats.gamesPlayed) * 100 : 0,
      };
    }),

  /**
   * Delete user account and all associated data
   */
  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { success: false };

    const userId = ctx.user.id;

    try {
      // Delete all user-owned data in order of dependencies
      // 1. Delete daily challenge entries
      await db.delete(dailyChallengeEntries).where(eq(dailyChallengeEntries.userId, userId));
      
      // 2. Delete achievements
      await db.delete(userAchievements).where(eq(userAchievements.userId, userId));
      
      // 3. Delete games (keeps historical record but removes user association)
      await db.delete(games).where(eq(games.userId, userId));
      
      // 4. Delete user stats
      await db.delete(userStats).where(eq(userStats.userId, userId));
      
      // 5. Delete user account
      await db.delete(users).where(eq(users.id, userId));
      
      return { success: true };
    } catch (error) {
      console.error("Error deleting account:", error);
      return { success: false };
    }
  }),
});

export { userRouter };
