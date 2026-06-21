'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

function blockCyrillic(e: React.KeyboardEvent<HTMLInputElement>) {
  if (/[Ѐ-ӿ]/.test(e.key)) e.preventDefault();
}

function stripCyrillic(value: string) {
  return value.replace(/[Ѐ-ӿ]/g, '');
}

function shellCard(extra = '') {
  return `rounded-[30px] border border-black/10 bg-white shadow-[0_24px_60px_rgba(0,0,0,0.08)] ${extra}`;
}

function MiniCard({
  title,
  value,
  note,
  accent,
}: {
  title: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <div className={`${shellCard('p-5 shadow-none')}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/30">{title}</div>
      <div className={`mt-5 text-[2rem] font-semibold leading-none tracking-[-0.06em] ${accent ? 'text-[#15803d]' : 'text-black'}`}>
        {value}
      </div>
      <div className="mt-2 text-sm leading-6 text-black/46">{note}</div>
    </div>
  );
}

export default function PlatformAdminSignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/pa/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (data.ok) {
      router.push('/pa');
    } else {
      setError(data.error ?? 'Грешен имейл или парола');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-white px-4 py-4 sm:px-6 lg:px-8">
      <div className={`${shellCard('mx-auto min-h-[calc(100dvh-2rem)] max-w-[1540px] overflow-hidden')}`}>
        <div className="grid min-h-[calc(100dvh-2rem)] xl:grid-cols-[110px_minmax(0,1.1fr)_420px]">
          <aside className="hidden border-r border-black/8 xl:flex xl:flex-col xl:justify-between xl:p-5">
            <div>
              <div className="flex h-14 items-center justify-center rounded-[24px] border border-black/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/clicka-logo.svg" alt="Clicka" className="h-8 w-8" />
              </div>

              <div className="mt-8 space-y-3">
                {[
                  { icon: Building2, active: true },
                  { icon: ShieldCheck },
                  { icon: Sparkles },
                  { icon: LockKeyhole },
                ].map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={index}
                      className={`flex h-14 items-center justify-center rounded-[22px] border ${
                        item.active
                          ? 'border-black bg-black text-white'
                          : 'border-black/10 bg-white text-black/42'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex h-12 items-center justify-center rounded-[22px] border border-black/10 text-black/42">
                <CircleDot className="h-4 w-4" />
              </div>
              <div className="flex h-12 items-center justify-center rounded-[22px] border border-black/10 text-black/42">
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </aside>

          <section className="border-b border-black/8 p-5 sm:p-6 xl:border-b-0 xl:border-r xl:border-black/8 xl:p-8 2xl:p-10">
            <div className="inline-flex items-center gap-3 rounded-full border border-black/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-black/42">
              <span className="h-2 w-2 rounded-full bg-[#15803d]" />
              Platform Admin
            </div>

            <div className="mt-6 max-w-3xl">
              <h1 className="text-[clamp(2.8rem,6vw,6rem)] font-semibold leading-[0.9] tracking-[-0.08em] text-black">
                Control room
                <br />
                for premium client sites.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-black/50">
                Същият спокоен product feel като dashboard-а, но преведен в login екран:
                ясно, чисто и подредено за бърз достъп.
              </p>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              <MiniCard title="Clients" value="24" note="Активни салони в agency workspace-а." />
              <MiniCard title="Access" value="/admin" note="Единният вход за custom domain сайтовете." accent />
              <MiniCard title="Invites" value="Magic link" note="Бърз onboarding без ръчни обяснения." />
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className={`${shellCard('p-6 shadow-none')}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/30">
                      Workspace preview
                    </div>
                    <div className="mt-2 text-xl font-semibold tracking-[-0.04em] text-black">
                      Agency operations
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#bbf7d0] px-3 py-1.5 text-xs font-semibold text-[#15803d]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Active
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  <div className="rounded-[24px] border border-black/10 p-4">
                    <div className="text-sm font-semibold text-black">Salon onboarding</div>
                    <div className="mt-2 text-sm leading-6 text-black/48">
                      Създаване на салон, custom domain и изпращане на magic link.
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-black/10 p-4">
                    <div className="text-sm font-semibold text-black">Access control</div>
                    <div className="mt-2 text-sm leading-6 text-black/48">
                      Impersonate, owner login, fallback URL и domain status на едно място.
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-[26px] border border-black/10 p-4">
                  <div className="flex items-center justify-between border-b border-black/8 pb-3">
                    <div className="text-sm font-semibold text-black">Quick rules</div>
                    <div className="text-xs uppercase tracking-[0.16em] text-black/28">Standard</div>
                  </div>
                  <div className="space-y-3 pt-4 text-sm text-black/62">
                    <div className="flex items-start justify-between gap-4">
                      <span>Custom domain admin</span>
                      <span className="font-medium text-black">domain.com/admin</span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span>Fallback login</span>
                      <span className="font-medium text-black">slug.clicka.bg/admin</span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span>Admin subdomain</span>
                      <span className="font-medium text-black">Не е нужен</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`${shellCard('p-6 shadow-none')}`}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/30">
                  Why this layout
                </div>
                <div className="mt-3 text-lg font-semibold tracking-[-0.04em] text-black">
                  Dashboard first, form second.
                </div>
                <div className="mt-3 text-sm leading-6 text-black/48">
                  Екранът вече не е просто форма, а вход към самата система. Това му дава повече
                  тежест и по-премиум усещане.
                </div>
              </div>
            </div>
          </section>

          <section className="flex items-center p-5 sm:p-6 xl:p-8">
            <div className="mx-auto w-full max-w-[360px]">
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-black/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/38">
                  Secure sign in
                </div>
                <h2 className="mt-4 text-[2rem] font-semibold leading-[0.95] tracking-[-0.06em] text-black">
                  Agency Admin
                </h2>
                <p className="mt-2 text-sm leading-6 text-black/48">
                  Влез с твоите данни и отвори control center-а.
                </p>
              </div>

              <div className={`${shellCard('p-6')}`}>
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  <div>
                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-black/72">
                      Имейл
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(stripCyrillic(e.target.value))}
                      onKeyDown={blockCyrillic}
                      autoFocus
                      required
                      className="min-h-[54px] w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black placeholder:text-black/24 focus:border-black/24 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-black/72">
                      Парола
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(stripCyrillic(e.target.value))}
                        onKeyDown={blockCyrillic}
                        required
                        className="min-h-[54px] w-full rounded-2xl border border-black/10 bg-white px-4 py-3 pr-11 text-sm text-black placeholder:text-black/24 focus:border-black/24 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-black/34 transition-colors hover:text-black/58"
                        aria-label={showPassword ? 'Скрий паролата' : 'Покажи паролата'}
                      >
                        {showPassword ? (
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-2xl border border-[#fecaca] px-4 py-2.5 text-sm text-red-600" role="alert">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !email || !password}
                    className="inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-full border border-[#15803d] bg-[#15803d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Влизане…
                      </>
                    ) : (
                      <>
                        Влез
                        <ArrowUpRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
