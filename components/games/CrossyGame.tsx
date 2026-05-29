"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSessionStore } from "@/store/session";
import { CROSSY_MAX_BET, MIN_BET } from "@/lib/constants";

const COLS = 20;
const ROWS = 12;
const CELL = 28;

export function CrossyGame() {
  const patchBalance = useSessionStore((s) => s.patchBalance);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [bet, setBet] = useState(20_000);
  const [lanes, setLanes] = useState<boolean[][] | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [advanceNonce, setAdvanceNonce] = useState<string | null>(null);
  const [player, setPlayer] = useState({ row: ROWS - 1, col: 0 });
  const [msg, setMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const raf = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const busyRef = useRef(false);

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c || !lanes) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, c.width, c.height);
    const t = performance.now() / 16;
    offsetRef.current = t % COLS;
    for (let row = 0; row < ROWS; row++) {
      const lane = lanes[Math.min(row, lanes.length - 1)];
      for (let col = 0; col < COLS; col++) {
        const shift = (col + offsetRef.current + row * 0.3) % COLS;
        const x = Math.floor(shift) * CELL;
        const y = row * CELL;
        if (lane[Math.floor(shift) % COLS]) {
          ctx.fillStyle = row > 8 ? "#b91c1c" : row > 5 ? "#ea580c" : "#facc15";
          ctx.fillRect(x, y, CELL - 2, CELL - 2);
        }
      }
    }
    ctx.fillStyle = "#4ade80";
    ctx.fillRect(player.col * CELL + 2, player.row * CELL + 2, CELL - 4, CELL - 4);
  }, [lanes, player]);

  useEffect(() => {
    if (!lanes) return;
    const loop = () => {
      draw();
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [draw, lanes]);

  async function serverAdvance(lane: number, position: number) {
    if (!runId || !advanceNonce || busyRef.current) return null;
    busyRef.current = true;
    const res = await fetch("/api/game/crossy/advance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId,
        lane,
        position,
        clientTimestamp: Date.now(),
        nonce: advanceNonce,
      }),
    });
    const data = await res.json();
    busyRef.current = false;
    if (!res.ok) {
      setMsg(data.error ?? "invalid move");
      return null;
    }
    if (data.nearMiss || data.screenShake) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
    if (data.nextNonce) setAdvanceNonce(data.nextNonce);
    return data as {
      died?: boolean;
      lane?: number;
      payoutMultiplier?: number;
      nextNonce?: string;
    };
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!runId || !lanes || busyRef.current) return;
      if (e.key === "ArrowUp" || e.key === "w") {
        e.preventDefault();
        void (async () => {
          const nextRow = Math.max(0, player.row - 1);
          const lane = ROWS - 1 - nextRow;
          const data = await serverAdvance(lane, player.col);
          if (!data) return;
          if (data.died) {
            setMsg("Hit — settling run…");
            await settle(false);
            return;
          }
          setPlayer({ row: nextRow, col: player.col });
          if (data.payoutMultiplier) {
            setMsg(`Lane ${lane + 1} — bank ${data.payoutMultiplier}×`);
          }
          if (nextRow === 0) {
            await settle(true);
          }
        })();
      }
      if (e.key === "ArrowLeft" || e.key === "a") {
        setPlayer((p) => ({ ...p, col: Math.max(0, p.col - 1) }));
      }
      if (e.key === "ArrowRight" || e.key === "d") {
        setPlayer((p) => ({ ...p, col: Math.min(COLS - 1, p.col + 1) }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [runId, lanes, player, advanceNonce]);

  async function start() {
    setMsg(null);
    const res = await fetch("/api/game/crossy/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ betAmount: bet }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "failed");
      return;
    }
    setLanes(data.lanes);
    setRunId(data.runId);
    setAdvanceNonce(data.nextNonce);
    setPlayer({ row: ROWS - 1, col: 0 });
    patchBalance(data.newBalance);
    setMsg("Server-authoritative lanes — move up to advance");
  }

  async function settle(cashOut: boolean) {
    if (!runId) return;
    const res = await fetch("/api/game/crossy/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId, cashOut }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "failed");
      return;
    }
    setRunId(null);
    setLanes(null);
    setAdvanceNonce(null);
    patchBalance(data.newBalance);
    setMsg(
      data.outcome === "win"
        ? `Settled — $${data.payout.toLocaleString()} (${data.multiplier}×)`
        : "Run closed",
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/lobby" className="text-sm text-flipz-cyan underline">
        ← Lobby
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-flipz-cyan">Crossy</h1>
      <p className="text-sm text-white/50">
        Outcomes validated server-side · lane payouts up to 15×
      </p>
      <div
        className={`mt-4 overflow-hidden rounded-xl border border-white/10 ${shake ? "animate-pulse" : ""}`}
      >
        <canvas
          ref={canvasRef}
          width={COLS * CELL}
          height={ROWS * CELL}
          className="mx-auto block bg-black"
        />
      </div>
      {!runId && (
        <>
          <label className="mt-4 block text-sm text-white/60">
            Bet (${MIN_BET.toLocaleString()} – ${CROSSY_MAX_BET.toLocaleString()})
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2"
              value={bet}
              min={MIN_BET}
              max={CROSSY_MAX_BET}
              onChange={(e) => setBet(Number(e.target.value))}
            />
          </label>
          <button
            type="button"
            onClick={() => void start()}
            className="mt-4 rounded-lg bg-flipz-pink px-6 py-2 font-semibold text-black"
          >
            Start run
          </button>
        </>
      )}
      {runId && (
        <button
          type="button"
          onClick={() => void settle(true)}
          className="mt-4 rounded-lg border border-flipz-cyan px-6 py-2 text-flipz-cyan"
        >
          Cash out lane bank
        </button>
      )}
      {msg && <p className="mt-4 text-sm text-amber-200">{msg}</p>}
    </div>
  );
}
