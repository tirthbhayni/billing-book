'use client';

import { Purchase } from '@/types';
import { supabase } from '@/lib/supabase';
import { useState, useMemo, useEffect } from 'react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Search, X, Filter } from 'lucide-react';

type TransactionsListProps = {
  purchases: Purchase[];
  onUpdate: () => void;
  buyerFilter?: string;
  onBuyerFilterChange?: (buyer: string) => void;
  title?: string;
};

export default function TransactionsList({ 
  purchases, 
  onUpdate, 
  buyerFilter: controlledBuyerFilter,
  onBuyerFilterChange,
  title = 'Recent Purchases'
}: TransactionsListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [internalBuyerFilter, setInternalBuyerFilter] = useState('');

  const activeBuyerFilter = controlledBuyerFilter !== undefined ? controlledBuyerFilter : internalBuyerFilter;
  const setBuyerFilter = (val: string) => {
    if (onBuyerFilterChange) {
      onBuyerFilterChange(val);
    } else {
      setInternalBuyerFilter(val);
    }
  };

  // Sync internal state if controlled prop changes
  useEffect(() => {
    if (controlledBuyerFilter !== undefined) {
      setInternalBuyerFilter(controlledBuyerFilter);
    }
  }, [controlledBuyerFilter]);

  const uniqueBuyers = useMemo(() => {
    const set = new Set<string>();
    purchases.forEach(p => {
      if (p.buyer_name) set.add(p.buyer_name);
    });
    return Array.from(set).sort();
  }, [purchases]);

  const filteredPurchases = useMemo(() => {
    let list = purchases;

    // Date filtering
    if (dateFilter !== 'all') {
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
        if (customStart && customEnd) {
          start = startOfDay(parseISO(customStart));
          end = endOfDay(parseISO(customEnd));
        } else {
          start = new Date(0);
          end = new Date(8640000000000000);
        }
      }

      if (dateFilter !== 'custom' || (customStart && customEnd)) {
        list = list.filter(p => {
          const d = parseISO(p.date);
          return isWithinInterval(d, { start, end });
        });
      }
    }

    // Buyer filter
    if (activeBuyerFilter) {
      list = list.filter(p => p.buyer_name.toLowerCase() === activeBuyerFilter.toLowerCase());
    }

    // Search query filter (matches buyer_name or item_description)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(p => 
        (p.buyer_name && p.buyer_name.toLowerCase().includes(q)) ||
        (p.item_description && p.item_description.toLowerCase().includes(q))
      );
    }

    return list;
  }, [purchases, dateFilter, customStart, customEnd, activeBuyerFilter, searchQuery]);

  // Calculate totals for filtered list
  const { totalQty, totalAmount } = useMemo(() => {
    return filteredPurchases.reduce(
      (acc, p) => ({
        totalQty: acc.totalQty + (Number(p.quantity) || 0),
        totalAmount: acc.totalAmount + (Number(p.price) || 0)
      }),
      { totalQty: 0, totalAmount: 0 }
    );
  }, [filteredPurchases]);

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

  const hasActiveFilters = dateFilter !== 'all' || activeBuyerFilter !== '' || searchQuery.trim() !== '';

  const clearAllFilters = () => {
    setDateFilter('all');
    setCustomStart('');
    setCustomEnd('');
    setSearchQuery('');
    setBuyerFilter('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200/60 overflow-hidden mt-8 lg:mt-0">
      <div className="p-6 border-b border-slate-100 flex flex-col gap-4">
        
        {/* Header & Date Filters */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing <span className="font-semibold text-slate-700">{filteredPurchases.length}</span> of {purchases.length} records
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5 text-sm">
              {(['all', 'week', 'month', 'custom'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setDateFilter(f)}
                  className={`px-3 py-1.5 rounded-full capitalize transition-all font-medium text-xs ${
                    dateFilter === f 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f === 'all' ? 'All Time' : f === 'week' ? 'This Week' : f === 'month' ? 'This Month' : 'Custom'}
                </button>
              ))}
            </div>
            
            {dateFilter === 'custom' && (
              <div className="flex gap-2 items-center text-xs mt-1">
                <input 
                  type="date" 
                  value={customStart} 
                  onChange={e => setCustomStart(e.target.value)} 
                  className="border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                />
                <span className="text-slate-500 font-medium">to</span>
                <input 
                  type="date" 
                  value={customEnd} 
                  onChange={e => setCustomEnd(e.target.value)} 
                  className="border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                />
              </div>
            )}
          </div>
        </div>

        {/* Search, Buyer Dropdown & Filter Clear */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by buyer or item description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs md:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Buyer filter */}
          <div className="sm:w-52">
            <select
              value={activeBuyerFilter}
              onChange={(e) => setBuyerFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs md:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-colors text-slate-700"
            >
              <option value="">All Buyers / Suppliers</option>
              {uniqueBuyers.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors whitespace-nowrap self-start sm:self-auto"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Live Filter Totals Summary Pill */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50/70 border border-indigo-100/80 rounded-xl px-4 py-2.5 text-xs text-indigo-950">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            <span>Current Filter Summary:</span>
            <span className="font-bold text-indigo-900">{filteredPurchases.length} purchases</span>
          </div>
          <div className="flex items-center gap-4 font-semibold">
            <span>Total Units: <span className="font-bold text-indigo-700">{totalQty.toLocaleString()}</span></span>
            <span>Total Spent: <span className="font-extrabold text-indigo-800 text-sm">₹{totalAmount.toLocaleString()}</span></span>
          </div>
        </div>

      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
              <th className="p-4 font-semibold whitespace-nowrap">Date</th>
              <th className="p-4 font-semibold whitespace-nowrap">Buyer / Supplier</th>
              <th className="p-4 font-semibold whitespace-nowrap">Item Description</th>
              <th className="p-4 font-semibold text-center whitespace-nowrap">Qty</th>
              <th className="p-4 font-semibold text-right whitespace-nowrap">Total Price</th>
              <th className="p-4 font-semibold text-center whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredPurchases.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                  No purchases found matching the selected filters.
                </td>
              </tr>
            ) : (
              filteredPurchases.map(p => (
                <tr key={p.id} className="hover:bg-indigo-50/50 transition-colors group">
                  <td className="p-4 whitespace-nowrap text-slate-500 font-medium">{p.date}</td>
                  <td className="p-4 font-medium text-slate-700 whitespace-nowrap">
                    <span 
                      onClick={() => setBuyerFilter(p.buyer_name)}
                      className="cursor-pointer hover:text-indigo-600 hover:underline"
                      title="Filter by this buyer"
                    >
                      {p.buyer_name}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600 whitespace-nowrap">{p.item_description}</td>
                  <td className="p-4 text-center font-semibold text-slate-700 whitespace-nowrap">{p.quantity}</td>
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

          {/* Table Footer with Summary Row */}
          {filteredPurchases.length > 0 && (
            <tfoot className="bg-slate-50/90 border-t-2 border-slate-200 text-sm font-semibold">
              <tr>
                <td colSpan={3} className="p-4 text-slate-700 font-bold whitespace-nowrap">
                  Total ({filteredPurchases.length} {filteredPurchases.length === 1 ? 'record' : 'records'})
                </td>
                <td className="p-4 text-center text-indigo-700 font-extrabold whitespace-nowrap">
                  {totalQty.toLocaleString()}
                </td>
                <td className="p-4 text-right text-indigo-700 font-extrabold text-base whitespace-nowrap">
                  ₹{totalAmount.toLocaleString()}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

