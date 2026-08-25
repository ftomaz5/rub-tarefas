"use client";

import { useState } from "react";
import { Workspace } from "@/lib/types";
import { KanbanBoard } from "./KanbanBoard";

export function WorkspaceTabs() {
  const [workspace, setWorkspace] = useState<Workspace>("LOJA");

  return (
    <div>
      <div className="flex gap-1 mb-5 bg-slate-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setWorkspace("LOJA")}
          className={`text-sm font-medium px-4 py-1.5 rounded-md transition-colors ${
            workspace === "LOJA"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Loja
        </button>
        <button
          onClick={() => setWorkspace("PESSOAL")}
          className={`text-sm font-medium px-4 py-1.5 rounded-md transition-colors ${
            workspace === "PESSOAL"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Pessoal
        </button>
      </div>

      <KanbanBoard key={workspace} workspace={workspace} />
    </div>
  );
}
