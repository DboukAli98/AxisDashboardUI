import { useEffect, useState } from "react";
import {
    getItems,
    createItem,
    updateItem,
    deleteItem,
    ItemDto,
    ItemListResponse,
} from "../../services/itemService";
import { createCoffeeShopOrder, OrderItemRequest, getTransactions, TransactionItem } from '../../services/transactionService';
import { useAuth } from '../../context/AuthContext';
import Modal from "../../components/ui/Modal";
import Loader from "../../components/ui/Loader";
import Alert from "../../components/ui/alert/Alert";
import { getCategoriesByType, CategoryDto } from "../../services/categoryService";
import StatusToggle from '../../components/ui/StatusToggle';
import { STATUS_ENABLED } from '../../services/statuses';

export default function CashierItems() {
    const [items, setItems] = useState<ItemDto[]>([]);
    const [categories, setCategories] = useState<CategoryDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [itemsReloadToken, setItemsReloadToken] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState<ItemDto | null>(null);
    const [form, setForm] = useState<Omit<ItemDto, "id">>({
        name: "",
        quantity: 0,
        price: 0,
        type: "",
        categoryId: null,
        gameId: null,
        statusId: STATUS_ENABLED,
    });
    const [submitting, setSubmitting] = useState(false);

    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [orderSubmitting, setOrderSubmitting] = useState(false);
    const [orderTimestamp, setOrderTimestamp] = useState<Date | null>(null);
    // orders (transactions) for the current user
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [ordersPage, setOrdersPage] = useState(1);
    const [ordersPageSize] = useState(5);
    const [ordersTotal, setOrdersTotal] = useState(0);
    const [orders, setOrders] = useState<TransactionItem[]>([]);

    const auth = useAuth();

    const [notification, setNotification] = useState<{
        variant: "success" | "error" | "warning" | "info";
        title: string;
        message: string;
    } | null>(null);

    useEffect(() => {
        if (!notification) return;
        const t = setTimeout(() => setNotification(null), 4000);
        return () => clearTimeout(t);
    }, [notification]);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        getItems(page, pageSize, selectedCategory, debouncedSearch)
            .then((data: ItemListResponse) => {
                if (!mounted) return;
                setItems(data.items || []);
                setTotal(data.totalCount || 0);
            })
            .catch((err) => {
                if (!mounted) return;
                setError(err?.message || "Failed to load items");
            })
            .finally(() => {
                if (!mounted) return;
                setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [page, pageSize, selectedCategory, debouncedSearch, itemsReloadToken]);

    // fetch orders created by current user
    useEffect(() => {
        let mounted = true;
        const name = auth?.claims?.name ?? null;
        if (!name) return;
        setOrdersLoading(true);
        getTransactions({ page: ordersPage, pageSize: ordersPageSize, createdBy: name })
            .then((res) => {
                if (!mounted) return;
                setOrders(res.items || []);
                setOrdersTotal(res.totalCount || 0);
            })
            .catch(() => {
                /* ignore */
            })
            .finally(() => { if (mounted) setOrdersLoading(false); });

        return () => { mounted = false; };
    }, [auth?.claims?.name, ordersPage, ordersPageSize]);

    // Debounce search input (300ms)
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        let mounted = true;
        // load categories only for items (not games)
        getCategoriesByType('item', 1, 100)
            .then((res) => {
                if (!mounted) return;
                setCategories(res.items || []);
            })
            .catch(() => {
                /* ignore */
            });
        return () => { mounted = false; };
    }, []);

    // total selected items count (used to show View Order button)
    const totalSelected = Object.values(selectedItems).reduce((s, v) => s + (v || 0), 0);

    // build order lines from selectedItems and items list (coerce to numbers)
    const orderLines = Object.entries(selectedItems)
        .filter(([, q]) => Number(q) > 0)
        .map(([itemId, q]) => {
            const item = items.find((it) => String(it.id) === String(itemId));
            const qty = Number(q) || 0;
            const unit = item && item.price != null ? Number(item.price) : 0;
            const name = item ? item.name : itemId;
            const lineTotal = unit * qty;
            return { itemId, name, qty, unit, lineTotal };
        });

    const orderTotal = orderLines.reduce((s, l) => s + l.lineTotal, 0);

    // Creation UI is intentionally not exposed to cashiers in the header.

    // Editing is intentionally not exposed in cashier view.

    async function submitForm() {
        setSubmitting(true);
        try {
            if (editing) {
                await updateItem(editing.id, form);
                setItems((s) => s.map((it) => (it.id === editing.id ? { ...it, ...form } : it)));
                setNotification({ variant: "success", title: "Updated", message: "Item updated" });
            } else {
                const created = await createItem(form);
                setItems((s) => [created, ...s]);
                setNotification({ variant: "success", title: "Created", message: `Item '${created.name}' created` });
            }
            setIsFormOpen(false);
            setEditing(null);
        } catch (err: unknown) {
            let message = "Failed to save";
            if (err && typeof err === "object") {
                const maybe = err as { message?: unknown };
                if (typeof maybe.message === "string") message = maybe.message;
            }
            setError(message);
            setNotification({ variant: "error", title: "Save failed", message });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">Items (Cashier)</h1>

            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div>
                        <label className="text-sm text-gray-600 mr-2">Category</label>
                        <select value={selectedCategory ?? ""} onChange={(e) => { setPage(1); setSelectedCategory(e.target.value === '' ? null : Number(e.target.value)); }} className="px-2 py-1 border rounded">
                            <option value="">All</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm text-gray-600 mr-2">Search</label>
                        <input className="px-2 py-1 border rounded" placeholder="Search items..." value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
                    </div>
                </div>

                <div>
                    {totalSelected > 0 && (
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded shadow" onClick={() => { setOrderTimestamp(new Date()); setIsDrawerOpen(true); }}>View Order</button>
                    )}
                </div>
            </div>

            {loading && <div className="text-gray-600">Loading items...</div>}

            {error && <div className="text-red-600 bg-red-50 p-3 rounded">{error}</div>}

            {!loading && !error && (
                <div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {items.map(it => (
                            <div key={it.id} className={`border rounded p-3 bg-white shadow-sm ${(selectedItems[it.id] || 0) > 0 ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-200'}`}>
                                <div className="font-medium text-gray-800 mb-1">{it.name}</div>
                                <div className="text-sm text-gray-500">Category: {categories.find(c => c.id === it.categoryId)?.name ?? '-'}</div>
                                <div className="text-sm text-gray-500">Price: ${it.price}</div>
                                <div className="text-sm text-gray-500">Stock: {it.quantity}</div>
                                <div className="mt-3 flex items-center gap-2">
                                    <button
                                        className="px-2 py-1 bg-gray-200 rounded"
                                        onClick={() => setSelectedItems(s => {
                                            const cur = s[it.id] || 0;
                                            const next = Math.max(0, cur - 1);
                                            const copy = { ...s };
                                            if (next === 0) delete copy[it.id]; else copy[it.id] = next;
                                            return copy;
                                        })}
                                    >-</button>
                                    <div className="px-3 py-1 border rounded">{selectedItems[it.id] || 0}</div>
                                    <button
                                        className="px-2 py-1 bg-gray-200 rounded"
                                        onClick={() => setSelectedItems(s => ({ ...s, [it.id]: (s[it.id] || 0) + 1 }))}
                                    >+</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 flex items-start justify-between">
                        <div>
                            <div className="text-sm text-gray-600">Showing page {page} — {total} items</div>
                            <div className="mt-2 space-x-2">
                                <button className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
                                <button className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50" disabled={page >= Math.max(1, Math.ceil(total / pageSize))} onClick={() => setPage(p => p + 1)}>Next</button>
                            </div>
                        </div>

                        <div>
                            {/* Drawer backdrop (fades) */}
                            <div className={`fixed inset-0 z-30 transition-opacity ${isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} aria-hidden>
                                <div className="absolute inset-0 bg-black/40" onClick={() => setIsDrawerOpen(false)} />
                            </div>

                            {/* Sliding panel: offset from top to avoid overlapping navbar (adjust 64px if your header height differs) */}
                            <div
                                className="fixed right-0 z-40"
                                style={{
                                    top: '64px',
                                    height: 'calc(100% - 64px)',
                                    width: '320px',
                                    transition: 'transform 300ms ease',
                                    transform: isDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
                                }}
                            >
                                <div className="h-full bg-white shadow-xl p-4 overflow-y-auto">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-medium">Order Summary</h3>
                                        <button className="text-gray-500" onClick={() => setIsDrawerOpen(false)}>Close</button>
                                    </div>
                                    <div className="mt-4">
                                        <div className="text-sm text-gray-700">Date: {orderTimestamp ? orderTimestamp.toLocaleDateString() : ''} {orderTimestamp ? orderTimestamp.toLocaleTimeString() : ''}</div>

                                        <div className="mt-3 bg-gray-50 border p-2 rounded">
                                            <div className="text-sm font-medium border-b pb-2 mb-2">Receipt</div>
                                            <div className="space-y-2">
                                                {orderLines.length === 0 && <div className="text-sm text-gray-500">No items</div>}
                                                {orderLines.map((l) => (
                                                    <div key={l.itemId} className="flex items-center justify-between text-sm">
                                                        <div className="flex-1">
                                                            <div className="font-medium">{l.name}</div>
                                                            <div className="text-xs text-gray-500">{l.qty} × ${l.unit.toFixed(2)}</div>
                                                        </div>
                                                        <div className="ml-2 w-24 text-right font-medium">${l.lineTotal.toFixed(2)}</div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="border-t mt-3 pt-3 text-sm">
                                                <div className="flex items-center justify-between"><div>Subtotal</div><div>${orderTotal.toFixed(2)}</div></div>
                                                <div className="flex items-center justify-between mt-1"><div>Tax</div><div>$0.00</div></div>
                                                <div className="flex items-center justify-between mt-2 font-semibold"><div>Total</div><div>${orderTotal.toFixed(2)}</div></div>
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <button
                                                className="px-3 py-2 bg-green-600 text-white rounded w-full flex items-center justify-center disabled:opacity-60"
                                                disabled={orderSubmitting}
                                                onClick={async () => {
                                                    const orderItems = Object.entries(selectedItems).filter(([, q]) => q > 0).map(([itemId, q]) => ({ itemId, quantity: q }));
                                                    if (orderItems.length === 0) return;
                                                    setOrderSubmitting(true);
                                                    try {
                                                        await createCoffeeShopOrder(orderItems as OrderItemRequest[]);
                                                        setSelectedItems({});
                                                        setIsDrawerOpen(false);
                                                        // refresh items list to reflect updated stock
                                                        setItemsReloadToken(t => t + 1);
                                                        setNotification({ variant: 'success', title: 'Order Created', message: 'Order submitted successfully' });
                                                    } catch (err) {
                                                        let message = 'Failed to create order';
                                                        if (err && typeof err === 'object') {
                                                            const maybe = err as { message?: unknown };
                                                            if (typeof maybe.message === 'string') message = maybe.message;
                                                        }
                                                        setNotification({ variant: 'error', title: 'Order failed', message });
                                                    } finally {
                                                        setOrderSubmitting(false);
                                                    }
                                                }}
                                            >
                                                {orderSubmitting ? <Loader size={16} /> : 'Submit Order'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* My Orders (created by current user) */}
                    <div className="mt-8">
                        <h2 className="text-lg font-medium mb-3">My Orders</h2>
                        {ordersLoading && <div className="text-sm text-gray-600">Loading orders...</div>}
                        {!ordersLoading && orders.length === 0 && <div className="text-sm text-gray-500">No orders yet.</div>}
                        {!ordersLoading && orders.length > 0 && (
                            <div className="space-y-2">
                                {orders.map((o: TransactionItem) => (
                                    <div key={o.id} className="p-3 border rounded bg-white">
                                        <div className="flex items-center justify-between">
                                            <div className="font-medium">{o.room ?? o.game ?? 'Order'}</div>
                                            <div className="text-sm text-gray-600">{new Date(o.createdOn).toLocaleString()}</div>
                                        </div>
                                        <div className="text-sm text-gray-500 mt-1">Total: ${o.totalPrice?.toFixed ? o.totalPrice.toFixed(2) : o.totalPrice}</div>
                                        <div className="text-sm text-gray-500 mt-1">Status: {o.statusId}</div>
                                    </div>
                                ))}
                                <div className="mt-2 flex items-center justify-between">
                                    <div className="text-sm text-gray-600">Page {ordersPage}</div>
                                    <div className="space-x-2">
                                        <button className="px-2 py-1 bg-gray-200 rounded" disabled={ordersPage <= 1} onClick={() => setOrdersPage(p => Math.max(1, p - 1))}>Prev</button>
                                        <button className="px-2 py-1 bg-gray-200 rounded" disabled={ordersPage >= Math.max(1, Math.ceil(ordersTotal / ordersPageSize))} onClick={() => setOrdersPage(p => p + 1)}>Next</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editing ? "Edit Item" : "Create Item"}>
                <div className="flex flex-col gap-3">
                    <input className="px-2 py-1 border rounded" placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                    <label className="text-sm text-gray-600">Quantity</label>
                    <input type="number" className="px-2 py-1 border rounded" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))} />
                    <label className="text-sm text-gray-600">Price (usd)</label>
                    <input type="number" step="0.01" className="px-2 py-1 border rounded" placeholder="Price" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} />
                    <input className="px-2 py-1 border rounded" placeholder="Type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} />
                    <label className="text-sm text-gray-600">Category</label>
                    <select className="px-2 py-1 border rounded" value={form.categoryId ?? ""} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value === '' ? null : Number(e.target.value) }))}>
                        <option value="">-- Select category --</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <label className="text-sm text-gray-600">Status</label>
                    <StatusToggle value={form.statusId} onChange={(id) => setForm((f) => ({ ...f, statusId: id }))} />
                    <input className="px-2 py-1 border rounded" placeholder="GameId" value={form.gameId ?? ""} onChange={(e) => setForm((f) => ({ ...f, gameId: e.target.value || null }))} />
                    <div className="flex items-center gap-2">
                        <button className="px-3 py-1 bg-green-600 text-white rounded flex items-center gap-2" onClick={submitForm}>
                            {submitting ? <Loader size={16} /> : (editing ? 'Save' : 'Create')}
                        </button>
                        <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => setIsFormOpen(false)}>Cancel</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirm delete">
                <div className="space-y-4">
                    <p>Are you sure you want to delete this item?</p>
                    <div className="flex items-center gap-2">
                        <button className="px-3 py-1 bg-red-600 text-white rounded flex items-center gap-2" onClick={async () => {
                            if (!deleteId) return;
                            setDeleting(true);
                            try {
                                await deleteItem(deleteId);
                                setItems((s) => s.filter(x => x.id !== deleteId));
                                setDeleteId(null);
                                setError(null);
                                setNotification({ variant: "success", title: "Deleted", message: "Item deleted" });
                            } catch (err) {
                                let message = 'Failed to delete';
                                if (err && typeof err === 'object') {
                                    const maybe = err as { message?: unknown };
                                    if (typeof maybe.message === 'string') message = maybe.message;
                                }
                                setError(message);
                                setNotification({ variant: "error", title: "Delete failed", message });
                            } finally {
                                setDeleting(false);
                            }
                        }}>
                            {deleting ? <Loader size={16} /> : 'Delete'}
                        </button>
                        <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => setDeleteId(null)}>Cancel</button>
                    </div>
                </div>
            </Modal>

            {/* Toast container bottom-right */}
            <div className="fixed bottom-6 right-6 z-50">
                {notification && (
                    <div className="max-w-sm">
                        <Alert variant={notification.variant} title={notification.title} message={notification.message} />
                    </div>
                )}
            </div>
        </div>
    );
}
