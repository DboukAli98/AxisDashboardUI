// ItemAddOnsPanel
// ===============
// Add-ons live ON the item card — a tap on the "Add-ons" strip expands the
// list right there, no modal. Shared by the cashier Items page and the
// Open Invoices "add items" flow so both pick extras the same way.
//
// `picks` is { [addOnId]: qty } for this item; `onChange` gets the next map
// (empty object = nothing picked). Extras are charged as picked, not per
// item quantity — 2 lattes with 1x Oat Milk bills one Oat Milk.

import { useState } from "react";
import type { ItemAddOnDto } from "../../services/itemService";

export type AddOnPicks = Record<number, number>;

type Props = {
    addOns: ItemAddOnDto[];
    picks: AddOnPicks;
    onChange: (next: AddOnPicks) => void;
    /** Called when the first add-on is picked while the item itself isn't in the order yet. */
    onFirstPick?: () => void;
    /** Start expanded (e.g. inside a dense modal). */
    defaultOpen?: boolean;
};

export const addOnsTotal = (addOns: ItemAddOnDto[] | null | undefined, picks: AddOnPicks | undefined) =>
    Object.entries(picks ?? {}).reduce((sum, [id, qty]) => {
        const def = addOns?.find(a => a.id === Number(id));
        return def ? sum + def.price * qty : sum;
    }, 0);

export default function ItemAddOnsPanel({ addOns, picks, onChange, onFirstPick, defaultOpen = false }: Props) {
    const [open, setOpen] = useState(defaultOpen);
    const active = addOns.filter(a => a.isActive !== false);
    if (active.length === 0) return null;

    const pickedCount = Object.values(picks).reduce((a, b) => a + b, 0);
    const extra = addOnsTotal(active, picks);
    const pickedNames = active.filter(a => (picks[a.id] ?? 0) > 0).map(a => `${picks[a.id]}× ${a.name}`);

    const setQty = (id: number, next: number) => {
        const wasEmpty = pickedCount === 0;
        const copy: AddOnPicks = { ...picks };
        if (next <= 0) delete copy[id]; else copy[id] = next;
        onChange(copy);
        if (wasEmpty && next > 0) onFirstPick?.();
    };

    return (
        <div className={`mt-2 rounded-xl border transition ${pickedCount > 0 ? "border-indigo-200 bg-indigo-50/40" : "border-gray-100 bg-gray-50/60"}`}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-left"
            >
                <div className="min-w-0">
                    <div className={`text-[11px] font-semibold ${pickedCount > 0 ? "text-indigo-700" : "text-gray-600"}`}>
                        ✚ Add-ons{pickedCount > 0 ? ` · ${pickedCount} picked` : ` · ${active.length} available`}
                    </div>
                    {pickedCount > 0 && !open && (
                        <div className="text-[10px] text-indigo-600 truncate">{pickedNames.join(", ")}</div>
                    )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    {extra > 0 && <span className="text-[11px] font-bold text-indigo-700">+${extra.toFixed(2)}</span>}
                    <span className="text-gray-400 text-xs">{open ? "▾" : "▸"}</span>
                </div>
            </button>

            {open && (
                <div className="px-2 pb-2 space-y-1">
                    {active.map(a => {
                        const qty = picks[a.id] ?? 0;
                        return (
                            <div
                                key={a.id}
                                className={`flex items-center justify-between rounded-lg px-2 py-1 ${qty > 0 ? "bg-white border border-indigo-200" : "bg-white/70 border border-transparent"}`}
                            >
                                <div className="min-w-0">
                                    <div className={`text-xs font-medium truncate ${qty > 0 ? "text-indigo-800" : "text-gray-800"}`}>{a.name}</div>
                                    <div className="text-[10px] text-gray-500">+${a.price.toFixed(2)}</div>
                                </div>
                                {qty === 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => setQty(a.id, 1)}
                                        className="h-7 px-2.5 rounded-md bg-white border border-indigo-300 text-indigo-700 text-[11px] font-semibold hover:bg-indigo-600 hover:text-white transition"
                                    >
                                        Add
                                    </button>
                                ) : (
                                    <div className="flex items-center rounded-md border border-indigo-200 overflow-hidden">
                                        <button type="button" onClick={() => setQty(a.id, qty - 1)} className="h-7 w-7 bg-gray-50 text-gray-600 hover:bg-gray-100 text-sm">−</button>
                                        <div className="h-7 w-7 flex items-center justify-center text-xs font-bold text-indigo-700 bg-indigo-50">{qty}</div>
                                        <button type="button" onClick={() => setQty(a.id, qty + 1)} className="h-7 w-7 bg-indigo-600 text-white hover:bg-indigo-700 text-sm">+</button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
