"use client";

import { useState } from "react";
import { Workspace } from "@/lib/types";
import { KanbanBoard } from "./KanbanBoard";

export function WorkspaceTabs() {
  const [workspace, setWorkspace] = useState<Workspace>("LOJA");

  return (
    <div>
      <div className="flex gap-1 mb-5 bg-slate-100/80 border border-slate-200/60 rounded-xl p-1 w-fit">
        <button
          onClick={() => setWorkspace("LOJA")}
          className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition-all ${
            workspace === "LOJA"
              ? "bg-brand-900 text-white shadow-premium"
              : "text-slate-500 hover:text-brand-800"
          }`}
        >
          Loja
        </button>
        <button
          onClick={() => setWorkspace("PESSOAL")}
          className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition-all ${
            workspace === "PESSOAL"
              ? "bg-brand-900 text-white shadow-premium"
              : "text-slate-500 hover:text-brand-800"
          }`}
        >
          Pessoal
        </button>
      </div>

      <KanbanBoard key={workspace} workspace={workspace} />
    </div>
  );
}
