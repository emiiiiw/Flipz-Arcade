import { NextResponse } from "next/server";
import { verifyCrashPoint } from "@/lib/games/crash";
import { generateLaneObstacles } from "@/lib/games/crossy";
import { sha256Hex } from "@/lib/rng";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    game: string;
    seed: string;
    roundId?: string;
    lane?: number;
  };

  try {
    if (body.game === "crash" && body.roundId) {
      const cp = verifyCrashPoint(body.seed, body.roundId);
      return NextResponse.json({ crashPoint: cp });
    }
    if (body.game === "coinflip") {
      const hash = (body as { seedHash?: string }).seedHash;
      if (!hash) {
        return NextResponse.json({ error: "seedHash required" }, { status: 400 });
      }
      const ok = sha256Hex(body.seed) === hash;
      return NextResponse.json({ seedMatchesHash: ok });
    }
    if (body.game === "crossy" && typeof body.lane === "number") {
      const cells = generateLaneObstacles(body.seed, body.lane, 20);
      return NextResponse.json({ cells });
    }
    return NextResponse.json({ error: "unsupported" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "verify_failed" }, { status: 400 });
  }
}
