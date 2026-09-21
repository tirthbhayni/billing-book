'use client';
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { Calculator, CheckCircle2, AlertCircle, FileUp, Banknote, Clock3, RotateCcw } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Money,
  Select,
  StatCard,
  TableWrap,
} from '@/components/ui';
import { formatINR } from '@/lib/format';

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
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Meesho reconciliation</CardTitle>
            <CardDescription>Match order sheets with settlements and calculate profit.</CardDescription>
          </div>
          <Field label="Global packing cost (₹)" htmlFor="packing-cost">
            <Input
              id="packing-cost"
              type="number"
              min={0}
              inputMode="decimal"
              value={globalPackingCost}
              onChange={(e) => handleSaveGlobalPacking(Number(e.target.value))}
              className="sm:w-32"
            />
          </Field>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>1. Order sheet</CardTitle>
            <CardDescription>Upload the sheet with Sub Order No, SKU, and status.</CardDescription>
          </CardHeader>
          <CardBody>
            <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/50 px-4 py-6 text-center hover:border-primary hover:bg-muted">
              <FileUp className="size-5 text-muted-foreground" aria-hidden />
              <span className="text-sm font-semibold text-primary">Select order sheet</span>
              <input type="file" className="sr-only" accept=".xlsx,.xls,.csv" onChange={handleOrderFileUpload} />
            </label>
            {orders.length > 0 ? (
              <p className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="size-4" aria-hidden />
                {orders.length} orders loaded
              </p>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Payment sheets</CardTitle>
            <CardDescription>Upload one or more settlement files to match payments.</CardDescription>
          </CardHeader>
          <CardBody>
            <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/50 px-4 py-6 text-center hover:border-primary hover:bg-muted">
              <FileUp className="size-5 text-muted-foreground" aria-hidden />
              <span className="text-sm font-semibold text-primary">Select payment sheets</span>
              <input type="file" className="sr-only" multiple accept=".xlsx,.xls,.csv" onChange={handlePaymentFileUpload} />
            </label>
            {payments.length > 0 ? (
              <p className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="size-4" aria-hidden />
                {payments.length} payment records loaded
              </p>
            ) : null}
          </CardBody>
        </Card>
      </div>

      <div className="flex justify-stretch sm:justify-end">
        <Button onClick={handleCalculate} disabled={orders.length === 0 || loading} className="w-full sm:w-auto">
          <Calculator className="size-4" aria-hidden />
          {loading ? 'Processing…' : 'Run reconciliation'}
        </Button>
      </div>

      {missingSkus.length > 0 ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sku-dialog-title"
            className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-card shadow-2xl sm:rounded-2xl"
          >
            <div className="border-b border-border px-4 py-4 sm:px-5">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertCircle className="size-5" aria-hidden />
                <h3 id="sku-dialog-title" className="text-lg font-semibold text-foreground">
                  New SKUs detected
                </h3>
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Enter product cost for these SKUs. They will be saved for future reconciliations.
              </p>
            </div>
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 sm:p-5">
              {missingSkus.map((sku) => (
                <div key={sku} className="flex flex-col gap-2 rounded-xl border border-border bg-muted/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-mono text-sm font-semibold">{sku}</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={newSkuCosts[sku] === 0 ? '' : newSkuCosts[sku]}
                    onChange={(e) => setNewSkuCosts({ ...newSkuCosts, [sku]: Number(e.target.value) })}
                    placeholder="Cost"
                    aria-label={`Cost for ${sku}`}
                    className="sm:w-32"
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-border p-4 sm:flex-row sm:justify-end sm:p-5">
              <Button type="button" variant="secondary" onClick={() => setMissingSkus([])}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSaveNewSkus}>
                Save and continue
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {isCalculated && results.length > 0 ? (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Total settled" value={formatINR(totalSettled)} icon={Banknote} tone="green" hint="Amount received" />
            <StatCard label="Pending payments" value={formatINR(pendingAmount)} icon={Clock3} tone="amber" hint="Delivered, not paid" />
            <StatCard label="Returns & cancellations" value={String(returnedCount)} icon={RotateCcw} tone="red" hint="RTO or cancelled orders" />
          </div>

          <Card>
            <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Sub order details</CardTitle>
                <CardDescription>Showing {filteredResults.length} orders</CardDescription>
              </div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by status"
                className="sm:w-56"
              >
                <option value="ALL">All statuses ({results.length})</option>
                {uniqueStatuses.map((status) => {
                  const count = results.filter((r) => r.status === status).length;
                  return (
                    <option key={status} value={status}>
                      {status} ({count})
                    </option>
                  );
                })}
              </Select>
            </CardHeader>
            <TableWrap>
              <div className="max-h-[600px] overflow-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="sticky top-0 bg-muted z-10 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-center font-semibold">#</th>
                      <th className="px-4 py-3 font-semibold">Sub order</th>
                      <th className="px-4 py-3 font-semibold">SKU</th>
                      <th className="px-4 py-3 text-center font-semibold">Qty</th>
                      <th className="px-4 py-3 text-right font-semibold">Payment</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 text-right font-semibold">Product</th>
                      <th className="px-4 py-3 text-right font-semibold">Final cost</th>
                      <th className="px-4 py-3 text-right font-semibold">Packing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredResults.map((r, i) => {
                      const prodCost = dbSkuCosts[r.sku] || 0;
                      const isReturnOrCancel = ['CANCELLED', 'RTO_COMPLETE', 'RTO_LOCKED', 'RTO'].includes(r.status);
                      const finalCost = isReturnOrCancel ? 0 : r.qty * prodCost;
                      const finalPacking = r.status === 'CANCELLED' ? 0 : globalPackingCost;

                      return (
                        <tr key={`${r.subOrderNo}-${i}`} className="hover:bg-muted/50">
                          <td className="px-4 py-3 text-center font-mono text-xs text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-3 font-medium">{r.subOrderNo}</td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.sku}</td>
                          <td className="px-4 py-3 text-center tabular-nums">{r.qty}</td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                            <Money value={r.settledAmount} />
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={r.status === 'DELIVERED' ? 'green' : isReturnOrCancel ? 'red' : 'slate'}>
                              {r.status || 'UNKNOWN'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Money value={prodCost} />
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-red-600">
                            <Money value={finalCost} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Money value={finalPacking} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="sticky bottom-0 bg-sidebar text-white">
                    {(() => {
                      const totals = filteredResults.reduce(
                        (acc, r) => {
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
                        },
                        { qty: 0, received: 0, productCost: 0, finalCost: 0, packing: 0 }
                      );
                      const totalProfit = totals.received - totals.finalCost - totals.packing;
                      return (
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-right text-slate-300">
                            Totals
                          </td>
                          <td className="px-4 py-3 text-center">{totals.qty}</td>
                          <td className="px-4 py-3 text-right text-emerald-300">
                            <Money value={totals.received} />
                          </td>
                          <td className="px-4 py-3 text-center text-xs">
                            Profit{' '}
                            <span className={totalProfit >= 0 ? 'font-semibold text-emerald-300' : 'font-semibold text-red-300'}>
                              {formatINR(totalProfit)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-300">
                            <Money value={totals.productCost} />
                          </td>
                          <td className="px-4 py-3 text-right text-red-300">
                            <Money value={totals.finalCost} />
                          </td>
                          <td className="px-4 py-3 text-right text-amber-300">
                            <Money value={totals.packing} />
                          </td>
                        </tr>
                      );
                    })()}
                  </tfoot>
                </table>
              </div>
            </TableWrap>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
