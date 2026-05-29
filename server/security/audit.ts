import { prisma } from "@/lib/db";

export async function logAdminAction(
  adminUser: string,
  action: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  await prisma.adminLog.create({
    data: {
      adminUser,
      action,
      detail: detail ? JSON.stringify(detail) : null,
    },
  });
}

export async function bumpSuspicion(
  sessionId: string,
  delta: number,
  reason: string,
): Promise<number> {
  const s = await prisma.session.update({
    where: { id: sessionId },
    data: { suspicionScore: { increment: delta } },
  });
  if (s.suspicionScore >= 100) {
    await logAdminAction("system", "high_suspicion", { sessionId, reason, score: s.suspicionScore });
  }
  return s.suspicionScore;
}
