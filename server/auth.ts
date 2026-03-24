import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { User as SelectUser } from "@shared/schema";
import { userService } from "./services";
import { storage } from "./storage";
import { generateToken, getUserId, requireAuth } from "./middleware/auth";
import { validateRegistrationData } from "./utils/validation";
import { toSafeUser } from "./utils/userResponse";

const scryptAsync = promisify(scrypt);

type GoogleTokenInfo = {
  aud: string;
  sub: string;
  email?: string;
  email_verified?: string | boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
  exp?: string;
};

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  if (!stored) return false;
  const [hashed, salt] = stored.split(".");
  if (!salt) return false;
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

/**
 * Authentication service that handles user authentication and session management
 */
export class AuthService {
  /**
   * Set up authentication middleware and routes
   */
  setupAuth(app: Express) {
    const isProduction = process.env.NODE_ENV === "production";
    const sessionSecret = process.env.SESSION_SECRET || "development-only-session-secret";

    if (isProduction && !process.env.SESSION_SECRET) {
      throw new Error("SESSION_SECRET must be set in production.");
    }

    const sessionSettings: session.SessionOptions = {
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      },
      store: storage.sessionStore,
    };

    app.set("trust proxy", 1);
    app.use(session(sessionSettings));
    app.use(passport.initialize());
    app.use(passport.session());

    this.configurePassport();
    this.registerAuthRoutes(app);
  }

  /**
   * Configure Passport.js authentication strategies
   */
  private configurePassport() {
    passport.use(
      new LocalStrategy(async (usernameOrEmail, password, done) => {
        try {
          const credential = usernameOrEmail.trim();
          const normalizedCredential = credential.toLowerCase();

          let user = await userService.getUserByUsername(credential);
          if (!user && normalizedCredential.includes("@")) {
            user = await userService.getUserByEmail(normalizedCredential);
          }

          if (!user || !user.password || !(await comparePasswords(password, user.password))) {
            return done(null, false);
          } else {
            return done(null, user);
          }
        } catch (error) {
          return done(error);
        }
      }),
    );

    passport.serializeUser((user, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id: string, done) => {
      try {
        const user = await userService.getUser(id);
        done(null, user);
      } catch (error) {
        done(error);
      }
    });
  }

  private getGoogleClientIds(): string[] {
    return [
      ...(process.env.GOOGLE_WEB_CLIENT_IDS ?? "").split(","),
      process.env.GOOGLE_WEB_CLIENT_ID ?? "",
    ]
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  private async verifyGoogleIdToken(idToken: string): Promise<GoogleTokenInfo | null> {
    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      );
      if (!response.ok) {
        return null;
      }

      const tokenInfo = (await response.json()) as GoogleTokenInfo;
      if (!tokenInfo?.aud || !tokenInfo?.sub || !tokenInfo?.email) {
        return null;
      }

      if (tokenInfo.exp && Number(tokenInfo.exp) * 1000 <= Date.now()) {
        return null;
      }

      const emailVerified = String(tokenInfo.email_verified ?? "").toLowerCase();
      if (emailVerified !== "true") {
        return null;
      }

      return tokenInfo;
    } catch (_error) {
      return null;
    }
  }

  private async buildUniqueUsername(name?: string | null, email?: string | null): Promise<string> {
    const fromEmail = (email ?? "").split("@")[0] ?? "";
    const rawBase = (name ?? fromEmail ?? "linguauser")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")
      .replace(/^[-_]+|[-_]+$/g, "");

    const normalizedBase = (rawBase.length >= 3 ? rawBase : "linguauser").slice(0, 24);

    for (let attempt = 0; attempt < 50; attempt++) {
      const suffix =
        attempt === 0
          ? ""
          : `_${Math.floor(Math.random() * 10000)
              .toString()
              .padStart(4, "0")}`;
      const candidate = `${normalizedBase.slice(0, 30 - suffix.length)}${suffix}`;
      const existing = await userService.getUserByUsername(candidate);
      if (!existing) {
        return candidate;
      }
    }

    return `user_${randomBytes(4).toString("hex")}`.slice(0, 30);
  }

  /**
   * Register authentication-related routes
   */
  private registerAuthRoutes(app: Express) {
    app.post("/api/register", async (req, res, next) => {
      try {
        // Validate registration data
        // Requirements: 1.2, 25.1
        const validation = validateRegistrationData({
          username: req.body.username,
          email: req.body.email,
          password: req.body.password
        });

        if (!validation.valid) {
          return res.status(400).json({ 
            message: "Validation failed", 
            errors: validation.errors 
          });
        }

        // Check if username already exists
        const existingUser = await userService.getUserByUsername(req.body.username);
        if (existingUser) {
          return res.status(400).json({ 
            message: "Username already exists",
            errors: ["This username is already taken. Please choose another."]
          });
        }

        // Check if email already exists (if provided)
        if (req.body.email) {
          const existingEmail = await userService.getUserByEmail(req.body.email);
          if (existingEmail) {
            return res.status(400).json({ 
              message: "Email already exists",
              errors: ["This email is already registered. Please use another or login."]
            });
          }
        }

        // Create user with hashed password
        // Requirements: 1.3, 25.1
        const user = await userService.createUser(req.body);

        // Generate JWT token with 24-hour expiration
        // Requirements: 1.3, 21.4
        const token = generateToken(user);

        req.login(user, (err) => {
          if (err) return next(err);
          return res.status(201).json({ 
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              xp: user.xp,
              streak: user.streak
            }, 
            token,
            message: "Registration successful" 
          });
        });
      } catch (error) {
        next(error);
      }
    });

    app.post("/api/login", (req, res, next) => {
      // Requirements: 1.3, 1.4
      passport.authenticate("local", (err: any, user: any) => {
        if (err) return next(err);
        
        // Handle invalid credentials
        // Requirements: 1.4, 25.1
        if (!user) {
          return res.status(401).json({ 
            message: "Invalid credentials",
            errors: ["Invalid username or password. Please try again."]
          });
        }
        
        // Generate JWT token with 24-hour expiration
        // Requirements: 1.3, 21.4, 25.5
        const token = generateToken(user);
        
        req.login(user, (err) => {
          if (err) return next(err);
          return res.status(200).json({ 
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              xp: user.xp,
              streak: user.streak
            }, 
            token,
            message: "Login successful" 
          });
        });
      })(req, res, next);
    });

    app.post("/api/google-login", async (req, res, next) => {
      try {
        const idToken = typeof req.body?.idToken === "string" ? req.body.idToken.trim() : "";
        if (!idToken) {
          return res.status(400).json({
            message: "Google id token is required",
            errors: ["Missing idToken in request body."],
          });
        }

        const allowedGoogleClientIds = this.getGoogleClientIds();
        if (allowedGoogleClientIds.length === 0) {
          return res.status(500).json({
            message: "Google auth is not configured",
            errors: ["Set GOOGLE_WEB_CLIENT_ID or GOOGLE_WEB_CLIENT_IDS on the server."],
          });
        }

        const tokenInfo = await this.verifyGoogleIdToken(idToken);
        if (!tokenInfo) {
          return res.status(401).json({
            message: "Invalid Google credentials",
            errors: ["Unable to verify Google sign-in token."],
          });
        }

        if (!allowedGoogleClientIds.includes(tokenInfo.aud)) {
          return res.status(401).json({
            message: "Invalid Google audience",
            errors: ["Google token audience does not match this app configuration."],
          });
        }

        const email = tokenInfo.email?.toLowerCase();
        if (!email) {
          return res.status(401).json({
            message: "Invalid Google account data",
            errors: ["Google account email is missing from token."],
          });
        }

        let user = await userService.getUserByEmail(email);

        if (!user) {
          const username = await this.buildUniqueUsername(
            tokenInfo.name ?? tokenInfo.given_name,
            email,
          );
          user = await userService.createUser({
            username,
            email,
            password: randomBytes(32).toString("hex"),
            firstName: tokenInfo.given_name ?? null,
            lastName: tokenInfo.family_name ?? null,
            profileImageUrl: tokenInfo.picture ?? null,
          });
        } else {
          const profileUpdates: {
            firstName?: string;
            lastName?: string;
            email?: string;
            profileImageUrl?: string;
          } = {};

          if (!user.firstName && tokenInfo.given_name) {
            profileUpdates.firstName = tokenInfo.given_name;
          }
          if (!user.lastName && tokenInfo.family_name) {
            profileUpdates.lastName = tokenInfo.family_name;
          }
          if (!user.profileImageUrl && tokenInfo.picture) {
            profileUpdates.profileImageUrl = tokenInfo.picture;
          }

          if (Object.keys(profileUpdates).length > 0) {
            user = await userService.updateUserProfile(user.id, profileUpdates);
          }
        }

        const token = generateToken(user);
        req.login(user, (err) => {
          if (err) return next(err);
          return res.status(200).json({
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              xp: user.xp,
              streak: user.streak,
            },
            token,
            message: "Google login successful",
          });
        });
      } catch (error) {
        next(error);
      }
    });

    app.post("/api/logout", (req, res, next) => {
      req.logout((err) => {
        if (err) return next(err);
        res.status(200).json({ message: "Logout successful" });
      });
    });

    app.get("/api/user", requireAuth, async (req, res, next) => {
      try {
        const userId = getUserId(req);
        if (!userId) {
          return res.status(401).json({ message: "Not authenticated" });
        }

        const user = await userService.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        res.json(toSafeUser(user));
      } catch (error) {
        next(error);
      }
    });

    // Update user profile
    // Requirements: 1.5
    app.put("/api/auth/profile", requireAuth, async (req, res, next) => {
      try {
        const userId = getUserId(req);
        if (!userId) {
          return res.status(401).json({ message: "Not authenticated" });
        }

        const { firstName, lastName, email, profileImageUrl } = req.body;
        
        // Update user profile
        const updatedUser = await userService.updateUserProfile(userId, {
          firstName,
          lastName,
          email,
          profileImageUrl
        });

        res.json({
          user: toSafeUser(updatedUser),
          message: "Profile updated successfully"
        });
      } catch (error) {
        next(error);
      }
    });

    // Update streak and last active
    app.post("/api/streak/update", async (req, res, next) => {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      try {
        const updatedUser = await userService.updateUserStreak(req.user.id);
        res.json(updatedUser);
      } catch (error) {
        next(error);
      }
    });
  }
}

// Create singleton instance
export const authService = new AuthService();

// For backward compatibility
export function setupAuth(app: Express) {
  authService.setupAuth(app);
}
