// session.ts

import { prisma } from "@/lib/prisma"; // Adjust path if needed
import { encodeBase32, encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import { cache } from "react";
import { cookies } from "next/headers";

// Import Prisma-generated types
import type { User, Session } from "@prisma/client";

// Define the result type using Prisma types
type SessionValidationResult =
  | { session: Session; user: User }
  | { session: null; user: null };

export async function validateSessionToken(
  token: string
): Promise<SessionValidationResult> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

  const sessionAndUser = await prisma.session.findUnique({
    where: {
      id: sessionId
    },
    include: {
      // Automatically fetch the related user
      user: true
    }
  });

  if (!sessionAndUser || !sessionAndUser.user) {
    return { session: null, user: null };
  }

  const { user, ...session } = sessionAndUser; // Separate session and user data

  // Prisma returns Date objects directly for DateTime fields
  if (Date.now() >= session.expiresAt.getTime()) {
    // Use await for the async delete operation
    await prisma.session.delete({
      where: {
        id: session.id
      }
    });
    return { session: null, user: null };
  }

  // Check if session needs renewal (within 15 days of expiry)
  const fifteenDaysInMillis = 1000 * 60 * 60 * 24 * 15;
  const thirtyDaysInMillis = 1000 * 60 * 60 * 24 * 30;
  if (Date.now() >= session.expiresAt.getTime() - fifteenDaysInMillis) {
    const newExpiresAt = new Date(Date.now() + thirtyDaysInMillis);
    // Use await for the async update operation
    const updatedSession = await prisma.session.update({
      where: {
        id: session.id
      },
      data: {
        expiresAt: newExpiresAt
      }
    });
    return { session: updatedSession, user };
  }

  return { session, user };
}

// cache() works with async functions
export const getCurrentSession = cache(async (): Promise<
  SessionValidationResult
> => {
  const token = (await cookies()).get("session")?.value ?? null;
  if (token === null) {
    return { session: null, user: null };
  }
  // Use await since validateSessionToken is now async
  const result = await validateSessionToken(token);
  return result;
});

export async function invalidateSession(sessionId: string): Promise<void> {
  try {
    // delete returns the deleted record, use deleteMany if you don't need it
    await prisma.session.delete({
      where: {
        id: sessionId
      }
    });
  } catch (error) {
    // Prisma might throw an error if the record doesn't exist (P2025)
    // You can choose to ignore this specific error if needed
    if ((error as any)?.code !== "P2025") {
      console.error("Error invalidating session:", error);
      // Optionally re-throw or handle
    }
  }
}

export async function invalidateUserSessions(userId: string): Promise<void> {
  // deleteMany is suitable here as we don't need the deleted records
  await prisma.session.deleteMany({
    where: {
      userId: userId
    }
  });
}

// No changes needed for cookie functions
export async function setSessionTokenCookie(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set("session", token, {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt
  });
}

export async function deleteSessionTokenCookie(): Promise<void> {
  (await cookies()).set("session", "", {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0
  });
}

// No changes needed for token generation
export function generateSessionToken(): string {
  const tokenBytes = new Uint8Array(20);
  crypto.getRandomValues(tokenBytes);
  const token = encodeBase32(tokenBytes).toLowerCase();
  return token;
}

export async function createSession(
  token: string,
  userId: string
): Promise<Session> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days

  const user = await prisma.user.findUnique({
    where: {
      id: userId
    }
  });

  if (!user) {
    throw new Error(`User with ID ${userId} not found`);
  }

  const session = await prisma.session.create({
    data: {
      id: sessionId,
      userId: userId, // Prisma knows this links to User based on @relation
      expiresAt: expiresAt
    }
  });
  return session;
}

// The local Session interface definition is removed.
// The local SessionValidationResult type alias is updated to use Prisma types.
