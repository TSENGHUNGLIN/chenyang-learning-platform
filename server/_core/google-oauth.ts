import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

const COOKIE_NAME = "manus_session";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function initializeGoogleOAuth(app: Express) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || "https://chenyang-learning-platform.onrender.com/api/auth/google/callback";

  if (!googleClientId || !googleClientSecret) {
    console.error("[Google OAuth] ERROR: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not configured!");
    return;
  }

  console.log("[Google OAuth] Initializing with callback URL:", callbackURL);

  // Initialize Passport
  app.use(passport.initialize());

  // Configure Google Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: callbackURL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Extract user info from Google profile
          const email = profile.emails?.[0]?.value || null;
          const name = profile.displayName || null;
          const googleId = profile.id;

          // Use googleId as openId for compatibility with existing system
          const openId = `google_${googleId}`;

          // Upsert user in database
          await db.upsertUser({
            openId: openId,
            name: name,
            email: email,
            loginMethod: "google",
            lastSignedIn: new Date(),
          });

          done(null, { openId, name, email });
        } catch (error) {
          console.error("[Google OAuth] Error in strategy callback:", error);
          done(error as Error);
        }
      }
    )
  );

  // Google OAuth routes
  app.get(
    "/api/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
      session: false,
    })
  );

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", {
      session: false,
      failureRedirect: "/?error=auth_failed",
    }),
    async (req: Request, res: Response) => {
      try {
        const user = req.user as { openId: string; name: string | null; email: string | null };

        if (!user || !user.openId) {
          res.redirect("/?error=no_user_info");
          return;
        }

        // Create session token
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });

        // Set cookie
        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        // Redirect to home page
        res.redirect("/");
      } catch (error) {
        console.error("[Google OAuth] Callback error:", error);
        res.redirect("/?error=callback_failed");
      }
    }
  );

  console.log("[Google OAuth] Routes registered successfully");
}
