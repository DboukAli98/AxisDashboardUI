import React, { useEffect, useMemo, useState } from 'react'
import { getGames, GameDto } from '../../services/gameService';
import { getSettings, GameSettingDto } from '../../services/gameSettingsService';
import { getStatusName, STATUS_DISABLED, STATUS_ENABLED, STATUS_PROCESSED_PAID } from '../../services/statuses';
import Loader from '../../components/ui/Loader';
import Modal from '../../components/ui/Modal';
import Label from '../../components/form/Label';
import Input from '../../components/form/input/InputField';
import Select from '../../components/form/Select';
import Alert from '../../components/ui/alert/Alert';
import { createGameSession } from '../../services/gameSession';
import { getRooms, RoomDto } from '../../services/roomsService';
import { getSetAvailability, SetAvailabilityDto } from '../../services/setService';
import { getGameTransactions, GameTransaction } from '../../services/transactionService';
import { useAuth } from '../../context/AuthContext';
import GameInvoice from '../../components/invoice/GameInvoice';
// ...existing imports...

const PAGE_SIZE = 8;

const GameSession: React.FC = () => {
    const { claims } = useAuth();
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
    const [loadingAvailability, setLoadingAvailability] = useState(false);

    // Invoice states
    const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
    const [currentInvoice, setCurrentInvoice] = useState<GameTransaction | null>(null);
    const [userInvoices, setUserInvoices] = useState<GameTransaction[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const [showInvoicesSection, setShowInvoicesSection] = useState(false);
    const [totalInvoices, setTotalInvoices] = useState<number>(0);
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | '3days' | 'week' | 'month' | 'custom'>('all');
    const [customFromDate, setCustomFromDate] = useState<string>('');
    const [customToDate, setCustomToDate] = useState<string>('');

    useEffect(() => {
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

    // Load user's invoices
    useEffect(() => {
        if (!showInvoicesSection || !claims?.name) return;
        let mounted = true;
        setLoadingInvoices(true);

        // Calculate date range based on filter
        let fromDate: string | undefined;
        let toDate: string | undefined;
        const now = new Date();

        switch (dateFilter) {
            case 'custom': {
                if (customFromDate) {
                    // datetime-local format is "YYYY-MM-DDTHH:mm", convert directly to ISO
                    fromDate = new Date(customFromDate).toISOString();
                }
                if (customToDate) {
                    // datetime-local format is "YYYY-MM-DDTHH:mm", convert directly to ISO
                    toDate = new Date(customToDate).toISOString();
                } else if (customFromDate) {
                    // If only from date is set, use current time as to date
                    toDate = new Date().toISOString();
                }
                break;
            }
            case 'today': {
                const today = new Date();
                fromDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0)).toISOString();
                toDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)).toISOString();
                break;
            }
            case '3days': {
                const threeDaysAgo = new Date(now);
                threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
                fromDate = new Date(Date.UTC(threeDaysAgo.getUTCFullYear(), threeDaysAgo.getUTCMonth(), threeDaysAgo.getUTCDate(), 0, 0, 0, 0)).toISOString();
                toDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)).toISOString();
                break;
            }
            case 'week': {
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                fromDate = new Date(Date.UTC(weekAgo.getUTCFullYear(), weekAgo.getUTCMonth(), weekAgo.getUTCDate(), 0, 0, 0, 0)).toISOString();
                toDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)).toISOString();
                break;
            }
            case 'month': {
                const monthAgo = new Date(now);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                fromDate = new Date(Date.UTC(monthAgo.getUTCFullYear(), monthAgo.getUTCMonth(), monthAgo.getUTCDate(), 0, 0, 0, 0)).toISOString();
                toDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)).toISOString();
                break;
            }
            case 'all':
            default:
                fromDate = undefined;
                toDate = undefined;
                break;
        }

        getGameTransactions({
            CreatedBy: [claims.name],
            PageSize: 50,
            From: fromDate,
            To: toDate,
        })
            .then((res) => {
                if (!mounted) return;
                setUserInvoices(res.data || []);
                setTotalInvoices(res.totalInvoices || 0);
            })
            .catch(() => { /* ignore */ })
            .finally(() => { if (mounted) setLoadingInvoices(false); });
        return () => { mounted = false; };
    }, [showInvoicesSection, claims?.name, dateFilter, customFromDate, customToDate]);

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
                                            if (statusIdNum === STATUS_ENABLED || statusIdNum === STATUS_PROCESSED_PAID) {
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
                                        isOpenHour: selectedSetting.isOpenHour,
                                    });

                                    // Fetch the latest transaction for this user to show as invoice
                                    if (claims?.name) {
                                        const invoiceRes = await getGameTransactions({
                                            CreatedBy: [claims.name],
                                            PageSize: 1,
                                            Page: 1
                                        });
                                        if (invoiceRes.data && invoiceRes.data.length > 0) {
                                            setCurrentInvoice(invoiceRes.data[0]);
                                            setInvoiceModalOpen(true);
                                        }
                                    }

                                    setToast({ variant: 'success', title: 'Session started', message: `Session created successfully` });
                                    setStartModalOpen(false);
                                    setSelectedRoomId(null);
                                    setSelectedSetId(null);

                                    // Refresh invoices list if it's visible
                                    if (showInvoicesSection) {
                                        setShowInvoicesSection(false);
                                        setTimeout(() => setShowInvoicesSection(true), 100);
                                    }
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

            {/* Invoice Modal */}
            <Modal
                isOpen={invoiceModalOpen}
                onClose={() => {
                    setInvoiceModalOpen(false);
                    setCurrentInvoice(null);
                }}
                title="Invoice"
            >
                <div className="max-h-[80vh] overflow-y-auto">
                    {currentInvoice && <GameInvoice transaction={currentInvoice} />}
                </div>
            </Modal>

            {/* Invoices Section */}
            <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">My Invoices</h2>
                    <button
                        onClick={() => setShowInvoicesSection(!showInvoicesSection)}
                        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
                    >
                        {showInvoicesSection ? 'Hide Invoices' : 'Show Invoices'}
                    </button>
                </div>

                {showInvoicesSection && (
                    <div className="space-y-4">
                        {/* Date Filter Buttons */}
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="flex items-center gap-2 flex-wrap mb-4">
                                <span className="text-sm font-medium text-gray-700 mr-2">Filter by:</span>
                                {[
                                    { value: 'all', label: 'All Time' },
                                    { value: 'today', label: 'Today' },
                                    { value: '3days', label: 'Last 3 Days' },
                                    { value: 'week', label: 'Last Week' },
                                    { value: 'month', label: 'Last Month' },
                                    { value: 'custom', label: 'Custom Range' },
                                ].map((filter) => (
                                    <button
                                        key={filter.value}
                                        onClick={() => setDateFilter(filter.value as typeof dateFilter)}
                                        className={`px-3 py-1.5 rounded text-sm font-medium transition ${dateFilter === filter.value
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>

                            {/* Custom Date Range Inputs */}
                            {dateFilter === 'custom' && (
                                <div className="border-t pt-4 mt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label>From Date & Time</Label>
                                            <Input
                                                type="datetime-local"
                                                value={customFromDate}
                                                onChange={(e) => setCustomFromDate(e.target.value)}
                                                className="w-full"
                                            />
                                        </div>
                                        <div>
                                            <Label>To Date & Time</Label>
                                            <Input
                                                type="datetime-local"
                                                value={customToDate}
                                                onChange={(e) => setCustomToDate(e.target.value)}
                                                className="w-full"
                                            />
                                        </div>
                                    </div>
                                    {customFromDate && customToDate && new Date(customFromDate) > new Date(customToDate) && (
                                        <div className="mt-2 text-sm text-red-600">
                                            From date & time must be before or equal to To date & time
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Total Fees Widget */}
                        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg shadow-lg p-6 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium opacity-90">Total Fees</p>
                                    <p className="text-3xl font-bold mt-1">${totalInvoices.toFixed(2)}</p>
                                    <p className="text-xs opacity-75 mt-1">
                                        {dateFilter === 'all' ? 'All time' :
                                            dateFilter === 'today' ? 'Today' :
                                                dateFilter === '3days' ? 'Last 3 days' :
                                                    dateFilter === 'week' ? 'Last week' :
                                                        dateFilter === 'month' ? 'Last month' :
                                                            dateFilter === 'custom' && customFromDate && customToDate
                                                                ? `${new Date(customFromDate).toLocaleString()} - ${new Date(customToDate).toLocaleString()}`
                                                                : dateFilter === 'custom' && customFromDate
                                                                    ? `From ${new Date(customFromDate).toLocaleString()}`
                                                                    : 'Custom range'}
                                    </p>
                                </div>
                                <div className="bg-white/20 rounded-full p-4">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Invoices List */}
                        <div className="bg-white rounded-lg shadow p-6">
                            {loadingInvoices && (
                                <div className="flex justify-center py-10">
                                    <Loader />
                                </div>
                            )}

                            {!loadingInvoices && userInvoices.length === 0 && (
                                <div className="text-center py-10 text-gray-500">
                                    No invoices found
                                </div>
                            )}

                            {!loadingInvoices && userInvoices.length > 0 && (
                                <div className="space-y-4">
                                    {userInvoices.map((invoice) => (
                                        <div
                                            key={invoice.transactionId}
                                            className="border rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                                            onClick={() => {
                                                setCurrentInvoice(invoice);
                                                setInvoiceModalOpen(true);
                                            }}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="text-lg font-semibold text-gray-800">
                                                            Invoice #{invoice.transactionId}
                                                        </span>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${invoice.statusId === STATUS_ENABLED || invoice.statusId === STATUS_PROCESSED_PAID
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {getStatusName(invoice.statusId) || 'Unknown'}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                        <div>
                                                            <p className="text-gray-500">Date</p>
                                                            <p className="font-medium text-gray-800">
                                                                {new Date(invoice.createdOn).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        {invoice.roomName && (
                                                            <div>
                                                                <p className="text-gray-500">Room</p>
                                                                <p className="font-medium text-gray-800">{invoice.roomName}</p>
                                                            </div>
                                                        )}
                                                        {invoice.gameName && (
                                                            <div>
                                                                <p className="text-gray-500">Game</p>
                                                                <p className="font-medium text-gray-800">{invoice.gameName}</p>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="text-gray-500">Durations</p>
                                                            <p className="font-medium text-gray-800">
                                                                {invoice.hours === 0 ? 'Open Hour' : `${invoice.hours}h`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right ml-4">
                                                    <p className="text-sm text-gray-500">Total</p>
                                                    <p className="text-2xl font-bold text-gray-800">
                                                        ${invoice.totalPrice.toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default GameSession