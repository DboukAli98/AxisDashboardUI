import React, { useEffect, useMemo, useState } from 'react'
import { getGames, GameDto } from '../../services/gameService';
import { getSettings, GameSettingDto } from '../../services/gameSettingsService';
import { getStatusName, STATUS_DISABLED, STATUS_ENABLED } from '../../services/statuses';
import Loader from '../../components/ui/Loader';
import Modal from '../../components/ui/Modal';
import Label from '../../components/form/Label';
import Input from '../../components/form/input/InputField';
import Alert from '../../components/ui/alert/Alert';
import { createGameSession } from '../../services/gameSession';
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

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setError(null);

        // load games (paged)
        getGames(page, PAGE_SIZE)
            .then((res) => {
                if (!mounted) return;
                setGames(res.items || []);
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
                setSettings(res.items || []);
            })
            .catch(() => {
                // ignore settings errors for now or show a lighter UI
            });

        return () => { mounted = false; };
    }, [page]);

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
                                                    <div className="text-xs text-gray-500">{s.hours ? `${s.hours} hrs` : ''}{s.hours && s.price ? ' • ' : ''}{s.price ? `$${s.price}` : ''}</div>
                                                </div>
                                                <div className="text-right">
                                                    <button className="px-2 py-1 bg-blue-600 text-white text-xs rounded" onClick={() => {
                                                        setSelectedSetting(s);
                                                        setStartHours(s.hours ?? 1);
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
            <Modal isOpen={startModalOpen} onClose={() => setStartModalOpen(false)} title={selectedSetting ? `Start: ${selectedSetting.name}` : 'Start session'}>
                <div className="space-y-4">
                    {toast && <Alert variant={toast.variant} title={toast.title} message={toast.message} />}
                    <div>
                        <Label>Hours</Label>
                        <Input type="number" value={startHours.toString()} onChange={(e) => setStartHours(Number(e.target.value))} min={'1'} disabled={selectedSetting?.type === 'offer'} />
                        {selectedSetting?.type === 'offer' && (
                            <div className="text-xs text-gray-500 mt-1">This setting is an offer — duration is fixed.</div>
                        )}
                    </div>
                    <div>
                        <Label>Total</Label>
                        <div className="text-lg font-semibold">${(selectedSetting?.price ?? 0) * startHours}</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="px-3 py-1 bg-green-600 text-white rounded flex items-center gap-2" onClick={async () => {
                            if (!selectedSetting) return;
                            setStarting(true);
                            try {
                                await createGameSession({
                                    gameId: selectedSetting.gameId,
                                    gameSettingId: selectedSetting.id,
                                    hours: startHours,
                                    status: String(STATUS_ENABLED),
                                });
                                setToast({ variant: 'success', title: 'Session started', message: `Session created` });
                                setStartModalOpen(false);
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
                        }}>{starting ? <Loader size={14} /> : 'Submit'}</button>
                        <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => setStartModalOpen(false)}>Cancel</button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

export default GameSession