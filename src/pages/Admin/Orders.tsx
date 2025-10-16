import React, { useEffect, useState } from "react";
import { getItemTransactions, getGameTransactions, ItemTransaction, GameTransaction } from '../../services/transactionService';
import { getStatusName, STATUS_PROCESSED_PAID } from '../../services/statuses';
import Loader from '../../components/ui/Loader';

const Orders: React.FC = () => {
    const [itemOrders, setItemOrders] = useState<ItemTransaction[]>([]);
    const [gameOrders, setGameOrders] = useState<GameTransaction[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [loadingGames, setLoadingGames] = useState(false);
    const [itemPage, setItemPage] = useState(1);
    const [gamePage, setGamePage] = useState(1);
    const [pageSize] = useState(10);
    const [itemTotal, setItemTotal] = useState(0);
    const [gameTotal, setGameTotal] = useState(0);

    // Load item transactions
    useEffect(() => {
        let mounted = true;
        setLoadingItems(true);
        getItemTransactions({ Page: itemPage, PageSize: pageSize })
            .then((res) => {
                if (!mounted) return;
                setItemOrders(res.data || []);
                setItemTotal(res.totalCount);
            })
            .catch(() => { /* ignore */ })
            .finally(() => { if (mounted) setLoadingItems(false); });
        return () => { mounted = false; };
    }, [itemPage, pageSize]);

    // Load game transactions
    useEffect(() => {
        let mounted = true;
        setLoadingGames(true);
        getGameTransactions({ Page: gamePage, PageSize: pageSize })
            .then((res) => {
                if (!mounted) return;
                setGameOrders(res.data || []);
                setGameTotal(res.totalCount);
            })
            .catch(() => { /* ignore */ })
            .finally(() => { if (mounted) setLoadingGames(false); });
        return () => { mounted = false; };
    }, [gamePage, pageSize]);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold mb-6">Orders Management</h1>

            {/* Item Transactions Section */}
            <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Coffee Shop Orders</h2>
                    <span className="text-sm text-gray-600">Total: {itemTotal}</span>
                </div>

                {loadingItems && (
                    <div className="flex justify-center py-10">
                        <Loader />
                    </div>
                )}

                {!loadingItems && itemOrders.length === 0 && (
                    <div className="text-sm text-gray-500 text-center py-10">No coffee shop orders found.</div>
                )}

                {!loadingItems && itemOrders.length > 0 && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-12 gap-2 font-medium text-sm border-b pb-2">
                            <div className="col-span-2">Date/Time</div>
                            <div className="col-span-2">Cashier</div>
                            <div className="col-span-4">Items</div>
                            <div className="col-span-2">Total</div>
                            <div className="col-span-2">Status</div>
                        </div>
                        {itemOrders.map((o, idx) => (
                            <div key={`${o.transactionId}-${idx}`} className="grid grid-cols-12 gap-2 items-center p-3 bg-white border rounded hover:shadow-md transition">
                                <div className="col-span-2">
                                    <div className="font-medium text-sm">
                                        {new Date(o.createdOn).toLocaleDateString()}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {new Date(o.createdOn).toLocaleTimeString()}
                                    </div>
                                </div>
                                <div className="col-span-2 text-sm">
                                    <div className="font-medium">{o.createdBy}</div>
                                    {o.roomName && <div className="text-xs text-gray-500">{o.roomName}</div>}
                                </div>
                                <div className="col-span-4 text-sm">
                                    {o.items && o.items.length > 0 ? (
                                        <div className="space-y-1">
                                            {o.items.map((item, itemIdx) => (
                                                <div key={itemIdx} className="flex items-center gap-2">
                                                    <span className="font-medium">{item.itemName}</span>
                                                    <span className="text-xs text-gray-500">x{item.quantity}</span>
                                                    <span className="text-xs text-gray-400">({item.categoryName})</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-gray-400">No items</span>
                                    )}
                                </div>
                                <div className="col-span-2 text-sm font-semibold">${o.totalPrice.toFixed(2)}</div>
                                <div className="col-span-2 text-sm">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${o.statusId === 1 ? 'bg-green-100 text-green-800' :
                                            o.statusId === STATUS_PROCESSED_PAID ? 'bg-green-100 text-green-800' :
                                                'bg-gray-100 text-gray-800'
                                        }`}>
                                        {getStatusName(o.statusId) ?? o.statusId}
                                    </span>
                                </div>
                            </div>
                        ))}

                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600">Page {itemPage} — {itemTotal} orders</div>
                            <div className="space-x-2">
                                <button className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50" disabled={itemPage <= 1} onClick={() => setItemPage(p => Math.max(1, p - 1))}>Prev</button>
                                <button className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50" disabled={itemPage >= Math.max(1, Math.ceil(itemTotal / pageSize))} onClick={() => setItemPage(p => p + 1)}>Next</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Game Transactions Section */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Game Session Orders</h2>
                    <span className="text-sm text-gray-600">Total: {gameTotal}</span>
                </div>

                {loadingGames && (
                    <div className="flex justify-center py-10">
                        <Loader />
                    </div>
                )}

                {!loadingGames && gameOrders.length === 0 && (
                    <div className="text-sm text-gray-500 text-center py-10">No game session orders found.</div>
                )}

                {!loadingGames && gameOrders.length > 0 && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-12 gap-2 font-medium text-sm border-b pb-2">
                            <div className="col-span-2">Date/Time</div>
                            <div className="col-span-2">Cashier</div>
                            <div className="col-span-2">Room/Game</div>
                            <div className="col-span-2">Setting</div>
                            <div className="col-span-1">Hours</div>
                            <div className="col-span-1">Total</div>
                            <div className="col-span-2">Status</div>
                        </div>
                        {gameOrders.map((o, idx) => (
                            <div key={`${o.transactionId}-${idx}`} className="grid grid-cols-12 gap-2 items-center p-3 bg-white border rounded hover:shadow-md transition">
                                <div className="col-span-2">
                                    <div className="font-medium text-sm">
                                        {new Date(o.createdOn).toLocaleDateString()}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {new Date(o.createdOn).toLocaleTimeString()}
                                    </div>
                                </div>
                                <div className="col-span-2 text-sm">
                                    <div className="font-medium">{o.createdBy}</div>
                                    {o.setName && <div className="text-xs text-gray-500">Set: {o.setName}</div>}
                                </div>
                                <div className="col-span-2 text-sm">
                                    <div className="font-medium">{o.roomName || '-'}</div>
                                    <div className="text-xs text-gray-500">{o.gameName || '-'}</div>
                                </div>
                                <div className="col-span-2 text-sm">
                                    <div>{o.gameSettingName || '-'}</div>
                                    {o.gameCategoryName && <div className="text-xs text-gray-500">{o.gameCategoryName}</div>}
                                </div>
                                <div className="col-span-1 text-sm">
                                    {o.hours === 0 ? <span className="text-xs">Open</span> : `${o.hours}h`}
                                </div>
                                <div className="col-span-1 text-sm font-semibold">${o.totalPrice.toFixed(2)}</div>
                                <div className="col-span-2 text-sm">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${o.statusId === 1 ? 'bg-green-100 text-green-800' :
                                            o.statusId === STATUS_PROCESSED_PAID ? 'bg-green-100 text-green-800' :
                                                'bg-gray-100 text-gray-800'
                                        }`}>
                                        {getStatusName(o.statusId) ?? o.statusId}
                                    </span>
                                </div>
                            </div>
                        ))}

                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600">Page {gamePage} — {gameTotal} orders</div>
                            <div className="space-x-2">
                                <button className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50" disabled={gamePage <= 1} onClick={() => setGamePage(p => Math.max(1, p - 1))}>Prev</button>
                                <button className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50" disabled={gamePage >= Math.max(1, Math.ceil(gameTotal / pageSize))} onClick={() => setGamePage(p => p + 1)}>Next</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Orders;
