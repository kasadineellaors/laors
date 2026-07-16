import type { DbSetupIssue } from "@/lib/system/db-status";
import { AlertBanner } from "@/components/dashboard/alert-banner";

interface DbSetupBannerProps {
  issues: DbSetupIssue[];
}

export function DbSetupBanner({ issues }: DbSetupBannerProps) {
  if (issues.length === 0) return null;

  return (
    <AlertBanner variant="info">
      <p className="font-semibold text-navy">Database setup incomplete</p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-text-primary">
        {issues.map((issue) => (
          <li key={issue.id}>
            {issue.message}. <span className="font-medium">{issue.fix}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-text-secondary">
        Recommended: run{" "}
        <code className="rounded bg-surface-muted px-1">npx supabase db push</code> or paste{" "}
        <code className="rounded bg-surface-muted px-1">supabase/RUN_ALL_PHASES.sql</code> in the
        SQL Editor.
      </p>
    </AlertBanner>
  );
}
