'use client';

import { Purchase } from '@/types';
import { supabase } from '@/lib/supabase';
import { useState, useMemo } from 'react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';

type TransactionsListProps = {
  purchases: Purchase[];
  onUpdate: () => void;
};

export default function TransactionsList({ purchases, onUpdate }: TransactionsListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const filteredPurchases = useMemo(() => {
    if (dateFilter === 'all') return purchases;

    const today = new Date();
    let start: Date;
    let end: Date;

    if (dateFilter === 'week') {
      start = startOfWeek(today, { weekStartsOn: 1 });
      end = endOfWeek(today, { weekStartsOn: 1 });
    } else if (dateFilter === 'month') {
      start = startOfMonth(today);
      end = endOfMonth(today);
    } else {
      if (!customStart || !customEnd) return purchases;
      start = startOfDay(parseISO(customStart));
      end = endOfDay(parseISO(customEnd));
    }

    return purchases.filter(p => {
      const d = parseISO(p.date);
      return isWithinInterval(d, { start, end });
    });
  }, [purchases, dateFilter, customStart, customEnd]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this purchase?')) return;
    
    setLoadingId(id);
    try {
      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      onUpdate();
    } catch (err) {
      console.error(err);
      alert('Failed to delete purchase.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200/60 overflow-hidden mt-8 lg:mt-0">
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h2 className="text-xl font-bold text-slate-800">Recent Purchases</h2>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 text-sm">
            {(['all', 'week', 'month', 'custom'] as const).map(f => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className={`px-3 py-1.5 rounded-full capitalize transition-all font-medium ${dateFilter === f ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {f === 'all' ? 'All Time' : f === 'week' ? 'This Week' : f === 'month' ? 'This Month' : 'Custom'}
              </button>
            ))}
          </div>
          {dateFilter === 'custom' && (
            <div className="flex gap-2 items-center text-sm mt-2">
              <input 
                type="date" 
                value={customStart} 
                onChange={e => setCustomStart(e.target.value)} 
                className="border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
              />
              <span className="text-slate-500 font-medium">to</span>
              <input 
                type="date" 
                value={customEnd} 
                onChange={e => setCustomEnd(e.target.value)} 
                className="border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
              />
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
              <th className="p-4 font-semibold whitespace-nowrap">Date</th>
              <th className="p-4 font-semibold whitespace-nowrap">Buyer</th>
              <th className="p-4 font-semibold whitespace-nowrap">Item</th>
              <th className="p-4 font-semibold text-center whitespace-nowrap">Qty</th>
              <th className="p-4 font-semibold text-right whitespace-nowrap">Total Price</th>
              <th className="p-4 font-semibold text-center whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredPurchases.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                  No purchases found for this date range.
                </td>
              </tr>
            ) : (
              filteredPurchases.map(p => (
                <tr key={p.id} className="hover:bg-indigo-50/50 transition-colors group">
                  <td className="p-4 whitespace-nowrap text-slate-500">{p.date}</td>
                  <td className="p-4 font-medium text-slate-700 whitespace-nowrap">{p.buyer_name}</td>
                  <td className="p-4 text-slate-600 whitespace-nowrap">{p.item_description}</td>
                  <td className="p-4 text-center font-medium text-slate-700 whitespace-nowrap">{p.quantity}</td>
                  <td className="p-4 text-right font-bold text-slate-800 whitespace-nowrap">₹{p.price.toLocaleString()}</td>
                  <td className="p-4 text-center whitespace-nowrap">
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={loadingId === p.id}
                      className="text-red-500 hover:text-red-700 disabled:opacity-50 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      {loadingId === p.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

