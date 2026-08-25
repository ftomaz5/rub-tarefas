"use client";

import { signOut } from "next-auth/react";

interface Props {
  userName: string;
}

export function Header({ userName }: Props) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900 leading-tight">
            RUB Tarefas
          </h1>
          <p className="text-xs text-slate-400 leading-tight">
            Rede Única de Baterias Bandeirantes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600 hidden sm:inline">
            Olá, {userName.split(" ")[0]}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-slate-500 hover:text-slate-700 font-medium"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
