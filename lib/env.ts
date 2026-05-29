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
  /** Server-only — never expose to client */
  fleecaApiKey: () => process.env.FLEECA_API_KEY?.trim() ?? "",
  baseUrl: () => process.env.BASE_URL?.trim() ?? "http://localhost:3000",
  adminUsername: () => process.env.ADMIN_USERNAME?.trim() ?? "admin",
  adminPassword: () => process.env.ADMIN_PASSWORD?.trim() ?? "",
  redisUrl: () => process.env.REDIS_URL?.trim() ?? "",
  /** Optional Supabase — player lookup falls back to Prisma Session */
  supabaseUrl: () => process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
  supabaseAnonKey: () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "",
  supabaseServiceRoleKey: () => process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "",
};

/** Log which auth-related env vars are present (never log secret values). */
export function logAuthEnvStatus(): void {
  console.log("[env] auth config", {
    FLEECA_API_KEY: Boolean(process.env.FLEECA_API_KEY?.trim()),
    DATABASE_URL: Boolean(process.env.DATABASE_URL?.trim()),
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
  });
}
