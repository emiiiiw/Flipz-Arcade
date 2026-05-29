import { getCrashEngine } from "@/lib/crash-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const engine = getCrashEngine();
  let keep: ReturnType<typeof setInterval> | undefined;
  let unsub: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const send = (data: unknown) => {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      send(engine.getPublicState());
      unsub = engine.subscribe((state) => send(state));
      keep = setInterval(() => send(engine.getPublicState()), 2000);
    },
    cancel() {
      if (keep) clearInterval(keep);
      unsub?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
