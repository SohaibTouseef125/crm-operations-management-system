'use client';

import { useState, useEffect } from 'react';
import api from '@/services/api/axios';
import { toast } from '@/lib/toast';
import { BarChart3, DollarSign, TrendingUp, FileText, Download } from 'lucide-react';

interface MonthlyRevenue { month: string; revenue: number; invoice_count: number; }
interface YearlyRevenue { year: number; revenue: number; invoice_count: number; }
interface InvoiceSummary { [status: string]: { count: number; amount: number; } }

export default function FinancialReports() {
  const [tab, setTab] = useState<'revenue' | 'invoices' | 'payments'>('revenue');
  const [monthlyRev, setMonthlyRev] = useState<MonthlyRevenue[]>([]);
  const [yearlyRev, setYearlyRev] = useState<YearlyRevenue[]>([]);
  const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummary>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const year = new Date().getFullYear();
    Promise.all([
      api.get('/billing/reports/revenue/monthly', { params: { year } }).then(r => setMonthlyRev(r.data.data || [])),
      api.get('/billing/reports/revenue/yearly').then(r => setYearlyRev(r.data.data || [])),
      api.get('/billing/reports/invoices/summary').then(r => setInvoiceSummary(r.data.breakdown || {})),
    ]).catch(() => toast.error('Failed to load reports'))
    .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {(['revenue', 'invoices', 'payments'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {t === 'revenue' ? 'Revenue Reports' : t === 'invoices' ? 'Invoice Reports' : 'Payment Reports'}
          </button>
        ))}
      </div>

      {tab === 'revenue' && (
        <div className="grid gap-6">
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><TrendingUp size={20} /> Monthly Revenue ({new Date().getFullYear()})</h3>
            {monthlyRev.length === 0 ? <p className="text-gray-400">No data</p> : (
              <div className="space-y-2">
                {monthlyRev.map(m => (
                  <div key={m.month} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <span className="font-medium">{m.month}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-green-600 font-bold">Rs. {m.revenue.toLocaleString()}</span>
                      <span className="text-sm text-gray-500">{m.invoice_count} invoices</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><BarChart3 size={20} /> Yearly Revenue</h3>
            {yearlyRev.length === 0 ? <p className="text-gray-400">No data</p> : (
              <div className="space-y-2">
                {yearlyRev.map(y => (
                  <div key={y.year} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <span className="font-medium">{y.year}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-green-600 font-bold">Rs. {y.revenue.toLocaleString()}</span>
                      <span className="text-sm text-gray-500">{y.invoice_count} invoices</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'invoices' && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FileText size={20} /> Invoice Status Breakdown</h3>
          {Object.keys(invoiceSummary).length === 0 ? <p className="text-gray-400">No invoices</p> : (
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(invoiceSummary).map(([status, data]) => (
                <div key={status} className="p-4 border rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">{status.replace(/_/g, ' ')}</p>
                  <p className="text-2xl font-bold">Rs. {data.amount.toLocaleString()}</p>
                  <p className="text-sm text-gray-400">{data.count} invoices</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'payments' && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><DollarSign size={20} /> Collections & Outstanding</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Total Paid (All Time)</p>
              <p className="text-2xl font-bold text-green-600">
                Rs. {yearlyRev.reduce((s, y) => s + y.revenue, 0).toLocaleString()}
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Outstanding (Unpaid)</p>
              <p className="text-2xl font-bold text-red-600">
                Rs. {(invoiceSummary['SENT']?.amount || 0) + (invoiceSummary['OVERDUE']?.amount || 0) + (invoiceSummary['PARTIALLY_PAID']?.amount || 0) > 0 ? 'See Invoice Breakdown' : '0'}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-4">Detailed payment reports available in the Billing section.</p>
        </div>
      )}
    </div>
  );
}
