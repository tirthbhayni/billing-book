'use client';

import { Purchase, Payment, Buyer } from '@/types';
import { supabase } from '@/lib/supabase';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  EmptyState,
  Field,
  Input,
  Money,
  TFoot,
  THead,
  Td,
  Tf,
  Th,
  Tr,
} from '@/components/ui';

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

  const totals = useMemo(
    () =>
      buyerStats.reduce(
        (acc, b) => ({
          purchased: acc.purchased + b.totalPurchases,
          paid: acc.paid + b.totalPaid,
          due: acc.due + b.due,
        }),
        { purchased: 0, paid: 0, due: 0 }
      ),
    [buyerStats]
  );

  const selectedPayments = useMemo(
    () => (selectedBuyer ? payments.filter((p) => p.buyer_name === selectedBuyer) : []),
    [payments, selectedBuyer]
  );

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
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader className="gap-4">
          <div>
            <CardTitle>Buyer ledger</CardTitle>
            <CardDescription>Party-wise purchase, payment, and outstanding due.</CardDescription>
          </div>
          <form onSubmit={handleAddBuyer} className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="text"
              placeholder="New buyer name"
              value={newBuyerName}
              onChange={(e) => setNewBuyerName(e.target.value)}
              required
              aria-label="New buyer name"
              className="sm:max-w-xs"
            />
            <Button type="submit" disabled={loading || !newBuyerName.trim()} className="sm:w-auto">
              Add buyer
            </Button>
          </form>
        </CardHeader>

        {buyerStats.length === 0 ? (
          <EmptyState title="No buyers yet" description="Add a buyer name to start the ledger." />
        ) : (
          <DataTable minWidth={720}>
            <THead>
              <tr>
                <Th align="center">Sr</Th>
                <Th>Buyer / party</Th>
                <Th align="right">Purchased (₹)</Th>
                <Th align="right">Paid (₹)</Th>
                <Th align="right">Due (₹)</Th>
                <Th align="center">Status</Th>
              </tr>
            </THead>
            <tbody>
              {buyerStats.map((buyer, idx) => (
                <Tr key={buyer.name} selected={selectedBuyer === buyer.name} onClick={() => setSelectedBuyer(buyer.name)}>
                  <Td align="center">{idx + 1}</Td>
                  <Td className="font-semibold">{buyer.name}</Td>
                  <Td align="right">
                    <Money value={buyer.totalPurchases} />
                  </Td>
                  <Td align="right">
                    <Money value={buyer.totalPaid} />
                  </Td>
                  <Td align="right" className={buyer.due > 0 ? 'font-semibold text-red-600' : 'font-semibold text-emerald-700'}>
                    <Money value={buyer.due} />
                  </Td>
                  <Td align="center">
                    <Badge tone={buyer.due > 0 ? 'red' : 'green'}>{buyer.due > 0 ? 'Due' : 'Settled'}</Badge>
                  </Td>
                </Tr>
              ))}
            </tbody>
            <TFoot>
              <tr>
                <Tf colSpan={2}>Total ({buyerStats.length} parties)</Tf>
                <Tf align="right">
                  <Money value={totals.purchased} className="text-white" />
                </Tf>
                <Tf align="right">
                  <Money value={totals.paid} className="text-white" />
                </Tf>
                <Tf align="right">
                  <Money value={totals.due} className="text-white" />
                </Tf>
                <Tf />
              </tr>
            </TFoot>
          </DataTable>
        )}
      </Card>

      {selectedBuyer ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card>
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
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Payment register — {selectedBuyer}</CardTitle>
            </CardHeader>
            {selectedPayments.length === 0 ? (
              <EmptyState title="No payments yet" description="Record a lump-sum payment for this party." />
            ) : (
              <DataTable minWidth={480}>
                <THead>
                  <tr>
                    <Th align="center">Sr</Th>
                    <Th>Date</Th>
                    <Th align="right">Amount paid (₹)</Th>
                  </tr>
                </THead>
                <tbody>
                  {selectedPayments.map((p, idx) => (
                    <Tr key={p.id}>
                      <Td align="center">{idx + 1}</Td>
                      <Td>{p.date}</Td>
                      <Td align="right" className="font-semibold text-emerald-700">
                        <Money value={p.amount} />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
                <TFoot>
                  <tr>
                    <Tf colSpan={2}>Total paid</Tf>
                    <Tf align="right">
                      <Money
                        value={selectedPayments.reduce((sum, p) => sum + p.amount, 0)}
                        className="text-white"
                      />
                    </Tf>
                  </tr>
                </TFoot>
              </DataTable>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
