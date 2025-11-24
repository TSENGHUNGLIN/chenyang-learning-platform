import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import type { Express, Request, Response } from "express";
import * as db from "../db";

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
  app.use(passport.session());

  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.openId);
  });

  // Deserialize user from session
  passport.deserializeUser(async (openId: string, done) => {
    try {
      const user = await db.getUserByOpenId(openId);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

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

          console.log("[Google OAuth] User authenticated:", { openId, name, email });

          // Upsert user in database
          await db.upsertUser({
            openId: openId,
            name: name,
            email: email,
            loginMethod: "google",
            lastSignedIn: new Date(),
          });

          const user = await db.getUserByOpenId(openId);
          done(null, user);
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
    })
  );

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: "/?error=auth_failed",
    }),
    async (req: Request, res: Response) => {
      try {
        console.log("[Google OAuth] Callback successful, user:", req.user);
        
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
