'use client';

import { Purchase, Payment, Buyer } from '@/types';
import { supabase } from '@/lib/supabase';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';

type BuyersLedgerProps = {
  buyers: Buyer[];
  purchases: Purchase[];
  payments: Payment[];
  onUpdate: () => void;
};

export default function BuyersLedger({ buyers, purchases, payments, onUpdate }: BuyersLedgerProps) {
  const [selectedBuyer, setSelectedBuyer] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [newBuyerName, setNewBuyerName] = useState('');
  const [loading, setLoading] = useState(false);

  // Group purchases and payments by buyer
  const buyerStats = useMemo(() => {
    const stats: Record<string, { totalPurchases: number; totalPaid: number; due: number }> = {};

    // Initialize all known buyers first
    buyers.forEach(b => {
      stats[b.name] = { totalPurchases: 0, totalPaid: 0, due: 0 };
    });

    purchases.forEach(p => {
      if (!stats[p.buyer_name]) stats[p.buyer_name] = { totalPurchases: 0, totalPaid: 0, due: 0 };
      stats[p.buyer_name].totalPurchases += p.price;
    });

    payments.forEach(p => {
      if (!stats[p.buyer_name]) stats[p.buyer_name] = { totalPurchases: 0, totalPaid: 0, due: 0 };
      stats[p.buyer_name].totalPaid += p.amount;
    });

    Object.keys(stats).forEach(buyer => {
      stats[buyer].due = stats[buyer].totalPurchases - stats[buyer].totalPaid;
    });

    return Object.entries(stats).map(([name, data]) => ({
      name,
      ...data
    })).sort((a, b) => b.due - a.due); // Sort by highest due
  }, [buyers, purchases, payments]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuyer || paymentAmount <= 0) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('payments').insert([{
        buyer_name: selectedBuyer,
        amount: paymentAmount,
        date: format(new Date(), 'yyyy-MM-dd')
      }]);

      if (error) throw error;
      
      setPaymentAmount(0);
      setSelectedBuyer(null);
      onUpdate();
    } catch (err) {
      console.error(err);
      alert('Failed to add payment');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBuyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuyerName.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('buyers').insert([{
        name: newBuyerName.trim()
      }]);

      if (error) throw error;
      
      setNewBuyerName('');
      onUpdate();
    } catch (err) {
      console.error(err);
      alert('Failed to add buyer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200/60 overflow-hidden mt-8">
      <div className="p-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-800">Buyer Accounts (Ledger)</h2>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Current Balances</h3>
            </div>
            
            <form onSubmit={handleAddBuyer} className="mb-6 flex gap-2">
              <input 
                type="text"
                placeholder="New Buyer Name"
                value={newBuyerName}
                onChange={(e) => setNewBuyerName(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition-colors"
                required
              />
              <button 
                type="submit" 
                disabled={loading || !newBuyerName.trim()}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 text-sm whitespace-nowrap shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
              >
                Add Buyer
              </button>
            </form>

            <div className="space-y-3">
              {buyerStats.length === 0 ? (
                <p className="text-sm text-slate-400 font-medium p-4 text-center border-2 border-dashed border-slate-200 rounded-xl">No buyers found. Add one above.</p>
              ) : (
                buyerStats.map(buyer => (
                  <div 
                    key={buyer.name} 
                    onClick={() => setSelectedBuyer(buyer.name)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all ${selectedBuyer === buyer.name ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' : 'border-slate-200 hover:border-indigo-300 hover:shadow-md'}`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-bold text-slate-800">{buyer.name}</span>
                      <span className={`font-bold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider ${buyer.due > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {buyer.due > 0 ? `₹${buyer.due.toLocaleString()} Due` : 'Settled'}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-slate-500 flex gap-4">
                      <span>Purchased: <span className="text-slate-700">₹{buyer.totalPurchases.toLocaleString()}</span></span>
                      <span>Paid: <span className="text-slate-700">₹{buyer.totalPaid.toLocaleString()}</span></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            {selectedBuyer ? (
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Add Payment for {selectedBuyer}</h3>
                <form onSubmit={handleAddPayment} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Amount Paid (₹)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₹</span>
                      <input 
                        type="number" 
                        min="1"
                        step="0.01"
                        required
                        value={paymentAmount || ''}
                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                        className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button 
                      type="submit" 
                      disabled={loading || paymentAmount <= 0}
                      className="flex-1 bg-emerald-600 text-white py-2.5 px-4 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                    >
                      {loading ? 'Processing...' : 'Record Payment'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setSelectedBuyer(null)}
                      className="px-5 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 font-medium p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                Click on a buyer from the list to record a lump-sum payment.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
