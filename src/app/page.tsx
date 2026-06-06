import { getUserSession } from "@/lib/auth/session";
import { getAuthRedirectPath } from "@/lib/auth/redirects";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getUserSession();
  if (!session) redirect("/login");
  redirect(getAuthRedirectPath(session));
}
