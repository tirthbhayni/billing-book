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
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 border-l-4 border-l-pink-500">
          <h3 className="text-sm font-medium text-slate-500 mb-1">Meesho Total</h3>
          <p className="text-2xl font-bold text-slate-900">₹{stats.Meesho.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 border-l-4 border-l-yellow-400">
          <h3 className="text-sm font-medium text-slate-500 mb-1">Flipkart Total</h3>
          <p className="text-2xl font-bold text-slate-900">₹{stats.Flipkart.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 border-l-4 border-l-green-500">
          <h3 className="text-sm font-medium text-slate-500 mb-1">Total Received</h3>
          <p className="text-2xl font-bold text-slate-900">₹{(stats.Meesho + stats.Flipkart + stats.Other).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Record Received Payment</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input 
                  type="date" 
                  required
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                <select 
                  required
                  value={formData.platform}
                  onChange={e => setFormData({ ...formData, platform: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Meesho">Meesho</option>
                  <option value="Flipkart">Flipkart</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Received (₹)</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  required
                  value={formData.amount || ''}
                  onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button 
                type="submit" 
                disabled={loading || formData.amount <= 0}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400"
              >
                {loading ? 'Saving...' : 'Save Payment'}
              </button>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Payment History</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-sm">
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium">Platform</th>
                    <th className="p-4 font-medium text-right">Amount</th>
                    <th className="p-4 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {receivedPayments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        No received payments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    receivedPayments.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="p-4">{p.date}</td>
                        <td className="p-4 font-medium">
                          <span className={`px-2 py-1 rounded text-xs ${p.platform === 'Meesho' ? 'bg-pink-100 text-pink-700' : p.platform === 'Flipkart' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                            {p.platform}
                          </span>
                        </td>
                        <td className="p-4 text-right font-medium text-green-600">₹{p.amount.toLocaleString()}</td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDelete(p.id)}
                            disabled={deletingId === p.id}
                            className="text-red-500 hover:text-red-700 disabled:opacity-50 text-xs font-medium underline"
                          >
                            {deletingId === p.id ? '...' : 'Delete'}
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
