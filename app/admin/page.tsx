import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AdminAccessSection } from "@/components/AdminAccessSection";

export default function AdminLoginPage() {
  return (
    <AppShell
      centered
      className="flex min-h-[calc(100vh-2rem)] flex-col items-center justify-center"
    >
      <AdminAccessSection showBackToArcade className="neon-border p-8" />
      <Link href="/lobby" className="flipz-link mt-6 text-sm">
        Player lobby
      </Link>
    </AppShell>
  );
}
