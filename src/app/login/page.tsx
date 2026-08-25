"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("E-mail ou senha incorretos.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-brand-gradient relative overflow-hidden">
      {/* Marca d'água decorativa, não interfere no formulário */}
      <div
        className="absolute -right-24 -top-24 w-[420px] h-[420px] opacity-10 pointer-events-none"
        style={{
          backgroundImage: "url('/logo.png')",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div
        className="absolute -left-32 bottom-[-140px] w-[360px] h-[360px] opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage: "url('/logo.png')",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <Image
            src="/logo.png"
            alt="Rede Única de Baterias"
            width={72}
            height={72}
            className="mx-auto rounded-2xl shadow-lg shadow-black/20 mb-4"
            priority
          />
          <h1 className="text-2xl font-bold text-white tracking-tight">
            RUB Tarefas
          </h1>
          <p className="text-brand-200/80 text-sm mt-1">
            Rede Única de Baterias Bandeirantes
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-xl shadow-black/20 p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
              placeholder="voce@exemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors shadow-sm"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm text-brand-200/80 mt-4">
          Não tem conta?{" "}
          <Link href="/cadastro" className="text-gold-400 font-semibold hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
