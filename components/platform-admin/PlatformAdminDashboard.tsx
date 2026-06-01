'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { SalonRow } from '@/app/pa/page';

type Stats = {
  totalSalons: number;
  activeSalons: number;
  totalBookings: number;
  claimedSalons: number;
};

type BookingRow = {
  booking_id: string;
  client_name: string;
  client_phone: string;
  service_name: string;
  date: string;
  time: string;
  status: string;
  created_at: string;
  salon_name: string;
  salon_slug: string;
};

type PaymentRow = {
  id: string;
  amount: number;
  currency: string;
  customerEmail: string | null;
  created: number;
  flow: string;
  planType: string | null;
  salonSlug: string | null;
};

type Tab = 'salons' | 'bookings' | 'payments';

export default function PlatformAdminDashboard({
  salons,
  recentBookings,
  stats,
}: {
  salons: SalonRow[];
  recentBookings: BookingRow[];
  stats: Stats;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('salons');
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [salonList, setSalonList] = useState<SalonRow[]>(salons);
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  const filteredSalons = useMemo(() => {
    return salonList.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q) ||
        (s.owner_email ?? '').toLowerCase().includes(q);
      const matchActive =
        filterActive === 'all' ||
        (filterActive === 'active' && s.is_active) ||
        (filterActive === 'inactive' && !s.is_active);
      return matchSearch && matchActive;
    });
  }, [salonList, search, filterActive]);

  async function handleImpersonate(salonId: string) {
    setImpersonating(salonId);
    try {
      const res = await fetch('/api/pa/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonId }),
      });
      const data = await res.json();
      if (data.magicLink) {
        window.open(data.magicLink, '_blank');
      }
    } finally {
      setImpersonating(null);
    }
  }

  async function handleToggleActive(salonId: string, current: boolean) {
    setToggling(salonId);
    try {
      const res = await fetch('/api/pa/salons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonId, isActive: !current }),
      });
      if (res.ok) {
        setSalonList((prev) =>
          prev.map((s) =>
            s.salon_id === salonId ? { ...s, is_active: !current } : s
          )
        );
      }
    } finally {
      setToggling(null);
    }
  }

  async function handleLoadPayments() {
    if (payments !== null) return;
    setPaymentsLoading(true);
    try {
      const res = await fetch('/api/pa/payments');
      const data = await res.json();
      setPayments(data.payments ?? []);
      setTotalRevenue(data.totalRevenue ?? 0);
    } finally {
      setPaymentsLoading(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/pa/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    router.push('/pa/sign-in');
  }

  function formatDate(iso: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('bg-BG', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function formatAmount(cents: number, currency: string) {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }

  function planLabel(plan: string | null) {
    const map: Record<string, string> = {
      solo: 'SOLO',
      ekip: 'ЕКИП',
      studio: 'СТУДИО',
      custom_domain: 'Домейн',
      sms_pack: 'SMS',
    };
    return plan ? (map[plan] ?? plan) : '—';
  }

  function statusBadge(isActive: boolean) {
    return isActive ? (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
        Активен
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 inline-block" />
        Неактивен
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-lg tracking-tight">Clicka</span>
          <span className="text-zinc-600 text-sm">/ Platform Admin</span>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="text-zinc-500 hover:text-white text-sm transition-colors disabled:opacity-40"
        >
          Изход
        </button>
      </div>

      {/* Stats */}
      <div className="px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Общо салони', value: stats.totalSalons },
          { label: 'Активни', value: stats.activeSalons },
          { label: 'Регистрирани', value: stats.claimedSalons },
          { label: 'Резервации', value: stats.totalBookings },
        ].map((s) => (
          <div key={s.label} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-zinc-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="px-6 flex gap-1 border-b border-zinc-900 mb-6">
        {([
          { id: 'salons', label: 'Салони' },
          { id: 'bookings', label: 'Резервации' },
          { id: 'payments', label: 'Плащания' },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              if (t.id === 'payments') handleLoadPayments();
            }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-white text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-6 pb-12">
        {/* Salons Tab */}
        {tab === 'salons' && (
          <>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <input
                type="search"
                placeholder="Търси по име, slug, имейл…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white
                           placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 flex-1"
              />
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value as typeof filterActive)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white
                           focus:outline-none focus:border-zinc-600"
              >
                <option value="all">Всички</option>
                <option value="active">Активни</option>
                <option value="inactive">Неактивни</option>
              </select>
            </div>

            <div className="text-xs text-zinc-600 mb-3">{filteredSalons.length} салона</div>

            <div className="space-y-2">
              {filteredSalons.map((salon) => (
                <div
                  key={salon.salon_id}
                  className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 hover:border-zinc-800 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white truncate">{salon.name}</span>
                        {statusBadge(salon.is_active)}
                        {salon.plan_type && (
                          <span className="text-xs bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded-full">
                            {planLabel(salon.plan_type)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-500">
                        <span>{salon.slug}.clicka.bg</span>
                        {salon.custom_domain && <span>🌐 {salon.custom_domain}</span>}
                        <span>{salon.email}</span>
                        {salon.owner_email && salon.owner_email !== salon.email && (
                          <span>собственик: {salon.owner_email}</span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-zinc-600">
                        <span>Рег: {formatDate(salon.created_at)}</span>
                        <span>{salon.booking_count} резервации</span>
                        {salon.stripe_session_id && <span>✓ Stripe</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleImpersonate(salon.salon_id)}
                        disabled={impersonating === salon.salon_id}
                        className="text-xs bg-zinc-900 hover:bg-zinc-800 text-white px-3 py-1.5
                                   rounded-lg transition-colors disabled:opacity-40"
                      >
                        {impersonating === salon.salon_id ? '…' : 'Влез'}
                      </button>
                      <button
                        onClick={() => handleToggleActive(salon.salon_id, salon.is_active)}
                        disabled={toggling === salon.salon_id}
                        className={`text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                          salon.is_active
                            ? 'bg-red-950 hover:bg-red-900 text-red-400'
                            : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-400'
                        }`}
                      >
                        {toggling === salon.salon_id
                          ? '…'
                          : salon.is_active
                          ? 'Деакт.'
                          : 'Активирай'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredSalons.length === 0 && (
                <div className="text-center text-zinc-600 py-12 text-sm">Няма резултати</div>
              )}
            </div>
          </>
        )}

        {/* Bookings Tab */}
        {tab === 'bookings' && (
          <div className="space-y-2">
            {recentBookings.length === 0 && (
              <div className="text-center text-zinc-600 py-12 text-sm">Няма резервации</div>
            )}
            {recentBookings.map((b) => (
              <div
                key={b.booking_id}
                className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white text-sm">{b.client_name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {b.salon_name} · {b.service_name} · {b.date} {b.time}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      b.status === 'completed'
                        ? 'bg-emerald-950 text-emerald-400'
                        : b.status === 'cancelled'
                        ? 'bg-red-950 text-red-400'
                        : 'bg-zinc-900 text-zinc-400'
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Payments Tab */}
        {tab === 'payments' && (
          <>
            {paymentsLoading && (
              <div className="text-center text-zinc-600 py-12 text-sm">Зарежда…</div>
            )}

            {!paymentsLoading && payments !== null && (
              <>
                <div className="mb-4 bg-zinc-950 border border-zinc-900 rounded-2xl p-4 inline-block">
                  <div className="text-2xl font-bold text-white">
                    {formatAmount(totalRevenue, 'eur')}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">Общи приходи (последни 100)</div>
                </div>

                <div className="space-y-2 mt-4">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-white text-sm">
                            {formatAmount(p.amount, p.currency)}
                          </div>
                          <div className="text-xs text-zinc-500 mt-0.5">
                            {p.customerEmail ?? '—'}
                            {p.planType && ` · ${planLabel(p.planType)}`}
                            {p.salonSlug && ` · ${p.salonSlug}`}
                          </div>
                        </div>
                        <div className="text-xs text-zinc-600">
                          {formatDate(new Date(p.created * 1000).toISOString())}
                        </div>
                      </div>
                    </div>
                  ))}

                  {payments.length === 0 && (
                    <div className="text-center text-zinc-600 py-12 text-sm">Няма плащания</div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
