import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { nanoid } from "nanoid";

export interface OAuthProfile {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
  provider: "google" | "github" | "microsoft";
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  picture?: string;
  provider: string;
  createdAt: Date;
}

/**
 * Find or create user from OAuth profile
 */
export async function findOrCreateOAuthUser(profile: OAuthProfile): Promise<AuthUser | null> {
  const db = await getDb();
  if (!db) return null;

  // Try to find existing user by email
  if (profile.email) {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, profile.email))
      .limit(1);

    if (existing.length > 0) {
      const user = existing[0];
      return {
        id: user.id,
        email: user.email || profile.email,
        name: user.name || profile.name || "User",
        picture: user.picture || undefined,
        provider: profile.provider,
        createdAt: user.createdAt,
      };
    }
  }

  // Create new user
  const newName = profile.name || `User_${nanoid(6)}`;
  const newEmail = profile.email || `${profile.provider}_${profile.id}@solitaire.local`;

  try {
    await db.insert(users).values({
      openId: `${profile.provider}_${profile.id}`,
      email: newEmail,
      name: newName,
      loginMethod: profile.provider,
      picture: profile.picture,
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    const created = await db
      .select()
      .from(users)
      .where(eq(users.email, newEmail))
      .limit(1);

    if (created.length > 0) {
      const user = created[0];
      return {
        id: user.id,
        email: user.email || newEmail,
        name: user.name || newName,
        picture: user.picture || undefined,
        provider: profile.provider,
        createdAt: user.createdAt,
      };
    }
  } catch (error) {
    console.error("[Auth] Failed to create user:", error);
  }

  return null;
}

/**
 * Update user last signed in
 */
export async function updateLastSignedIn(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, userId));
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number): Promise<AuthUser | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (result.length === 0) return null;

  const user = result[0];
  return {
    id: user.id,
    email: user.email || "unknown@solitaire.local",
    name: user.name || "User",
    picture: user.picture || undefined,
    provider: user.loginMethod || "unknown",
    createdAt: user.createdAt,
  };
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: number,
  updates: { name?: string; picture?: string }
): Promise<AuthUser | null> {
  const db = await getDb();
  if (!db) return null;

  await db
    .update(users)
    .set({
      ...(updates.name && { name: updates.name }),
      ...(updates.picture && { picture: updates.picture }),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return getUserById(userId);
}
