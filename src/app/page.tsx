import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { WorkspaceTabs } from "@/components/WorkspaceTabs";
import { WeeklyReportBanner } from "@/components/WeeklyReportBanner";

export default async function Home() {
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
          <WeeklyReportBanner />
          <WorkspaceTabs />
        </main>
      </div>
    </div>
  );
}
