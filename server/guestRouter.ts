import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { getOrCreateGuestPlayer, getGuestPlayerById } from "./guestDb";

export const guestRouter = router({
  /**
   * Create or get a guest player by name.
   * Returns the guest player with auto-assigned discriminator.
   */
  getOrCreate: publicProcedure
    .input(z.object({ displayName: z.string().min(1).max(64) }))
    .mutation(async ({ input }) => {
      return getOrCreateGuestPlayer(input.displayName);
    }),

  /**
   * Get a guest player by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getGuestPlayerById(input.id);
    }),
});
