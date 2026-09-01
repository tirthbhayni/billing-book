'use client';
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { Calculator, CheckCircle2, AlertCircle, FileUp, Save } from 'lucide-react';

type OrderRow = {
  subOrderNo: string;
  orderDate: string;
  status: string;
  sku: string;
  qty: number;
  expectedAmount: number;
};

type PaymentRow = {
  subOrderNo: string;
  settledAmount: number;
  status?: string;
};

type ReconciliationResult = OrderRow & {
  settledAmount: number;
  difference: number;
  isPaid: boolean;
};

export default function MeeshoRecon() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [results, setResults] = useState<ReconciliationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [dbSkuCosts, setDbSkuCosts] = useState<Record<string, number>>({});
  const [globalPackingCost, setGlobalPackingCost] = useState<number>(0);
  
  const [missingSkus, setMissingSkus] = useState<string[]>([]);
  const [newSkuCosts, setNewSkuCosts] = useState<Record<string, number>>({});
  const [isCalculated, setIsCalculated] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: skus } = await supabase.from('sku_costs').select('*');
      if (skus) {
        const costMap: Record<string, number> = {};
        skus.forEach((s: any) => costMap[s.sku] = s.cost);
        setDbSkuCosts(costMap);
      }

      const { data: settings } = await supabase.from('app_settings').select('*').eq('key', 'global_packing_cost').single();
      if (settings && settings.value) {
        setGlobalPackingCost(Number(settings.value));
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const handleSaveGlobalPacking = async (val: number) => {
    setGlobalPackingCost(val);
    try {
      await supabase.from('app_settings').upsert({ key: 'global_packing_cost', value: String(val) });
    } catch (err) {
      console.error(err);
    }
  };

  const handleOrderFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        let sheetName = workbook.SheetNames.find(name => name.trim() === 'Order Payments') 
                     || workbook.SheetNames.find(name => !name.toLowerCase().includes('disclaimer')) 
                     || workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        let headerRowIndex = -1;
        let cols = { subOrder: -1, date: -1, status: -1, sku: -1, qty: -1, price: -1 };

        for (let r = 0; r < Math.min(20, rawData.length); r++) {
          const row = rawData[r] || [];
          for (let c = 0; c < row.length; c++) {
            const cell = String(row[c] || '').toLowerCase();
            if (cell.includes('sub order no')) { headerRowIndex = r; cols.subOrder = c; }
            else if (cell.includes('order date')) cols.date = c;
            else if (cell.includes('reason for credit entry') || cell.includes('live order status') || cell.includes('order status') || cell === 'status') cols.status = c;
            else if (cell === 'sku' || cell.includes('supplier sku')) cols.sku = c;
            else if (cell === 'quantity' || cell === 'qty') cols.qty = c;
            else if (cell.includes('supplier discounted price') || cell.includes('supplier listed price')) cols.price = c;
          }
          if (headerRowIndex !== -1) break; 
        }

        if (headerRowIndex === -1 || cols.subOrder === -1) {
          alert(`Warning: Could not find "Sub Order No" in Order sheet. Please check the file format.`);
          return;
        }

        const parsedOrders: OrderRow[] = [];
        for (let r = headerRowIndex + 1; r < rawData.length; r++) {
          const row = rawData[r];
          if (!row || row.length === 0) continue;
          
          const subOrderVal = row[cols.subOrder];
          if (!subOrderVal || String(subOrderVal).trim() === '') continue;

          parsedOrders.push({
            subOrderNo: String(subOrderVal).trim(),
            orderDate: cols.date !== -1 ? String(row[cols.date]) : '',
            status: cols.status !== -1 ? String(row[cols.status]).toUpperCase() : '',
            sku: cols.sku !== -1 ? String(row[cols.sku]) : '',
            qty: cols.qty !== -1 ? Number(row[cols.qty]) || 1 : 1,
            expectedAmount: cols.price !== -1 ? Number(row[cols.price]) || 0 : 0,
          });
        }

        setOrders(parsedOrders);
        setIsCalculated(false);
      } catch (err) {
        console.error(err);
        alert('Error parsing Order sheet.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handlePaymentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPayments: PaymentRow[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const data = await new Promise<any>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result);
          reader.onerror = reject;
          reader.readAsBinaryString(file);
        });

        const workbook = XLSX.read(data, { type: 'binary' });
        
        let sheetName = workbook.SheetNames.find(name => name.trim() === 'Order Payments') 
                     || workbook.SheetNames.find(name => !name.toLowerCase().includes('disclaimer')) 
                     || workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        let headerRowIndex = -1;
        let subOrderColIndex = -1;
        let settledColIndex = -1;
        let statusColIndex = -1;

        for (let r = 0; r < Math.min(20, rawData.length); r++) {
          const row = rawData[r] || [];
          for (let c = 0; c < row.length; c++) {
            const cellValue = String(row[c] || '').toLowerCase();
            if (cellValue.includes('sub order no')) { headerRowIndex = r; subOrderColIndex = c; }
            if (cellValue.includes('final settlement') || cellValue.includes('settlement amount') || cellValue.includes('bank amount')) { settledColIndex = c; }
            if (cellValue.includes('reason for credit entry') || cellValue.includes('live order status') || cellValue.includes('order status') || cellValue === 'status') { statusColIndex = c; }
          }
          if (headerRowIndex !== -1) break; 
        }

        if (headerRowIndex === -1 || subOrderColIndex === -1) { continue; }

        const parsedPayments: PaymentRow[] = [];
        for (let r = headerRowIndex + 1; r < rawData.length; r++) {
          const row = rawData[r];
          if (!row || row.length === 0) continue;
          
          const subOrderVal = row[subOrderColIndex];
          const settledVal = settledColIndex !== -1 ? row[settledColIndex] : 0;
          const statusVal = statusColIndex !== -1 ? row[statusColIndex] : undefined;
          
          if (subOrderVal && String(subOrderVal).trim() !== '') {
            parsedPayments.push({
              subOrderNo: String(subOrderVal).trim(),
              settledAmount: Number(settledVal) || 0,
              status: statusVal ? String(statusVal).trim().toUpperCase() : undefined,
            });
          }
        }

        newPayments.push(...parsedPayments);
      } catch (err) {
        console.error(err);
      }
    }

    if (newPayments.length > 0) {
      setPayments(prev => [...prev, ...newPayments]);
      setIsCalculated(false);
    }
  };

  const handleCalculate = async () => {
    setLoading(true);
    await fetchSettings();

    const uniqueOrderSkus = Array.from(new Set(orders.map(o => o.sku).filter(Boolean)));
    const missing = uniqueOrderSkus.filter(sku => dbSkuCosts[sku] === undefined);
    
    if (missing.length > 0) {
      setMissingSkus(missing);
      const initialNewCosts: Record<string, number> = {};
      missing.forEach(sku => initialNewCosts[sku] = 0);
      setNewSkuCosts(initialNewCosts);
      setLoading(false);
      return; 
    }

    processReconciliation();
  };

  const handleSaveNewSkus = async () => {
    setLoading(true);
    try {
      const rowsToInsert = Object.entries(newSkuCosts).map(([sku, cost]) => ({ sku, cost }));
      const { error } = await supabase.from('sku_costs').upsert(rowsToInsert, { onConflict: 'sku' });
      if (error) throw error;
      
      setDbSkuCosts(prev => ({ ...prev, ...newSkuCosts }));
      setMissingSkus([]);
      setNewSkuCosts({});
      
      processReconciliation(rowsToInsert);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const processReconciliation = (newlyAddedSkus?: {sku: string, cost: number}[]) => {
    const activeCosts = { ...dbSkuCosts };
    if (newlyAddedSkus) {
      newlyAddedSkus.forEach(s => activeCosts[s.sku] = s.cost);
    }

    const paymentMap = new Map<string, number>();
    const paymentStatusMap = new Map<string, string>();
    
    payments.forEach(p => {
      const current = paymentMap.get(p.subOrderNo) || 0;
      paymentMap.set(p.subOrderNo, current + p.settledAmount);
      if (p.status) paymentStatusMap.set(p.subOrderNo, p.status);
    });

    const reconResults = orders.map(order => {
      const settledAmount = paymentMap.get(order.subOrderNo) || 0;
      const paymentStatus = paymentStatusMap.get(order.subOrderNo);
      
      const finalStatus = (paymentStatus || order.status || 'UNKNOWN').toUpperCase();
      const isReturnOrCancel = ['CANCELLED', 'RTO_COMPLETE', 'RTO_LOCKED', 'RTO'].includes(finalStatus);
      const expected = isReturnOrCancel ? 0 : order.expectedAmount;
      
      return {
        ...order,
        status: finalStatus,
        expectedAmount: expected,
        settledAmount: settledAmount,
        difference: settledAmount - expected,
        isPaid: settledAmount > 0 || isReturnOrCancel
      };
    });

    setResults(reconResults);
    setIsCalculated(true);
    setLoading(false);
  };

  const totalExpected = results.reduce((sum, r) => sum + r.expectedAmount, 0);
  const totalSettled = results.reduce((sum, r) => sum + r.settledAmount, 0);
  const pendingAmount = results.filter(r => r.expectedAmount > 0 && r.settledAmount === 0).reduce((sum, r) => sum + r.expectedAmount, 0);
  const deliveredCount = results.filter(r => !['CANCELLED', 'RTO_COMPLETE', 'RTO_LOCKED', 'RTO'].includes(r.status)).length;
  const returnedCount = results.filter(r => ['CANCELLED', 'RTO_COMPLETE', 'RTO_LOCKED', 'RTO'].includes(r.status)).length;

  const uniqueStatuses = Array.from(new Set(results.map(r => r.status).filter(Boolean)));
  const filteredResults = results.filter(r => {
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Meesho Recon</h2>
          <p className="text-slate-500 text-sm">Automated match & profit calculation</p>
        </div>
        <div className="flex items-center gap-3 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
          <span className="text-sm font-semibold text-indigo-800">Global Packing Cost (₹):</span>
          <input 
            type="number"
            min="0"
            value={globalPackingCost}
            onChange={(e) => handleSaveGlobalPacking(Number(e.target.value))}
            className="w-20 p-1.5 border border-indigo-200 rounded-lg text-center font-bold text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200/60 hover:border-indigo-200 transition-colors group">
          <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg"><FileUp size={16} /></div>
            1. Upload Order Sheets
          </h3>
          <p className="text-sm text-slate-500 mb-4">Upload the primary order sheets containing Sub Order No, SKU, and Status.</p>
          <label className="flex items-center justify-center w-full p-6 border-2 border-dashed border-indigo-200 bg-indigo-50/50 rounded-xl cursor-pointer hover:bg-indigo-50 hover:border-indigo-400 transition-all group-hover:shadow-inner">
            <div className="flex flex-col items-center gap-2">
              <FileUp size={24} className="text-indigo-400" />
              <span className="text-sm font-medium text-indigo-600">Select Order Sheet</span>
            </div>
            <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleOrderFileUpload} />
          </label>
          {orders.length > 0 && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-emerald-700 text-sm font-medium">
              <CheckCircle2 size={16} />
              {orders.length} orders loaded
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200/60 hover:border-indigo-200 transition-colors group">
          <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg"><FileUp size={16} /></div>
            2. Upload Payment Sheets
          </h3>
          <p className="text-sm text-slate-500 mb-4">Upload one or multiple payment sheets to match settlements.</p>
          <label className="flex items-center justify-center w-full p-6 border-2 border-dashed border-indigo-200 bg-indigo-50/50 rounded-xl cursor-pointer hover:bg-indigo-50 hover:border-indigo-400 transition-all group-hover:shadow-inner">
            <div className="flex flex-col items-center gap-2">
              <FileUp size={24} className="text-indigo-400" />
              <span className="text-sm font-medium text-indigo-600">Select Payment Sheets</span>
            </div>
            <input type="file" className="hidden" multiple accept=".xlsx,.xls,.csv" onChange={handlePaymentFileUpload} />
          </label>
          {payments.length > 0 && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-emerald-700 text-sm font-medium">
              <CheckCircle2 size={16} />
              {payments.length} payment records loaded
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button 
          onClick={handleCalculate}
          disabled={orders.length === 0 || loading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 active:scale-95"
        >
          <Calculator size={20} />
          {loading ? 'Processing...' : 'Run Reconciliation'}
        </button>
      </div>

      {/* Missing SKUs Modal */}
      {missingSkus.length > 0 && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3 text-orange-600 mb-2">
                <AlertCircle size={24} />
                <h3 className="text-xl font-bold text-slate-800">New SKUs Detected</h3>
              </div>
              <p className="text-slate-500 text-sm">We found SKUs in your order sheet that are not in your database. Please enter their actual product cost to continue. They will be saved permanently.</p>
            </div>
            
            <div className="p-6 overflow-y-auto bg-white flex-1 space-y-4">
              {missingSkus.map(sku => (
                <div key={sku} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50 hover:border-indigo-300 transition-colors">
                  <span className="font-mono text-sm font-semibold text-slate-700">{sku}</span>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₹</span>
                    <input
                      type="number"
                      value={newSkuCosts[sku] === 0 ? '' : newSkuCosts[sku]}
                      onChange={(e) => setNewSkuCosts({...newSkuCosts, [sku]: Number(e.target.value)})}
                      className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      placeholder="Cost"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setMissingSkus([])}
                className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveNewSkus}
                className="px-6 py-2.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20"
              >
                Save & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {isCalculated && results.length > 0 && (
        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200/60 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100/50 rounded-bl-full -mr-4 -mt-4"></div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Settled</p>
              <p className="text-3xl font-extrabold text-emerald-600 tracking-tight">₹{totalSettled.toLocaleString()}</p>
              <p className="text-xs font-medium text-slate-400 mt-2">Amount successfully received</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200/60 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-100/50 rounded-bl-full -mr-4 -mt-4"></div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Pending Payments</p>
              <p className="text-3xl font-extrabold text-orange-600 tracking-tight">₹{pendingAmount.toLocaleString()}</p>
              <p className="text-xs font-medium text-slate-400 mt-2">Orders delivered but not paid yet</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200/60 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-100/50 rounded-bl-full -mr-4 -mt-4"></div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Returns & Cancellations</p>
              <p className="text-3xl font-extrabold text-slate-800 tracking-tight">{returnedCount}</p>
              <p className="text-xs font-medium text-slate-400 mt-2">RTO or Cancelled orders</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200/60 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-slate-800">Sub Order Details</h3>
                <p className="text-xs text-slate-500">Showing {filteredResults.length} orders.</p>
              </div>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="ALL">All Statuses ({results.length})</option>
                {uniqueStatuses.map(status => {
                  const count = results.filter(r => r.status === status).length;
                  return (
                    <option key={status} value={status}>{status} ({count})</option>
                  );
                })}
              </select>
            </div>
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="sticky top-0 bg-slate-100/80 backdrop-blur-md shadow-sm z-10">
                  <tr className="text-slate-600">
                    <th className="p-4 font-semibold whitespace-nowrap border-b border-slate-200 text-center">Sr. No.</th>
                    <th className="p-4 font-semibold whitespace-nowrap border-b border-slate-200">Sub Order No</th>
                    <th className="p-4 font-semibold whitespace-nowrap border-b border-slate-200">SKU</th>
                    <th className="p-4 font-semibold whitespace-nowrap text-center border-b border-slate-200">Qty</th>
                    <th className="p-4 font-semibold whitespace-nowrap text-right border-b border-slate-200">Payment</th>
                    <th className="p-4 font-semibold whitespace-nowrap border-b border-slate-200">Status</th>
                    <th className="p-4 font-semibold whitespace-nowrap text-right border-b border-slate-200">Product Cost</th>
                    <th className="p-4 font-semibold whitespace-nowrap text-right border-b border-slate-200">Final Cost</th>
                    <th className="p-4 font-semibold whitespace-nowrap text-right border-b border-slate-200">Packing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredResults.map((r, i) => {
                    const prodCost = dbSkuCosts[r.sku] || 0;
                    const isReturnOrCancel = ['CANCELLED', 'RTO_COMPLETE', 'RTO_LOCKED', 'RTO'].includes(r.status);
                    const finalCost = isReturnOrCancel ? 0 : r.qty * prodCost;
                    const finalPacking = r.status === 'CANCELLED' ? 0 : globalPackingCost; 

                    return (
                      <tr key={i} className="hover:bg-indigo-50/50 transition-colors bg-white group">
                        <td className="p-4 whitespace-nowrap text-center text-slate-400 font-mono text-xs">{i + 1}</td>
                        <td className="p-4 whitespace-nowrap font-medium text-slate-700">{r.subOrderNo}</td>
                        <td className="p-4 whitespace-nowrap text-slate-500 text-xs font-mono">{r.sku}</td>
                        <td className="p-4 whitespace-nowrap text-center font-medium text-slate-600">{r.qty}</td>
                        <td className="p-4 whitespace-nowrap text-right text-emerald-600 font-bold">
                          ₹{r.settledAmount.toLocaleString()}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            r.status === 'DELIVERED' ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200' : 
                            isReturnOrCancel ? 'bg-red-100/80 text-red-700 border border-red-200' : 'bg-slate-100/80 text-slate-700 border border-slate-200'
                          }`}>
                            {r.status || 'UNKNOWN'}
                          </span>
                        </td>
                        <td className="p-4 whitespace-nowrap text-right text-slate-600 font-medium">₹{prodCost}</td>
                        <td className="p-4 whitespace-nowrap text-right text-red-500 font-bold">₹{finalCost}</td>
                        <td className="p-4 whitespace-nowrap text-right text-orange-500 font-medium">₹{finalPacking}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="sticky bottom-0 bg-slate-900 text-white shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.2)] z-10">
                  {(() => {
                    const totals = filteredResults.reduce((acc, r) => {
                      const prodCost = dbSkuCosts[r.sku] || 0;
                      const isReturnOrCancel = ['CANCELLED', 'RTO_COMPLETE', 'RTO_LOCKED', 'RTO'].includes(r.status);
                      const finalCost = isReturnOrCancel ? 0 : r.qty * prodCost;
                      const finalPacking = r.status === 'CANCELLED' ? 0 : globalPackingCost;
                      
                      acc.qty += r.qty;
                      acc.received += r.settledAmount;
                      acc.productCost += prodCost;
                      acc.finalCost += finalCost;
                      acc.packing += finalPacking;
                      return acc;
                    }, { qty: 0, received: 0, productCost: 0, finalCost: 0, packing: 0 });

                    const totalProfit = totals.received - totals.finalCost - totals.packing;

                    return (
                      <tr>
                        <td colSpan={3} className="p-4 font-bold text-right text-slate-300">TOTALS:</td>
                        <td className="p-4 font-bold text-center text-slate-100">{totals.qty}</td>
                        <td className="p-4 font-bold text-right text-emerald-400">₹{totals.received.toLocaleString()}</td>
                        <td className="p-4 text-center text-xs text-slate-400 font-medium">Profit: <span className={`font-bold text-sm ml-1 ${totalProfit >= 0 ? 'text-indigo-400' : 'text-red-400'}`}>₹{totalProfit.toLocaleString()}</span></td>
                        <td className="p-4 font-bold text-right text-slate-300">₹{totals.productCost.toLocaleString()}</td>
                        <td className="p-4 font-bold text-right text-red-400">₹{totals.finalCost.toLocaleString()}</td>
                        <td className="p-4 font-bold text-right text-orange-400">₹{totals.packing.toLocaleString()}</td>
                      </tr>
                    );
                  })()}
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
