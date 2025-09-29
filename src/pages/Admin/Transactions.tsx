import React, { useEffect, useState } from 'react';
import { getTransactions, TransactionItem } from '../../services/transactionService';

export default function Transactions() {
    const [items, setItems] = useState<TransactionItem[]>([]);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            try {
                const res = await getTransactions(page, pageSize);
                if (!cancelled) {
                    setItems(res.items || []);
                    setTotal(res.totalCount || 0);
                }
            } catch (err) {
                console.error('Failed to load transactions', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [page, pageSize]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return (
        <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Transactions</h2>

            <div className="bg-white shadow rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">ID</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Room</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Game</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Setting</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Hours</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Total Price</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Status</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Created On</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Created By</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={9} className="px-4 py-6 text-center text-sm text-gray-500">Loading...</td>
                            </tr>
                        ) : items.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-4 py-6 text-center text-sm text-gray-500">No transactions found</td>
                            </tr>
                        ) : (
                            items.map((t) => (
                                <tr key={t.id}>
                                    <td className="px-4 py-3 text-sm text-gray-700 break-all">{t.id}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{t.room}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{t.game}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{t.gameSetting}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{t.hours}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{t.totalPrice}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{t.statusId}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{new Date(t.createdOn).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{t.createdBy}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">Showing page {page} of {totalPages} — {total} items</div>
                <div className="space-x-2">
                    <button
                        className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        Prev
                    </button>
                    <button
                        className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
