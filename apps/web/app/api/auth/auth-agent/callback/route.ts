import { NextRequest, NextResponse } from "next/server";
import { createAuthAgentClient } from "auth-agent-sdk/client";

/**
 * Auth Agent OAuth Callback Handler
 * Scenario 1: Full Account Access - Agent uses user's existing account
 *
 * This handler:
 * 1. Validates the OAuth callback
 * 2. Exchanges authorization code for tokens
 * 3. Calls /userinfo to get user email
 * 4. Links agent to existing user account via Better Auth
 * 5. Creates a full-access session
 */
export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const code = searchParams.get("code");
		const error = searchParams.get("error");
		const errorDescription = searchParams.get("error_description");

		// Handle OAuth errors
		if (error) {
			console.error("[AUTH AGENT] OAuth error:", error, errorDescription);
			return NextResponse.redirect(
				new URL(
					`/login?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || "")}`,
					request.url,
				),
			);
		}

		if (!code) {
			console.error("[AUTH AGENT] Missing authorization code");
			return NextResponse.redirect(
				new URL("/login?error=missing_code", request.url),
			);
		}

		console.log("[AUTH AGENT] Processing callback with code:", code.substring(0, 10) + "...");

		// Initialize Auth Agent client
		const client = createAuthAgentClient({
			authServerUrl: process.env.NEXT_PUBLIC_AUTH_AGENT_SERVER_URL || "https://api.auth-agent.com",
			clientId: process.env.NEXT_PUBLIC_AUTH_AGENT_CLIENT_ID!,
			redirectUri: `${new URL(request.url).origin}/api/auth/auth-agent/callback`,
		});

		// Validate callback and get code verifier
		const callbackResult = client.handleCallback();
		if (!callbackResult) {
			console.error("[AUTH AGENT] Invalid callback - state mismatch or missing code verifier");
			return NextResponse.redirect(
				new URL("/login?error=invalid_callback", request.url),
			);
		}

		console.log("[AUTH AGENT] Callback validated, exchanging code for tokens...");

		// Exchange authorization code for access token
		const tokenResponse = await fetch(`${process.env.NEXT_PUBLIC_AUTH_AGENT_SERVER_URL || "https://api.auth-agent.com"}/token`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				grant_type: "authorization_code",
				code: callbackResult.code,
				code_verifier: callbackResult.codeVerifier,
				redirect_uri: `${new URL(request.url).origin}/api/auth/auth-agent/callback`,
				client_id: process.env.NEXT_PUBLIC_AUTH_AGENT_CLIENT_ID,
				client_secret: process.env.AUTH_AGENT_CLIENT_SECRET,
			}),
		});

		if (!tokenResponse.ok) {
			const errorData = await tokenResponse.json().catch(() => ({}));
			console.error("[AUTH AGENT] Token exchange failed:", errorData);
			return NextResponse.redirect(
				new URL("/login?error=token_exchange_failed", request.url),
			);
		}

		const tokens = await tokenResponse.json();
		console.log("[AUTH AGENT] Tokens received successfully");

		// Call /userinfo to get user email (REQUIRED for Scenario 1)
		const userInfoResponse = await fetch(`${process.env.NEXT_PUBLIC_AUTH_AGENT_SERVER_URL || "https://api.auth-agent.com"}/userinfo`, {
			headers: {
				Authorization: `Bearer ${tokens.access_token}`,
			},
		});

		if (!userInfoResponse.ok) {
			console.error("[AUTH AGENT] Failed to fetch user info");
			return NextResponse.redirect(
				new URL("/login?error=userinfo_failed", request.url),
			);
		}

		const userInfo = await userInfoResponse.json();
		console.log("[AUTH AGENT] User info retrieved:", { email: userInfo.email, sub: userInfo.sub });

		// TODO: Integration with Better Auth
		// The Supermemory team should implement this part to:
		// 1. Find or create user by email using their Better Auth setup
		// 2. Create a full-access session that grants the agent access to the user's account
		// 3. Store agent metadata (agent ID, model) for audit logging
		//
		// Example pseudo-code:
		// const user = await auth.api.findUserByEmail(userInfo.email);
		// if (!user) {
		//   // User doesn't exist - redirect to registration or create account
		//   return NextResponse.redirect('/auth/register?email=' + userInfo.email);
		// }
		// const session = await auth.api.createSession({
		//   userId: user.id,
		//   metadata: {
		//     type: 'agent',
		//     agentId: userInfo.sub,
		//     model: tokens.model || 'unknown',
		//   }
		// });

		// TEMPORARY: For demonstration, create a temporary session cookie
		// This should be replaced with proper Better Auth integration
		const sessionData = {
			email: userInfo.email,
			agentId: userInfo.sub,
			model: tokens.model || "unknown",
			type: "agent_full_access",
			authCode: code,
			accessToken: tokens.access_token,
			refreshToken: tokens.refresh_token,
			authenticatedAt: Date.now(),
			expiresAt: Date.now() + (tokens.expires_in * 1000 || 3600 * 1000),
		};

		console.log("[AUTH AGENT] Creating session for agent:", userInfo.sub);

		// Create redirect response to dashboard
		const dashboardUrl = new URL("/", request.url);
		const response = NextResponse.redirect(dashboardUrl);

		// Set temporary session cookie
		// NOTE: This is a placeholder. Supermemory team should replace this with
		// their Better Auth session management
		response.cookies.set("auth_agent_session", JSON.stringify(sessionData), {
			httpOnly: true,  // Should be true in production for security
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: tokens.expires_in || 3600,
			path: "/",
		});

		console.log("[AUTH AGENT] ✅ Authentication successful");
		console.log("[AUTH AGENT] User email:", userInfo.email);
		console.log("[AUTH AGENT] Agent ID:", userInfo.sub);
		console.log("[AUTH AGENT] Redirecting to dashboard");

		return response;
	} catch (error) {
		console.error("[AUTH AGENT] Callback error:", error);
		return NextResponse.redirect(
			new URL(
				`/login?error=internal_error&details=${encodeURIComponent(error instanceof Error ? error.message : "Unknown error")}`,
				request.url,
			),
		);
	}
}
