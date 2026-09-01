'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { Buyer } from '@/types';

type PurchaseFormProps = {
  buyers: Buyer[];
  onSuccess: () => void;
};

export default function PurchaseForm({ buyers, onSuccess }: PurchaseFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    buyer_name: '',
    item_description: '',
    quantity: 1,
    price: 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'price' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.buyer_name) {
      setError('Please select a buyer');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const { error: dbError } = await supabase
        .from('purchases')
        .insert([formData]);

      if (dbError) throw dbError;

      setFormData(prev => ({ ...prev, item_description: '', quantity: 1, price: 0 }));
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save purchase. Check if Supabase is connected.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200/60 p-6">
      <h2 className="text-xl font-bold mb-4 text-slate-800">Add New Purchase</h2>
      
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm font-medium">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
            <input 
              type="date" 
              name="date"
              required
              value={formData.date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Supplier / Buyer</label>
            <select 
              name="buyer_name"
              required
              value={formData.buyer_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-colors"
            >
              <option value="" disabled>Select a buyer...</option>
              {buyers.map(b => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>
            {buyers.length === 0 && <p className="text-xs font-medium text-red-500 mt-1">Please add a buyer in the Buyer Accounts tab first.</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Item Description</label>
          <input 
            type="text" 
            name="item_description"
            required
            value={formData.item_description}
            onChange={handleChange}
            placeholder="e.g. 2x Gold Plated Necklace sets"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Quantity</label>
            <input 
              type="number" 
              name="quantity"
              min="1"
              required
              value={formData.quantity}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Total Price (₹)</label>
            <input 
              type="number" 
              name="price"
              min="0"
              step="0.01"
              required
              value={formData.price}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-colors"
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full mt-2 bg-indigo-600 text-white py-3 px-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none disabled:active:scale-100"
        >
          {loading ? 'Adding...' : 'Add Purchase'}
        </button>
      </form>
    </div>
  );
}
