'use client';

import { ReceivedPayment } from '@/types';
import { supabase } from '@/lib/supabase';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';

type ReceivedPaymentsProps = {
  receivedPayments: ReceivedPayment[];
  onUpdate: () => void;
};

export default function ReceivedPayments({ receivedPayments, onUpdate }: ReceivedPaymentsProps) {
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    platform: 'Meesho',
    amount: 0,
  });

  const stats = useMemo(() => {
    const data: Record<string, number> = { Meesho: 0, Flipkart: 0, Other: 0 };
    receivedPayments.forEach(p => {
      const plat = data[p.platform] !== undefined ? p.platform : 'Other';
      data[plat] += p.amount;
    });
    return data;
  }, [receivedPayments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount <= 0) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('received_payments').insert([formData]);
      if (error) throw error;
      
      setFormData(prev => ({ ...prev, amount: 0 }));
      onUpdate();
    } catch (err) {
      console.error(err);
      alert('Failed to save received payment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this payment?')) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from('received_payments').delete().eq('id', id);
      if (error) throw error;
      onUpdate();
    } catch (err) {
      console.error(err);
      alert('Failed to delete payment');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200/60 border-l-4 border-l-pink-500 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-pink-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Meesho Total</h3>
          <p className="text-3xl font-extrabold text-slate-800 tracking-tight">₹{stats.Meesho.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200/60 border-l-4 border-l-yellow-400 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Flipkart Total</h3>
          <p className="text-3xl font-extrabold text-slate-800 tracking-tight">₹{stats.Flipkart.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200/60 border-l-4 border-l-emerald-500 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Received</h3>
          <p className="text-3xl font-extrabold text-emerald-600 tracking-tight">₹{(stats.Meesho + stats.Flipkart + stats.Other).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200/60 p-6">
            <h2 className="text-xl font-bold mb-6 text-slate-800">Record Received Payment</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
                <input 
                  type="date" 
                  required
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Platform</label>
                <select 
                  required
                  value={formData.platform}
                  onChange={e => setFormData({ ...formData, platform: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-colors"
                >
                  <option value="Meesho">Meesho</option>
                  <option value="Flipkart">Flipkart</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Amount Received (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₹</span>
                  <input 
                    type="number" 
                    min="0"
                    step="0.01"
                    required
                    value={formData.amount || ''}
                    onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading || formData.amount <= 0}
                className="w-full mt-2 bg-indigo-600 text-white py-3 px-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none disabled:active:scale-100"
              >
                {loading ? 'Saving...' : 'Save Payment'}
              </button>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200/60 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Payment History</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                    <th className="p-4 font-semibold whitespace-nowrap">Date</th>
                    <th className="p-4 font-semibold whitespace-nowrap">Platform</th>
                    <th className="p-4 font-semibold text-right whitespace-nowrap">Amount</th>
                    <th className="p-4 font-semibold text-center whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {receivedPayments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 font-medium">
                        No received payments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    receivedPayments.map(p => (
                      <tr key={p.id} className="hover:bg-indigo-50/50 transition-colors group">
                        <td className="p-4 whitespace-nowrap text-slate-500 font-medium">{p.date}</td>
                        <td className="p-4 font-medium whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${p.platform === 'Meesho' ? 'bg-pink-100 text-pink-700 border border-pink-200' : p.platform === 'Flipkart' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                            {p.platform}
                          </span>
                        </td>
                        <td className="p-4 text-right font-bold text-emerald-600 whitespace-nowrap">₹{p.amount.toLocaleString()}</td>
                        <td className="p-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleDelete(p.id)}
                            disabled={deletingId === p.id}
                            className="text-red-500 hover:text-red-700 disabled:opacity-50 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            {deletingId === p.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
