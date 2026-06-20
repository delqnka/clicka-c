'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function blockCyrillic(e: React.KeyboardEvent<HTMLInputElement>) {
  if (/[Ѐ-ӿ]/.test(e.key)) e.preventDefault();
}

function stripCyrillic(value: string) {
  return value.replace(/[Ѐ-ӿ]/g, '');
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
    <div className="min-h-dvh flex items-center justify-center p-4"
         style={{ background: 'linear-gradient(135deg,#f5f3ff 0%,#fdf2f8 100%)' }}>
      <div style={{ width: '100%', maxWidth: '384px' }}>
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/clicka-logo.svg"
            alt="Agency Admin"
            width={64}
            height={64}
            style={{ width: 64, height: 64, marginBottom: 16, filter: 'drop-shadow(0 4px 12px rgba(124,58,237,0.35))' }}
          />
          <h1 className="text-xl font-bold text-gray-900">Agency Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Влез с твоите данни</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-lg border border-white/80 p-6">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
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
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-white
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                           placeholder:text-gray-300 min-h-[48px]"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
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
                  className="w-full px-4 py-3 pr-11 text-sm border border-gray-200 rounded-xl bg-white
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                             placeholder:text-gray-300 min-h-[48px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                             hover:text-gray-600 transition-colors cursor-pointer p-1"
                  aria-label={showPassword ? 'Скрий паролата' : 'Покажи паролата'}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-sm text-red-600" role="alert">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-white
                         transition-opacity duration-150 cursor-pointer
                         disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px]"
              style={{ background: 'linear-gradient(135deg,#6366f1,#ec4899)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Влизане…
                </span>
              ) : 'Влез'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
