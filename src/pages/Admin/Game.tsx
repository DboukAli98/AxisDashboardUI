import { useEffect, useState } from "react";
import { getGames, GameDto } from "../../services/gameService";
import { createGame } from "../../services/gameService";
import Modal from "../../components/ui/Modal";
import Loader from "../../components/ui/Loader";
import Alert from "../../components/ui/alert/Alert";
import DeleteIconButton from "../../components/ui/DeleteIconButton";
import { deleteGame } from "../../services/gameService";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "../../components/ui/table";

export default function Game() {
    const [games, setGames] = useState<GameDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState("");
    const [type, setType] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [notification, setNotification] = useState<{
        variant: "success" | "error" | "warning" | "info";
        title: string;
        message: string;
    } | null>(null);

    // auto dismiss timer
    useEffect(() => {
        if (!notification) return;
        const t = setTimeout(() => setNotification(null), 4000);
        return () => clearTimeout(t);
    }, [notification]);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        getGames()
            .then((data) => {
                if (!mounted) return;
                setGames(data.items);
            })
            .catch((err) => {
                if (!mounted) return;
                setError(err?.message || "Failed to load games");
            })
            .finally(() => {
                if (!mounted) return;
                setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, []);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">Games</h1>

            <div className="mb-4 flex items-center gap-3">
                <button
                    className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded"
                    onClick={() => setShowForm(true)}
                >
                    Add Game
                </button>
                <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Create Game">
                    <div className="flex flex-col gap-3">
                        <div>
                            <Label htmlFor="game-name">Name</Label>
                            <Input id="game-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
                        </div>
                        <div>
                            <Label htmlFor="game-type">Type</Label>
                            <Input id="game-type" value={type} onChange={(e) => setType(e.target.value)} placeholder="Type" />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                className="px-3 py-1 bg-green-600 text-white rounded flex items-center gap-2"
                                onClick={async () => {
                                    setSubmitting(true);
                                    try {
                                        const created = await createGame({ name, type });
                                        setGames((g) => [created, ...g]);
                                        setName("");
                                        setType("");
                                        setShowForm(false);
                                        setError(null);
                                        setNotification({ variant: "success", title: "Created", message: `Game '${created.name}' created` });
                                    } catch (err: unknown) {
                                        let message = "Failed to create game";
                                        if (err && typeof err === "object") {
                                            const maybe = err as { message?: unknown };
                                            if (typeof maybe.message === "string") message = maybe.message;
                                        } else if (typeof err === "string") {
                                            message = err;
                                        }
                                        setError(message);
                                        setNotification({ variant: "error", title: "Create failed", message });
                                    } finally {
                                        setSubmitting(false);
                                    }
                                }}
                            >
                                {submitting ? <Loader size={16} /> : "Create"}
                            </button>
                            <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </div>
                </Modal>
            </div>

            {loading && <div className="text-gray-600">Loading games...</div>}

            {error && (
                <div className="text-red-600 bg-red-50 p-3 rounded">{error}</div>
            )}

            {!loading && !error && (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                    <div className="max-w-full overflow-x-auto">
                        <Table>
                            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                                <TableRow>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Name</TableCell>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Type</TableCell>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Created</TableCell>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
                                </TableRow>
                            </TableHeader>

                            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                {games.map((g) => (
                                    <TableRow key={g.id}>
                                        <TableCell className="px-5 py-4 sm:px-6 text-start">
                                            <div className="font-medium text-gray-800 dark:text-white/90">{g.name}</div>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{g.type}</TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{new Date(g.createdOn).toLocaleString()}</TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                            <DeleteIconButton onClick={() => setDeleteId(g.id)} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirm delete">
                <div className="space-y-4">
                    <p>Are you sure you want to delete this game?</p>
                    <div className="flex items-center gap-2">
                        <button className="px-3 py-1 bg-red-600 text-white rounded flex items-center gap-2" onClick={async () => {
                            if (!deleteId) return;
                            setDeleting(true);
                            try {
                                await deleteGame(deleteId);
                                setGames((s) => s.filter(x => x.id !== deleteId));
                                setDeleteId(null);
                                setError(null);
                                setNotification({ variant: "success", title: "Deleted", message: "Game deleted" });
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
