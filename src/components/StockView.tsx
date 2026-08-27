"use client";

import { useEffect, useMemo, useState } from "react";

interface Product {
  id: string;
  brand: string;
  amperage: number;
  quantity: number;
  minQuantity: number | null;
}

// Modal de movimentação (entrada/saída) em lote, com quantidade e nota
// opcionais — usado tanto pelo botão "+" quanto pelo "-" grandes.
function MovementModal({
  product,
  type,
  onClose,
  onDone,
}: {
  product: Product;
  type: "ENTRADA" | "SAIDA";
  onClose: () => void;
  onDone: (updated: Product) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${product.id}/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, quantity, note: note.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Não deu para registrar");
        setSaving(false);
        return;
      }
      onDone(json.product);
    } catch {
      setError("Não deu para registrar. Confere sua conexão.");
      setSaving(false);
    }
  }

  const isEntrada = type === "ENTRADA";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-5 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-brand-900">
            {isEntrada ? "➕ Entrada" : "➖ Saída"} de estoque
          </h2>
          <p className="text-sm text-slate-500">
            {product.brand} {product.amperage}Ah · saldo atual: {product.quantity}
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Quantidade</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-11 h-11 rounded-lg bg-slate-100 text-slate-600 text-xl font-bold shrink-0"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full text-center text-lg font-semibold border border-slate-300 rounded-lg py-2"
            />
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-11 h-11 rounded-lg bg-slate-100 text-slate-600 text-xl font-bold shrink-0"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Nota (opcional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={isEntrada ? "Ex: compra fornecedor X" : "Ex: venda balcão, troca por garantia"}
            maxLength={200}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-medium text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className={`flex-1 py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-60 ${
              isEntrada ? "bg-emerald-600" : "bg-red-600"
            }`}
          >
            {saving ? "Salvando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewProductForm({ onClose, onCreated }: { onClose: () => void; onCreated: (p: Product) => void }) {
  const [brand, setBrand] = useState("");
  const [amperage, setAmperage] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [minQuantity, setMinQuantity] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!brand.trim() || !amperage.trim()) {
      setError("Preenche marca e amperagem");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: brand.trim(),
          amperage: parseInt(amperage),
          quantity: quantity.trim() ? parseInt(quantity) : 0,
          minQuantity: minQuantity.trim() ? parseInt(minQuantity) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Não deu para cadastrar");
        setSaving(false);
        return;
      }
      onCreated(json.product);
    } catch {
      setError("Não deu para cadastrar. Confere sua conexão.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-5 space-y-3">
        <h2 className="text-lg font-bold text-brand-900">📦 Novo produto</h2>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Marca</label>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Ex: Moura"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Amperagem (Ah)</label>
          <input
            type="number"
            min={1}
            value={amperage}
            onChange={(e) => setAmperage(e.target.value)}
            placeholder="Ex: 60"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Quantidade inicial
          </label>
          <input
            type="number"
            min={0}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Alertar quando estoque ficar abaixo de (opcional)
          </label>
          <input
            type="number"
            min={0}
            value={minQuantity}
            onChange={(e) => setMinQuantity(e.target.value)}
            placeholder="Ex: 3"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-medium text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg bg-brand-700 text-white font-medium text-sm disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Cadastrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductRow({
  product,
  onMove,
}: {
  product: Product;
  onMove: (product: Product, type: "ENTRADA" | "SAIDA") => void;
}) {
  const isLow = product.minQuantity !== null && product.quantity <= product.minQuantity;

  return (
    <div className="flex items-center justify-between gap-3 py-3 border-t border-slate-100 first:border-t-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800">{product.amperage}Ah</p>
        {isLow && (
          <span className="inline-block mt-0.5 text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
            ⚠️ Estoque baixo
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={() => onMove(product, "SAIDA")}
          className="w-9 h-9 rounded-lg bg-red-50 text-red-600 text-lg font-bold border border-red-200"
          aria-label="Registrar saída"
        >
          −
        </button>
        <span className="text-base font-semibold text-brand-900 w-8 text-center">
          {product.quantity}
        </span>
        <button
          type="button"
          onClick={() => onMove(product, "ENTRADA")}
          className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 text-lg font-bold border border-emerald-200"
          aria-label="Registrar entrada"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function StockView() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState(false);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [movementTarget, setMovementTarget] = useState<{ product: Product; type: "ENTRADA" | "SAIDA" } | null>(
    null
  );

  function load() {
    fetch("/api/products")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => setProducts(json.products))
      .catch(() => setError(true));
  }

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    if (!products) return [];
    const byBrand = new Map<string, Product[]>();
    for (const p of products) {
      if (!byBrand.has(p.brand)) byBrand.set(p.brand, []);
      byBrand.get(p.brand)!.push(p);
    }
    return Array.from(byBrand.entries()).sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [products]);

  const totalUnits = products?.reduce((sum, p) => sum + p.quantity, 0) ?? 0;
  const lowStockCount =
    products?.filter((p) => p.minQuantity !== null && p.quantity <= p.minQuantity).length ?? 0;

  function updateProduct(updated: Product) {
    setProducts((prev) => (prev ? prev.map((p) => (p.id === updated.id ? updated : p)) : prev));
    setMovementTarget(null);
  }

  if (error) {
    return <p className="text-sm text-red-600">Não deu para carregar o estoque. Tenta recarregar a página.</p>;
  }

  if (!products) {
    return <p className="text-sm text-slate-400">Carregando estoque...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-brand-900">📦 Estoque</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {products.length} produto(s) cadastrado(s) · {totalUnits} unidade(s) no total
            {lowStockCount > 0 && ` · ${lowStockCount} com estoque baixo`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewProduct(true)}
          className="bg-brand-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 shrink-0"
        >
          + Novo produto
        </button>
      </div>

      {grouped.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum produto cadastrado ainda.</p>
      ) : (
        <div className="space-y-4">
          {grouped.map(([brand, items]) => (
            <div key={brand} className="bg-white rounded-xl border border-slate-200 px-4 py-2">
              <h2 className="text-sm font-semibold text-slate-700 pt-2">{brand}</h2>
              <div>
                {items
                  .sort((a, b) => a.amperage - b.amperage)
                  .map((p) => (
                    <ProductRow
                      key={p.id}
                      product={p}
                      onMove={(product, type) => setMovementTarget({ product, type })}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showNewProduct && (
        <NewProductForm
          onClose={() => setShowNewProduct(false)}
          onCreated={(p) => {
            setProducts((prev) => (prev ? [...prev, p] : [p]));
            setShowNewProduct(false);
          }}
        />
      )}

      {movementTarget && (
        <MovementModal
          product={movementTarget.product}
          type={movementTarget.type}
          onClose={() => setMovementTarget(null)}
          onDone={updateProduct}
        />
      )}
    </div>
  );
}
