import { cn } from "@/lib/cn";

type AppShellProps = {
  children: React.ReactNode;
  className?: string;
  centered?: boolean;
};

export function AppShell({ children, className, centered }: AppShellProps) {
  return (
    <div className="flipz-page-bg">
      <div className="flipz-page-glow" aria-hidden />
      <div
        className={cn(
          "flipz-shell",
          centered && "flex min-h-[calc(100vh-2rem)] flex-col items-center justify-center",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
