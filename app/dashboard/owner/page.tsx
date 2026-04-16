import { redirect } from "next/navigation";

export default function OwnerIndex() {
  redirect("/dashboard/owner/dashboard");
}
