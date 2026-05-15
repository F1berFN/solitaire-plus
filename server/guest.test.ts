import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getOrCreateGuestPlayer, getGuestPlayerById } from "./guestDb";
import { getDb } from "./db";
import { guestPlayers } from "../drizzle/schema";

describe("Guest Player System", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      console.warn("Database not available for tests");
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (db) {
      try {
        await db.delete(guestPlayers).where(true); // Clear all guests
      } catch (e) {
        console.warn("Failed to clean up test data");
      }
    }
  });

  it("should create first guest with discriminator #0001", async () => {
    const guest = await getOrCreateGuestPlayer("Alice");
    expect(guest.displayName).toBe("Alice");
    expect(guest.discriminator).toBe(1);
    expect(guest.fullName).toBe("Alice #0001");
  });

  it("should create second guest with discriminator #0002", async () => {
    const guest = await getOrCreateGuestPlayer("Bob");
    expect(guest.displayName).toBe("Bob");
    expect(guest.discriminator).toBe(2);
    expect(guest.fullName).toBe("Bob #0002");
  });

  it("should allow duplicate names with different discriminators", async () => {
    const guest1 = await getOrCreateGuestPlayer("Charlie");
    const guest2 = await getOrCreateGuestPlayer("Charlie");
    
    expect(guest1.displayName).toBe("Charlie");
    expect(guest2.displayName).toBe("Charlie");
    expect(guest1.discriminator).not.toBe(guest2.discriminator);
    expect(guest2.discriminator).toBe(guest1.discriminator + 1);
  });

  it("should retrieve guest player by ID", async () => {
    const created = await getOrCreateGuestPlayer("David");
    const retrieved = await getGuestPlayerById(created.id);
    
    expect(retrieved).not.toBeNull();
    expect(retrieved?.displayName).toBe("David");
    expect(retrieved?.discriminator).toBe(created.discriminator);
    expect(retrieved?.fullName).toBe(created.fullName);
  });

  it("should return null for non-existent guest ID", async () => {
    const retrieved = await getGuestPlayerById(99999);
    expect(retrieved).toBeNull();
  });

  it("should format discriminator with leading zeros", async () => {
    // Create enough guests to test formatting
    for (let i = 0; i < 10; i++) {
      await getOrCreateGuestPlayer(`Player${i}`);
    }
    
    const guest = await getOrCreateGuestPlayer("TestPlayer");
    // Should be padded to 4 digits
    expect(guest.fullName).toMatch(/#\d{4}$/);
  });
});
