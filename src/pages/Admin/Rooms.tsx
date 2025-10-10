import { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import Label from '../../components/form/Label';
import Input from '../../components/form/input/InputField';
import Select from '../../components/form/Select';
import DeleteIconButton from '../../components/ui/DeleteIconButton';
import { PlayStationIcon, PcIcon } from '../../icons';
import { getRooms, RoomDto, CreateRoomRequest, createRoom, updateRoom, deleteRoom } from '../../services/roomsService';
import { getCategoriesByType, CategoryDto } from '../../services/categoryService';

export default function Rooms() {
    const [rooms, setRooms] = useState<RoomDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState<number | null>(null);
    const [categories, setCategories] = useState<CategoryDto[]>([]);

    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [sets, setSets] = useState<number | ''>('');
    const [submitting, setSubmitting] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        getRooms(page, pageSize)
            .then(res => {
                if (!mounted) return;
                setRooms(res.items || []);
                setTotalCount(res.totalCount ?? null);
            })
            .catch(() => { /* ignore */ })
            .finally(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, [page, pageSize]);

    useEffect(() => {
        getCategoriesByType('game', 1, 100)
            .then(res => setCategories(res.items || []))
            .catch(() => { /* ignore */ });
    }, []);

    const openCreate = () => {
        setEditingId(null);
        setName('');
        setCategoryId(categories[0]?.id ?? null);
        setSets('');
        setIsOpen(true);
    };


    // seatsSelected removed — UI simplified to numeric sets input only

    const handleSave = async () => {
        setSubmitting(true);
        try {
            if (!categoryId) {
                // require category
                setSubmitting(false);
                return;
            }
            const body: CreateRoomRequest = { name, categoryId, sets: sets === '' ? 0 : sets };
            if (editingId) {
                await updateRoom(editingId, body);
            } else {
                await createRoom(body);
            }
            const refreshed = await getRooms(page, pageSize);
            setRooms(refreshed.items || []);
            setTotalCount(refreshed.totalCount ?? null);
            setIsOpen(false);
            setEditingId(null);
        } catch {
            // ignore
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            await deleteRoom(deleteId);
            const refreshed = await getRooms(page, pageSize);
            setRooms(refreshed.items || []);
            setTotalCount(refreshed.totalCount ?? null);
            setDeleteId(null);
        } catch {
            // ignore
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-semibold">Rooms</h1>
                <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={openCreate}>Add Room</button>
            </div>

            {loading && <div className="text-gray-600">Loading rooms...</div>}

            {!loading && (
                <div>
                    {/* Grid of room cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {rooms.map(r => {
                            const catName = (r.categoryName || '').toString();
                            const lower = catName.toLowerCase();
                            const isPc = lower.includes('pc');
                            const isPlay = lower.includes('play') || lower.includes('playstation');
                            return (
                                <div key={r.id} className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition flex flex-col justify-between">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="text-lg font-medium">{r.name}</div>
                                            <div className="text-sm text-gray-500">{r.categoryName ?? r.categoryId}</div>
                                        </div>
                                        <div className="ml-4">
                                            {isPc && <PcIcon className="w-6 h-6 text-gray-600" />}
                                            {(!isPc && isPlay) && <PlayStationIcon className="w-6 h-6 text-gray-600" />}
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between">
                                        <div className="text-sm text-gray-600">Sets: <span className="font-semibold">{r.sets}</span></div>
                                        <div className="flex items-center gap-2">
                                            <button className="text-sm px-2 py-1 bg-gray-200 rounded" onClick={() => {
                                                setEditingId(r.id);
                                                setName(r.name);
                                                setCategoryId(r.categoryId);
                                                setSets(r.sets);
                                                setIsOpen(true);
                                            }}>Edit</button>
                                            <DeleteIconButton onClick={() => setDeleteId(r.id)} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination controls */}
                    <div className="mt-4 p-2 flex items-center justify-between">
                        <div className="text-sm text-gray-600">{totalCount !== null ? `Showing ${rooms.length} of ${totalCount}` : ''}</div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600">Page size</label>
                            <Select options={[{ value: 5, label: '5' }, { value: 10, label: '10' }, { value: 25, label: '25' }]} defaultValue={pageSize} onChange={(v: string | number) => { setPageSize(Number(v)); setPage(1); }} className="w-24" />
                            <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</button>
                            <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => setPage((p) => p + 1)} disabled={totalCount !== null && page * pageSize >= (totalCount || 0)}>Next</button>
                        </div>
                    </div>
                </div>
            )}

            <Modal
                isOpen={isOpen}
                onClose={() => { setIsOpen(false); setEditingId(null); }}
                title={editingId ? 'Edit Room' : 'Create Room'}
                footer={(
                    <>
                        <button className="bg-gray-200 px-3 py-1 rounded" onClick={() => setIsOpen(false)}>Cancel</button>
                        <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={handleSave} disabled={submitting}>{submitting ? 'Saving...' : (editingId ? 'Save' : 'Create')}</button>
                    </>
                )}
            >
                <div className="space-y-4">
                    <div>
                        <Label>Name</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
                    </div>
                    <div>
                        <Label>Category</Label>
                        <Select options={categories.map(c => ({ value: c.id, label: c.name }))} defaultValue={categoryId ?? ""} onChange={(v) => setCategoryId(v === '' ? null : (typeof v === 'number' ? v : Number(v)))} />
                    </div>
                    <div>
                        <Label>Sets</Label>
                        <div className="flex items-center gap-3">
                            <Input type="number" min="0" value={sets === '' ? '' : String(sets)} onChange={(e) => {
                                const val = e.target.value === '' ? '' : Number(e.target.value);
                                setSets(val);
                            }} placeholder="Sets" />
                        </div>
                    </div>
                    {/* actions moved to Modal footer */}
                </div>
            </Modal>

            <Modal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                title="Confirm delete"
                footer={(
                    <>
                        <button className="px-3 py-1 bg-red-600 text-white rounded flex items-center gap-2" onClick={handleDelete}>
                            {deleting ? 'Deleting...' : 'Delete'}
                        </button>
                        <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => setDeleteId(null)}>Cancel</button>
                    </>
                )}
            >
                <div className="space-y-4">
                    <p>Are you sure you want to delete this room?</p>
                </div>
            </Modal>
        </div>
    );
}
