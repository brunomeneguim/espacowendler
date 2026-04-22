import { redirect } from "next/navigation";

// Esta página foi substituída pela visualização "Lista" no calendário do dashboard.
export default function AgendaPage() {
  redirect("/dashboard");
}
