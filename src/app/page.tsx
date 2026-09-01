'use client';

import { useEffect, useState } from 'react';
import Dashboard from '@/components/Dashboard';
import PurchaseForm from '@/components/PurchaseForm';
import TransactionsList from '@/components/TransactionsList';
import BuyersLedger from '@/components/BuyersLedger';
import Analytics from '@/components/Analytics';
import ReceivedPayments from '@/components/ReceivedPayments';
import Expenses from '@/components/Expenses';
import { supabase } from '@/lib/supabase';
import { Purchase, Payment, Buyer, ReceivedPayment, Expense } from '@/types';
import { LayoutDashboard, ShoppingBag, Users, PieChart, Gem, HandCoins, Receipt } from 'lucide-react';

export default function Home() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [receivedPayments, setReceivedPayments] = useState<ReceivedPayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'purchases' | 'ledger' | 'analytics' | 'sales' | 'expenses'>('dashboard');

  const fetchData = async () => {
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
    fetchData();
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
    { id: 'ledger', label: 'Buyers & Payments', icon: Users },
    { id: 'sales', label: 'Received (Sales)', icon: HandCoins },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      {/* Sidebar / Mobile Header */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 md:min-h-screen flex flex-col shadow-xl flex-shrink-0 z-20 sticky top-0">
        <div className="p-4 md:p-6 flex items-center justify-center md:justify-start gap-3 bg-slate-950 border-b border-slate-800">
          <div className="p-1.5 md:p-2 bg-blue-600 rounded-lg text-white">
            <Gem size={20} className="md:w-6 md:h-6" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-white tracking-tight">BillingBook</h1>
            <p className="hidden md:block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Jewellery Retail</p>
          </div>
        </div>
        
        <nav className="p-2 md:p-4 flex flex-row md:flex-col gap-1 md:gap-2 overflow-x-auto scrollbar-hide">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 px-3 py-2 md:px-4 md:py-3 rounded-lg transition-all font-medium text-[11px] md:text-sm whitespace-nowrap min-w-[72px] md:min-w-0 flex-1 md:flex-none ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} className={`mb-1 md:mb-0 md:w-[18px] md:h-[18px] ${activeTab === item.id ? "text-white" : "text-slate-400"}`} />
              <span className="leading-none">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6 pb-20 md:pb-0">
          
          <header className="mb-4 md:mb-8 hidden md:block">
            <h2 className="text-xl md:text-2xl font-bold text-slate-800">
              {navItems.find(n => n.id === activeTab)?.label}
            </h2>
            <p className="text-slate-500 text-xs md:text-sm mt-1">
              Manage your business data efficiently.
            </p>
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
