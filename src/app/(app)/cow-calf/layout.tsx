import { requireCowCalfEnterprise } from "@/lib/cow-calf/enterprise-guard";
import { CowCalfEnterpriseNav } from "@/components/cow-calf/cow-calf-enterprise-nav";

export default async function CowCalfLayout({ children }: { children: React.ReactNode }) {
  await requireCowCalfEnterprise();

  return (
    <div className="space-y-5 pb-4">
      <CowCalfEnterpriseNav />
      {children}
    </div>
  );
}
