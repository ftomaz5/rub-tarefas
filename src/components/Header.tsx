"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { PushNotifications } from "./PushNotifications";

interface Props {
  userName: string;
}

const NAV_LINKS = [
  { href: "/", label: "📋 Tarefas" },
  { href: "/dashboard", label: "📊 Painel" },
  { href: "/estoque", label: "📦 Estoque" },
];

export function Header({ userName }: Props) {
  const pathname = usePathname();

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200/80 shadow-[0_1px_0_rgba(5,13,51,0.04)] sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="rounded-xl shrink-0 p-[1.5px] bg-gradient-to-br from-gold-400 to-gold-500">
            <Image
              src="/logo.png"
              alt="Rede Única de Baterias"
              width={34}
              height={34}
              className="rounded-[10px] block"
              priority
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-brand-900 leading-tight tracking-tight">
              RUB Tarefas
            </h1>
            <p className="text-[11px] text-slate-400 leading-tight truncate">
              Rede Única de Baterias Bandeirantes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 sm:gap-5">
          <nav className="hidden sm:flex items-center gap-5">
            {NAV_LINKS.map((link) => {
              const active = link.href === pathname;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium whitespace-nowrap pb-0.5 transition-colors ${
                    active
                      ? "text-brand-900 gold-underline"
                      : "text-slate-500 hover:text-brand-800"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <nav className="flex sm:hidden items-center gap-3.5">
            {NAV_LINKS.map((link) => {
              const active = link.href === pathname;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-lg leading-none pb-1.5 transition-opacity ${
                    active ? "gold-underline opacity-100" : "opacity-50"
                  }`}
                  aria-label={link.label}
                  title={link.label}
                >
                  {link.label.split(" ")[0]}
                </Link>
              );
            })}
          </nav>
          <div className="hidden sm:block w-px h-5 bg-slate-200" />
          <PushNotifications />
          <span className="text-sm text-slate-600 hidden md:inline">
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
