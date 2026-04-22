import { getCurrentProfile } from "@/lib/auth";
import { GerenciarContaClient } from "./GerenciarContaClient";

export default async function GerenciarContaPage() {
  const profile = await getCurrentProfile();
  return <GerenciarContaClient email={profile.email} />;
}
