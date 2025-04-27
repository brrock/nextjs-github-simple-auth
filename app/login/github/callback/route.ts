import {
	generateSessionToken,
	createSession,
	setSessionTokenCookie,
} from "@/lib/server/session";
import { github } from "@/lib/server/oauth";
import { cookies } from "next/headers";
import { createUser, getUserFromGitHubId } from "@/lib/server/user";
import { ObjectParser } from "@pilcrowjs/object-parser";
import { globalGETRateLimit } from "@/lib/server/request";

import type { OAuth2Tokens } from "arctic";
// Assuming User type might look like this (adjust as needed)
// type User = { id: number; /* other fields */ };

export async function GET(request: Request): Promise<Response> {
	if (!globalGETRateLimit()) {
		return new Response("Too many requests", {
			status: 429,
		});
	}
	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const storedState = (await cookies()).get("github_oauth_state")?.value ?? null;
	if (
		code === null ||
		state === null ||
		storedState === null ||
		state !== storedState
	) {
		// Clear the potentially invalid cookie
		(await
			// Clear the potentially invalid cookie
			cookies()).delete("github_oauth_state");
		return new Response(
			"Invalid request or state mismatch. Please restart the process.",
			{
				status: 400,
			},
		);
	}
	// State is valid, clear the cookie
	(await
		// State is valid, clear the cookie
		cookies()).delete("github_oauth_state");

	let tokens: OAuth2Tokens;
	try {
		tokens = await github.validateAuthorizationCode(code);
	} catch (e) {
		console.error("GitHub OAuth code validation failed:", e);
		// Invalid code or client credentials
		return new Response(
			"Invalid authorization code. Please restart the process.",
			{
				status: 400,
			},
		);
	}
	const githubAccessToken = tokens.accessToken();

	let githubUserId: number;
	let username: string;

	try {
		const userRequest = new Request("https://api.github.com/user");
		userRequest.headers.set("Authorization", `Bearer ${githubAccessToken}`);
		userRequest.headers.set("Accept", "application/vnd.github.v3+json"); // Good practice
		const userResponse = await fetch(userRequest);

		if (!userResponse.ok) {
			throw new Error(
				`GitHub API error (${userResponse.status}): ${await userResponse.text()}`,
			);
		}

		const userResult: unknown = await userResponse.json();
		const userParser = new ObjectParser(userResult);

		githubUserId = userParser.getNumber("id"); // Throws if not a number
		username = userParser.getString("login"); // Throws if not a string
	} catch (e) {
		console.error("Failed to fetch or parse GitHub user data:", e);
		return new Response("Failed to retrieve user information from GitHub.", {
			status: 500, // Or 400 depending on cause
		});
	}

	// Use await here to get the user object or null
	const existingUser = await getUserFromGitHubId(githubUserId);

	let userId: string;

	if (existingUser !== null) {
		// --- User Exists ---
		userId = existingUser.id; // Assuming User type has 'id'
		const sessionToken = generateSessionToken();
		// Await session creation before setting cookie
		const session = await createSession(sessionToken, userId);
		setSessionTokenCookie(sessionToken, session.expiresAt);
	} else {
		// --- New User ---
		let email: string | null = null;
		try {
			const emailListRequest = new Request(
				"https://api.github.com/user/emails",
			);
			emailListRequest.headers.set(
				"Authorization",
				`Bearer ${githubAccessToken}`,
			);
			emailListRequest.headers.set(
				"Accept",
				"application/vnd.github.v3+json",
			);
			const emailListResponse = await fetch(emailListRequest);

			if (!emailListResponse.ok) {
				throw new Error(
					`GitHub API error (${emailListResponse.status}): ${await emailListResponse.text()}`,
				);
			}

			const emailListResult: unknown = await emailListResponse.json();

			if (!Array.isArray(emailListResult) || emailListResult.length < 1) {
				// No emails returned
				return new Response(
					"Could not retrieve email addresses from GitHub.",
					{
						status: 400,
					},
				);
			}

			for (const emailRecord of emailListResult) {
				// Consider adding try/catch around parser if structure isn't guaranteed
				const emailParser = new ObjectParser(emailRecord);
				const primaryEmail = emailParser.getBoolean("primary");
				const verifiedEmail = emailParser.getBoolean("verified");
				if (primaryEmail && verifiedEmail) {
					email = emailParser.getString("email");
					break; // Found the primary, verified email
				}
			}

			// Fallback: If no primary+verified email, find *any* verified email
			if (email === null) {
				for (const emailRecord of emailListResult) {
					const emailParser = new ObjectParser(emailRecord);
					if (emailParser.getBoolean("verified")) {
						email = emailParser.getString("email");
						console.warn(
							`Using non-primary but verified email for user ${username}: ${email}`,
						);
						break;
					}
				}
			}

			if (email === null) {
				return new Response(
					"Please verify at least one email address on your GitHub account.",
					{
						status: 400,
					},
				);
			}
		} catch (e) {
			console.error("Failed to fetch or parse GitHub email data:", e);
			return new Response(
				"Failed to retrieve email information from GitHub.",
				{
					status: 500, // Or 400
				},
			);
		}

		// *** Step 1: Explicitly await user creation ***
		const newUser = await createUser(githubUserId, email, username);

		// Optional but recommended: Check if user creation succeeded
		if (!newUser || typeof newUser.id !== "number") {
			console.error(
				"User creation failed or returned invalid data for GitHub ID:",
				githubUserId,
			);
			return new Response("Failed to create user account.", {
				status: 500,
			});
		}

		userId = newUser.id; // Get the ID from the created user

		// *** Step 2: Now create the session for the newly created user ***
		const sessionToken = generateSessionToken();
		const newSession = await createSession(sessionToken, userId); // Use newUser.id

		// *** Step 3: Set the cookie using the created session's expiry ***
		setSessionTokenCookie(sessionToken, newSession.expiresAt);
	}

	// --- Redirect (Common for both existing and new users) ---
	return new Response(null, {
		status: 302,
		headers: {
			Location: "/",
			// The setSessionTokenCookie function should handle setting the Set-Cookie header
		},
	});
}
