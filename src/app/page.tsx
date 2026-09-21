'use client';

import { useEffect, useState } from 'react';
import Dashboard from '@/components/Dashboard';
import TransactionsList from '@/components/TransactionsList';
import PurchasesTab from '@/components/PurchasesTab';
import BuyersLedger from '@/components/BuyersLedger';
import Analytics from '@/components/Analytics';
import ReceivedPayments from '@/components/ReceivedPayments';
import Expenses from '@/components/Expenses';
import Auth from '@/components/Auth';
import MeeshoRecon from '@/components/MeeshoRecon';
import { supabase } from '@/lib/supabase';
import { Purchase, Payment, Buyer, ReceivedPayment, Expense } from '@/types';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  PieChart,
  Gem,
  HandCoins,
  Receipt,
  LogOut,
  Calculator,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { cn } from '@/lib/cn';

type TabId = 'dashboard' | 'purchases' | 'ledger' | 'analytics' | 'sales' | 'expenses' | 'meesho_recon';

const navItems: { id: TabId; label: string; short: string; icon: typeof LayoutDashboard; description: string }[] = [
  { id: 'dashboard', label: 'Overview', short: 'Home', icon: LayoutDashboard, description: 'Balances and recent activity' },
  { id: 'purchases', label: 'Purchases', short: 'Buy', icon: ShoppingBag, description: 'Bills, items, and suppliers' },
  { id: 'ledger', label: 'Buyers', short: 'Buyers', icon: Users, description: 'Accounts and supplier payments' },
  { id: 'sales', label: 'Received', short: 'Received', icon: HandCoins, description: 'Meesho, Flipkart, Amazon and other receipts' },
  { id: 'expenses', label: 'Expenses', short: 'Costs', icon: Receipt, description: 'Operating costs' },
  { id: 'meesho_recon', label: 'Meesho Recon', short: 'Recon', icon: Calculator, description: 'Order and settlement matching' },
  { id: 'analytics', label: 'Analytics', short: 'Stats', icon: PieChart, description: 'Purchase trends and share' },
];

const primaryNav = ['dashboard', 'purchases', 'ledger', 'sales'] as const;

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [receivedPayments, setReceivedPayments] = useState<ReceivedPayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async () => {
    if (!session) return;
    setIsSyncing(true);
    try {
      const [purchasesRes, paymentsRes, buyersRes, receivedRes, expensesRes] = await Promise.all([
        supabase.from('purchases').select('*').order('date', { ascending: false }),
        supabase.from('payments').select('*').order('date', { ascending: false }),
        supabase.from('buyers').select('*').order('name', { ascending: true }),
        supabase.from('received_payments').select('*').order('date', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
      ]);

      if (purchasesRes.error) console.error('Error fetching purchases:', purchasesRes.error);
      else setPurchases(purchasesRes.data || []);

      if (paymentsRes.error) console.error('Error fetching payments:', paymentsRes.error);
      else setPayments(paymentsRes.data || []);

      if (buyersRes.error) console.error('Error fetching buyers:', buyersRes.error);
      else setBuyers(buyersRes.data || []);

      if (receivedRes.error) console.error('Error fetching received payments:', receivedRes.error);
      else setReceivedPayments(receivedRes.data || []);

      if (expensesRes.error) console.error('Error fetching expenses:', expensesRes.error);
      else setExpenses(expensesRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session?.user?.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!session) {
    return <Auth />;
  }

  const current = navItems.find((n) => n.id === activeTab);
  const moreActive = !primaryNav.includes(activeTab as (typeof primaryNav)[number]);

  const selectTab = (id: TabId) => {
    setActiveTab(id);
    setMoreOpen(false);
  };

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-white/5 bg-sidebar text-slate-300 lg:flex">
        <div className="flex items-center gap-3 border-b border-white/8 px-5 py-5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-white">
            <Gem className="size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight text-white">Billing Book</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-blue-300">Jewellery retail</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Primary">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => selectTab(item.id)}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-200',
                  active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <item.icon className="size-4 shrink-0" aria-hidden />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/8 p-3">
          <p className="truncate px-3 pb-2 text-xs text-slate-500">{session.user.email}</p>
          <button
            onClick={handleLogout}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-400 transition-colors duration-200 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur-md lg:hidden">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{current?.label}</p>
            <p className="truncate text-xs text-muted-foreground">{current?.description}</p>
          </div>
          {isSyncing && !initialLoading ? (
            <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">Syncing</span>
          ) : (
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-white">
              <Gem className="size-4" aria-hidden />
            </div>
          )}
        </header>

        <main id="main-content" className="min-w-0 flex-1 overflow-y-auto px-4 py-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
          <div className="mx-auto w-full max-w-6xl">
            <header className="mb-6 hidden items-end justify-between gap-4 lg:flex">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">{current?.label}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{current?.description}</p>
              </div>
              {isSyncing && !initialLoading ? (
                <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  Syncing latest data
                </span>
              ) : null}
            </header>

            {initialLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Loading dashboard">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-32 animate-pulse rounded-xl border border-border bg-card" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className={activeTab === 'dashboard' ? 'flex flex-col gap-6' : 'hidden'}>
                  <Dashboard
                    purchases={purchases}
                    payments={payments}
                    receivedPayments={receivedPayments}
                    expenses={expenses}
                  />
                  <TransactionsList purchases={purchases} onUpdate={fetchData} />
                </div>

                <div className={activeTab === 'purchases' ? 'block' : 'hidden'}>
                  <PurchasesTab buyers={buyers} purchases={purchases} onUpdate={fetchData} />
                </div>

                <div className={activeTab === 'ledger' ? 'block' : 'hidden'}>
                  <BuyersLedger buyers={buyers} purchases={purchases} payments={payments} onUpdate={fetchData} />
                </div>

                <div className={activeTab === 'sales' ? 'block' : 'hidden'}>
                  <ReceivedPayments receivedPayments={receivedPayments} onUpdate={fetchData} />
                </div>

                <div className={activeTab === 'expenses' ? 'block' : 'hidden'}>
                  <Expenses expenses={expenses} onUpdate={fetchData} />
                </div>

                <div className={activeTab === 'analytics' ? 'block' : 'hidden'}>
                  <Analytics purchases={purchases} />
                </div>

                <div className={activeTab === 'meesho_recon' ? 'block' : 'hidden'}>
                  <MeeshoRecon />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        aria-label="Mobile"
      >
        <div className="grid grid-cols-5">
          {navItems
            .filter((item) => primaryNav.includes(item.id as (typeof primaryNav)[number]))
            .map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => selectTab(item.id)}
                  className={cn(
                    'flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <item.icon className="size-5" aria-hidden />
                  {item.short}
                </button>
              );
            })}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium',
              moreActive || moreOpen ? 'text-primary' : 'text-muted-foreground'
            )}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
          >
            <MoreHorizontal className="size-5" aria-hidden />
            More
          </button>
        </div>
      </nav>

      {moreOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More pages"
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">More</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {navItems
                .filter((item) => !primaryNav.includes(item.id as (typeof primaryNav)[number]))
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => selectTab(item.id)}
                    className={cn(
                      'flex min-h-12 items-center gap-3 rounded-lg px-3 text-left text-sm font-medium',
                      activeTab === item.id ? 'bg-muted text-primary' : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <item.icon className="size-4 text-muted-foreground" aria-hidden />
                    <span>
                      {item.label}
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{item.description}</span>
                    </span>
                  </button>
                ))}
              <button
                onClick={handleLogout}
                className="mt-2 flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium text-destructive hover:bg-red-50"
              >
                <LogOut className="size-4" aria-hidden />
                Sign out
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
