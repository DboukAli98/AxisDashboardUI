import React, { useEffect, useMemo, useState } from 'react'
import { getGames, GameDto } from '../../services/gameService';
import { getSettings, GameSettingDto } from '../../services/gameSettingsService';
import { getStatusName, STATUS_DISABLED, STATUS_ENABLED } from '../../services/statuses';
import Loader from '../../components/ui/Loader';
import Modal from '../../components/ui/Modal';
import Label from '../../components/form/Label';
import Input from '../../components/form/input/InputField';
import Select from '../../components/form/Select';
import Alert from '../../components/ui/alert/Alert';
import { createGameSession } from '../../services/gameSession';
import { getRooms, RoomDto } from '../../services/roomsService';
import { getSetAvailability, SetAvailabilityDto } from '../../services/setService';
// ...existing imports...

const PAGE_SIZE = 8;

const GameSession: React.FC = () => {
    const [games, setGames] = useState<GameDto[]>([]);
    const [settings, setSettings] = useState<GameSettingDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState<number | null>(null);
    const [selectedSetting, setSelectedSetting] = useState<GameSettingDto | null>(null);
    const [startModalOpen, setStartModalOpen] = useState(false);
    const [startHours, setStartHours] = useState<number>(1);
    const [starting, setStarting] = useState(false);
    const [toast, setToast] = useState<{ variant: 'success' | 'error' | 'info', title: string, message: string } | null>(null);

    // Room and set selection
    const [rooms, setRooms] = useState<RoomDto[]>([]);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [setAvailability, setSetAvailability] = useState<SetAvailabilityDto | null>(null);
    const [selectedSetId, setSelectedSetId] = useState<number | null>(null);
    const [loadingAvailability, setLoadingAvailability] = useState(false); useEffect(() => {
        let mounted = true;
        setLoading(true);
        setError(null);

        // load games (paged)
        getGames(page, PAGE_SIZE)
            .then((res) => {
                if (!mounted) return;
                setGames(res.data || []);
                setTotalCount(res.totalCount ?? null);
            })
            .catch((err) => {
                if (!mounted) return;
                setError(err?.message || 'Failed to load games');
            })
            .finally(() => {
                if (!mounted) return;
                setLoading(false);
            });

        // load all settings (we'll request a large page to include settings for listed games)
        getSettings(1, 1000)
            .then((res) => {
                if (!mounted) return;
                setSettings(res.data || []);
            })
            .catch(() => {
                // ignore settings errors for now or show a lighter UI
            });

        return () => { mounted = false; };
    }, [page]);

    // Load rooms for set selection
    useEffect(() => {
        let mounted = true;
        getRooms(1, 100)
            .then((res) => {
                if (!mounted) return;
                setRooms(res.data || []);
            })
            .catch(() => { /* ignore */ });
        return () => { mounted = false; };
    }, []);

    // Load set availability when room is selected
    useEffect(() => {
        if (!selectedRoomId || !startModalOpen) {
            setSetAvailability(null);
            setSelectedSetId(null);
            return;
        }
        const selectedRoom = rooms.find(r => String(r.id) === String(selectedRoomId));
        console.log('useEffect - Selected room:', selectedRoom);
        if (selectedRoom?.isOpenSet) {
            // Skip loading sets for open set rooms - auto-enable submit
            console.log('Room is open set, skipping set loading');
            setSetAvailability(null);
            setSelectedSetId(null);
            setLoadingAvailability(false);
            return;
        }
        let mounted = true;
        setLoadingAvailability(true);
        const roomIdNum = Number(selectedRoomId);
        getSetAvailability(roomIdNum, 1)
            .then((res) => {
                if (!mounted) return;
                setSetAvailability(res);
            })
            .catch(() => { /* ignore */ })
            .finally(() => { if (mounted) setLoadingAvailability(false); });
        return () => { mounted = false; };
    }, [selectedRoomId, startModalOpen, rooms]);

    const settingsByGame = useMemo(() => {
        const map = new Map<string, GameSettingDto[]>();
        settings.forEach((s) => {
            const list = map.get(s.gameId) || [];
            list.push(s);
            map.set(s.gameId, list);
        });
        return map;
    }, [settings]);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">Game Sessions</h1>

            {loading && (
                <div className="flex items-center justify-center py-20">
                    <Loader />
                </div>
            )}

            {error && (
                <div className="text-red-600 bg-red-50 p-3 rounded mb-4">{error}</div>
            )}

            {!loading && !error && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {games.map((g) => (
                            <div key={g.id} className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="text-lg font-semibold">{g.name}</div>
                                        <div className="text-sm text-gray-500">{g.categoryName ?? '—'}</div>
                                    </div>
                                    <div className="text-sm">
                                        {(() => {
                                            // coerce to number for reliable comparisons (API may return strings)
                                            const statusIdNum = g.statusId === null || g.statusId === undefined ? null : Number(g.statusId);
                                            const name = getStatusName(statusIdNum) ?? (g.statusId ?? '-');
                                            if (statusIdNum === STATUS_ENABLED) {
                                                return <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">{name}</span>;
                                            }
                                            if (statusIdNum === STATUS_DISABLED) {
                                                return <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">{name}</span>;
                                            }
                                            // default neutral badge
                                            return <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs">{name}</span>;
                                        })()}
                                    </div>
                                </div>

                                <div className="mt-3">
                                    <div className="text-sm font-medium mb-2">Settings</div>
                                    <div className="space-y-2">
                                        {(settingsByGame.get(g.id) || []).map((s) => (
                                            <div key={s.id} className="flex items-center justify-between p-2 rounded bg-gray-50">
                                                <div>
                                                    <div className="text-sm font-medium">{s.name}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {s.hours === 0 ? 'Open Hour' : (s.hours ? `${s.hours} hrs` : '')}
                                                        {((s.hours === 0 || s.hours) && s.price) ? ' • ' : ''}
                                                        {s.price ? `$${s.price}` : ''}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <button className="px-2 py-1 bg-blue-600 text-white text-xs rounded" onClick={() => {
                                                        setSelectedSetting(s);
                                                        setStartHours(s.hours ?? 1);
                                                        setSelectedRoomId(null);
                                                        setSelectedSetId(null);
                                                        setSetAvailability(null);
                                                        setStartModalOpen(true);
                                                    }}>Start</button>
                                                </div>
                                            </div>
                                        ))}
                                        {((settingsByGame.get(g.id) || []).length === 0) && (
                                            <div className="text-sm text-gray-500">No settings available</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    <div className="mt-6 flex items-center justify-between">
                        <div className="text-sm text-gray-600">{totalCount !== null ? `Showing ${games.length} of ${totalCount}` : ''}</div>
                        <div className="flex items-center gap-2">
                            <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</button>
                            <div className="text-sm">Page {page}</div>
                            <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => setPage((p) => p + 1)} disabled={totalCount !== null && page * PAGE_SIZE >= (totalCount || 0)}>Next</button>
                        </div>
                    </div>
                </>
            )}
            {/* Start session modal */}
            <Modal isOpen={startModalOpen} onClose={() => { setStartModalOpen(false); setSelectedRoomId(null); setSelectedSetId(null); }} title={selectedSetting ? `Start: ${selectedSetting.name}` : 'Start session'}>
                <div className="space-y-4">
                    {toast && <Alert variant={toast.variant} title={toast.title} message={toast.message} />}

                    <div>
                        <Label>Room</Label>
                        <Select
                            key={startModalOpen ? 'room-select-open' : 'room-select-closed'}
                            options={[...rooms.map(r => ({ value: r.id, label: r.name }))]}
                            defaultValue={selectedRoomId ?? ''}
                            isPlaceHolderDisabled={false}
                            placeholder='Select a room'
                            onChange={(v) => {
                                const roomId = v === '' ? null : String(v);
                                console.log('Selected room ID:', roomId);
                                console.log('Available rooms:', rooms.map(r => ({ id: r.id, name: r.name, isOpenSet: r.isOpenSet })));
                                setSelectedRoomId(roomId);
                            }}
                        />
                    </div>

                    {selectedRoomId && (() => {
                        const selectedRoom = rooms.find(r => String(r.id) === String(selectedRoomId));
                        console.log('Selected room ID:', selectedRoomId);
                        console.log('Found room:', selectedRoom);
                        if (selectedRoom?.isOpenSet) {
                            return (
                                <div className="text-sm text-green-600 bg-green-50 p-3 rounded">
                                    This is an open set room — no set selection required.
                                </div>
                            );
                        }
                        return null;
                    })()}

                    {selectedRoomId && !rooms.find(r => String(r.id) === String(selectedRoomId))?.isOpenSet && loadingAvailability && <div className="text-sm text-gray-500">Loading sets...</div>}

                    {selectedRoomId && !rooms.find(r => String(r.id) === String(selectedRoomId))?.isOpenSet && !loadingAvailability && setAvailability && (
                        <div>
                            <Label>Select Set</Label>
                            <div className="flex gap-3 text-xs mb-2">
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-green-100 border-2 border-green-500 rounded"></div>
                                    <span>Available ({setAvailability.availableCount})</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-red-100 border-2 border-red-500 rounded"></div>
                                    <span>Occupied ({setAvailability.unavailableCount})</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-6 gap-2">
                                {setAvailability.available.map((set) => (
                                    <button
                                        key={set.id}
                                        onClick={() => setSelectedSetId(set.id)}
                                        className={`px-2 py-2 rounded-lg border-2 text-center text-sm font-medium transition ${selectedSetId === set.id
                                            ? 'border-blue-600 bg-blue-100 text-blue-700'
                                            : 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100'
                                            }`}
                                    >
                                        {set.name}
                                    </button>
                                ))}
                                {setAvailability.unavailable.map((set) => (
                                    <div
                                        key={set.id}
                                        className="px-2 py-2 rounded-lg border-2 border-red-500 bg-red-50 text-center text-sm font-medium text-red-700 cursor-not-allowed opacity-60"
                                    >
                                        {set.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <Label>Hours</Label>
                        <Input type="number" value={startHours.toString()} onChange={(e) => setStartHours(Number(e.target.value))} min={'1'} disabled={!!selectedSetting?.isOffer || selectedSetting?.hours === 0} />
                        {selectedSetting?.isOffer && (
                            <div className="text-xs text-gray-500 mt-1">This setting is an offer — duration is fixed.</div>
                        )}
                        {selectedSetting?.hours === 0 && (
                            <div className="text-xs text-gray-500 mt-1">This is an open hour setting — duration is not applicable.</div>
                        )}
                    </div>
                    <div>
                        <Label>Total</Label>
                        <div className="text-lg font-semibold">${selectedSetting?.hours === 0 ? (selectedSetting?.price ?? 0) : ((selectedSetting?.price ?? 0) * startHours)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            className="px-3 py-1 bg-green-600 text-white rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={(() => {
                                if (!selectedRoomId) return true;
                                const selectedRoom = rooms.find(r => String(r.id) === String(selectedRoomId));
                                console.log('Submit button - Selected room:', selectedRoom);
                                if (selectedRoom?.isOpenSet) return false; // Enable immediately for open set rooms
                                return !selectedSetId; // Require set selection for non-open-set rooms
                            })()}
                            onClick={async () => {
                                if (!selectedSetting || !selectedRoomId) return;
                                const selectedRoom = rooms.find(r => String(r.id) === String(selectedRoomId));
                                const isOpenSetRoom = selectedRoom?.isOpenSet;
                                if (!isOpenSetRoom && !selectedSetId) return;

                                setStarting(true);
                                try {
                                    await createGameSession({
                                        gameId: selectedSetting.gameId,
                                        gameSettingId: selectedSetting.id,
                                        hours: startHours,
                                        status: String(STATUS_ENABLED),
                                        setId: isOpenSetRoom ? undefined : selectedSetId!,
                                    });
                                    setToast({ variant: 'success', title: 'Session started', message: `Session created` });
                                    setStartModalOpen(false);
                                    setSelectedRoomId(null);
                                    setSelectedSetId(null);
                                } catch (e: unknown) {
                                    let message = 'Failed to start session';
                                    if (e && typeof e === 'object') {
                                        const maybe = e as { message?: unknown };
                                        if (typeof maybe.message === 'string') message = maybe.message;
                                    }
                                    setToast({ variant: 'error', title: 'Failed', message });
                                } finally {
                                    setStarting(false);
                                    setTimeout(() => setToast(null), 3000);
                                }
                            }}
                        >
                            {starting ? <Loader size={14} /> : 'Submit'}
                        </button>
                        <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => { setStartModalOpen(false); setSelectedRoomId(null); setSelectedSetId(null); }}>Cancel</button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

export default GameSession