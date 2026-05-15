import { eq } from "drizzle-orm";
import { guestPlayers } from "../drizzle/schema";
import { getDb } from "./db";

/**
 * Get or create a guest player with auto-assigned global discriminator.
 * First guest ever created gets #0001, second gets #0002, etc.
 * Multiple guests can have the same displayName but different discriminators.
 */
export async function getOrCreateGuestPlayer(displayName: string): Promise<{ id: number; displayName: string; discriminator: number; fullName: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the total count of existing guests to determine next discriminator
  const allGuests = await db.select().from(guestPlayers);
  const nextDiscriminator = allGuests.length + 1;

  // Insert new guest player with global discriminator
  const result = await db.insert(guestPlayers).values({
    displayName,
    discriminator: nextDiscriminator,
  });

  const insertedId = (result as any).insertId ?? (result as any)[0]?.insertId;
  return {
    id: insertedId,
    displayName,
    discriminator: nextDiscriminator,
    fullName: `${displayName} #${String(nextDiscriminator).padStart(4, "0")}`,
  };
}

/**
 * Get a guest player by ID
 */
export async function getGuestPlayerById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(guestPlayers)
    .where(eq(guestPlayers.id, id))
    .limit(1);

  if (result.length === 0) return null;
  const player = result[0]!;
  return {
    ...player,
    fullName: `${player.displayName} #${String(player.discriminator).padStart(4, "0")}`,
  };
}

/**
 * Update last seen timestamp for a guest player
 */
export async function updateGuestPlayerLastSeen(id: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(guestPlayers)
    .set({ lastSeenAt: new Date() })
    .where(eq(guestPlayers.id, id));
}
