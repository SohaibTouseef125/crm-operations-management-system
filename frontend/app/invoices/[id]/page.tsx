'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import InvoiceDetail from '@/modules/invoices/InvoiceDetail';
import api from '@/services/api/axios';
import { toast } from '@/lib/toast';
import { formatApiError } from '@/lib/formatApiError';
import { InvoiceDetail as InvoiceDetailType } from '@/types/invoice';

interface Client {
  id: string; name: string; company_name: string;
  address: string | null; contact_info: string | null;
}

interface Payment {
  id: string; amount: number;
  payment_date: string; payment_method: string | null;
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetailType | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [invRes, payRes] = await Promise.all([
        api.get(`/invoices/${id}`),
        api.get('/billing/payments', { params: { invoice_id: id } }),
      ]);
      setInvoice(invRes.data);
      setPayments(payRes.data || []);

      try {
        const clientRes = await api.get(`/clients/${invRes.data.client_id}`);
        setClient(clientRes.data);
      } catch { /* non-fatal */ }
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to load invoice'));
      router.push('/invoices');
    } finally {
      setIsLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'ACCOUNTS']}>
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-4">
            <button onClick={() => router.push('/invoices')}
              className="text-sm text-gray-500 hover:text-gray-700">
              ← Back to Invoices
            </button>
          </div>
          {isLoading ? (
            <div className="text-center py-16 text-gray-400">Loading invoice...</div>
          ) : invoice ? (
            <InvoiceDetail
              invoice={invoice}
              client={client}
              payments={payments}
              onRefresh={fetchData}
            />
          ) : null}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
