import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to .env (one level up from server directory)
const envPath = path.resolve(__dirname, "..", ".env");

console.log(`[EnvLoader] Loading environment from ${envPath}`);

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  const lines = content.split("\n");

  let loadedCount = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Split at the first '='
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed
        .slice(eqIdx + 1)
        .trim()
        .replace(/\r$/, "");

      // Remove wrapping quotes if present
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }

      // Only set if not already set (respect existing process.env)
      if (!process.env[key]) {
        process.env[key] = val;
        loadedCount++;
      }
    }
  }
  console.log(`[EnvLoader] Loaded ${loadedCount} variables from .env`);
} else {
  console.warn("[EnvLoader] .env file not found!");
}
