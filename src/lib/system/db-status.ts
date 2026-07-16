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
    {
      id: "phase8-cow-calf",
      probe: async () => {
        const { error } = await supabase.from("calving_records").select("id").limit(1);
        return !error;
      },
      message: "Cow-calf / calving is not set up",
      fix: "Run supabase/RUN_PHASE8.sql or supabase db push",
    },
    {
      id: "phase9-breeding",
      probe: async () => {
        const { error } = await supabase.from("breeding_records").select("id").limit(1);
        return !error;
      },
      message: "Breeding records are not set up",
      fix: "Run supabase/RUN_PHASE9.sql or supabase db push",
    },
    {
      id: "phase10-feed",
      probe: async () => {
        const { error } = await supabase.from("feed_rations").select("id").limit(1);
        return !error;
      },
      message: "Feed rations / feeding log are not set up",
      fix: "Run supabase/RUN_PHASE10.sql or supabase db push",
    },
    {
      id: "phase17-feed-inventory",
      probe: async () => {
        const { error } = await supabase.from("feed_items").select("id").limit(1);
        return !error;
      },
      message: "Feedstuff inventory is not set up",
      fix: "Run supabase/RUN_PHASE17.sql or supabase db push",
    },
    {
      id: "phase18-lots",
      probe: async () => {
        const { error } = await supabase.from("processing_events").select("id").limit(1);
        return !error;
      },
      message: "Lot processing / mortality tables are not set up",
      fix: "Run supabase/RUN_PHASE18.sql or supabase db push",
    },
    {
      id: "phase19-feed-purchases",
      probe: async () => {
        const { error } = await supabase.from("feed_purchases").select("id").limit(1);
        return !error;
      },
      message: "Feed purchases / % ration inclusion are not set up",
      fix: "Run supabase/RUN_PHASE19.sql or supabase/RUN_ALL_UPDATES.sql",
    },
    {
      id: "phase20-lot-expenses",
      probe: async () => {
        const { error } = await supabase.from("lot_expenses").select("id").limit(1);
        return !error;
      },
      message: "Lot expense ledger is not set up",
      fix: "Run supabase/RUN_PHASE20.sql or supabase/RUN_THIS_IN_SUPABASE.sql",
    },
    {
      id: "phase21-feed-snapshots",
      probe: async () => {
        const { error } = await supabase
          .from("feeding_records")
          .select("unit_cost_snapshot")
          .limit(1);
        return !error;
      },
      message: "Feed cost snapshots / reports columns are not set up",
      fix: "Run supabase/RUN_PHASE21.sql or supabase/RUN_THIS_IN_SUPABASE.sql",
    },
    {
      id: "phase22-ration-price-history",
      probe: async () => {
        const { error } = await supabase
          .from("feed_ration_price_history")
          .select("id")
          .limit(1);
        return !error;
      },
      message: "Ration price history is not set up",
      fix: "Run supabase/RUN_PHASE22.sql or supabase/RUN_THIS_IN_SUPABASE.sql",
    },
    {
      id: "phase13-calendar",
      probe: async () => {
        const { error } = await supabase.from("calendar_events").select("id").limit(1);
        return !error;
      },
      message: "Ranch calendar is not set up",
      fix: "Run supabase/RUN_PHASE13.sql or supabase db push",
    },
    {
      id: "phase14-seedstock",
      probe: async () => {
        const { error } = await supabase
          .from("individual_animals")
          .select("registry_context")
          .limit(1);
        return !error;
      },
      message: "Seedstock registry fields are not set up",
      fix: "Run supabase/RUN_PHASE14.sql or supabase db push",
    },
    {
      id: "phase15-seedstock-breeding-sales",
      probe: async () => {
        const { error } = await supabase
          .from("breeding_records")
          .select("breeding_context, dam_id")
          .limit(1);
        return !error;
      },
      message: "Seedstock breeding and sales links are not set up",
      fix: "Run supabase/RUN_PHASE15.sql or supabase db push",
    },
    {
      id: "phase16-maternal-intelligence",
      probe: async () => {
        const { error } = await supabase
          .from("exposure_records")
          .select("id")
          .limit(1);
        return !error;
      },
      message: "Maternal intelligence tables are not set up",
      fix: "Run supabase/RUN_PHASE16.sql or supabase db push",
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
