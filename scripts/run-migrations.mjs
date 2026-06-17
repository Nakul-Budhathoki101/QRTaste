import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(".");
const envPath = join(root, ".env");

if (existsSync(envPath)) {
  const envText = readFileSync(envPath, "utf8");

  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const [key, ...valueParts] = trimmed.split("=");
    process.env[key] ??= valueParts.join("=");
  }
}

const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    "Missing SUPABASE_DB_URL. Add your Supabase database connection string to .env.",
  );
  console.error(
    "Example: SUPABASE_DB_URL=postgresql://postgres.xxx:YOUR_PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres",
  );
  process.exit(1);
}

const migrationsDir = join(root, "app", "database", "migrations");

if (!existsSync(migrationsDir)) {
  console.log("No migrations directory found.");
  process.exit(0);
}

const runPsql = (args, options = {}) => {
  const result = spawnSync("psql", ["--dbname", databaseUrl, ...args], {
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });

  if (result.status !== 0) {
    if (options.capture) {
      process.stderr.write(result.stderr || result.stdout || "");
    }
    process.exit(result.status || 1);
  }

  return result.stdout || "";
};

runPsql([
  "-v",
  "ON_ERROR_STOP=1",
  "-c",
  `create table if not exists public.schema_migrations (
    id text primary key,
    applied_at timestamptz not null default now()
  );`,
]);

const applied = new Set(
  runPsql(["-At", "-c", "select id from public.schema_migrations"], {
    capture: true,
  })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean),
);

const migrationFiles = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

let appliedCount = 0;

for (const file of migrationFiles) {
  if (applied.has(file)) {
    console.log(`Skipping ${file}`);
    continue;
  }

  const filePath = join(migrationsDir, file);
  console.log(`Applying ${file}`);
  runPsql(["-v", "ON_ERROR_STOP=1", "-f", filePath]);
  runPsql([
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `insert into public.schema_migrations(id) values ('${file.replaceAll("'", "''")}');`,
  ]);
  appliedCount += 1;
}

console.log(
  appliedCount
    ? `Applied ${appliedCount} migration(s).`
    : "Database is already up to date.",
);
