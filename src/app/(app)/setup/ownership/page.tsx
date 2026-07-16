import { redirect } from "next/navigation";

export default function OwnershipRedirectPage() {
  redirect("/setup/owners");
}
