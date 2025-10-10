import { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import { getRooms, RoomDto } from '../../services/roomsService';
import { PcIcon, PlayStationIcon } from '../../icons';

export default function GameCashierRooms() {
    const [rooms, setRooms] = useState<RoomDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);
    const [totalCount, setTotalCount] = useState<number | null>(null);
    const [selectedRoom, setSelectedRoom] = useState<RoomDto | null>(null);

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

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-semibold">Rooms</h1>
            </div>

            {loading && <div className="text-gray-600">Loading rooms...</div>}

            {!loading && (
                <div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {rooms.map(r => {
                            const catName = (r.categoryName || '').toString();
                            const lower = catName.toLowerCase();
                            const isPc = lower.includes('pc');
                            const isPlay = lower.includes('play') || lower.includes('playstation');
                            return (
                                <div key={r.id} className="bg-white rounded-lg shadow-sm p-3 hover:shadow-md transition flex flex-col justify-between cursor-pointer" onClick={() => setSelectedRoom(r)}>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="text-base font-medium">{r.name}</div>
                                            <div className="text-xs text-gray-500">{r.categoryName ?? r.categoryId}</div>
                                        </div>
                                        <div className="ml-2">
                                            {isPc && <PcIcon className="w-5 h-5 text-gray-600" />}
                                            {(!isPc && isPlay) && <PlayStationIcon className="w-5 h-5 text-gray-600" />}
                                        </div>
                                    </div>
                                    <div className="mt-3 text-sm text-gray-600">Sets: <span className="font-semibold">{r.sets}</span></div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-4 p-2 flex items-center justify-between">
                        <div className="text-sm text-gray-600">{totalCount !== null ? `Showing ${rooms.length} of ${totalCount}` : ''}</div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600">Page size</label>
                            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="input h-9">
                                <option value={6}>6</option>
                                <option value={12}>12</option>
                                <option value={24}>24</option>
                            </select>
                            <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</button>
                            <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => setPage((p) => p + 1)} disabled={totalCount !== null && page * pageSize >= (totalCount || 0)}>Next</button>
                        </div>
                    </div>
                </div>
            )}

            <Modal isOpen={!!selectedRoom} onClose={() => setSelectedRoom(null)} title={selectedRoom ? selectedRoom.name : 'Room'}>
                <div className="space-y-4">
                    <div className="text-sm text-gray-600">Category: {selectedRoom?.categoryName ?? selectedRoom?.categoryId}</div>
                    <div className="text-sm text-gray-600">Sets available:</div>
                    <div className="grid grid-cols-6 gap-2">
                        {Array.from({ length: selectedRoom?.sets ?? 0 }).map((_, i) => (
                            <div key={i} className="px-2 py-1 rounded-lg border border-gray-200 bg-gray-50 text-center text-sm text-gray-700">{i + 1}</div>
                        ))}
                    </div>
                </div>
            </Modal>
        </div>
    );
}
