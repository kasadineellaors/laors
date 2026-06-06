import { createClient } from "@/lib/supabase/server";

export type DbSetupIssue = {
  id: string;
  message: string;
  fix: string;
};

/** Lightweight checks for tables/RPCs the app expects after full migration. */
export async function getDbSetupIssues(): Promise<DbSetupIssue[]> {
  const supabase = await createClient();
  const issues: DbSetupIssue[] = [];

  const checks: Array<{
    id: string;
    probe: () => Promise<boolean>;
    message: string;
    fix: string;
  }> = [
    {
      id: "phase2-moves",
      probe: async () => {
        const { error } = await supabase.from("cattle_movements").select("id").limit(1);
        return !error;
      },
      message: "Cattle moves are not set up",
      fix: "Run supabase/RUN_PHASE2.sql or supabase/RUN_ALL_PHASES.sql",
    },
    {
      id: "phase3-tasks",
      probe: async () => {
        const { error } = await supabase.from("tasks").select("id").limit(1);
        return !error;
      },
      message: "Jobs / tasks are not set up",
      fix: "Run supabase/RUN_PHASE3_ALL.sql or RUN_ALL_PHASES.sql",
    },
    {
      id: "phase4-sales",
      probe: async () => {
        const { error } = await supabase.from("sales_records").select("id").limit(1);
        return !error;
      },
      message: "Sales records are not set up",
      fix: "Run supabase/RUN_PHASE4.sql or RUN_ALL_PHASES.sql",
    },
    {
      id: "phase5-invoices",
      probe: async () => {
        const { error } = await supabase.from("invoices").select("id").limit(1);
        return !error;
      },
      message: "Invoices are not set up",
      fix: "Run supabase/RUN_PHASE5.sql or RUN_ALL_PHASES.sql",
    },
    {
      id: "phase6-customers",
      probe: async () => {
        const { error } = await supabase.from("customers").select("id").limit(1);
        return !error;
      },
      message: "Customers / billing catalog are not set up",
      fix: "Run supabase/RUN_PHASE6.sql or RUN_ALL_PHASES.sql",
    },
  ];

  for (const check of checks) {
    try {
      const ok = await check.probe();
      if (!ok) {
        issues.push({ id: check.id, message: check.message, fix: check.fix });
      }
    } catch {
      issues.push({ id: check.id, message: check.message, fix: check.fix });
    }
  }

  const { error: rpcError } = await supabase.rpc("execute_cattle_move", {
    p_payload: {},
  });
  if (
    rpcError &&
    (rpcError.message.includes("execute_cattle_move") ||
      rpcError.message.includes("schema cache"))
  ) {
    issues.push({
      id: "phase2-rpc",
      message: "Cattle move RPC is missing",
      fix: "Run supabase/RUN_PHASE2.sql or RUN_ALL_PHASES.sql",
    });
  }

  return issues;
}
