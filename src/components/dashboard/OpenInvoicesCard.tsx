// OpenInvoicesCard
// ================
// What is still open on the floor right now: F&B invoices + PS5 / board
// game sessions, their running value and the oldest one. Uses the same
// endpoints the till pages use, so the dashboard can never disagree with
// what the cashier sees.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Loader from "../ui/Loader";
import {
    getOpenFnbInvoices, getOpenPs5Sessions, getOpenBoardGameSessions,
} from "../../services/transactionService";

type Summary = {
    invoices: number; invoicesValue: number;
    ps5: number; board: number; sessionsValue: number;
    oldestMinutes: number;
    failed: boolean;
};

const money = (n: number) => `$${n.toFixed(2)}`;

export default function OpenInvoicesCard() {
    const [data, setData] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const load = async () => {
        try {
            // Each source fails independently — one 500 must not blank the card.
            const [inv, ps5, board] = await Promise.all([
                getOpenFnbInvoices().catch(() => null),
                getOpenPs5Sessions().catch(() => null),
                getOpenBoardGameSessions().catch(() => null),
            ]);
            const invoices = inv?.data ?? [];
            const ps5Rows = ps5?.data ?? [];
            const boardRows = board?.data ?? [];
            const now = Date.now();
            const ages = [...invoices, ...ps5Rows, ...boardRows]
                .map((r) => now - new Date(r.createdOn).getTime())
                .filter((ms) => Number.isFinite(ms) && ms > 0);
            setData({
                invoices: invoices.length,
                invoicesValue: invoices.reduce((s, r) => s + (r.totalPrice || 0), 0),
                ps5: ps5Rows.length,
                board: boardRows.length,
                sessionsValue: [...ps5Rows, ...boardRows].reduce((s, r) => s + (r.totalPrice || 0), 0),
                oldestMinutes: ages.length ? Math.floor(Math.max(...ages) / 60000) : 0,
                failed: !inv && !ps5 && !board,
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        const id = setInterval(load, 30000);
        return () => clearInterval(id);
    }, []);

    const total = (data?.invoices ?? 0) + (data?.ps5 ?? 0) + (data?.board ?? 0);
    const totalValue = (data?.invoicesValue ?? 0) + (data?.sessionsValue ?? 0);
    const urgency = data && data.oldestMinutes > 120 ? "high" : data && data.oldestMinutes > 60 ? "medium" : "low";
    const gradient = total === 0
        ? "from-emerald-500 to-emerald-600"
        : urgency === "high" ? "from-red-500 to-red-600"
        : urgency === "medium" ? "from-orange-500 to-orange-600"
        : "from-blue-500 to-indigo-600";

    return (
        <div
            className={`bg-gradient-to-br ${gradient} rounded-xl shadow-lg p-5 text-white cursor-pointer hover:opacity-95 transition`}
            onClick={() => navigate("/cashier/open-invoices")}
        >
            <div className="flex items-start justify-between mb-3">
                <div>
                    <p className="text-sm font-medium opacity-90">Open Now</p>
                    <p className="text-xs opacity-70 mt-0.5">invoices + game sessions — click to view</p>
                </div>
                <div className="bg-white/20 rounded-full p-2.5">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-2"><Loader size={20} /></div>
            ) : (
                <>
                    <div className="flex items-end gap-4 mb-3">
                        <div>
                            <p className="text-4xl font-bold">{total}</p>
                            <p className="text-xs opacity-75 mt-0.5">open</p>
                        </div>
                        <div className="mb-1">
                            <p className="text-xl font-semibold">{money(totalValue)}</p>
                            <p className="text-xs opacity-75">running value</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 mb-3 text-center">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); navigate("/cashier/open-invoices"); }}
                            className="bg-white/20 rounded-lg px-2 py-1.5 hover:bg-white/30"
                        >
                            <div className="text-lg font-bold leading-tight">{data?.invoices ?? 0}</div>
                            <div className="text-[10px] opacity-80">🧾 F&amp;B invoices</div>
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); navigate("/gamecashier/ps5-sessions"); }}
                            className="bg-white/20 rounded-lg px-2 py-1.5 hover:bg-white/30"
                        >
                            <div className="text-lg font-bold leading-tight">{data?.ps5 ?? 0}</div>
                            <div className="text-[10px] opacity-80">🎮 PS5</div>
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); navigate("/gamecashier/board-sessions"); }}
                            className="bg-white/20 rounded-lg px-2 py-1.5 hover:bg-white/30"
                        >
                            <div className="text-lg font-bold leading-tight">{data?.board ?? 0}</div>
                            <div className="text-[10px] opacity-80">🎲 Board games</div>
                        </button>
                    </div>

                    {data?.failed ? (
                        <div className="bg-white/20 rounded-lg px-3 py-2">
                            <p className="text-xs font-medium">⚠ Could not load open items</p>
                        </div>
                    ) : total > 0 ? (
                        <div className="bg-white/20 rounded-lg px-3 py-2 flex items-center gap-2">
                            <span className="text-lg">{urgency === "high" ? "🔴" : urgency === "medium" ? "🟡" : "🟢"}</span>
                            <p className="text-xs font-medium">
                                Oldest open: {data!.oldestMinutes >= 60
                                    ? `${Math.floor(data!.oldestMinutes / 60)}h ${data!.oldestMinutes % 60}m`
                                    : `${data!.oldestMinutes}m`} ago
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white/20 rounded-lg px-3 py-2">
                            <p className="text-xs font-medium">✅ Nothing open — all invoices and sessions closed</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
