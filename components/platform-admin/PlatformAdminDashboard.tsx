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

/* ── SVG Icons ─────────────────────────────────────────────── */
function IconSearch({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  );
}
function IconLogout({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
function IconBuilding({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}
function IconCalendar({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}
function IconCreditCard({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  );
}
function IconUsers({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
function IconChevronRight({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}
function IconGlobe({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}
function IconExternalLink({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  );
}

/* ── Helpers ────────────────────────────────────────────────── */
function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('bg-BG', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}
function formatAmount(cents: number, currency: string) {
  return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}
function planLabel(plan: string | null) {
  const map: Record<string, string> = {
    solo: 'SOLO', ekip: 'ЕКИП', studio: 'СТУДИО',
    custom_domain: 'Домейн', sms_pack: 'SMS',
  };
  return plan ? (map[plan] ?? plan) : null;
}

/* ── Main component ─────────────────────────────────────────── */
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
  const [expandedSalon, setExpandedSalon] = useState<string | null>(null);

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
      if (data.magicLink) window.open(data.magicLink, '_blank');
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
          prev.map((s) => s.salon_id === salonId ? { ...s, is_active: !current } : s)
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

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'salons',   label: 'Салони',      icon: <IconBuilding className="w-4 h-4" /> },
    { id: 'bookings', label: 'Резервации',  icon: <IconCalendar className="w-4 h-4" /> },
    { id: 'payments', label: 'Плащания',    icon: <IconCreditCard className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-dvh bg-gray-50 font-sans text-gray-900">

      {/* ── Header ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Gradient logo mark */}
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
              style={{ background: 'linear-gradient(135deg,#6366f1,#ec4899)' }}
              aria-label="Clicka"
            >
              C
            </span>
            <span className="font-semibold text-sm text-gray-900 leading-none">
              Platform Admin
            </span>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900
                       transition-colors duration-150 cursor-pointer disabled:opacity-40
                       min-h-[44px] px-2"
            aria-label="Изход"
          >
            <IconLogout className="w-4 h-4" />
            <span className="hidden sm:inline">Изход</span>
          </button>
        </div>
      </header>

      {/* ── Stats cards ──────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 pt-5 pb-2 grid grid-cols-2 gap-3">
        {[
          { label: 'Общо салони',    value: stats.totalSalons,   icon: <IconBuilding className="w-5 h-5" />,   from: '#6366f1', to: '#818cf8' },
          { label: 'Активни',        value: stats.activeSalons,  icon: <IconGlobe className="w-5 h-5" />,      from: '#10b981', to: '#34d399' },
          { label: 'Регистрирани',   value: stats.claimedSalons, icon: <IconUsers className="w-5 h-5" />,      from: '#f59e0b', to: '#fbbf24' },
          { label: 'Резервации',     value: stats.totalBookings, icon: <IconCalendar className="w-5 h-5" />,   from: '#ec4899', to: '#f472b6' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white mb-3"
              style={{ background: `linear-gradient(135deg,${s.from},${s.to})` }}
            >
              {s.icon}
            </div>
            <div className="text-2xl font-bold text-gray-900 leading-none">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 mt-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-gray-100">
            {tabs.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTab(t.id);
                    if (t.id === 'payments') handleLoadPayments();
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium
                               transition-colors duration-150 cursor-pointer min-h-[48px]
                               ${active
                                 ? 'text-gray-900 border-b-2'
                                 : 'text-gray-400 hover:text-gray-700 border-b-2 border-transparent'}`}
                  style={active ? { borderBottomColor: '#6366f1' } : {}}
                >
                  <span style={active ? { color: '#6366f1' } : {}}>{t.icon}</span>
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* ── TAB: Салони ────────────────────────────────── */}
          {tab === 'salons' && (
            <div className="p-4 space-y-3">
              {/* Search + filter */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="search"
                    placeholder="Търси салон, имейл…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200
                               rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': '#6366f1' } as React.CSSProperties}
                  />
                </div>
                <select
                  value={filterActive}
                  onChange={(e) => setFilterActive(e.target.value as typeof filterActive)}
                  className="px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl
                             focus:outline-none cursor-pointer min-h-[44px]"
                >
                  <option value="all">Всички</option>
                  <option value="active">Активни</option>
                  <option value="inactive">Неактивни</option>
                </select>
              </div>

              <p className="text-xs text-gray-400">{filteredSalons.length} салона</p>

              {/* Salon list */}
              <div className="space-y-2">
                {filteredSalons.length === 0 && (
                  <div className="text-center py-12 text-sm text-gray-400">Няма резултати</div>
                )}
                {filteredSalons.map((salon) => {
                  const isExpanded = expandedSalon === salon.salon_id;
                  const plan = planLabel(salon.plan_type);
                  return (
                    <div
                      key={salon.salon_id}
                      className="border border-gray-100 rounded-2xl overflow-hidden"
                    >
                      {/* Row header — tappable */}
                      <button
                        onClick={() => setExpandedSalon(isExpanded ? null : salon.salon_id)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left
                                   hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                        aria-expanded={isExpanded}
                      >
                        {/* Avatar */}
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center
                                     text-white text-sm font-bold shrink-0"
                          style={{ background: 'linear-gradient(135deg,#6366f1,#ec4899)' }}
                          aria-hidden="true"
                        >
                          {salon.name.charAt(0).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-gray-900 truncate">
                              {salon.name}
                            </span>
                            {/* Active dot */}
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${salon.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`}
                              title={salon.is_active ? 'Активен' : 'Неактивен'}
                            />
                            {plan && (
                              <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: 'linear-gradient(135deg,#ede9fe,#fce7f3)', color: '#7c3aed' }}
                              >
                                {plan}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 truncate mt-0.5">
                            {salon.slug}.clicka.bg
                            {salon.custom_domain ? ` · ${salon.custom_domain}` : ''}
                          </div>
                        </div>

                        <IconChevronRight
                          className={`w-4 h-4 text-gray-300 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      </button>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                          {/* Info grid */}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Имейл</p>
                              <p className="text-gray-800 break-all">{salon.email}</p>
                            </div>
                            {salon.owner_email && (
                              <div>
                                <p className="text-xs text-gray-400 mb-0.5">Собственик</p>
                                <p className="text-gray-800 break-all">{salon.owner_email}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Регистриран</p>
                              <p className="text-gray-800">{formatDate(salon.created_at)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Резервации</p>
                              <p className="text-gray-800">{salon.booking_count}</p>
                            </div>
                            {salon.stripe_session_id && (
                              <div>
                                <p className="text-xs text-gray-400 mb-0.5">Stripe</p>
                                <p className="text-emerald-600 text-xs font-medium">✓ Платен</p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Статус</p>
                              <p className={`text-xs font-medium ${salon.is_active ? 'text-emerald-600' : 'text-gray-400'}`}>
                                {salon.is_active ? 'Активен' : 'Неактивен'}
                              </p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-1">
                            {/* Impersonate */}
                            <button
                              onClick={() => handleImpersonate(salon.salon_id)}
                              disabled={impersonating === salon.salon_id}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5
                                         rounded-xl text-sm font-semibold text-white
                                         transition-opacity duration-150 cursor-pointer
                                         disabled:opacity-40 min-h-[44px]"
                              style={{ background: 'linear-gradient(135deg,#6366f1,#ec4899)' }}
                            >
                              <IconExternalLink className="w-4 h-4" />
                              {impersonating === salon.salon_id ? 'Зарежда…' : 'Влез в панела'}
                            </button>

                            {/* Toggle active */}
                            <button
                              onClick={() => handleToggleActive(salon.salon_id, salon.is_active)}
                              disabled={toggling === salon.salon_id}
                              className={`px-4 py-2.5 rounded-xl text-sm font-semibold
                                          transition-colors duration-150 cursor-pointer
                                          disabled:opacity-40 min-h-[44px] border
                                          ${salon.is_active
                                            ? 'border-red-200 text-red-500 bg-red-50 hover:bg-red-100'
                                            : 'border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100'}`}
                            >
                              {toggling === salon.salon_id
                                ? '…'
                                : salon.is_active ? 'Деакт.' : 'Активирай'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── TAB: Резервации ────────────────────────────── */}
          {tab === 'bookings' && (
            <div className="p-4 space-y-2">
              {recentBookings.length === 0 && (
                <div className="text-center py-12 text-sm text-gray-400">Няма резервации</div>
              )}
              {recentBookings.map((b) => (
                <div key={b.booking_id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#ec4899)' }}
                    aria-hidden="true"
                  >
                    {b.client_name?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{b.client_name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {b.salon_name} · {b.service_name} · {b.date} {b.time}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${
                      b.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : b.status === 'cancelled'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── TAB: Плащания ──────────────────────────────── */}
          {tab === 'payments' && (
            <div className="p-4">
              {paymentsLoading && (
                <div className="flex items-center justify-center py-12 gap-2 text-gray-400 text-sm">
                  <span className="w-4 h-4 rounded-full border-2 border-gray-200 border-t-indigo-500 animate-spin" />
                  Зарежда…
                </div>
              )}

              {!paymentsLoading && payments !== null && (
                <>
                  {/* Total */}
                  <div
                    className="rounded-2xl p-4 mb-4 text-white"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#ec4899)' }}
                  >
                    <p className="text-xs opacity-80 mb-1">Общи приходи</p>
                    <p className="text-3xl font-bold">{formatAmount(totalRevenue, 'eur')}</p>
                    <p className="text-xs opacity-70 mt-1">последни 100 плащания</p>
                  </div>

                  <div className="space-y-2">
                    {payments.length === 0 && (
                      <div className="text-center py-8 text-sm text-gray-400">Няма плащания</div>
                    )}
                    {payments.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                          style={{ background: 'linear-gradient(135deg,#10b981,#34d399)' }}
                          aria-hidden="true"
                        >
                          <IconCreditCard className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatAmount(p.amount, p.currency)}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {p.customerEmail ?? '—'}
                            {p.planType ? ` · ${planLabel(p.planType)}` : ''}
                            {p.salonSlug ? ` · ${p.salonSlug}` : ''}
                          </p>
                        </div>
                        <p className="text-xs text-gray-400 shrink-0">
                          {formatDate(new Date(p.created * 1000).toISOString())}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom safe-area spacer */}
      <div className="h-8" />
    </div>
  );
}
