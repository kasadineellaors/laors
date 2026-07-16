import Link from "next/link";

interface LaorsLogoProps {
  subtitle?: string;
}

export function LaorsLogo({ subtitle = "The Foreman" }: LaorsLogoProps) {
  return (
    <Link href="/dashboard" className="inline-flex flex-col leading-tight">
      <span className="text-xl font-bold tracking-tight text-navy">LAORS</span>
      <span className="text-xs font-medium text-text-secondary">{subtitle}</span>
    </Link>
  );
}
