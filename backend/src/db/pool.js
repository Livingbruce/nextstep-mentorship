import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

const { Pool } = pg;

// Ensure password is a string in case env parsing yields non-string
let connectionString = process.env.DATABASE_URL;

// Fix common connection string issues
if (connectionString) {
  // Remove 'psql' prefix if present
  if (connectionString.startsWith('psql ')) {
    connectionString = connectionString.replace(/^psql\s+/, '');
  }
  // Remove quotes if present
  connectionString = connectionString.replace(/^['"]|['"]$/g, '');
}

let poolConfig;
if (connectionString) {
  try {
    const url = new URL(connectionString);
    const passwordFromUrl = url.password && url.password.length > 0 ? url.password : undefined;
    const envPassword = Object.prototype.hasOwnProperty.call(process.env, "PGPASSWORD")
      ? process.env.PGPASSWORD
      : undefined;
    const resolvedPassword =
      typeof passwordFromUrl === "string" && passwordFromUrl.length > 0
        ? passwordFromUrl
        : typeof envPassword === "string" && envPassword.length > 0
        ? envPassword
        : undefined;
    poolConfig = {
      host: url.hostname,
      port: url.port ? Number(url.port) : 5432,
      database: url.pathname ? url.pathname.replace(/^\//, "") : undefined,
      user: url.username || undefined,
      ...(resolvedPassword !== undefined ? { password: resolvedPassword } : {}),
      ssl: process.env.PGSSL === "true" || connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
    };
  } catch (_e) {
    poolConfig = { connectionString };
  }
} else {
  const envHost = process.env.PGHOST || process.env.DB_HOST || "localhost";
  const envPort = process.env.PGPORT || process.env.DB_PORT;
  const envDb = process.env.PGDATABASE || process.env.DB_NAME;
  const envUser = process.env.PGUSER || process.env.DB_USER;
  const envPassRaw =
    Object.prototype.hasOwnProperty.call(process.env, "PGPASSWORD")
      ? process.env.PGPASSWORD
      : process.env.DB_PASSWORD;
  const envPass =
    envPassRaw == null
      ? undefined
      : typeof envPassRaw === "string"
      ? envPassRaw
      : String(envPassRaw);

  poolConfig = {
    host: envHost,
    port: envPort ? Number(envPort) : 5432,
    database: envDb || undefined,
    user: envUser || undefined,
    ...(envPass !== undefined ? { password: envPass } : {}),
    ssl: process.env.PGSSL === "true" || connectionString?.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  };
}

// Debug: ensure password is a string
if (process.env.DEBUG_DB === "true") {
  console.log("DB pool config:", {
    ...poolConfig,
    password: poolConfig && Object.prototype.hasOwnProperty.call(poolConfig, "password")
      ? `[type=${typeof poolConfig.password}]` + (typeof poolConfig.password === "string" ? poolConfig.password.replace(/./g, "*") : String(poolConfig.password))
      : undefined,
  });
}

const pool = new Pool(poolConfig);

export default pool;