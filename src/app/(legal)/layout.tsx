import Link from "next/link";
import { LaorsLogo } from "@/components/brand/laors-logo";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-cream">
      <header className="border-b border-border-neutral bg-surface-white px-6 py-5">
        <LaorsLogo subtitle="The Foreman" />
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <article className="prose-legal space-y-4 text-text-primary">{children}</article>
      </main>
      <footer className="border-t border-border-neutral px-6 py-6 text-center text-sm text-text-secondary">
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2">
          <Link href="/privacy" className="hover:text-brown hover:underline">Privacy</Link>
          <Link href="/terms" className="hover:text-brown hover:underline">Terms</Link>
          <Link href="/support" className="hover:text-brown hover:underline">Support</Link>
          <Link href="/login" className="hover:text-brown hover:underline">Sign in</Link>
        </nav>
        <p className="mt-3 text-xs">© {new Date().getFullYear()} LAORS</p>
      </footer>
    </div>
  );
}
