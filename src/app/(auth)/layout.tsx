import { LaorsLogo } from "@/components/brand/laors-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col bg-cream">
      <header className="border-b border-border bg-surface px-6 py-5">
        <LaorsLogo />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="px-6 py-4 text-center text-xs text-charcoal/50">
        LAORS — Livestock &amp; Agricultural Operations Resource System
      </footer>
    </div>
  );
}
