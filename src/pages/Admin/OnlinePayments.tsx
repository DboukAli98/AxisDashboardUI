// Admin → Online Payments
// =======================
// Every payment taken online (MontyPay today) in one place: what it was
// for, who paid, did it settle, was the business effect applied. Plus
// "Create pay link" — a shareable /pay/{code} URL for any amount, a wallet
// top-up, or an open invoice — and the MontyPay setup card with the
// callback URL to hand to MontyPay.

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import Modal from "../../components/ui/Modal";
import Loader from "../../components/ui/Loader";
import {
  OnlinePayment, OnlinePaymentDetail, OnlinePaymentsPage, PaymentProviderConfig,
  listOnlinePayments, getOnlinePayment, createPayLink, reconcileOnlinePayment, cancelOnlinePayment,
  getPaymentProviderConfig,
} from "../../services/onlinePaymentService";
import { searchClientsByPhone, ClientUserDto } from "../../services/clientService";

const money = (n: number, c = "USD") => `${c === "USD" ? "$" : c + " "}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const localYmd = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const localMidnight = (ymd: string, plusDays = 0) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d + plusDays, 0, 0, 0, 0);
};

const STATUS_STYLE: Record<string, string> = {
  Paid: "bg-green-50 text-green-700 border-green-200",
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Redirected: "bg-blue-50 text-blue-700 border-blue-200",
  Created: "bg-gray-50 text-gray-600 border-gray-200",
  Failed: "bg-red-50 text-red-700 border-red-200",
  Cancelled: "bg-gray-100 text-gray-500 border-gray-200",
  Expired: "bg-gray-100 text-gray-500 border-gray-200",
  Refunded: "bg-purple-50 text-purple-700 border-purple-200",
  Voided: "bg-purple-50 text-purple-700 border-purple-200",
  Chargeback: "bg-red-100 text-red-800 border-red-300",
};

const PURPOSE_ICON: Record<string, string> = { EventTicket: "🎟", WalletTopUp: "👛", Invoice: "🧾", Custom: "🔗" };

function StatusPill({ s }: { s: string }) {
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_STYLE[s] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>{s}</span>;
}

function copy(text: string) {
  navigator.clipboard?.writeText(text).catch(() => { /* ignore */ });
}

// ── Setup card (callback URL etc.) ───────────────────────────────────────
function ProviderCard({ cfg, onRefresh }: { cfg: PaymentProviderConfig | null; onRefresh: () => void }) {
  if (!cfg) return null;
  const live = cfg.environment === "production";
  return (
    <div className={`rounded-2xl border p-5 ${live ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/40"}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900">{cfg.provider}</h2>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${live ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}`}>
              {cfg.environment}
            </span>
            <span className={`text-[11px] ${cfg.activeConfigured ? "text-emerald-700" : "text-red-600"}`}>
              {cfg.activeConfigured ? "● credentials set" : "● not configured"}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Sandbox {cfg.sandboxConfigured ? "✓" : "—"} · Production {cfg.productionConfigured ? "✓" : "—"} · hash {cfg.hashAlgorithm.toUpperCase()}.
            Switch environment and paste keys under <Link to="/admin/integrations" className="text-indigo-600 underline">Integrations</Link>.
          </p>
        </div>
        <button onClick={onRefresh} className="text-xs px-3 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50">↻</button>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-xl bg-white border border-gray-200 p-3">
          <div className="text-[11px] font-semibold uppercase text-gray-500">Give this URL to MontyPay (notification / callback URL)</div>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 text-xs break-all text-gray-800">{cfg.callbackUrl}</code>
            <button onClick={() => copy(cfg.callbackUrl)} className="shrink-0 text-xs px-2.5 h-8 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Copy</button>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Same URL for sandbox and production. MontyPay POSTs every status change here; it's verified by hash.</p>
        </div>
        <div className="rounded-xl bg-white border border-gray-200 p-3">
          <div className="text-[11px] font-semibold uppercase text-gray-500">Customer return pages (sent automatically per payment)</div>
          <div className="mt-1 text-xs text-gray-700 break-all">✓ {cfg.successUrlSample}</div>
          <div className="text-xs text-gray-700 break-all">✕ {cfg.cancelUrlSample}</div>
          <p className="text-[11px] text-gray-400 mt-1">Pay links look like <code>{cfg.publicBaseUrl}/pay/&lt;code&gt;</code>.</p>
        </div>
      </div>
    </div>
  );
}

// ── Create link modal ────────────────────────────────────────────────────
function CreateLinkModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (p: OnlinePayment) => void }) {
  const [purpose, setPurpose] = useState<"Custom" | "WalletTopUp" | "Invoice">("Custom");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [expires, setExpires] = useState("72");
  const [client, setClient] = useState<ClientUserDto | null>(null);
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<ClientUserDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) { setPurpose("Custom"); setAmount(""); setDescription(""); setCustomerName(""); setCustomerPhone(""); setCustomerEmail(""); setInvoiceId(""); setClient(null); setClientQuery(""); setClientResults([]); setErr(null); }
  }, [open]);

  useEffect(() => {
    if (clientQuery.trim().length < 3) { setClientResults([]); return; }
    const t = setTimeout(() => {
      searchClientsByPhone(clientQuery.trim()).then((r) => setClientResults(r || [])).catch(() => setClientResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [clientQuery]);

  const submit = async () => {
    setErr(null);
    const amt = Number(amount);
    if (!(amt > 0)) { setErr("Enter an amount."); return; }
    if (!description.trim()) { setErr("Enter what this payment is for."); return; }
    if (purpose === "WalletTopUp" && !client) { setErr("Pick the client whose wallet will be credited."); return; }
    if (purpose === "Invoice" && !(Number(invoiceId) > 0)) { setErr("Enter the open invoice number."); return; }
    setBusy(true);
    try {
      const p = await createPayLink({
        amount: amt,
        description: description.trim(),
        purpose,
        customerName: client ? `${client.firstName || ""} ${client.lastName || ""}`.trim() || customerName || null : customerName || null,
        customerPhone: client?.phoneNumber || customerPhone || null,
        customerEmail: client?.email || customerEmail || null,
        userId: client?.id ?? null,
        referenceId: purpose === "Invoice" ? Number(invoiceId) : purpose === "WalletTopUp" ? client?.id : null,
        expiresInHours: Number(expires) > 0 ? Number(expires) : null,
      });
      onCreated(p);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setErr(msg ?? "Could not create the link.");
    } finally { setBusy(false); }
  };

  const inputCls = "w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <Modal isOpen={open} onClose={onClose} title="Create a pay link">
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1">
          {([["Custom", "🔗 Any amount"], ["WalletTopUp", "👛 Wallet top-up"], ["Invoice", "🧾 Open invoice"]] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setPurpose(k)}
              className={`h-9 rounded-lg text-xs font-semibold transition ${purpose === k ? "bg-white shadow text-indigo-700" : "text-gray-600"}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500">Amount (USD)</label>
            <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} placeholder="25.00" autoFocus />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Link valid for (hours)</label>
            <input type="number" min="0" value={expires} onChange={(e) => setExpires(e.target.value)} className={inputCls} placeholder="72 (0 = never)" />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500">What is it for? (shown to the customer)</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} placeholder={purpose === "WalletTopUp" ? "Wallet top-up" : purpose === "Invoice" ? "Table 4 — invoice #1234" : "Birthday booking deposit"} />
        </div>

        {purpose === "Invoice" && (
          <div>
            <label className="text-xs font-semibold text-gray-500">Open invoice #</label>
            <input type="number" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} className={inputCls} placeholder="Invoice id from Open Invoices" />
            <p className="text-[11px] text-gray-400 mt-1">When paid, the invoice closes automatically.</p>
          </div>
        )}

        {purpose === "WalletTopUp" ? (
          <div>
            <label className="text-xs font-semibold text-gray-500">Client (by phone)</label>
            {client ? (
              <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-3 h-10 text-sm">
                <span>{`${client.firstName || ""} ${client.lastName || ""}`.trim() || client.phoneNumber} · {client.phoneNumber}</span>
                <button type="button" onClick={() => setClient(null)} className="text-xs text-indigo-600">change</button>
              </div>
            ) : (
              <>
                <input value={clientQuery} onChange={(e) => setClientQuery(e.target.value)} className={inputCls} placeholder="Type phone number…" />
                {clientResults.length > 0 && (
                  <div className="mt-1 rounded-lg border border-gray-200 divide-y max-h-40 overflow-y-auto">
                    {clientResults.map((c) => (
                      <button key={c.id} type="button" onClick={() => { setClient(c); setClientResults([]); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50">
                        {`${c.firstName || ""} ${c.lastName || ""}`.trim() || "—"} <span className="text-gray-400">· {c.phoneNumber}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            <p className="text-[11px] text-gray-400 mt-1">When paid, the wallet is credited (bonus tiers apply) and booked to the ledger.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs font-semibold text-gray-500">Customer name</label><input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputCls} /></div>
            <div><label className="text-xs font-semibold text-gray-500">Phone</label><input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className={inputCls} /></div>
            <div><label className="text-xs font-semibold text-gray-500">Email</label><input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className={inputCls} /></div>
          </div>
        )}

        {err && <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{err}</div>}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium">Cancel</button>
          <button onClick={submit} disabled={busy} className="flex-1 h-11 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
            {busy ? "Creating…" : "Create link"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Detail modal ─────────────────────────────────────────────────────────
function DetailModal({ id, onClose, onChanged }: { id: number | null; onClose: () => void; onChanged: () => void }) {
  const [d, setD] = useState<OnlinePaymentDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [showRaw, setShowRaw] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (id == null) return;
    setD(await getOnlinePayment(id));
  }, [id]);

  useEffect(() => { setD(null); load(); }, [load]);

  const reconcile = async () => {
    if (id == null) return;
    setBusy(true);
    try { await reconcileOnlinePayment(id); await load(); onChanged(); } finally { setBusy(false); }
  };
  const cancel = async () => {
    if (id == null || !confirm("Cancel this pay link? The customer will no longer be able to pay it.")) return;
    setBusy(true);
    try { await cancelOnlinePayment(id, "Cancelled from admin"); await load(); onChanged(); }
    catch (e: unknown) { alert((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Could not cancel."); }
    finally { setBusy(false); }
  };

  if (id == null) return null;
  const p = d?.payment;
  const wa = p?.customerPhone ? `https://wa.me/${p.customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi${p.customerName ? " " + p.customerName : ""}, here is your AXIS payment link for ${p.description} (${money(p.amount, p.currency)}): ${p.payUrl}`)}` : null;

  return (
    <Modal isOpen onClose={onClose} title={p ? `${PURPOSE_ICON[p.purpose] ?? "🔗"} ${p.description}` : "Payment"}>
      {!p ? <div className="py-8 flex justify-center"><Loader /></div> : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold text-gray-900">{money(p.amount, p.currency)}</div>
            <div className="text-right">
              <StatusPill s={p.status} />
              <div className="text-[11px] text-gray-400 mt-1">{p.provider} · {p.environment}</div>
            </div>
          </div>

          {p.status === "Paid" && !p.isFulfilled && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2">
              Paid but the business effect failed: <b>{p.fulfillmentError}</b>. Fix the cause, then press <b>Reconcile</b> to retry.
            </div>
          )}
          {p.failureReason && p.status !== "Paid" && (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{p.failureReason}</div>
          )}

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <div className="text-gray-500">For</div><div className="text-gray-900">{p.referenceLabel ?? p.purpose}</div>
            <div className="text-gray-500">Customer</div><div className="text-gray-900">{p.customerName || "—"}{p.customerPhone ? ` · ${p.customerPhone}` : ""}{p.customerEmail ? ` · ${p.customerEmail}` : ""}</div>
            <div className="text-gray-500">Created</div><div className="text-gray-900">{new Date(p.createdOn).toLocaleString()} · by {p.createdBy}</div>
            {p.paidOn && <><div className="text-gray-500">Paid</div><div className="text-gray-900">{new Date(p.paidOn).toLocaleString()}{p.paymentMethodUsed ? ` · ${p.paymentMethodUsed}` : ""}{p.cardMasked ? ` · ${p.cardMasked}` : ""}</div></>}
            {p.expiresOn && <><div className="text-gray-500">Expires</div><div className="text-gray-900">{new Date(p.expiresOn).toLocaleString()}</div></>}
            <div className="text-gray-500">Gateway refs</div><div className="text-gray-900 text-xs font-mono break-all">{p.providerOrderNumber || "—"}{p.providerPaymentId ? ` / ${p.providerPaymentId}` : ""}</div>
            <div className="text-gray-500">Callbacks</div><div className="text-gray-900">{p.callbackCount}{p.lastCallbackOn ? ` · last ${new Date(p.lastCallbackOn).toLocaleString()}` : ""}</div>
          </div>

          <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
            <div className="text-[11px] font-semibold uppercase text-gray-500">Pay link</div>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 text-xs break-all">{p.payUrl}</code>
              <button onClick={() => copy(p.payUrl)} className="text-xs px-2.5 h-8 rounded-lg bg-indigo-600 text-white">Copy</button>
              {wa && <a href={wa} target="_blank" rel="noreferrer" className="text-xs px-2.5 h-8 leading-8 rounded-lg bg-green-600 text-white">WhatsApp</a>}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={reconcile} disabled={busy} className="flex-1 h-10 rounded-xl border border-indigo-200 text-indigo-700 text-sm font-medium hover:bg-indigo-50 disabled:opacity-50">
              ↻ Reconcile with {p.provider}
            </button>
            {(p.status === "Created" || p.status === "Redirected" || p.status === "Pending" || p.status === "Failed") && (
              <button onClick={cancel} disabled={busy} className="h-10 px-4 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50">Cancel link</button>
            )}
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase text-gray-500 mb-1">History</div>
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 max-h-56 overflow-y-auto">
              {d!.events.map((e) => (
                <div key={e.id} className="px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-800">
                      {e.kind}{e.providerType ? ` · ${e.providerType}/${e.providerStatus}` : ""}{e.orderStatus ? ` → ${e.orderStatus}` : ""}
                      {!e.hashValid && <span className="ml-1 text-red-600">(bad hash)</span>}
                    </span>
                    <span className="text-gray-400 whitespace-nowrap">{new Date(e.createdOn).toLocaleString()}</span>
                  </div>
                  {e.note && <div className="text-gray-500 mt-0.5">{e.note}</div>}
                  {e.raw && (
                    <button onClick={() => setShowRaw(showRaw === e.id ? null : e.id)} className="text-indigo-500 mt-0.5">{showRaw === e.id ? "hide raw" : "raw"}</button>
                  )}
                  {showRaw === e.id && <pre className="mt-1 bg-gray-900 text-gray-100 rounded p-2 overflow-x-auto text-[10px] whitespace-pre-wrap break-all">{e.raw}</pre>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────
type Preset = "today" | "7d" | "30d" | "all";

export default function OnlinePayments() {
  const [cfg, setCfg] = useState<PaymentProviderConfig | null>(null);
  const [data, setData] = useState<OnlinePaymentsPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [preset, setPreset] = useState<Preset>("30d");
  const [status, setStatus] = useState("");
  const [purpose, setPurpose] = useState("");
  const [env, setEnv] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [justCreated, setJustCreated] = useState<OnlinePayment | null>(null);

  const loadCfg = useCallback(() => { getPaymentProviderConfig("MontyPay").then(setCfg).catch(() => setCfg(null)); }, []);
  useEffect(() => { loadCfg(); }, [loadCfg]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const today = localYmd(new Date());
      const from = preset === "today" ? localMidnight(today)
        : preset === "7d" ? localMidnight(localYmd(new Date(Date.now() - 6 * 86400000)))
        : preset === "30d" ? localMidnight(localYmd(new Date(Date.now() - 29 * 86400000)))
        : undefined;
      const to = preset === "all" ? undefined : localMidnight(today, 1);
      setData(await listOnlinePayments({ from, to, status: status || undefined, purpose: purpose || undefined, environment: env || undefined, search: search || undefined, page, pageSize: 50 }));
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [preset, status, purpose, env, search, page]);

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  // Live: pending payments settle in the background — keep the list fresh.
  useEffect(() => {
    const id = window.setInterval(() => { if (document.visibilityState === "visible") load(); }, 30000);
    return () => window.clearInterval(id);
  }, [load]);

  const s = data?.summary;
  const sel = "h-9 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700";

  return (
    <div className="p-6 max-w-[1500px] mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Online Payments</h1>
          <p className="text-sm text-gray-500 mt-0.5">Every card payment taken online — event tickets, wallet top-ups, invoices and pay links — with what it was for and whether it settled.</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="h-11 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm">
          + Create pay link
        </button>
      </div>

      <ProviderCard cfg={cfg} onRefresh={loadCfg} />

      {justCreated && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 flex items-center gap-3 flex-wrap">
          <div className="text-green-800 text-sm font-semibold">Link created — {money(justCreated.amount, justCreated.currency)} · {justCreated.description}</div>
          <code className="text-xs bg-white border border-green-200 rounded px-2 py-1 break-all">{justCreated.payUrl}</code>
          <button onClick={() => copy(justCreated.payUrl)} className="text-xs px-3 h-8 rounded-lg bg-green-600 text-white">Copy</button>
          {justCreated.customerPhone && (
            <a target="_blank" rel="noreferrer" className="text-xs px-3 h-8 leading-8 rounded-lg bg-white border border-green-300 text-green-800"
              href={`https://wa.me/${justCreated.customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi${justCreated.customerName ? " " + justCreated.customerName : ""}, here is your AXIS payment link for ${justCreated.description} (${money(justCreated.amount, justCreated.currency)}): ${justCreated.payUrl}`)}`}>
              Send on WhatsApp
            </a>
          )}
          <button onClick={() => setJustCreated(null)} className="ml-auto text-xs text-green-700">dismiss</button>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(["today", "7d", "30d", "all"] as Preset[]).map((p) => (
            <button key={p} onClick={() => { setPreset(p); setPage(1); }}
              className={`px-3 h-9 text-xs font-medium ${preset === p ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
              {p === "today" ? "Today" : p === "7d" ? "7 days" : p === "30d" ? "30 days" : "All time"}
            </button>
          ))}
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={sel}>
          <option value="">All statuses</option>
          <option value="Paid">Paid</option>
          <option value="Open">Open (waiting)</option>
          <option value="Failed">Failed</option>
          <option value="Refunded">Refunded</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <select value={purpose} onChange={(e) => { setPurpose(e.target.value); setPage(1); }} className={sel}>
          <option value="">All purposes</option>
          <option value="EventTicket">🎟 Event tickets</option>
          <option value="WalletTopUp">👛 Wallet top-ups</option>
          <option value="Invoice">🧾 Invoices</option>
          <option value="Custom">🔗 Pay links</option>
        </select>
        <select value={env} onChange={(e) => { setEnv(e.target.value); setPage(1); }} className={sel}>
          <option value="">Sandbox + production</option>
          <option value="production">Production only</option>
          <option value="sandbox">Sandbox only</option>
        </select>
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="🔍 name, phone, code, gateway id…" className="h-9 flex-1 min-w-[200px] rounded-lg border border-gray-200 px-3 text-sm" />
        <button onClick={load} className="h-9 px-3 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">↻</button>
      </div>

      {/* Totals */}
      {s && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-green-50 border border-green-100 p-4">
            <div className="text-[11px] font-semibold uppercase text-green-700">✓ Paid online</div>
            <div className="text-2xl font-bold text-green-800">{money(s.paidAmount)}</div>
            <div className="text-[11px] text-green-600">{s.paidCount} payment{s.paidCount === 1 ? "" : "s"}{s.byPurpose.length > 0 && ` · ${s.byPurpose.map((b) => `${PURPOSE_ICON[b.key] ?? ""} ${money(b.paidAmount)}`).join(" · ")}`}</div>
          </div>
          <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
            <div className="text-[11px] font-semibold uppercase text-amber-700">⏳ Waiting</div>
            <div className="text-2xl font-bold text-amber-800">{money(s.pendingAmount)}</div>
            <div className="text-[11px] text-amber-600">{s.pendingCount} link{s.pendingCount === 1 ? "" : "s"} not paid yet</div>
          </div>
          <div className="rounded-2xl bg-red-50 border border-red-100 p-4">
            <div className="text-[11px] font-semibold uppercase text-red-700">✕ Failed / expired</div>
            <div className="text-2xl font-bold text-red-800">{money(s.failedAmount)}</div>
            <div className="text-[11px] text-red-600">{s.failedCount}</div>
          </div>
          <div className="rounded-2xl bg-purple-50 border border-purple-100 p-4">
            <div className="text-[11px] font-semibold uppercase text-purple-700">↩ Refunded / disputed</div>
            <div className="text-2xl font-bold text-purple-800">{money(s.refundedAmount)}</div>
            <div className="text-[11px] text-purple-600">{s.refundedCount}</div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {loading && !data ? <div className="py-12 flex justify-center"><Loader /></div> : !data || data.rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No online payments for these filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-[11px] uppercase text-gray-500">
                <tr>
                  <th className="text-left px-4 py-2">When</th>
                  <th className="text-left px-4 py-2">For</th>
                  <th className="text-left px-4 py-2">Customer</th>
                  <th className="text-right px-4 py-2">Amount</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Gateway</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.rows.map((p) => (
                  <tr key={p.id} className="hover:bg-indigo-50/30 cursor-pointer" onClick={() => setDetailId(p.id)}>
                    <td className="px-4 py-2.5 whitespace-nowrap text-gray-600">
                      {new Date(p.createdOn).toLocaleString()}
                      {p.environment === "sandbox" && <span className="ml-1 text-[10px] px-1 rounded bg-amber-100 text-amber-700">sandbox</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900">{PURPOSE_ICON[p.purpose] ?? "🔗"} {p.description}</div>
                      {p.referenceLabel && <div className="text-[11px] text-gray-400">{p.referenceLabel}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {p.customerName || "—"}
                      {p.customerPhone && <div className="text-[11px] text-gray-400">{p.customerPhone}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap">{money(p.amount, p.currency)}</td>
                    <td className="px-4 py-2.5">
                      <StatusPill s={p.status} />
                      {p.status === "Paid" && !p.isFulfilled && <div className="text-[10px] text-amber-600 mt-0.5">effect not applied</div>}
                      {p.status === "Failed" && p.failureReason && <div className="text-[10px] text-red-500 mt-0.5 max-w-[180px] truncate" title={p.failureReason}>{p.failureReason}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-gray-500">
                      {p.provider}{p.paymentMethodUsed ? ` · ${p.paymentMethodUsed}` : ""}{p.cardMasked ? ` · ${p.cardMasked}` : ""}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => copy(p.payUrl)} className="text-xs px-2 h-7 rounded border border-gray-200 hover:bg-gray-50" title="Copy pay link">link</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.totalCount > data.pageSize && (
          <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
            <span>{data.totalCount} payments</span>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 h-8 rounded-lg border border-gray-200 disabled:opacity-40">← Prev</button>
              <button disabled={page * data.pageSize >= data.totalCount} onClick={() => setPage((p) => p + 1)} className="px-3 h-8 rounded-lg border border-gray-200 disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      <CreateLinkModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(p) => { setCreateOpen(false); setJustCreated(p); load(); }} />
      <DetailModal id={detailId} onClose={() => setDetailId(null)} onChanged={load} />
    </div>
  );
}
