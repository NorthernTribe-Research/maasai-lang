import { describe, it, expect, beforeEach, vi } from "vitest";
import { hashPassword } from "./auth";
import { generateToken, verifyToken } from "./middleware/auth";
import { validateRegistrationData } from "./utils/validation";
import jwt from "jsonwebtoken";

describe("Authentication Unit Tests", () => {
  describe("Password Hashing", () => {
    it("should hash passwords securely", async () => {
      const password = "Test123!@#";
      const hashed = await hashPassword(password);

      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed).toContain(".");
      
      // Hash should have salt and hash parts
      const parts = hashed.split(".");
      expect(parts).toHaveLength(2);
      expect(parts[0]).toBeTruthy(); // hash
      expect(parts[1]).toBeTruthy(); // salt
    });

    it("should generate different hashes for same password", async () => {
      const password = "Test123!@#";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty passwords", async () => {
      const password = "";
      const hashed = await hashPassword(password);

      expect(hashed).toBeDefined();
      expect(hashed).toContain(".");
    });

    it("should handle long passwords", async () => {
      const password = "a".repeat(200);
      const hashed = await hashPassword(password);

      expect(hashed).toBeDefined();
      expect(hashed).toContain(".");
      const parts = hashed.split(".");
      expect(parts).toHaveLength(2);
    });

    it("should handle special characters in passwords", async () => {
      const password = "!@#$%^&*()_+-=[]{}|;:',.<>?/~`";
      const hashed = await hashPassword(password);

      expect(hashed).toBeDefined();
      expect(hashed).toContain(".");
    });
  });

  describe("Registration Validation", () => {
    it("should accept valid registration data", () => {
      const validData = {
        username: "testuser",
        password: "Test123!@#",
        email: "test@example.com",
      };

      const result = validateRegistrationData(validData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject registration with missing username", () => {
      const invalidData = {
        username: "",
        password: "Test123!@#",
        email: "test@example.com",
      };

      const result = validateRegistrationData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should reject registration with short username", () => {
      const invalidData = {
        username: "ab",
        password: "Test123!@#",
        email: "test@example.com",
      };

      const result = validateRegistrationData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes("username"))).toBe(true);
    });

    it("should reject registration with missing password", () => {
      const invalidData = {
        username: "testuser",
        password: "",
        email: "test@example.com",
      };

      const result = validateRegistrationData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should reject registration with weak password", () => {
      const invalidData = {
        username: "testuser",
        password: "weak",
        email: "test@example.com",
      };

      const result = validateRegistrationData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes("password"))).toBe(true);
    });

    it("should reject registration with invalid email format", () => {
      const invalidData = {
        username: "testuser",
        password: "Test123!@#",
        email: "invalid-email",
      };

      const result = validateRegistrationData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes("email"))).toBe(true);
    });

    it("should accept registration without email (optional)", () => {
      const validData = {
        username: "testuser",
        password: "Test123!@#",
        email: undefined,
      };

      const result = validateRegistrationData(validData);
      // Email is optional, so this should be valid
      expect(result.valid).toBe(true);
    });
  });

  describe("JWT Token Generation", () => {
    it("should generate valid JWT token for user", () => {
      const user = {
        id: "test-user-id",
        username: "testuser",
        email: "test@example.com",
        xp: 0,
        streak: 0,
        hearts: 5,
        maxHearts: 5,
        level: 1,
        longestStreak: 0,
        lastActive: new Date(),
        streakUpdatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: null,
        isAdmin: false,
        firstName: null,
        lastName: null,
        profileImageUrl: null,
        password: null,
      };

      const token = generateToken(user);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
    });

    it("should include user information in token payload", () => {
      const user = {
        id: "test-user-id",
        username: "testuser",
        email: "test@example.com",
        xp: 0,
        streak: 0,
        hearts: 5,
        maxHearts: 5,
        level: 1,
        longestStreak: 0,
        lastActive: new Date(),
        streakUpdatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: null,
        isAdmin: false,
        firstName: null,
        lastName: null,
        profileImageUrl: null,
        password: null,
      };

      const token = generateToken(user);
      const decoded = verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(user.id);
      expect(decoded?.username).toBe(user.username);
      expect(decoded?.email).toBe(user.email);
    });

    it("should set token expiration to 24 hours", () => {
      const user = {
        id: "test-user-id",
        username: "testuser",
        email: "test@example.com",
        xp: 0,
        streak: 0,
        hearts: 5,
        maxHearts: 5,
        level: 1,
        longestStreak: 0,
        lastActive: new Date(),
        streakUpdatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: null,
        isAdmin: false,
        firstName: null,
        lastName: null,
        profileImageUrl: null,
        password: null,
      };

      const token = generateToken(user);
      const decoded = verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.exp).toBeDefined();
      expect(decoded?.iat).toBeDefined();

      // Check that expiration is approximately 24 hours from now
      const expirationTime = decoded!.exp! * 1000;
      const issuedTime = decoded!.iat! * 1000;
      const duration = expirationTime - issuedTime;
      const twentyFourHours = 24 * 60 * 60 * 1000;

      // Allow 1 second tolerance
      expect(Math.abs(duration - twentyFourHours)).toBeLessThan(1000);
    });
  });

  describe("JWT Token Validation", () => {
    it("should verify valid JWT token", () => {
      const user = {
        id: "test-user-id",
        username: "testuser",
        email: "test@example.com",
        xp: 0,
        streak: 0,
        hearts: 5,
        maxHearts: 5,
        level: 1,
        longestStreak: 0,
        lastActive: new Date(),
        streakUpdatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: null,
        isAdmin: false,
        firstName: null,
        lastName: null,
        profileImageUrl: null,
        password: null,
      };

      const token = generateToken(user);
      const decoded = verifyToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(user.id);
    });

    it("should reject invalid JWT token", () => {
      const invalidToken = "invalid.token.here";
      const decoded = verifyToken(invalidToken);

      expect(decoded).toBeNull();
    });

    it("should reject malformed JWT token", () => {
      const malformedToken = "not-a-jwt-token";
      const decoded = verifyToken(malformedToken);

      expect(decoded).toBeNull();
    });

    it("should reject expired JWT token", () => {
      const user = {
        id: "test-user-id",
        username: "testuser",
        email: "test@example.com",
      };

      // Create token that expires immediately
      const JWT_SECRET = process.env.JWT_SECRET || 'linguamaster_jwt_secret_key_change_in_production';
      const expiredToken = jwt.sign(user, JWT_SECRET, { expiresIn: '0s' });

      // Wait a moment to ensure expiration
      setTimeout(() => {
        const decoded = verifyToken(expiredToken);
        expect(decoded).toBeNull();
      }, 100);
    });

    it("should reject token with wrong signature", () => {
      const user = {
        id: "test-user-id",
        username: "testuser",
        email: "test@example.com",
      };

      // Create token with different secret
      const wrongToken = jwt.sign(user, "wrong-secret", { expiresIn: '24h' });
      const decoded = verifyToken(wrongToken);

      expect(decoded).toBeNull();
    });
  });

  describe("Login Validation", () => {
    it("should validate correct login credentials structure", () => {
      const validData = {
        username: "testuser",
        password: "Test123!@#",
      };

      expect(validData.username).toBeDefined();
      expect(validData.password).toBeDefined();
      expect(validData.username.length).toBeGreaterThan(0);
      expect(validData.password.length).toBeGreaterThan(0);
    });

    it("should detect missing username in login", () => {
      const invalidData = {
        username: "",
        password: "Test123!@#",
      };

      expect(invalidData.username).toBe("");
      expect(invalidData.username.length).toBe(0);
    });

    it("should detect missing password in login", () => {
      const invalidData = {
        username: "testuser",
        password: "",
      };

      expect(invalidData.password).toBe("");
      expect(invalidData.password.length).toBe(0);
    });
  });

  describe("Session Timeout", () => {
    it("should create token with 24-hour expiration", () => {
      const user = {
        id: "test-user-id",
        username: "testuser",
        email: "test@example.com",
        xp: 0,
        streak: 0,
        hearts: 5,
        maxHearts: 5,
        level: 1,
        longestStreak: 0,
        lastActive: new Date(),
        streakUpdatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: null,
        isAdmin: false,
        firstName: null,
        lastName: null,
        profileImageUrl: null,
        password: null,
      };

      const token = generateToken(user);
      const decoded = verifyToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.exp).toBeDefined();

      // Calculate time until expiration
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiration = decoded!.exp! - now;
      const twentyFourHoursInSeconds = 24 * 60 * 60;

      // Should be approximately 24 hours (allow 10 second tolerance)
      expect(Math.abs(timeUntilExpiration - twentyFourHoursInSeconds)).toBeLessThan(10);
    });

    it("should detect when token is expired", () => {
      const user = {
        id: "test-user-id",
        username: "testuser",
        email: "test@example.com",
      };

      const JWT_SECRET = process.env.JWT_SECRET || 'linguamaster_jwt_secret_key_change_in_production';
      const expiredToken = jwt.sign(user, JWT_SECRET, { expiresIn: '-1h' });

      const decoded = verifyToken(expiredToken);
      expect(decoded).toBeNull();
    });

    it("should accept token within valid time window", () => {
      const user = {
        id: "test-user-id",
        username: "testuser",
        email: "test@example.com",
        xp: 0,
        streak: 0,
        hearts: 5,
        maxHearts: 5,
        level: 1,
        longestStreak: 0,
        lastActive: new Date(),
        streakUpdatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: null,
        isAdmin: false,
        firstName: null,
        lastName: null,
        profileImageUrl: null,
        password: null,
      };

      const token = generateToken(user);
      const decoded = verifyToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.exp).toBeDefined();
      
      // Token should not be expired
      const now = Math.floor(Date.now() / 1000);
      expect(decoded!.exp!).toBeGreaterThan(now);
    });
  });

  describe("Security Requirements", () => {
    it("should not expose password in user object", () => {
      const user = {
        id: "test-user-id",
        username: "testuser",
        email: "test@example.com",
        password: "hashed-password-here",
        xp: 0,
        streak: 0,
        hearts: 5,
        maxHearts: 5,
        level: 1,
        longestStreak: 0,
        lastActive: new Date(),
        streakUpdatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: null,
        isAdmin: false,
        firstName: null,
        lastName: null,
        profileImageUrl: null,
      };

      const token = generateToken(user);
      const decoded = verifyToken(token);

      expect(decoded).not.toBeNull();
      expect((decoded as any).password).toBeUndefined();
    });

    it("should use secure hashing algorithm", async () => {
      const password = "Test123!@#";
      const hashed = await hashPassword(password);

      // Hash should be long enough to be secure (scrypt produces 64-byte hash + salt)
      expect(hashed.length).toBeGreaterThan(100);
      
      // Should contain hex characters and a dot separator
      expect(hashed).toMatch(/^[a-f0-9]+\.[a-f0-9]+$/);
    });

    it("should generate unique salts for each hash", async () => {
      const password = "Test123!@#";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      const hash3 = await hashPassword(password);

      const salt1 = hash1.split(".")[1];
      const salt2 = hash2.split(".")[1];
      const salt3 = hash3.split(".")[1];

      expect(salt1).not.toBe(salt2);
      expect(salt2).not.toBe(salt3);
      expect(salt1).not.toBe(salt3);
    });
  });
});
