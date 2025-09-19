import { useEffect, useState } from "react";
import {
    getItems,
    createItem,
    updateItem,
    deleteItem,
    ItemDto,
    ItemListResponse,
} from "../../services/itemService";
import Modal from "../../components/ui/Modal";
import Loader from "../../components/ui/Loader";
import Alert from "../../components/ui/alert/Alert";
import DeleteIconButton from "../../components/ui/DeleteIconButton";
import { getCategories, CategoryDto } from "../../services/categoryService";
import { getStatusName, STATUS_ENABLED, STATUS_DISABLED } from '../../services/statuses';
import StatusToggle from '../../components/ui/StatusToggle';
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "../../components/ui/table";

export default function Items() {
    const [items, setItems] = useState<ItemDto[]>([]);
    const [categories, setCategories] = useState<CategoryDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState<number | null>(null);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState<ItemDto | null>(null);
    const [form, setForm] = useState<Omit<ItemDto, "id">>({
        name: "",
        quantity: 0,
        price: 0,
        type: "",
        categoryId: null,
        gameId: null,
        statusId: null,
    });
    const [submitting, setSubmitting] = useState(false);

    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

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
        getItems(page, pageSize)
            .then((data: ItemListResponse) => {
                if (!mounted) return;
                setItems(data.items || []);
                setTotalCount(data.totalCount ?? null);
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
    }, [page, pageSize]);

    useEffect(() => {
        let mounted = true;
        getCategories(1, 100)
            .then((res) => {
                if (!mounted) return;
                setCategories(res.items || []);
            })
            .catch(() => {
                /* ignore */
            });
        return () => { mounted = false; };
    }, []);

    function openCreate() {
        setEditing(null);
        setForm({ name: "", quantity: 0, price: 0, type: "", categoryId: null, gameId: null });
        setIsFormOpen(true);
    }

    function openEdit(item: ItemDto) {
        setEditing(item);
        setForm({ name: item.name, quantity: item.quantity, price: item.price, type: item.type, categoryId: item.categoryId, gameId: item.gameId, statusId: item.statusId ?? null });
        setIsFormOpen(true);
    }

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
            <h1 className="text-2xl font-semibold mb-4">Items</h1>

            <div className="mb-4 flex items-center gap-3">
                <button className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded" onClick={openCreate}>
                    Add Item
                </button>
            </div>

            {loading && <div className="text-gray-600">Loading items...</div>}

            {error && <div className="text-red-600 bg-red-50 p-3 rounded">{error}</div>}

            {!loading && !error && (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                    <div className="max-w-full overflow-x-auto">
                        <Table>
                            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                                <TableRow>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Name</TableCell>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Quantity</TableCell>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Price</TableCell>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Type</TableCell>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Category</TableCell>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
                                </TableRow>
                            </TableHeader>

                            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                {items.map((it) => (
                                    <TableRow key={it.id}>
                                        <TableCell className="px-5 py-4 sm:px-6 text-start">
                                            <div className="font-medium text-gray-800 dark:text-white/90">{it.name}</div>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{it.quantity}</TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{it.price}</TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{it.type}</TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{categories.find(c => c.id === it.categoryId)?.name ?? it.categoryId}</TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                            {(() => {
                                                const id = it.statusId;
                                                const name = getStatusName(id) ?? id ?? '-';
                                                if (id === STATUS_ENABLED) {
                                                    return <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">{name}</span>;
                                                }
                                                if (id === STATUS_DISABLED) {
                                                    return <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">{name}</span>;
                                                }
                                                return <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs">{name}</span>;
                                            })()}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                            <div className="flex items-center gap-2">
                                                <button className="text-sm px-2 py-1 bg-gray-200 rounded" onClick={() => openEdit(it)}>Edit</button>
                                                <DeleteIconButton onClick={() => setDeleteId(it.id)} />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* Pagination controls */}
            <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">{totalCount !== null ? `Showing ${items.length} of ${totalCount}` : ''}</div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Page size</label>
                    <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="input h-9">
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                    </select>
                    <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</button>
                    <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => setPage((p) => p + 1)} disabled={totalCount !== null && page * pageSize >= (totalCount || 0)}>Next</button>
                </div>
            </div>

            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editing ? "Edit Item" : "Create Item"}>
                <div className="flex flex-col gap-3">
                    <input className="px-2 py-1 border rounded" placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                    <label className="text-sm text-gray-600">Quantity</label>
                    <input type="number" className="px-2 py-1 border rounded" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))} />
                    <label className="text-sm text-gray-600">Price (usd)</label>
                    <input type="number" step="0.01" className="px-2 py-1 border rounded" placeholder="Price" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} />
                    <input className="px-2 py-1 border rounded" placeholder="Type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} />
                    <label className="text-sm text-gray-600">Category</label>
                    <select className="px-2 py-1 border rounded" value={form.categoryId ?? ""} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value || null }))}>
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
