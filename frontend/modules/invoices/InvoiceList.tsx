'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Plus, Filter, ChevronLeft, ChevronRight, Edit3, Trash2, Send, FileText } from 'lucide-react';
import api from '@/services/api/axios';
import { useAuthStore } from '@/store/auth/useAuthStore';
import { toast } from '@/lib/toast';
import { formatApiError } from '@/lib/formatApiError';
import InvoiceStatusBadge from './InvoiceStatusBadge';
import EmailModal from './EmailModal';
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
  const canEdit = user && ['ADMIN', 'MANAGER', 'ACCOUNTS'].includes(user.role);
  const canSend = user && ['ADMIN', 'MANAGER', 'ACCOUNTS'].includes(user.role);
  const canDelete = user && ['ADMIN', 'MANAGER'].includes(user.role);

  const [emailTarget, setEmailTarget] = useState<{ id: string; number: string } | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  const handleDownloadPDF = async (id: string, invoiceNumber: string) => {
    setPdfLoadingId(id);
    try {
      const res = await api.post(`/invoices/${id}/pdf`, {}, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to generate PDF'));
    } finally {
      setPdfLoadingId(null);
    }
  };

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: PAGE_SIZE };
      if (search) params.search = search;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await api.get('/invoices', { params });
      setData(res.data);
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to load invoices'));
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice? This cannot be undone.')) return;
    try {
      await api.delete(`/invoices/${id}`);
      toast.success('Invoice deleted');
      fetchInvoices();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to delete invoice'));
    }
  };

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
            <Link href="/invoices/new"
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
                      <Link href={`/invoices/${inv.id}`} className="hover:underline">
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
                      <div className="flex items-center gap-2">
                        <Link href={`/invoices/${inv.id}`}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800">
                          View
                        </Link>
                        <button onClick={() => handleDownloadPDF(inv.id, inv.invoice_number || `INV-${inv.id.slice(0, 8).toUpperCase()}`)}
                          className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                          title="Generate Invoice PDF"
                          disabled={pdfLoadingId === inv.id}>
                          <FileText className={`w-4 h-4 ${pdfLoadingId === inv.id ? 'animate-pulse' : ''}`} />
                        </button>
                        {canSend && inv.status !== 'CANCELLED' && inv.status !== 'PAID' && (
                          <button onClick={() => setEmailTarget({ id: inv.id, number: inv.invoice_number || `INV-${inv.id.slice(0, 8).toUpperCase()}` })}
                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                            title="Send Invoice Email">
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {canEdit && (
                          <Link href={`/invoices/${inv.id}/edit`}
                            className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded transition-colors"
                            title="Edit Invoice">
                            <Edit3 className="w-4 h-4" />
                          </Link>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDelete(inv.id)}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors"
                            title="Delete Invoice">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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

      {emailTarget && (
        <EmailModal
          invoiceId={emailTarget.id}
          invoiceNumber={emailTarget.number}
          isOpen={true}
          onClose={() => setEmailTarget(null)}
          onSuccess={fetchInvoices}
        />
      )}
    </div>
  );
}
