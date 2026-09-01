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
import { supabase } from '@/lib/supabase';
import { Purchase, Payment, Buyer, ReceivedPayment, Expense } from '@/types';
import { LayoutDashboard, ShoppingBag, Users, PieChart, Gem, HandCoins, Receipt, LogOut } from 'lucide-react';
import { Session } from '@supabase/supabase-js';

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [receivedPayments, setReceivedPayments] = useState<ReceivedPayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'purchases' | 'ledger' | 'analytics' | 'sales' | 'expenses'>('dashboard');

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
    setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

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
    { id: 'analytics', label: 'Analytics', icon: PieChart },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900 pb-[72px] md:pb-0">
      
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-600 rounded-lg text-white">
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
      <aside className="hidden md:flex w-64 bg-slate-900 text-slate-300 min-h-screen flex-col shadow-xl flex-shrink-0 z-20 sticky top-0">
        <div className="p-6 flex items-center gap-3 bg-slate-950 border-b border-slate-800">
          <div className="p-2 bg-blue-600 rounded-lg text-white">
            <Gem size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">BillingBook</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Jewellery Retail</p>
          </div>
        </div>
        
        <nav className="p-4 flex flex-col gap-2 flex-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-sm ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} className={activeTab === item.id ? "text-white" : "text-slate-400"} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-sm text-red-400 hover:bg-slate-800 hover:text-red-300"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex overflow-x-auto scrollbar-hide shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-40 pb-safe">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center gap-1 min-w-[76px] flex-1 py-3 px-1 transition-colors ${
              activeTab === item.id 
                ? 'text-blue-600' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <item.icon size={20} className={activeTab === item.id ? "text-blue-600" : "text-slate-500"} />
            <span className="text-[10px] font-medium leading-none whitespace-nowrap">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
        <div className="max-w-6xl mx-auto space-y-6">
          
          <header className="mb-4 md:mb-8 hidden md:flex justify-between items-center">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800">
                {navItems.find(n => n.id === activeTab)?.label}
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                Manage your business data efficiently.
              </p>
            </div>
          </header>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p>Syncing data securely...</p>
            </div>
          ) : (
            <div className="animate-in fade-in duration-300 slide-in-from-bottom-4">
              {activeTab === 'dashboard' && (
                <>
                  <Dashboard 
                    purchases={purchases} 
                    payments={payments} 
                    receivedPayments={receivedPayments} 
                    expenses={expenses} 
                  />
                  <div className="mt-8">
                    <TransactionsList purchases={purchases} onUpdate={fetchData} />
                  </div>
                </>
              )}
              
              {activeTab === 'purchases' && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  <div className="xl:col-span-1">
                    <PurchaseForm buyers={buyers} onSuccess={fetchData} />
                  </div>
                  <div className="xl:col-span-2">
                    <TransactionsList purchases={purchases} onUpdate={fetchData} />
                  </div>
                </div>
              )}
              
              {activeTab === 'ledger' && (
                <BuyersLedger buyers={buyers} purchases={purchases} payments={payments} onUpdate={fetchData} />
              )}

              {activeTab === 'sales' && (
                <ReceivedPayments receivedPayments={receivedPayments} onUpdate={fetchData} />
              )}
              
              {activeTab === 'expenses' && (
                <Expenses expenses={expenses} onUpdate={fetchData} />
              )}

              {activeTab === 'analytics' && (
                <Analytics purchases={purchases} />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
