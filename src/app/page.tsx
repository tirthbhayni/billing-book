'use client';

import { useEffect, useState } from 'react';
import Dashboard from '@/components/Dashboard';
import PurchaseForm from '@/components/PurchaseForm';
import TransactionsList from '@/components/TransactionsList';
import BuyersLedger from '@/components/BuyersLedger';
import Analytics from '@/components/Analytics';
import ReceivedPayments from '@/components/ReceivedPayments';
import Expenses from '@/components/Expenses';
import Auth from '@/components/Auth';
import MeeshoRecon from '@/components/MeeshoRecon';
import { supabase } from '@/lib/supabase';
import { Purchase, Payment, Buyer, ReceivedPayment, Expense } from '@/types';
import { LayoutDashboard, ShoppingBag, Users, PieChart, Gem, HandCoins, Receipt, LogOut, Calculator } from 'lucide-react';
import { Session } from '@supabase/supabase-js';

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [receivedPayments, setReceivedPayments] = useState<ReceivedPayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'purchases' | 'ledger' | 'analytics' | 'sales' | 'expenses' | 'meesho_recon'>('dashboard');

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
        supabase.from('expenses').select('*').order('date', { ascending: false })
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

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
    { id: 'ledger', label: 'Buyers & Payments', icon: Users },
    { id: 'sales', label: 'Received (Sales)', icon: HandCoins },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'meesho_recon', label: 'Meesho Recon', icon: Calculator },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
  ] as const;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50/50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-neutral-950 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg text-white shadow-sm">
            <Gem size={20} />
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight">BillingBook</h1>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-red-400 transition-colors"
          aria-label="Logout"
        >
          <LogOut size={20} />
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 bg-neutral-950 text-slate-300 min-h-screen flex-col shadow-2xl flex-shrink-0 z-20 sticky top-0 border-r border-neutral-800">
        <div className="p-6 flex items-center gap-4 bg-neutral-950/50 border-b border-neutral-800/60 backdrop-blur-md">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
            <Gem size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">BillingBook</h1>
            <p className="text-[11px] text-indigo-400 uppercase tracking-widest font-bold mt-0.5">Jewellery Retail</p>
          </div>
        </div>
        
        <nav className="p-5 flex flex-col gap-1.5 flex-1 overflow-y-auto scrollbar-hide">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-2">Menu</p>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium text-sm group relative ${
                activeTab === item.id 
                  ? 'bg-indigo-600/10 text-indigo-400' 
                  : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
              }`}
            >
              {activeTab === item.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full" />
              )}
              <item.icon size={20} className={`transition-colors ${activeTab === item.id ? "text-indigo-400" : "text-neutral-500 group-hover:text-neutral-400"}`} />
              <span className="tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-5 border-t border-neutral-800/60 bg-neutral-950">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium text-sm text-neutral-400 hover:bg-red-500/10 hover:text-red-400 group"
          >
            <LogOut size={20} className="text-neutral-500 group-hover:text-red-400 transition-colors" />
            <span className="tracking-wide">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200/60 flex overflow-x-auto scrollbar-hide shadow-[0_-8px_30px_rgba(0,0,0,0.04)] z-40 pb-safe">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center gap-1.5 min-w-[76px] flex-1 py-3 px-1 transition-colors relative ${
              activeTab === item.id 
                ? 'text-indigo-600' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {activeTab === item.id && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-600 rounded-b-full" />
            )}
            <item.icon size={20} className={activeTab === item.id ? "text-indigo-600" : "text-slate-400"} />
            <span className="text-[10px] font-medium leading-none whitespace-nowrap">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
        <div className="max-w-6xl mx-auto space-y-6">
          
          <header className="mb-4 md:mb-8 hidden md:flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl md:text-2xl font-bold text-slate-800">
                  {navItems.find(n => n.id === activeTab)?.label}
                </h2>
                {isSyncing && !initialLoading && (
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full animate-pulse border border-blue-100">Syncing...</span>
                )}
              </div>
              <p className="text-slate-500 text-sm mt-1">
                Manage your business data efficiently.
              </p>
            </div>
          </header>

          {initialLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p>Loading application...</p>
            </div>
          ) : (
            <div className="animate-in fade-in duration-300 slide-in-from-bottom-4 pb-20 md:pb-0">
              <div className={activeTab === 'dashboard' ? 'block' : 'hidden'}>
                <Dashboard 
                  purchases={purchases} 
                  payments={payments} 
                  receivedPayments={receivedPayments} 
                  expenses={expenses} 
                />
                <div className="mt-8">
                  <TransactionsList purchases={purchases} onUpdate={fetchData} />
                </div>
              </div>
              
              <div className={activeTab === 'purchases' ? 'block' : 'hidden'}>
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  <div className="xl:col-span-1">
                    <PurchaseForm buyers={buyers} onSuccess={fetchData} />
                  </div>
                  <div className="xl:col-span-2">
                    <TransactionsList purchases={purchases} onUpdate={fetchData} />
                  </div>
                </div>
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
  );
}
