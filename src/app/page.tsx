import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { WorkspaceTabs } from "@/components/WorkspaceTabs";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header userName={session.user.name ?? "Usuário"} />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <WorkspaceTabs />
      </main>
    </div>
  );
}
