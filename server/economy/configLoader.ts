import { prisma } from "@/lib/db";
import { ECONOMY_SEEDS } from "./defaultConfigs";
import type {
  CardsEconomyConfig,
  CrashEconomyConfig,
  CrossyEconomyConfig,
  GameEconomyConfig,
  GlobalEconomyConfig,
} from "./types";
import { DEFAULT_GLOBAL } from "./types";

/** In-process cache — live reload on admin save (TTL 5s for multi-instance best-effort) */
const cache = new Map<string, { at: number; value: unknown }>();
const CACHE_MS = 5_000;

function parseConfig<T>(raw: string): T {
  return JSON.parse(raw) as T;
}

async function loadRaw(gameKey: string): Promise<unknown> {
  const hit = cache.get(gameKey);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  const row = await prisma.economySetting.findUnique({ where: { gameKey } });
  const value = row ? parseConfig<unknown>(row.config) : ECONOMY_SEEDS[gameKey];
  cache.set(gameKey, { at: Date.now(), value });
  return value;
}

export function invalidateEconomyCache(gameKey?: string) {
  if (gameKey) cache.delete(gameKey);
  else cache.clear();
}

export async function getGlobalEconomy(): Promise<GlobalEconomyConfig> {
  const v = await loadRaw("global");
  return { ...DEFAULT_GLOBAL, ...(v as GlobalEconomyConfig) };
}

export async function getGameEconomy(gameKey: string): Promise<GameEconomyConfig> {
  const v = await loadRaw(gameKey);
  const base = ECONOMY_SEEDS[gameKey] as GameEconomyConfig;
  return { ...defaultFromSeed(gameKey), ...(v as GameEconomyConfig) };
}

function defaultFromSeed(gameKey: string): GameEconomyConfig {
  const s = ECONOMY_SEEDS[gameKey];
  if (!s || typeof s !== "object") {
    return ECONOMY_SEEDS.coinflip as GameEconomyConfig;
  }
  return s as GameEconomyConfig;
}

export async function getCrashEconomy(): Promise<CrashEconomyConfig> {
  const v = await loadRaw("crash");
  return { ...(ECONOMY_SEEDS.crash as CrashEconomyConfig), ...(v as CrashEconomyConfig) };
}

export async function getCrossyEconomy(): Promise<CrossyEconomyConfig> {
  const v = await loadRaw("crossy");
  return { ...(ECONOMY_SEEDS.crossy as CrossyEconomyConfig), ...(v as CrossyEconomyConfig) };
}

export async function getCardsEconomy(): Promise<CardsEconomyConfig> {
  const v = await loadRaw("higher_lower");
  return { ...(ECONOMY_SEEDS.higher_lower as CardsEconomyConfig), ...(v as CardsEconomyConfig) };
}

export async function upsertEconomyConfig(
  gameKey: string,
  config: unknown,
  updatedBy: string,
): Promise<void> {
  await prisma.economySetting.upsert({
    where: { gameKey },
    create: {
      gameKey,
      config: JSON.stringify(config),
      updatedBy,
    },
    update: {
      config: JSON.stringify(config),
      updatedBy,
    },
  });
  invalidateEconomyCache(gameKey);
}

export async function ensureEconomySeeded(): Promise<void> {
  for (const [gameKey, config] of Object.entries(ECONOMY_SEEDS)) {
    await prisma.economySetting.upsert({
      where: { gameKey },
      create: { gameKey, config: JSON.stringify(config), updatedBy: "system" },
      update: {},
    });
  }
}
