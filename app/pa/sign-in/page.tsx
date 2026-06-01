'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PlatformAdminSignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-white text-2xl font-bold tracking-tight mb-1">Clicka</div>
          <div className="text-zinc-500 text-sm">Platform Admin</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Имейл"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white
                       placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
          />
          <input
            type="password"
            placeholder="Парола"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white
                       placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
          />

          {error && (
            <p className="text-red-400 text-sm text-center pt-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-white text-black font-semibold py-3 rounded-xl text-sm
                       disabled:opacity-40 disabled:cursor-not-allowed transition-opacity mt-1"
          >
            {loading ? 'Влизане…' : 'Влез'}
          </button>
        </form>
      </div>
    </div>
  );
}
