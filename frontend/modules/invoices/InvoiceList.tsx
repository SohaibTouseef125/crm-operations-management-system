'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Plus, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/services/api/axios';
import { useAuthStore } from '@/store/auth/useAuthStore';
import { toast } from '@/lib/toast';
import { formatApiError } from '@/lib/formatApiError';
import InvoiceStatusBadge from './InvoiceStatusBadge';
import { InvoiceDetail, InvoiceStatus, PaginatedInvoices } from '@/types/invoice';

const STATUSES: (InvoiceStatus | 'ALL')[] = ['ALL', 'DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];

export default function InvoiceList() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [data, setData] = useState<PaginatedInvoices | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const canCreate = user && ['ADMIN', 'MANAGER', 'ACCOUNTS'].includes(user.role);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: PAGE_SIZE };
      if (search) params.search = search;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await api.get('/billing/invoices', { params });
      setData(res.data);
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to load invoices'));
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  // Debounce search
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer ${
                statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white border text-gray-700 hover:bg-gray-50'
              }`}>
              {s === 'ALL' ? 'All' : s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by invoice # or client..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none w-64"
            />
          </div>
          {canCreate && (
            <Link href="/billing/invoices/new"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> New Invoice
            </Link>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['Invoice #', 'Client', 'Invoice Date', 'Due Date', 'Amount (PKR)', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400 text-sm">Loading...</td></tr>
              ) : data?.items.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-gray-400 text-sm">No invoices found.</td></tr>
              ) : (
                data?.items.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm font-bold text-blue-600">
                      <Link href={`/billing/invoices/${inv.id}`} className="hover:underline">
                        {inv.invoice_number || `INV-${inv.id.slice(0, 8).toUpperCase()}`}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700">{inv.client_id}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : '—'}
                    </td>
                    <td className={`px-5 py-3 text-sm font-medium ${inv.status === 'OVERDUE' ? 'text-red-600' : 'text-gray-600'}`}>
                      {new Date(inv.due_date).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-sm font-bold text-gray-900">
                      {Number(inv.total_amount || inv.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/billing/invoices/${inv.id}`}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total > PAGE_SIZE && (
          <div className="px-5 py-3 border-t flex items-center justify-between text-sm text-gray-600">
            <span>{data.total} total invoices</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded border hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded border hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
