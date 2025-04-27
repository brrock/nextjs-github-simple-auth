// user.ts

import { prisma } from "@/lib/prisma"; // Adjust path if needed
import type { User } from "@prisma/client"; // Import User type from Prisma

export { type User }; // Re-export the Prisma User type if needed elsewhere

export async function createUser(
  githubId: number,
  email: string,
  username: string
): Promise<User> {
  try {
    const user = await prisma.user.create({
      data: {
        githubId,
        email,
        username
      }
    });
    return user;
  } catch (error) {
    // Handle potential errors, e.g., unique constraint violation
    console.error("Error creating user:", error);
    // You might want to throw a more specific error or handle it differently
    throw new Error("Could not create user.");
  }
}

export async function getUserFromGitHubId(
  githubId: number
): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: {
      githubId: githubId
    }
  });
  return user;
}

// The local User interface definition is removed as we use the Prisma-generated one.
