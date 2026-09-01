'use client';

import { Expense } from '@/types';
import { supabase } from '@/lib/supabase';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';

type ExpensesProps = {
  expenses: Expense[];
  onUpdate: () => void;
};

export default function Expenses({ expenses, onUpdate }: ExpensesProps) {
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    category: 'Packaging',
    description: '',
    amount: 0,
  });

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount <= 0) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('expenses').insert([formData]);
      if (error) throw error;
      
      setFormData(prev => ({ ...prev, description: '', amount: 0 }));
      onUpdate();
    } catch (err) {
      console.error(err);
      alert('Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      onUpdate();
    } catch (err) {
      console.error(err);
      alert('Failed to delete expense');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 border-l-4 border-l-orange-500">
          <h3 className="text-sm font-medium text-slate-500 mb-1">Total Operating Expenses</h3>
          <p className="text-2xl font-bold text-slate-900">₹{totalExpenses.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Record Expense</h2>
            
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select 
                  required
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Packaging">Packaging (Boxes, Polythene)</option>
                  <option value="Shipping">Shipping / Courier</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. 100x Corrugated Boxes"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
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
                {loading ? 'Saving...' : 'Save Expense'}
              </button>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Expense History</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-sm">
                    <th className="p-4 font-medium whitespace-nowrap">Date</th>
                    <th className="p-4 font-medium whitespace-nowrap">Category</th>
                    <th className="p-4 font-medium whitespace-nowrap">Description</th>
                    <th className="p-4 font-medium text-right whitespace-nowrap">Amount</th>
                    <th className="p-4 font-medium text-center whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">
                        No expenses recorded yet.
                      </td>
                    </tr>
                  ) : (
                    expenses.map(e => (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="p-4 whitespace-nowrap">{e.date}</td>
                        <td className="p-4 font-medium whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-xs ${e.category === 'Packaging' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                            {e.category}
                          </span>
                        </td>
                        <td className="p-4 text-gray-600 whitespace-nowrap">{e.description}</td>
                        <td className="p-4 text-right font-medium text-red-500 whitespace-nowrap">₹{e.amount.toLocaleString()}</td>
                        <td className="p-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleDelete(e.id)}
                            disabled={deletingId === e.id}
                            className="text-red-500 hover:text-red-700 disabled:opacity-50 text-xs font-medium underline"
                          >
                            {deletingId === e.id ? '...' : 'Delete'}
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
