'use client';

import { Suspense, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';
import { setToken } from '@/lib/auth';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const [authMethod, setAuthMethod] = useState('PASSWORD'); // PASSWORD | OTP
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const usingOtp = authMethod === 'OTP';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = { email };
      if (usingOtp) body.otp = otp;
      else body.password = password;
      const res = await authApi.post('/auth/login', body);
      const token = res.accessToken || res.token;
      if (!token) {
        setError('Invalid response: no token');
        return;
      }

      // Gate the admin web by loginType. Only SUPER_ADMIN belongs on /management/*.
      // Shop-owner and shop-mobile sessions are mobile-app territory; employee
      // sessions belong in the employee app. We reject them here with a clear
      // message rather than dropping them on a half-broken admin dashboard.
      const loginType = res.loginType;
      if (loginType && loginType !== 'SUPER_ADMIN') {
        setError(
          loginType === 'SHOP_OWNER' || loginType === 'SHOP_LOGIN'
            ? 'Shop accounts must sign in through the GGfix mobile app.'
            : 'Employee accounts must sign in through the employee app.',
        );
        return;
      }

      setToken(token);
      // returnTo must be a portal page *below* /management — bare "/management"
      // is this login page, and replacing to it would just bounce back here.
      const safeReturn = returnTo && /^\/management\/.+/.test(returnTo) ? returnTo : null;
      const dest = safeReturn || '/management/dashboard';
      router.replace(dest);
    } catch (err) {
      setError(err.body?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-admin-dark px-4">
      <a href="/management" className="flex flex-col items-center mb-8">
        <Image
          src="/logo.png"
          alt="GGFIX logo"
          width={112}
          height={112}
          className="object-contain"
          priority
        />
        <span className="mt-3 text-xl font-bold text-slate-900">GGFIX Management Portal</span>
        <span className="text-sm text-slate-500">www.globogreen.in</span>
      </a>
      <div className="w-full max-w-sm rounded-xl bg-admin-card border border-admin-border p-8 shadow-xl">
        <h1 className="text-xl font-semibold text-slate-900 mb-6">Admin Login</h1>

        <div className="flex rounded-lg bg-admin-dark border border-admin-border p-1 mb-5">
          <button
            type="button"
            onClick={() => setAuthMethod('PASSWORD')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${
              !usingOtp ? 'bg-admin-card text-slate-900 shadow' : 'text-admin-muted hover:text-slate-800'
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => setAuthMethod('OTP')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${
              usingOtp ? 'bg-admin-card text-slate-900 shadow' : 'text-admin-muted hover:text-slate-800'
            }`}
          >
            OTP
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-admin-muted mb-1">Email or username</label>
            <input
              type="text"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. barani"
              className="w-full rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900 focus:border-admin-accent focus:outline-none"
              required
            />
          </div>
          {usingOtp ? (
            <div>
              <label className="block text-sm text-admin-muted mb-1">OTP</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="6-digit code"
                className="w-full rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900 focus:border-admin-accent focus:outline-none tracking-widest"
                required
              />
              <p className="text-xs text-admin-muted mt-1.5">
                Super-admin OTPs are unique per account.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm text-admin-muted mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900 focus:border-admin-accent focus:outline-none"
                required
              />
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-admin-accent py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
