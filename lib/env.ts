/**
 * Environment validation — fail fast in production when secrets are missing.
 */
function required(name: string, value: string | undefined): string {
  if (!value?.trim()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return "";
  }
  return value.trim();
}

export const env = {
  databaseUrl: () => required("DATABASE_URL", process.env.DATABASE_URL),
  sessionSecret: () =>
    required("SESSION_SECRET", process.env.SESSION_SECRET) || "dev-only-session-secret-change-me",
  fleecaApiKey: () => process.env.FLEECA_API_KEY?.trim() ?? "",
  baseUrl: () => process.env.BASE_URL?.trim() ?? "http://localhost:3000",
  adminUsername: () => process.env.ADMIN_USERNAME?.trim() ?? "admin",
  adminPassword: () => process.env.ADMIN_PASSWORD?.trim() ?? "",
  redisUrl: () => process.env.REDIS_URL?.trim() ?? "",
};
