import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getTransactions, TransactionItem } from '../../services/transactionService';
import { getStatusName } from '../../services/statuses';
import Loader from '../../components/ui/Loader';

const CashierOrders: React.FC = () => {
    const auth = useAuth();
    const [orders, setOrders] = useState<TransactionItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        let mounted = true;
        const name = auth?.claims?.name ?? null;
        if (!name) return;
        setLoading(true);
        getTransactions({ page, pageSize, createdBy: name })
            .then((res) => {
                if (!mounted) return;
                setOrders(res.items || []);
                setTotal(res.totalCount || 0);
            })
            .catch(() => {
                /* ignore */
            })
            .finally(() => { if (mounted) setLoading(false); });

        return () => { mounted = false; };
    }, [auth?.claims?.name, page, pageSize]);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">Orders (Cashier)</h1>

            {loading && <div className="text-gray-600"><Loader /></div>}

            {!loading && orders.length === 0 && (
                <div className="text-sm text-gray-500">No orders found.</div>
            )}

            {!loading && orders.length > 0 && (
                <div className="space-y-4">
                    <div className="grid grid-cols-12 gap-2 font-medium text-sm border-b pb-2">
                        <div className="col-span-3">Room / Game</div>
                        <div className="col-span-3">Setting</div>
                        <div className="col-span-2">Hours</div>
                        <div className="col-span-2">Total</div>
                        <div className="col-span-2">Status</div>
                    </div>
                    {orders.map((o) => (
                        <div key={o.id} className="grid grid-cols-12 gap-2 items-center p-2 bg-white border rounded">
                            <div className="col-span-3">
                                <div className="font-medium">{o.room ?? o.game}</div>
                                <div className="text-xs text-gray-500">{new Date(o.createdOn).toLocaleString()}</div>
                            </div>
                            <div className="col-span-3 text-sm">{o.gameSetting ?? '-'}</div>
                            <div className="col-span-2 text-sm">{o.hours}</div>
                            <div className="col-span-2 text-sm">${o.totalPrice.toFixed(2)}</div>
                            <div className="col-span-2 text-sm">{getStatusName(o.statusId) ?? o.statusId}</div>
                        </div>
                    ))}

                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">Page {page} — {total} orders</div>
                        <div className="space-x-2">
                            <button className="px-2 py-1 bg-gray-200 rounded" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
                            <button className="px-2 py-1 bg-gray-200 rounded" disabled={page >= Math.max(1, Math.ceil(total / pageSize))} onClick={() => setPage(p => p + 1)}>Next</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CashierOrders;
