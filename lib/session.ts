import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "flipz_session";

export interface PlayerSession {
  sessionId: string;
  routing: string;
  displayName: string;
  balance: number;
  totalDeposited: number;
  totalWagered: number;
  totalWon: number;
  createdAt: Date;
  lastActiveAt: Date;
}

export async function getSessionFromCookie(): Promise<PlayerSession | null> {
  const id = cookies().get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const row = await prisma.session.findUnique({ where: { id } });
  if (!row) return null;
  await prisma.session.update({
    where: { id: row.id },
    data: { lastActiveAt: new Date() },
  });
  return {
    sessionId: row.id,
    routing: row.routing,
    displayName: row.displayName,
    balance: row.balance,
    totalDeposited: row.totalDeposited,
    totalWagered: row.totalWagered,
    totalWon: row.totalWon,
    createdAt: row.createdAt,
    lastActiveAt: row.lastActiveAt,
  };
}

export async function requireSession(): Promise<PlayerSession> {
  const s = await getSessionFromCookie();
  if (!s) throw new Error("UNAUTHORIZED");
  return s;
}
