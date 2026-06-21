'use client';

import { useMemo, useState, type ButtonHTMLAttributes } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  ChevronDown,
  CreditCard,
  LogOut,
  Mail,
  Search,
  Sparkles,
} from 'lucide-react';
import type { SalonRow } from '@/app/pa/page';
import { ApiKeysPanel } from './ApiKeysPanel';
import { ResendSettingsPanel } from './ResendSettingsPanel';
import { NewSalonForm } from './NewSalonForm';

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

type InviteNotice = {
  salonId: string;
  tone: 'success' | 'error';
  message: string;
};

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
    solo: 'Solo',
    team: 'Екип',
    solo_bonus_12m: 'Solo 12м',
    solo_bonus_6m: 'Solo 6м',
    team_bonus_12m: 'Екип 12м',
    team_bonus_6m: 'Екип 6м',
    custom_domain: 'Домейн',
    sms_pack: 'SMS',
  };
  return plan ? (map[plan] ?? plan) : null;
}

function shellCard(extra = '') {
  return `rounded-[28px] border border-black/10 bg-white shadow-[0_18px_40px_rgba(0,0,0,0.06)] ${extra}`;
}

function actionButton({
  tone = 'dark',
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'dark' | 'green' | 'ghost' | 'danger';
}) {
  const tones = {
    dark: 'bg-black text-white border-black hover:bg-black/92',
    green: 'bg-[#15803d] text-white border-[#15803d] hover:bg-[#166534]',
    ghost: 'bg-white text-black border-black/12 hover:border-black/24',
    danger: 'bg-white text-[#b91c1c] border-[#fecaca] hover:border-[#fca5a5]',
  };

  return (
    <button
      {...props}
      className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${tones[tone]} disabled:cursor-default disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className={`${shellCard()} p-12 text-center`}>
      <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full border border-black/10">
        <Sparkles className="h-5 w-5 text-[#15803d]" />
      </div>
      <div className="text-lg font-semibold text-black">{title}</div>
      <div className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/48">{body}</div>
    </div>
  );
}

function SidebarTabButton({
  active,
  label,
  note,
  onClick,
}: {
  active: boolean;
  label: string;
  note: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
        active
          ? 'border-black bg-black text-white'
          : 'border-black/10 bg-white text-black hover:border-black/22'
      }`}
    >
      <div className="text-sm font-semibold">{label}</div>
      {note ? (
        <div className={`mt-1 text-sm ${active ? 'text-white/68' : 'text-black/45'}`}>{note}</div>
      ) : null}
    </button>
  );
}

export default function PlatformAdminDashboard({
  salons,
  recentBookings,
}: {
  salons: SalonRow[];
  recentBookings: BookingRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('salons');
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [expandedSalon, setExpandedSalon] = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [sendingInvite, setSendingInvite] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [settingPlan, setSettingPlan] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [salonList, setSalonList] = useState<SalonRow[]>(salons);
  const [inviteNotice, setInviteNotice] = useState<InviteNotice | null>(null);
  const [inviteEmails, setInviteEmails] = useState<Record<string, string>>(() =>
    Object.fromEntries(salons.map((salon) => [salon.salon_id, salon.email ?? ''])),
  );

  const filteredSalons = useMemo(() => {
    return salonList.filter((salon) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        salon.name.toLowerCase().includes(q) ||
        salon.slug.toLowerCase().includes(q) ||
        (salon.email ?? '').toLowerCase().includes(q) ||
        (salon.owner_email ?? '').toLowerCase().includes(q);
      const matchesActive =
        filterActive === 'all' ||
        (filterActive === 'active' && salon.is_active) ||
        (filterActive === 'inactive' && !salon.is_active);
      return matchesSearch && matchesActive;
    });
  }, [filterActive, salonList, search]);

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

  async function handleSendInvite(salonId: string) {
    setInviteNotice(null);
    setSendingInvite(salonId);
    try {
      const email = (inviteEmails[salonId] ?? '').trim();
      const res = await fetch('/api/pa/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonId, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setInviteNotice({
          salonId,
          tone: 'error',
          message: typeof data.error === 'string' ? data.error : 'Не успяхме да изпратим magic link.',
        });
        return;
      }
      setInviteNotice({
        salonId,
        tone: 'success',
        message:
          data.emailSent === false
            ? 'Magic link е генериран, но имейл не е изпратен. Провери email настройките.'
            : `Magic link е изпратен на ${typeof data.email === 'string' ? data.email : email}.`,
      });
    } finally {
      setSendingInvite(null);
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
          prev.map((salon) =>
            salon.salon_id === salonId ? { ...salon, is_active: !current } : salon,
          ),
        );
      }
    } finally {
      setToggling(null);
    }
  }

  async function handleSetPlan(salonId: string, planType: string | null) {
    setSettingPlan(salonId);
    try {
      const res = await fetch('/api/pa/salons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonId, planType }),
      });
      if (res.ok) {
        setSalonList((prev) =>
          prev.map((salon) =>
            salon.salon_id === salonId ? { ...salon, plan_type: planType } : salon,
          ),
        );
      }
    } finally {
      setSettingPlan(null);
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

  const tabMeta: Array<{ id: Tab; label: string; note: string }> = [
    { id: 'salons', label: 'Салони', note: '' },
    { id: 'bookings', label: 'Резервации', note: '' },
    { id: 'payments', label: 'Плащания', note: '' },
  ];

  return (
    <div className="min-h-dvh bg-white text-black">
      <div className="mx-auto max-w-[1620px] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
          <aside className={`${shellCard('h-fit p-4 xl:sticky xl:top-4')}`}>
            <div className="mt-4 space-y-3">
              {tabMeta.map((item) => (
                <SidebarTabButton
                  key={item.id}
                  active={tab === item.id}
                  label={item.label}
                  note={item.note}
                  onClick={() => {
                    setTab(item.id);
                    if (item.id === 'payments') void handleLoadPayments();
                  }}
                />
              ))}
            </div>

            <div className="mt-4 grid gap-3">
              <NewSalonForm onCreated={() => window.location.reload()} />
              {actionButton({
                tone: 'ghost',
                onClick: handleLogout,
                disabled: loggingOut,
                className: 'w-full',
                children: (
                  <>
                    <LogOut className="h-4 w-4" />
                    {loggingOut ? 'Излиза…' : 'Изход'}
                  </>
                ),
              })}
            </div>
          </aside>

          <main className={`${shellCard('overflow-hidden')}`}>
            <div className="border-b border-black/8 px-4 py-4 sm:px-6">
              <div className="flex flex-wrap gap-2">
                {tabMeta.map((item) => {
                  const active = tab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setTab(item.id);
                        if (item.id === 'payments') void handleLoadPayments();
                      }}
                      className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                        active
                          ? 'border-black bg-black text-white'
                          : 'border-black/10 bg-white text-black/62 hover:border-black/25 hover:text-black'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {tab === 'salons' && (
              <div className="p-4 sm:p-6">
              <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
                <label className={`${shellCard('flex items-center gap-3 px-4 py-3 shadow-none')}`}>
                  <Search className="h-4 w-4 text-black/32" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Търси по име, slug, имейл"
                    className="w-full border-0 bg-transparent text-sm text-black outline-none placeholder:text-black/28"
                  />
                </label>

                <div className={`${shellCard('relative px-4 py-3 shadow-none')}`}>
                  <select
                    value={filterActive}
                    onChange={(e) => setFilterActive(e.target.value as typeof filterActive)}
                    className="w-full appearance-none border-0 bg-transparent pr-8 text-sm font-medium text-black outline-none"
                  >
                    <option value="all">Всички салони</option>
                    <option value="active">Само активни</option>
                    <option value="inactive">Само неактивни</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
                </div>
              </div>

              <div className="mb-5 text-sm text-black/45">{filteredSalons.length} салона</div>

              {filteredSalons.length === 0 ? (
                <EmptyState
                  title="Няма съвпадения"
                  body="Промени търсенето или филтъра и ще покажем правилните салони веднага."
                />
              ) : (
                <div className="space-y-4">
                  {filteredSalons.map((salon) => {
                    const isExpanded = expandedSalon === salon.salon_id;
                    const plan = planLabel(salon.plan_type);
                    const statusLabel = salon.is_active ? 'Активен' : 'Неактивен';

                    return (
                      <article key={salon.salon_id} className={shellCard('overflow-hidden')}>
                        <button
                          type="button"
                          onClick={() => setExpandedSalon(isExpanded ? null : salon.salon_id)}
                          className="w-full px-5 py-5 text-left sm:px-6"
                        >
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div className="min-w-0">
                              <div className="mb-3 flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-black/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-black/35">
                                  {salon.slug}
                                </span>
                                <span className="text-xl font-semibold tracking-[-0.04em] text-black">
                                  {salon.name}
                                </span>
                                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                                  salon.is_active
                                    ? 'border-[#bbf7d0] text-[#15803d]'
                                    : 'border-black/10 text-black/45'
                                }`}>
                                  {statusLabel}
                                </span>
                                {plan && (
                                  <span className="rounded-full border border-black/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/58">
                                    {plan}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-black/50">
                                <span>{salon.custom_domain || `${salon.slug}.site`}</span>
                                <span>{inviteEmails[salon.salon_id] || salon.email}</span>
                                <span>{salon.booking_count} резервации</span>
                                <span>Създаден: {formatDate(salon.created_at)}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-5 text-sm text-black/42">
                              <div className="text-right">
                                <div className="text-[11px] uppercase tracking-[0.18em] text-black/28">Owner</div>
                                <div className="mt-1 max-w-[240px] truncate text-black/62">
                                  {salon.owner_email || 'Все още няма owner'}
                                </div>
                              </div>
                              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${
                                isExpanded ? 'border-black bg-black text-white' : 'border-black/10 text-black/48'
                              }`}>
                                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </span>
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-black/8 px-5 pb-6 pt-5 sm:px-6">
                            {inviteNotice?.salonId === salon.salon_id && (
                              <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${
                                inviteNotice.tone === 'success'
                                  ? 'border-[#bbf7d0] text-[#166534]'
                                  : 'border-[#fecaca] text-[#b91c1c]'
                              }`}>
                                {inviteNotice.message}
                              </div>
                            )}

                            <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                              <div className={`${shellCard('p-5 shadow-none')}`}>
                                <div className="mb-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-black/32">
                                  Overview
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                  <div>
                                    <div className="text-xs uppercase tracking-[0.16em] text-black/28">Slug</div>
                                    <div className="mt-1 text-sm font-medium text-black">{salon.slug}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs uppercase tracking-[0.16em] text-black/28">Домейн</div>
                                    <div className="mt-1 text-sm font-medium text-black">
                                      {salon.custom_domain || 'Няма custom domain'}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs uppercase tracking-[0.16em] text-black/28">Имейл за magic link</div>
                                    <input
                                      type="email"
                                      value={inviteEmails[salon.salon_id] ?? ''}
                                      onChange={(e) =>
                                        setInviteEmails((prev) => ({
                                          ...prev,
                                          [salon.salon_id]: e.target.value,
                                        }))
                                      }
                                      placeholder="client@email.com"
                                      className="mt-1 min-h-[46px] w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm font-medium text-black outline-none focus:border-black/24"
                                    />
                                  </div>
                                  <div>
                                    <div className="text-xs uppercase tracking-[0.16em] text-black/28">Owner login</div>
                                    <div className="mt-1 text-sm font-medium text-black">
                                      {salon.owner_email || 'Не е claim-нат'}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className={`${shellCard('p-5 shadow-none')}`}>
                                <div className="mb-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-black/32">
                                  Access
                                </div>
                                <div className="space-y-3 text-sm">
                                  <div className="rounded-2xl border border-black/10 px-4 py-3">
                                    <div className="text-xs uppercase tracking-[0.16em] text-black/28">Admin URL</div>
                                    <div className="mt-1 font-medium text-black">
                                      {`${salon.slug}.clicka.bg/admin`}
                                    </div>
                                  </div>
                                  <div className="rounded-2xl border border-black/10 px-4 py-3">
                                    <div className="text-xs uppercase tracking-[0.16em] text-black/28">Публичен сайт</div>
                                    <div className="mt-1 font-medium text-black">
                                      {salon.custom_domain || `${salon.slug}.clicka.bg`}
                                    </div>
                                  </div>
                                  <div className="rounded-2xl border border-black/10 px-4 py-3">
                                    <div className="text-xs uppercase tracking-[0.16em] text-black/28">Domain status</div>
                                    <div className="mt-1 font-medium text-black">
                                      {salon.domain_status || 'Няма custom domain'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="mb-6">
                              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-black/32">
                                Actions
                              </div>
                              <div className="grid gap-3 lg:grid-cols-4">
                                {actionButton({
                                  tone: 'green',
                                  onClick: () => handleImpersonate(salon.salon_id),
                                  disabled: impersonating === salon.salon_id,
                                  className: 'w-full',
                                  children: (
                                    <>
                                      <ArrowUpRight className="h-4 w-4" />
                                      {impersonating === salon.salon_id ? 'Отваря…' : 'Влез в панела'}
                                    </>
                                  ),
                                })}
                                {actionButton({
                                  tone: 'dark',
                                  onClick: () => handleSendInvite(salon.salon_id),
                                  disabled: sendingInvite === salon.salon_id,
                                  className: 'w-full',
                                  children: (
                                    <>
                                      <Mail className="h-4 w-4" />
                                      {sendingInvite === salon.salon_id ? 'Изпраща…' : 'Изпрати magic link'}
                                    </>
                                  ),
                                })}
                                {actionButton({
                                  tone: 'ghost',
                                  onClick: () => handleSetPlan(salon.salon_id, 'solo_bonus_12m'),
                                  disabled: settingPlan === salon.salon_id,
                                  className: 'w-full',
                                  children: settingPlan === salon.salon_id ? 'Записва…' : 'Solo 12м plan',
                                })}
                                {actionButton({
                                  tone: salon.is_active ? 'danger' : 'ghost',
                                  onClick: () => handleToggleActive(salon.salon_id, salon.is_active),
                                  disabled: toggling === salon.salon_id,
                                  className: 'w-full',
                                  children:
                                    toggling === salon.salon_id
                                      ? 'Обновява…'
                                      : salon.is_active
                                      ? 'Деактивирай'
                                      : 'Активирай',
                                })}
                              </div>
                            </div>

                            <div className="mb-6">
                              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-black/32">
                                Bonus plans
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                {([
                                  { value: 'solo_bonus_12m', label: 'Solo · 12 месеца' },
                                  { value: 'solo_bonus_6m', label: 'Solo · 6 месеца' },
                                  { value: 'team_bonus_12m', label: 'Екип · 12 месеца' },
                                  { value: 'team_bonus_6m', label: 'Екип · 6 месеца' },
                                ] as Array<{ value: string; label: string }>).map((planOption) => {
                                  const active = salon.plan_type === planOption.value;
                                  return (
                                    <button
                                      key={planOption.value}
                                      type="button"
                                      onClick={() => !active && handleSetPlan(salon.salon_id, planOption.value)}
                                      disabled={settingPlan === salon.salon_id || active}
                                      className={`rounded-2xl border px-4 py-4 text-left transition ${
                                        active
                                          ? 'border-[#15803d] text-[#166534]'
                                          : 'border-black/10 text-black hover:border-black/25'
                                      } disabled:opacity-50`}
                                    >
                                      <div className="text-sm font-semibold">{planOption.label}</div>
                                      <div className="mt-2 text-xs text-black/42">
                                        {active ? 'Текущо избран план' : 'Превключи плана за този салон'}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="grid gap-4 xl:grid-cols-2">
                              <div className={shellCard('p-5 shadow-none')}>
                                <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-black/32">
                                  API keys
                                </div>
                                <ApiKeysPanel salonId={salon.salon_id} />
                              </div>
                              <div className={shellCard('p-5 shadow-none')}>
                                <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-black/32">
                                  Email sender
                                </div>
                                <ResendSettingsPanel salonId={salon.salon_id} />
                              </div>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
              </div>
            )}

            {tab === 'bookings' && (
              <div className="p-4 sm:p-6">
              {recentBookings.length === 0 ? (
                <EmptyState
                  title="Няма скорошни резервации"
                  body="Когато започнат да идват нови записи, тук ще имаш бърз оперативен преглед."
                />
              ) : (
                <div className="space-y-4">
                  {recentBookings.map((booking) => (
                    <article key={booking.booking_id} className={`${shellCard()} p-5 sm:p-6`}>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-semibold tracking-[-0.04em] text-black">
                              {booking.client_name}
                            </span>
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                              booking.status === 'completed'
                                ? 'border-[#bbf7d0] text-[#15803d]'
                                : booking.status === 'cancelled'
                                ? 'border-[#fecaca] text-[#b91c1c]'
                                : 'border-black/10 text-black/45'
                            }`}>
                              {booking.status}
                            </span>
                          </div>
                          <div className="mt-2 text-sm leading-6 text-black/52">
                            {booking.salon_name} · {booking.service_name} · {booking.date} в {booking.time}
                          </div>
                        </div>
                        <div className="text-sm text-black/42">
                          {formatDate(booking.created_at)}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              </div>
            )}

            {tab === 'payments' && (
              <div className="p-4 sm:p-6">
              {paymentsLoading ? (
                <EmptyState title="Зареждаме плащанията" body="Събираме последните транзакции и total revenue." />
              ) : payments === null ? (
                <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className={`${shellCard()} p-8`}>
                    <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-black/32">
                      Revenue snapshot
                    </div>
                    <div className="max-w-lg text-[2rem] font-semibold leading-tight tracking-[-0.06em] text-black">
                      Зареди плащанията, за да видиш приходите и последните движения.
                    </div>
                    <div className="mt-4 text-sm leading-7 text-black/48">
                      Този изглед е направен за бърз финансов преглед, не за счетоводен export.
                    </div>
                  </div>
                  <div className={`${shellCard()} flex items-center justify-center p-8`}>
                    {actionButton({
                      tone: 'green',
                      onClick: () => void handleLoadPayments(),
                      children: (
                        <>
                          <CreditCard className="h-4 w-4" />
                          Зареди плащанията
                        </>
                      ),
                    })}
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className={`${shellCard()} p-6`}>
                      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-black/32">
                        Total revenue
                      </div>
                      <div className="text-5xl font-semibold tracking-[-0.08em] text-black">
                        {formatAmount(totalRevenue, 'eur')}
                      </div>
                      <div className="mt-3 text-sm text-black/46">
                        Последни 100 плащания в системата.
                      </div>
                    </div>
                    <div className={`${shellCard()} p-6`}>
                      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-black/32">
                        Notes
                      </div>
                      <div className="space-y-3 text-sm leading-7 text-black/52">
                        <p>Плащанията тук са за оперативен мониторинг и бърза проверка на plan и customer activity.</p>
                        <p>Ако искаш по-дълбок finance panel, следващата стъпка е отделен payments workspace с филтри и export.</p>
                      </div>
                    </div>
                  </div>

                  {payments.length === 0 ? (
                    <EmptyState
                      title="Няма плащания"
                      body="Когато системата получи първите транзакции, те ще се покажат тук."
                    />
                  ) : (
                    <div className="space-y-4">
                      {payments.map((payment) => (
                        <article key={payment.id} className={`${shellCard()} p-5 sm:p-6`}>
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="text-xl font-semibold tracking-[-0.04em] text-black">
                                {formatAmount(payment.amount, payment.currency)}
                              </div>
                              <div className="mt-2 text-sm leading-6 text-black/52">
                                {payment.customerEmail ?? 'Без customer email'}
                                {payment.planType ? ` · ${planLabel(payment.planType)}` : ''}
                                {payment.salonSlug ? ` · ${payment.salonSlug}` : ''}
                              </div>
                            </div>
                            <div className="text-sm text-black/42">
                              {formatDate(new Date(payment.created * 1000).toISOString())}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
