'use client';

/**
 * /shop-home/settings/subscription/receipt?id=<paymentId> — printable
 * NearGFix subscription receipt from GET /subscriptions/receipts/{paymentId}.
 * Print / Save as PDF uses the browser print dialog; the print stylesheet
 * hides the dashboard chrome so only the receipt is printed.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Printer } from 'lucide-react';

import ReceiptView from '@/components/subscription/ReceiptView';
import { BTN_PRIMARY, BTN_SECONDARY, Notice, SkeletonCard, SUB_BASE } from '@/components/subscription/shopUi';
import { fetchReceipt } from '@/lib/shopSubscription';
import { errorText } from '@/lib/subscriptionFormat';

const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  #subscription-receipt-print, #subscription-receipt-print * { visibility: visible !important; }
  #subscription-receipt-print { position: absolute; left: 0; top: 0; width: 100%; }
  @page { margin: 14mm; }
}`;

export default function ReceiptPage() {
  const id = useSearchParams().get('id') || '';
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setReceipt(null);
    if (!id) {
      setError('No receipt selected.');
      return;
    }
    try {
      setReceipt(await fetchReceipt(id));
    } catch (e) {
      setError(errorText(e, 'Could not load this receipt.'));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-5">
      <style>{PRINT_CSS}</style>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`${SUB_BASE}/`} className={BTN_SECONDARY}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Subscription
        </Link>
        <button type="button" onClick={() => window.print()} disabled={!receipt} className={BTN_PRIMARY}>
          <Printer className="h-4 w-4" aria-hidden="true" /> Print / Save as PDF
        </button>
      </div>

      {error ? (
        <Notice tone="red" icon={AlertTriangle}>
          {error}
          {id ? (
            <button type="button" onClick={load} className="ml-2 font-bold underline">
              Retry
            </button>
          ) : null}
        </Notice>
      ) : null}
      {!receipt && !error ? <SkeletonCard lines={8} /> : null}
      {receipt ? (
        <div id="subscription-receipt-print">
          <ReceiptView receipt={receipt} />
        </div>
      ) : null}
    </div>
  );
}
