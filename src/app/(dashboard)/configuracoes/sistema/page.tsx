import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { SistemaClient } from "./SistemaClient";

export default async function SistemaPage() {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") redirect("/dashboard");
  return <SistemaClient />;
}
