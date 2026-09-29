// Runs `prisma migrate deploy` only when a database is configured.
// Local dev and CI have no DATABASE_URL, so this is a no-op there and the
// file-db keeps working with zero setup.
import { execSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log("[prebuild] DATABASE_URL not set — skipping prisma migrate deploy.");
  process.exit(0);
}

// Migrations need a direct connection: prefer DIRECT_URL when both are set
// (DATABASE_URL is usually the pooled one for serverless runtime).
const env = { ...process.env };
if (process.env.DIRECT_URL) env.DATABASE_URL = process.env.DIRECT_URL;
execSync("npx --no-install prisma migrate deploy", { stdio: "inherit", env });
