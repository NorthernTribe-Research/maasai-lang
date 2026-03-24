type ConfigEntry = {
  key: string;
  required: boolean;
  productionOnly?: boolean;
  description: string;
  disallowedValues?: string[];
};

const CONFIG_ENTRIES: ConfigEntry[] = [
  {
    key: "DATABASE_URL",
    required: true,
    description: "Required for database connectivity.",
  },
  {
    key: "SESSION_SECRET",
    required: true,
    productionOnly: true,
    description: "Required to secure user sessions in production.",
    disallowedValues: [
      "linguamaster_secret_key",
      "your_super_secret_session_key_here",
      "development-only-session-secret",
    ],
  },
  {
    key: "JWT_SECRET",
    required: true,
    productionOnly: true,
    description: "Required for JWT signing and verification in production.",
    disallowedValues: [
      "linguamaster_jwt_secret_key_change_in_production",
      "your_super_secret_jwt_secret_here",
      "development-only-jwt-secret-do-not-use-in-production",
    ],
  },
  {
    key: "GEMINI_API_KEY",
    required: true,
    productionOnly: true,
    description: "Required by AI learning services in production.",
  },
  {
    key: "OPENAI_API_KEY",
    required: false,
    description: "Optional but recommended for voice/exercise AI features.",
  },
  {
    key: "GOOGLE_WEB_CLIENT_ID",
    required: false,
    description: "Required for Google account login (/api/google-login).",
  },
];

/**
 * Check if an API key is present and valid.
 * @param apiKey The API key to check
 * @param serviceName Name of the service for logging
 * @returns Boolean indicating if the key is valid
 */
export function checkApiKey(apiKey: string, serviceName: string): boolean {
  const isValid = !!apiKey && apiKey.length > 5 && apiKey !== "demo-api-key";
  if (!isValid) {
    console.warn(`${serviceName} key is missing or invalid. Some features may not work correctly.`);
  }
  return isValid;
}

export default function checkConfig() {
  const isProduction = process.env.NODE_ENV === "production";
  const hardFailures: string[] = [];
  const softWarnings: string[] = [];

  console.log("\n=== LinguaMaster Configuration Check ===\n");

  for (const entry of CONFIG_ENTRIES) {
    const rawValue = process.env[entry.key];
    const value = typeof rawValue === "string" ? rawValue.trim() : "";
    const requiredNow = entry.required && (!entry.productionOnly || isProduction);
    const hasDisallowedValue = !!entry.disallowedValues?.includes(value);
    const isValid = value.length > 0 && !hasDisallowedValue;

    const status = isValid ? "✅ Present" : requiredNow ? "❌ Missing/Invalid" : "⚠️ Optional";
    console.log(`${entry.key}: ${status}`);

    if (!isValid) {
      console.log(`  ${entry.description}`);
      if (requiredNow) {
        hardFailures.push(entry.key);
      } else {
        softWarnings.push(entry.key);
      }
    }
  }

  if (isProduction && !process.env.ALLOWED_ORIGINS) {
    console.log("ALLOWED_ORIGINS: ⚠️ Optional");
    console.log("  Strongly recommended in production to restrict CORS to trusted domains.");
    softWarnings.push("ALLOWED_ORIGINS");
  }

  console.log("\n=== Configuration Status ===");
  if (hardFailures.length === 0) {
    console.log("✅ Required configuration checks passed.");
    if (softWarnings.length > 0) {
      console.log(`⚠️ Warnings: ${softWarnings.join(", ")}`);
    }
    console.log("\n");
    return true;
  }

  console.log(`❌ Missing/invalid required configuration: ${hardFailures.join(", ")}`);
  console.log("\n");

  if (isProduction) {
    throw new Error(`Missing required production configuration: ${hardFailures.join(", ")}`);
  }

  return false;
}
