import Link from "next/link";

interface LaorsLogoProps {
  subtitle?: string;
}

export function LaorsLogo({ subtitle }: LaorsLogoProps) {
  return (
    <Link href="/dashboard" className="inline-flex flex-col">
      <span className="text-xl font-bold tracking-tight text-olive">
        LAORS
      </span>
      {subtitle ? (
        <span className="text-xs font-medium text-charcoal/60">{subtitle}</span>
      ) : (
        <span className="text-xs font-medium text-charcoal/60">The Foreman</span>
      )}
    </Link>
  );
}
