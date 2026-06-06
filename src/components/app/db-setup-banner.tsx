import type { DbSetupIssue } from "@/lib/system/db-status";

interface DbSetupBannerProps {
  issues: DbSetupIssue[];
}

export function DbSetupBanner({ issues }: DbSetupBannerProps) {
  if (issues.length === 0) return null;

  return (
    <div className="rounded-xl border border-rust/40 bg-rust/10 px-4 py-3 text-sm text-rust">
      <p className="font-semibold">Database setup incomplete</p>
      <ul className="mt-2 list-disc space-y-1 pl-4">
        {issues.map((issue) => (
          <li key={issue.id}>
            {issue.message}. <span className="font-medium">{issue.fix}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-charcoal/70">
        Recommended: run{" "}
        <code className="rounded bg-surface px-1">npx supabase db push</code> or paste{" "}
        <code className="rounded bg-surface px-1">supabase/RUN_ALL_PHASES.sql</code> in the
        SQL Editor (after base schema).
      </p>
    </div>
  );
}
