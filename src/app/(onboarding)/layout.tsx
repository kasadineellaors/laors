import { LaorsLogo } from "@/components/brand/laors-logo";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col bg-cream">
      <header className="border-b border-border-neutral bg-surface-white px-6 py-5">
        <LaorsLogo subtitle="Ranch setup" />
      </header>
      <main className="flex flex-1 flex-col px-6 py-10">{children}</main>
    </div>
  );
}
