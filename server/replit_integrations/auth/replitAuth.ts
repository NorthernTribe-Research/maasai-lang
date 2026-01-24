import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";

const getOidcConfig = memoize(async () => {
  return await client.discovery(new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"), process.env.REPL_ID!);
}, { maxAge: 3600 * 1000 });

export function getSession() {
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({ conString: process.env.DATABASE_URL, createTableIfMissing: false, tableName: "sessions" });
  return session({ secret: process.env.SESSION_SECRET!, store: sessionStore, resave: false, saveUninitialized: false, cookie: { httpOnly: true, secure: true, maxAge: 7 * 24 * 60 * 60 * 1000 } });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());
  const config = await getOidcConfig();
  const verify: VerifyFunction = async (tokens, verified) => {
    const claims = tokens.claims();
    await authStorage.upsertUser({ id: claims["sub"], email: claims["email"], firstName: claims["first_name"], lastName: claims["last_name"], profileImageUrl: claims["profile_image_url"] });
    verified(null, { claims: claims, access_token: tokens.access_token });
  };
  passport.serializeUser((user, cb) => cb(null, user));
  passport.deserializeUser((user: any, cb) => cb(null, user));
  app.get("/api/login", (req, res, next) => {
    const strategyName = `replitauth:${req.hostname}`;
    if (!passport._strategy(strategyName)) passport.use(strategyName, new Strategy({ name: strategyName, config, scope: "openid email profile", callbackURL: `https://${req.hostname}/api/callback` }, verify));
    passport.authenticate(strategyName)(req, res, next);
  });
  app.get("/api/callback", (req, res, next) => {
    const strategyName = `replitauth:${req.hostname}`;
    passport.authenticate(strategyName, { successRedirect: "/", failureRedirect: "/api/login" })(req, res, next);
  });
  app.get("/api/logout", (req, res) => {
    req.logout(() => res.redirect(client.buildEndSessionUrl(config, { client_id: process.env.REPL_ID!, post_logout_redirect_uri: `${req.protocol}://${req.hostname}` }).href));
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Unauthorized" });
};
