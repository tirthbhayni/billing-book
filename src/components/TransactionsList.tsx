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
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mt-8 lg:mt-0">
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-800">Recent Purchases</h2>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 text-sm">
            {(['all', 'week', 'month', 'custom'] as const).map(f => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className={`px-3 py-1 rounded-full capitalize transition-colors ${dateFilter === f ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
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
                className="border border-gray-300 rounded px-2 py-1"
              />
              <span className="text-gray-500">to</span>
              <input 
                type="date" 
                value={customEnd} 
                onChange={e => setCustomEnd(e.target.value)} 
                className="border border-gray-300 rounded px-2 py-1"
              />
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-sm">
              <th className="p-4 font-medium whitespace-nowrap">Date</th>
              <th className="p-4 font-medium whitespace-nowrap">Buyer</th>
              <th className="p-4 font-medium whitespace-nowrap">Item</th>
              <th className="p-4 font-medium text-center whitespace-nowrap">Qty</th>
              <th className="p-4 font-medium text-right whitespace-nowrap">Total Price</th>
              <th className="p-4 font-medium text-center whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {filteredPurchases.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  No purchases found for this date range.
                </td>
              </tr>
            ) : (
              filteredPurchases.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="p-4 whitespace-nowrap">{p.date}</td>
                  <td className="p-4 font-medium whitespace-nowrap">{p.buyer_name}</td>
                  <td className="p-4 text-gray-600 whitespace-nowrap">{p.item_description}</td>
                  <td className="p-4 text-center whitespace-nowrap">{p.quantity}</td>
                  <td className="p-4 text-right font-medium whitespace-nowrap">₹{p.price.toLocaleString()}</td>
                  <td className="p-4 text-center whitespace-nowrap">
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={loadingId === p.id}
                      className="text-red-500 hover:text-red-700 disabled:opacity-50 text-xs font-medium underline"
                    >
                      {loadingId === p.id ? '...' : 'Delete'}
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

