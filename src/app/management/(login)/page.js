'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { authApi } from '@/lib/api';
import { setToken, setRole } from '@/lib/auth';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;
const BACKGROUND_URL = 'https://media.ggfix.in/admin/background-2.png';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const [step, setStep] = useState('EMAIL'); // EMAIL | OTP
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sentTarget, setSentTarget] = useState('');

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [otpError, setOtpError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);

  const otpRefs = useRef([]);
  const emailFieldRef = useRef(null);
  // Synchronous request guards. The `sendingOtp`/`verifying` STATE only
  // drives the UI (disabled button, spinner) — it is not safe as the actual
  // duplicate-request guard because a closure captured at render time reads
  // whatever that state was AT THAT RENDER, not the live value. Two clicks
  // fired close enough together can both run the handler before React
  // commits the first setVerifying(true), so both closures still see
  // verifying=false and both fire. Refs are mutated in place and read
  // synchronously, so the second call always sees the first call's guard.
  const sendingRef = useRef(false);
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (step === 'EMAIL') {
      const t = setTimeout(() => emailFieldRef.current && emailFieldRef.current.focus(), 60);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [step]);

  useEffect(() => {
    if (step !== 'OTP' || resendSeconds <= 0) return undefined;
    const id = setInterval(() => setResendSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [step, resendSeconds]);

  const otpValue = otp.join('');

  const requestOtp = useCallback(
    async ({ isResend = false } = {}) => {
      if (sendingRef.current) return false;
      const trimmed = email.trim();
      if (!trimmed) {
        setEmailError('Email address is required.');
        return false;
      }
      if (!EMAIL_RE.test(trimmed)) {
        setEmailError('Enter a valid email address.');
        return false;
      }
      setEmailError('');
      setSendError('');
      sendingRef.current = true;
      setSendingOtp(true);
      try {
        const res = await authApi.post('/auth/otp/send', { email: trimmed });
        setSentTarget(res?.target || trimmed);
        setResendSeconds(RESEND_SECONDS);
        if (isResend) {
          setOtp(Array(OTP_LENGTH).fill(''));
          setOtpError('');
        }
        return true;
      } catch (err) {
        let message;
        if (typeof err.status !== 'number') {
          message = 'Unable to connect to the server. Please try again.';
        } else if (err.status === 400) {
          message = 'No management account was found for this email.';
        } else if (err.status === 429) {
          message = 'Too many OTP requests. Please wait and try again.';
        } else if (err.status >= 500) {
          message = 'Unable to send OTP right now. Please try again.';
        } else {
          message = err.body?.message || err.message || 'Unable to send OTP right now. Please try again.';
        }
        if (isResend) setOtpError(message);
        else setSendError(message);
        return false;
      } finally {
        sendingRef.current = false;
        setSendingOtp(false);
      }
    },
    [email],
  );

  const handleSendOtp = useCallback(
    async (e) => {
      e.preventDefault();
      const ok = await requestOtp();
      if (ok) {
        setStep('OTP');
        setOtp(Array(OTP_LENGTH).fill(''));
        setOtpError('');
        setTimeout(() => otpRefs.current[0] && otpRefs.current[0].focus(), 60);
      }
    },
    [requestOtp],
  );

  const handleResend = useCallback(() => {
    if (resendSeconds > 0) return;
    requestOtp({ isResend: true });
  }, [resendSeconds, requestOtp]);

  const handleChangeEmail = useCallback(() => {
    setStep('EMAIL');
    setOtp(Array(OTP_LENGTH).fill(''));
    setOtpError('');
    setSendError('');
    setSentTarget('');
    setResendSeconds(0);
    setVerifying(false);
  }, []);

  /* -- OTP box handlers (numeric-only, auto-advance, paste, backspace) ----- */
  const onOtpChange = (i, raw) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      setOtp((prev) => {
        const next = [...prev];
        next[i] = '';
        return next;
      });
      return;
    }
    const chars = digits.split('');
    setOtp((prev) => {
      const next = [...prev];
      let idx = i;
      chars.forEach((c) => {
        if (idx < OTP_LENGTH) next[idx] = c;
        idx += 1;
      });
      return next;
    });
    const nextIdx = Math.min(i + chars.length, OTP_LENGTH - 1);
    otpRefs.current[nextIdx] && otpRefs.current[nextIdx].focus();
  };

  const onOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i - 1] && otpRefs.current[i - 1].focus();
    } else if (e.key === 'ArrowLeft' && i > 0) {
      otpRefs.current[i - 1] && otpRefs.current[i - 1].focus();
    } else if (e.key === 'ArrowRight' && i < OTP_LENGTH - 1) {
      otpRefs.current[i + 1] && otpRefs.current[i + 1].focus();
    }
  };

  const handleVerify = useCallback(
    async (e) => {
      e.preventDefault();
      // Guard: exactly one in-flight verification request at a time.
      if (verifyingRef.current) return;
      if (otpValue.length < OTP_LENGTH) {
        setOtpError('Enter the 6-digit code sent to your email.');
        setShakeKey((k) => k + 1);
        return;
      }
      setOtpError('');
      verifyingRef.current = true;
      setVerifying(true);
      try {
        const res = await authApi.post('/auth/login', { email: email.trim(), otp: otpValue });
        const token = res.accessToken || res.token;
        if (!token) {
          setOtpError('Invalid response: no token');
          return;
        }

        // Gate the admin web by loginType. Back-office staff — SUPER_ADMIN and
        // MARKET_PERSON — belong on /management/*; both create shop owners, and
        // only SUPER_ADMIN may change account status (enforced server-side).
        // Shop-owner and shop-mobile sessions are mobile-app territory; employee
        // sessions belong in the employee app. We reject them here with a clear
        // message rather than dropping them on a half-broken admin dashboard.
        const loginType = res.loginType;
        const isStaff = loginType === 'SUPER_ADMIN' || loginType === 'MARKET_PERSON';
        if (loginType && !isStaff) {
          setOtpError(
            loginType === 'SHOP_OWNER' || loginType === 'SHOP_LOGIN'
              ? 'Shop accounts must sign in through the GGfix mobile app.'
              : 'Employee accounts must sign in through the employee app.',
          );
          return;
        }

        setToken(token);
        setRole(loginType || null);
        // returnTo must be a portal page *below* /management — bare "/management"
        // is this login page, and replacing to it would just bounce back here.
        const safeReturn = returnTo && /^\/management\/.+/.test(returnTo) ? returnTo : null;
        const dest = safeReturn || '/management/dashboard';
        router.replace(dest);
      } catch (err) {
        // request() attaches a generic "session expired" message to every 401 so
        // that stale-token bounces read well elsewhere in the app; on this page a
        // 401 only ever means "wrong code", so we override it with that instead.
        const message =
          err.status === 401
            ? 'Invalid OTP. Please check the code and try again.'
            : err.body?.message || err.message || 'Verification failed. Please try again.';
        setOtpError(message);
        setShakeKey((k) => k + 1);
      } finally {
        verifyingRef.current = false;
        setVerifying(false);
      }
    },
    [otpValue, email, returnTo, router],
  );

  return (
    <div
      // Anchored to the TOP, not center: on a real browser window (chrome +
      // taskbar eating vertical space) the effective viewport is short enough
      // that background-size:cover has to crop the image vertically to keep
      // full-width coverage. Center-anchoring split that crop evenly and
      // clipped the GGFIX logo at the very top almost entirely; top-anchoring
      // keeps the logo (and the feature list below it) intact and only trims
      // the decorative wave/leaf copy at the bottom instead.
      className="relative min-h-screen w-full bg-cover bg-top bg-no-repeat"
      style={{ backgroundImage: `url(${BACKGROUND_URL})` }}
    >
      {/* Subtle overlay so the card stays legible over busy artwork on mobile,
          where the card sits centred on top of it rather than beside it. */}
      <div className="pointer-events-none absolute inset-0 bg-white/10 md:hidden" aria-hidden="true" />

      {/* Positioning layer only — no background of its own. The artwork above is
          background-size:cover on the FULL viewport, so its right edge (and the
          blank canvas beside it) scales 1:1 with true viewport width forever. If
          the card's margin also scaled with raw viewport width (e.g. plain vw
          units) the gap between artwork and card would grow without bound on
          very wide monitors — fine at 1440px, an empty void at 1920px+. Capping
          this row at a sane design width and centering it freezes that margin
          in absolute pixels past the cap, while the true background keeps
          filling edge-to-edge underneath with no letterboxing. */}
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1680px] items-center justify-center px-4 py-10 md:justify-end md:px-0 md:pr-[max(24px,6%)]">
        <div className="relative w-full max-w-[440px] md:max-w-[460px]">
          <div className="w-full rounded-[24px] border border-white/80 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur-sm sm:p-8 md:p-10">
            <div className="mb-6 flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="GGFIX logo"
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-xl object-contain"
                priority
              />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-slate-900 sm:text-[26px]">Management Login</h1>
              </div>
            </div>
            <p className="-mt-3 mb-6 text-sm text-slate-500">
              Secure access to your GGFIX Management Portal.
            </p>

            {step === 'EMAIL' ? (
              <form onSubmit={handleSendOtp} noValidate className="space-y-5">
                <div>
                  <label htmlFor="mgmt-email" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input
                      id="mgmt-email"
                      ref={emailFieldRef}
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError('');
                      }}
                      placeholder="Enter your registered email"
                      aria-invalid={emailError ? 'true' : 'false'}
                      aria-describedby={emailError ? 'mgmt-email-error' : undefined}
                      className={`h-[52px] w-full rounded-xl border bg-white pl-10 pr-3.5 text-[15px] text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:ring-[3px] ${
                        emailError
                          ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                          : 'border-[#DDE3EA] hover:border-brand-400 focus:border-brand-600 focus:ring-brand-100'
                      }`}
                    />
                  </div>
                  {emailError ? (
                    <p id="mgmt-email-error" role="alert" aria-live="polite" className="mt-1.5 text-sm text-red-600">
                      {emailError}
                    </p>
                  ) : null}
                </div>

                {sendError ? (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="flex items-start gap-2 rounded-[10px] border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{sendError}</span>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={sendingOtp}
                  className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-[15px] font-semibold text-white shadow-sm transition hover:bg-brand-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sendingOtp ? (
                    <>
                      <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden="true" />
                      Sending OTP...
                    </>
                  ) : (
                    'Send OTP'
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerify} noValidate className="space-y-5">
                <div className="flex items-start gap-2 rounded-[10px] border border-brand-100 bg-brand-50 px-3.5 py-2.5 text-sm text-brand-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                  <span>OTP sent successfully to {sentTarget || 'your registered email'}.</span>
                </div>

                <div>
                  <p className="text-[15px] font-semibold text-slate-900">Verify OTP</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Enter the 6-digit verification code sent to your email.
                  </p>
                  <button
                    type="button"
                    onClick={handleChangeEmail}
                    className="mt-1.5 inline-flex items-center gap-1 text-sm font-medium text-brand-700 underline-offset-2 hover:underline"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    Change email
                  </button>
                </div>

                <div
                  key={shakeKey}
                  className={`flex justify-center gap-2 ${otpError ? 'animate-shake' : ''}`}
                >
                  {otp.map((val, i) => (
                    <input
                      // eslint-disable-next-line react/no-array-index-key
                      key={i}
                      ref={(el) => {
                        otpRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={OTP_LENGTH}
                      autoComplete={i === 0 ? 'one-time-code' : 'off'}
                      aria-label={`OTP digit ${i + 1}`}
                      aria-invalid={otpError ? 'true' : 'false'}
                      value={val}
                      onChange={(e) => onOtpChange(i, e.target.value)}
                      onKeyDown={(e) => onOtpKeyDown(i, e)}
                      onFocus={(e) => e.target.select()}
                      style={{ width: 'clamp(32px, 9vw, 52px)', height: 'clamp(40px, 10vw, 56px)' }}
                      className={`rounded-xl border bg-white text-center text-lg font-semibold text-slate-900 transition focus:outline-none focus:ring-[3px] ${
                        otpError
                          ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                          : 'border-[#DDE3EA] focus:border-brand-600 focus:ring-brand-100'
                      }`}
                    />
                  ))}
                </div>

                {otpError ? (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="flex items-start gap-2 rounded-[10px] border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{otpError}</span>
                  </div>
                ) : null}

                <div className="text-center text-sm text-slate-500">
                  Didn&apos;t receive the code?{' '}
                  {resendSeconds > 0 ? (
                    <span className="font-medium text-slate-400">Resend OTP in {resendSeconds}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={sendingOtp}
                      className="font-semibold text-brand-700 underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={verifying}
                  className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-[15px] font-semibold text-white shadow-sm transition hover:bg-brand-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden="true" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Sign In'
                  )}
                </button>
              </form>
            )}

            <div className="mt-6 flex items-center justify-center gap-1.5 border-t border-slate-100 pt-5 text-xs text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Your account is protected with secure OTP verification.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
