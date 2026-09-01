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
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mt-8">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800">Buyer Accounts (Ledger)</h2>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-gray-500">Current Balances</h3>
            </div>
            
            <form onSubmit={handleAddBuyer} className="mb-6 flex gap-2">
              <input 
                type="text"
                placeholder="New Buyer Name"
                value={newBuyerName}
                onChange={(e) => setNewBuyerName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
              <button 
                type="submit" 
                disabled={loading || !newBuyerName.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium whitespace-nowrap"
              >
                Add Buyer
              </button>
            </form>

            <div className="space-y-3">
              {buyerStats.length === 0 ? (
                <p className="text-sm text-gray-400">No buyers found. Add one above.</p>
              ) : (
                buyerStats.map(buyer => (
                  <div 
                    key={buyer.name} 
                    onClick={() => setSelectedBuyer(buyer.name)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedBuyer === buyer.name ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-gray-800">{buyer.name}</span>
                      <span className={`font-semibold ${buyer.due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {buyer.due > 0 ? `₹${buyer.due.toLocaleString()} Due` : 'Settled'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 flex gap-4">
                      <span>Purchased: ₹{buyer.totalPurchases.toLocaleString()}</span>
                      <span>Paid: ₹{buyer.totalPaid.toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            {selectedBuyer ? (
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Add Payment for {selectedBuyer}</h3>
                <form onSubmit={handleAddPayment} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (₹)</label>
                    <input 
                      type="number" 
                      min="1"
                      step="0.01"
                      required
                      value={paymentAmount || ''}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      type="submit" 
                      disabled={loading || paymentAmount <= 0}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : 'Record Payment'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setSelectedBuyer(null)}
                      className="px-4 py-2 border border-gray-300 text-gray-600 rounded-md hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 p-8 text-center border-2 border-dashed border-gray-200 rounded-lg">
                Click on a buyer from the list to record a lump-sum payment.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
