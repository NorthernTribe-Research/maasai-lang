/**
 * Configuration validation script for LinguaMaster
 * 
 * This script verifies that all the necessary API keys and configurations 
 * are set properly for the application to function correctly.
 */

console.log("\n=== LinguaMaster Configuration Check ===\n");

// Check for required environment variables
const requiredEnvVars = {
  "DATABASE_URL": process.env.DATABASE_URL,
  "GEMINI_API_KEY": process.env.GEMINI_API_KEY,
  "OPENAI_API_KEY": process.env.OPENAI_API_KEY
};

let allConfigValid = true;

// Check each environment variable
for (const [name, value] of Object.entries(requiredEnvVars)) {
  const isValid = !!value;
  console.log(`${name}: ${isValid ? '✅ Present' : '❌ Missing'}`);
  
  if (!isValid) {
    allConfigValid = false;
    if (name === "DATABASE_URL") {
      console.log(`  This is required for database connectivity.`);
    } else if (name === "GEMINI_API_KEY") {
      console.log(`  This is required for language mascot, pronunciation feedback, and learning path features.`);
    } else if (name === "OPENAI_API_KEY") {
      console.log(`  This is required for exercise generation and translation checking features.`);
    }
  }
}

// Overall status
console.log("\n=== Configuration Status ===");
if (allConfigValid) {
  console.log("✅ All required configuration is present. The application should function correctly.");
} else {
  console.log("⚠️  Some configuration is missing. Certain features may not work correctly.");
}
console.log("\n");

// Run this script automatically when the server starts
/**
 * Check if an API key is present and valid
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
  // This function is called from server/index.ts
  return allConfigValid;
}