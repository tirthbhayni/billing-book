'use client';

import { Purchase, Payment, Buyer } from '@/types';
import { supabase } from '@/lib/supabase';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Badge, Button, Card, CardBody, CardDescription, CardHeader, CardTitle, EmptyState, Field, Input, Money } from '@/components/ui';
import { formatINR } from '@/lib/format';

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

  const buyerStats = useMemo(() => {
    const stats: Record<string, { totalPurchases: number; totalPaid: number; due: number }> = {};

    buyers.forEach((b) => {
      stats[b.name] = { totalPurchases: 0, totalPaid: 0, due: 0 };
    });

    purchases.forEach((p) => {
      if (!stats[p.buyer_name]) stats[p.buyer_name] = { totalPurchases: 0, totalPaid: 0, due: 0 };
      stats[p.buyer_name].totalPurchases += p.price;
    });

    payments.forEach((p) => {
      if (!stats[p.buyer_name]) stats[p.buyer_name] = { totalPurchases: 0, totalPaid: 0, due: 0 };
      stats[p.buyer_name].totalPaid += p.amount;
    });

    Object.keys(stats).forEach((buyer) => {
      stats[buyer].due = stats[buyer].totalPurchases - stats[buyer].totalPaid;
    });

    return Object.entries(stats)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.due - a.due);
  }, [buyers, purchases, payments]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuyer || paymentAmount <= 0) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('payments').insert([
        {
          buyer_name: selectedBuyer,
          amount: paymentAmount,
          date: format(new Date(), 'yyyy-MM-dd'),
        },
      ]);

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
      const { error } = await supabase.from('buyers').insert([{ name: newBuyerName.trim() }]);
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
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Buyer accounts</CardTitle>
          <CardDescription>Add a party, then record lump-sum payments against their dues.</CardDescription>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <form onSubmit={handleAddBuyer} className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="text"
              placeholder="New buyer name"
              value={newBuyerName}
              onChange={(e) => setNewBuyerName(e.target.value)}
              required
              aria-label="New buyer name"
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !newBuyerName.trim()} className="sm:w-auto">
              Add buyer
            </Button>
          </form>

          <div className="flex flex-col gap-2">
            {buyerStats.length === 0 ? (
              <EmptyState title="No buyers yet" description="Add a buyer name to start the ledger." />
            ) : (
              buyerStats.map((buyer) => {
                const selected = selectedBuyer === buyer.name;
                return (
                  <button
                    key={buyer.name}
                    type="button"
                    onClick={() => setSelectedBuyer(buyer.name)}
                    className={`rounded-xl border p-4 text-left transition-colors duration-200 ${
                      selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-semibold">{buyer.name}</span>
                      <Badge tone={buyer.due > 0 ? 'red' : 'green'}>
                        {buyer.due > 0 ? `${formatINR(buyer.due)} due` : 'Settled'}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Purchased <Money value={buyer.totalPurchases} className="text-foreground" />
                      </span>
                      <span>
                        Paid <Money value={buyer.totalPaid} className="text-foreground" />
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </CardBody>
      </Card>

      <Card className="h-fit">
        {selectedBuyer ? (
          <>
            <CardHeader>
              <CardTitle>Record payment</CardTitle>
              <CardDescription>Payment for {selectedBuyer}</CardDescription>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleAddPayment} className="flex flex-col gap-4">
                <Field label="Amount paid (₹)" htmlFor="ledger-amount">
                  <Input
                    id="ledger-amount"
                    type="number"
                    min={1}
                    step="0.01"
                    inputMode="decimal"
                    required
                    value={paymentAmount || ''}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  />
                </Field>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="submit" variant="success" disabled={loading || paymentAmount <= 0} className="flex-1">
                    {loading ? 'Processing…' : 'Record payment'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setSelectedBuyer(null)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardBody>
          </>
        ) : (
          <EmptyState title="Select a buyer" description="Tap a buyer on the left to record a lump-sum payment." />
        )}
      </Card>
    </div>
  );
}
