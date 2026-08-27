import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { DashboardView } from "@/components/DashboardView";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="brand-watermark" />
      <div className="relative z-10">
        <Header userName={session.user.name ?? "Usuário"} />
        <main className="max-w-6xl mx-auto px-4 py-6">
          <DashboardView />
        </main>
      </div>
    </div>
  );
}
