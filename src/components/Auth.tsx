'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Gem, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { Button, Field, Input } from '@/components/ui';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        setMessage('Account created. You can sign in now. Check email if confirmation is required.');
        setIsSignUp(false);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred during authentication.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside aria-hidden="true" className="relative hidden overflow-hidden bg-sidebar text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_42%)]" />
        <div className="relative flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white/10">
            <Gem className="size-5" aria-hidden />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">Billing Book</p>
            <p className="text-xs uppercase tracking-[0.16em] text-blue-200">Jewellery retail</p>
          </div>
        </div>
        <div className="relative max-w-md">
          <p className="text-3xl font-semibold leading-tight tracking-tight">
            Keep purchases, payments, and settlements in one ledger.
          </p>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Built for daily jewellery operations — track supplier dues, marketplace receipts, expenses, and Meesho reconciliation.
          </p>
        </div>
        <p className="relative text-xs text-slate-400">Secure sign-in for your business data.</p>
      </aside>

      <main id="main-content" className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-white">
              <Gem className="size-5" aria-hidden />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">Billing Book</p>
              <p className="text-xs text-muted-foreground">Jewellery retail ledger</p>
            </div>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {isSignUp ? 'Create your account' : 'Sign in'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignUp ? 'Set up access for this billing workspace.' : 'Enter your email and password to continue.'}
          </p>

          {error && (
            <div role="alert" className="mt-5 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}
          {message && (
            <div role="status" className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
              {message}
            </div>
          )}

          <form onSubmit={handleAuth} className="mt-6 flex flex-col gap-4">
            <Field label="Email address" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
              />
            </Field>
            <Field label="Password" htmlFor="password">
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            <Button type="submit" disabled={loading} className="mt-1 w-full">
              {loading ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {loading ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setMessage(null);
              }}
              className="text-sm font-medium text-primary hover:underline"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
