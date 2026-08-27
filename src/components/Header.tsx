"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { PushNotifications } from "./PushNotifications";

interface Props {
  userName: string;
}

export function Header({ userName }: Props) {
  const pathname = usePathname();
  const onDashboard = pathname === "/dashboard";

  return (
    <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="Rede Única de Baterias"
            width={36}
            height={36}
            className="rounded-lg shrink-0"
            priority
          />
          <div>
            <h1 className="text-base font-bold text-brand-900 leading-tight tracking-tight">
              RUB Tarefas
            </h1>
            <p className="text-[11px] text-slate-400 leading-tight">
              Rede Única de Baterias Bandeirantes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={onDashboard ? "/" : "/dashboard"}
            className="text-sm font-medium text-brand-700 hover:text-brand-900 transition-colors whitespace-nowrap"
          >
            {onDashboard ? "📋 Tarefas" : "📊 Painel"}
          </Link>
          <PushNotifications />
          <span className="text-sm text-slate-600 hidden sm:inline">
            Olá, {userName.split(" ")[0]}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-slate-500 hover:text-brand-700 font-medium transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
