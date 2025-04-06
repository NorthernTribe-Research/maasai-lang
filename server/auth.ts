import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { User as SelectUser } from "@shared/schema";
import createMemoryStore from "memorystore";
import { userService } from "./services";
import { storage } from "./storage"; // Keep for sessionStore

const MemoryStore = createMemoryStore(session);
const scryptAsync = promisify(scrypt);

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
  const [hashed, salt] = stored.split(".");
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
    const sessionSettings: session.SessionOptions = {
      secret: process.env.SESSION_SECRET || "linguamaster_secret_key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
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
      new LocalStrategy(async (username, password, done) => {
        try {
          const user = await userService.getUserByUsername(username);
          if (!user || !(await comparePasswords(password, user.password))) {
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

    passport.deserializeUser(async (id: number, done) => {
      try {
        const user = await userService.getUser(id);
        done(null, user);
      } catch (error) {
        done(error);
      }
    });
  }

  /**
   * Register authentication-related routes
   */
  private registerAuthRoutes(app: Express) {
    app.post("/api/register", async (req, res, next) => {
      try {
        const existingUser = await userService.getUserByUsername(req.body.username);
        if (existingUser) {
          return res.status(400).json({ message: "Username already exists" });
        }

        const user = await userService.createUser(req.body);

        req.login(user, (err) => {
          if (err) return next(err);
          return res.status(201).json(user);
        });
      } catch (error) {
        next(error);
      }
    });

    app.post("/api/login", (req, res, next) => {
      passport.authenticate("local", (err, user) => {
        if (err) return next(err);
        if (!user) {
          return res.status(401).json({ message: "Invalid username or password" });
        }
        
        req.login(user, (err) => {
          if (err) return next(err);
          return res.status(200).json(user);
        });
      })(req, res, next);
    });

    app.post("/api/logout", (req, res, next) => {
      req.logout((err) => {
        if (err) return next(err);
        res.sendStatus(200);
      });
    });

    app.get("/api/user", (req, res) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      res.json(req.user);
    });

    // Update streak and last active
    app.post("/api/streak/update", async (req, res, next) => {
      if (!req.isAuthenticated()) {
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
