import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export const ADMIN_COOKIE = "flipz_admin";

function hashToken(token: string): string {
  return crypto.createHmac("sha256", env.sessionSecret()).update(token).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  const expectedUser = env.adminUsername();
  const expectedPass = env.adminPassword();
  if (!expectedPass) return false;
  return safeEqual(username, expectedUser) && safeEqual(password, expectedPass);
}

export async function createAdminSession(username: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  await prisma.adminSession.create({
    data: {
      tokenHash,
      username,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  return token;
}

export async function validateAdminSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const row = await prisma.adminSession.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!row || row.expiresAt < new Date()) return false;
  return true;
}

export async function requireAdmin(): Promise<{ username: string } | null> {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!(await validateAdminSession(token))) return null;
  const row = await prisma.adminSession.findUnique({
    where: { tokenHash: hashToken(token!) },
  });
  return row ? { username: row.username } : null;
}

export function setAdminCookie(token: string) {
  cookies().set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export function clearAdminCookie() {
  cookies().delete(ADMIN_COOKIE);
}
