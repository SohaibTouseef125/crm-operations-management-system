'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api/axios';
import { useAuthStore } from '@/store/auth/useAuthStore';
import { toast } from '@/lib/toast';
import { formatApiError } from '@/lib/formatApiError';
import ClientIssueModal from './ClientIssueModal';
import FieldReportModal from './FieldReportModal';
import { Plus, Calendar, FileText, AlertCircle, Upload, Download, Trash2 } from 'lucide-react';

interface Device {
  id: string;
  serial_number: string;
  device_type: string;
  inventory_status: string;
}

interface Invoice {
  id: string;
  amount: number;
  status: string;
  due_date: string;
  created_at: string;
}

interface Quotation {
  id: string;
  quote_number: string;
  grand_total: number;
  date: string;
  expiry_date: string;
  status: string;
}

interface ClientIssue {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
}

interface FieldReport {
  id: string;
  title: string;
  report_type: string;
  notes: string | null;
  created_at: string;
  attachments: string[] | null;
}

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  notes: string | null;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigned_to: { id: string; full_name: string } | null;
}

const PRODUCTION_API_URL = 'https://sohaib125-crm-operations-management-system.hf.space';
const API_BASE = (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
  ? PRODUCTION_API_URL
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/').replace(/\/$/, '');

function reportAttachmentUrl(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  if (normalized.startsWith('http')) return normalized;
  return `${API_BASE}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
}

interface Client {
  id: string;
  name: string;
  company_name: string;
  farm_size: number | null;
  address: string | null;
  contact_info: string | null;
  onboarding_date: string | null;
  crop_cycle_end_date: string | null;
  farm_location: string | null;
  services: string[] | null;
  contract_value: number | null;
  contract_status: string | null;
  devices: Device[];
  contact_person?: string;
  designation?: string;
  email?: string;
  phone?: string;
  ntn?: string;
  strn?: string;
  industry?: string;
  source_of_lead?: string;
}

export default function ClientProfile({ id }: { id: string }) {
  const { user } = useAuthStore();
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [issues, setIssues] = useState<ClientIssue[]>([]);
  const [reports, setReports] = useState<FieldReport[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [ledger, setLedger] = useState<{ type: string; amount: number; date: string; status?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('hardware');

  const fetchIssues = async () => {
    try {
      const res = await api.get(`/clients/${id}/issues`);
      setIssues(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to load client issues'));
      setIssues([]);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await api.get(`/clients/${id}/documents/`);
      setDocuments(Array.isArray(res.data) ? res.data : []);
    } catch {
      setDocuments([]);
    }
  };

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post(`/clients/${id}/documents/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Document uploaded');
      fetchDocuments();
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to upload document'));
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await api.delete(`/clients/${id}/documents/${documentId}`);
      toast.success('Document deleted');
      fetchDocuments();
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to delete document'));
    }
  };

  const fetchReports = async () => {
    try {
      const res = await api.get('/reports', { params: { client_id: id } });
      setReports(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to load field reports'));
      setReports([]);
    }
  };

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        const clientRes = await api.get(`/clients/${id}`);
        setClient(clientRes.data);

        try {
          const invoicesRes = await api.get('/invoices', { params: { client_id: id } });
          setInvoices(Array.isArray(invoicesRes.data) ? invoicesRes.data : (invoicesRes.data?.items ?? []));
        } catch {
          setInvoices([]);
        }

        try {
          const issuesRes = await api.get(`/clients/${id}/issues`);
          setIssues(issuesRes.data);
        } catch {
          setIssues([]);
        }

        try {
          const reportsRes = await api.get('/reports', { params: { client_id: id } });
          setReports(reportsRes.data);
        } catch {
          setReports([]);
        }

        try {
          const quotationsRes = await api.get('/quotations', { params: { client_id: id } });
          setQuotations(Array.isArray(quotationsRes.data) ? quotationsRes.data : (quotationsRes.data?.items ?? []));
        } catch {
          setQuotations([]);
        }

        try {
          const tasksRes = await api.get('/tasks', { params: { client_id: id } });
          setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data?.items ?? []));
        } catch {
          setTasks([]);
        }

        try {
          const docsRes = await api.get(`/clients/${id}/documents/`);
          setDocuments(Array.isArray(docsRes.data) ? docsRes.data : []);
        } catch {
          setDocuments([]);
        }

        try {
          const balanceRes = await api.get(`/billing/clients/${id}/arrears`);
          setBalance(balanceRes.data.outstanding_balance ?? null);
        } catch {
          setBalance(null);
        }

        if (user && ['ADMIN', 'MANAGER', 'ACCOUNTS', 'BUSINESS', 'BDM'].includes(user.role)) {
          try {
            const ledgerRes = await api.get(`/billing/clients/${id}/ledger`);
            setLedger(ledgerRes.data.items ?? []);
          } catch {
            setLedger([]);
          }
        }
      } catch (error) {
        toast.error(formatApiError(error, 'Failed to load client profile'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchClientData();
  }, [id, user]);

  if (isLoading) return <div className="p-8 text-center text-gray-700">Loading profile data...</div>;
  if (!client) return <div className='p-8 text-center text-gray-900 font-bold'>Client not found.</div>;

  const canLogIssue = user && ['ADMIN', 'MANAGER', 'BUSINESS'].includes(user.role);
  const canUploadReport = user && ['ADMIN', 'MANAGER', 'AGRONOMY'].includes(user.role);

  const tabs = [
    { id: 'hardware', label: 'Hardware' },
    { id: 'quotations', label: 'Quotations' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'payments', label: 'Payments' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'reports', label: 'Reports' },
    { id: 'documents', label: 'Documents' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 border-t-4 border-blue-600">
          <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
          <p className="text-gray-700 font-medium">{client.company_name}</p>
          <div className="space-y-3 pt-4 border-t mt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 font-medium">Farm Size:</span>
              <span className="text-gray-900 font-bold">{client.farm_size || 'N/A'} acres</span>
            </div>
            <div className="flex flex-col text-sm">
              <span className="text-gray-700 font-medium">Address:</span>
              <span className="text-gray-900 mt-1">{client.address || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 font-medium">Contact:</span>
              <span className="text-gray-900">{client.contact_info || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 font-medium">Onboarded:</span>
              <span className="text-gray-900">{client.onboarding_date ? new Date(client.onboarding_date).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 font-medium">Crop Cycle Ends:</span>
              <span className="text-gray-900">{client.crop_cycle_end_date ? new Date(client.crop_cycle_end_date).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="flex flex-col text-sm">
              <span className="text-gray-700 font-medium">Farm Location:</span>
              <span className="text-gray-900 mt-1">{client.farm_location || 'N/A'}</span>
            </div>
            {client.services && client.services.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2">
                {client.services.map((s) => (
                  <span key={s} className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{s}</span>
                ))}
              </div>
            )}
            {client.contract_value != null && (
              <div className="flex justify-between text-sm pt-2 border-t">
                <span className="text-gray-700 font-medium">Contract Value:</span>
                <span className="text-gray-900 font-bold">${Number(client.contract_value).toLocaleString()}</span>
              </div>
            )}
            {client.contract_status && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-700 font-medium">Contract Status:</span>
                <span className="text-gray-900 font-bold uppercase">{client.contract_status}</span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-gray-700 font-medium">Contact Person:</span>
              <span className="text-gray-900">{client.contact_person || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 font-medium">Designation:</span>
              <span className="text-gray-900">{client.designation || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 font-medium">Email:</span>
              <span className="text-gray-900">{client.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 font-medium">Phone:</span>
              <span className="text-gray-900">{client.phone || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 font-medium">NTN:</span>
              <span className="text-gray-900">{client.ntn || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 font-medium">STRN:</span>
              <span className="text-gray-900">{client.strn || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 font-medium">Industry:</span>
              <span className="text-gray-900">{client.industry || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 font-medium">Source of Lead:</span>
              <span className="text-gray-900">{client.source_of_lead || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between border-b pb-2 mb-4">
            <h3 className="text-lg font-bold text-gray-900">Historical Pain Points</h3>
            {canLogIssue && (
              <button 
                onClick={() => setIsIssueModalOpen(true)}
                className="p-1 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="Log new issue"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>
          <div className="space-y-4">
            {issues.length > 0 ? (
              issues.map(issue => (
                <div key={issue.id} className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      issue.priority === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {issue.priority}
                    </span>
                    <span className="text-[10px] text-gray-600 font-bold uppercase">{new Date(issue.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{issue.title}</p>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{issue.description}</p>
                  <div className="mt-2 text-right">
                    <span className="text-[10px] px-2 py-0.5 bg-white border border-red-200 rounded-full text-red-600 font-bold uppercase">{issue.status}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-700 italic">No historical issues recorded.</p>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        {(() => {
          const totalRevenue = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + Number(i.amount || 0), 0);
          const outstanding = invoices.filter(i => ['SENT', 'OVERDUE', 'PARTIALLY_PAID'].includes(i.status)).reduce((s, i) => s + Number(i.amount || 0), 0);
          const paidAmount = totalRevenue;
          const lastPayment = [...invoices].filter(i => i.status === 'PAID').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Revenue</p>
            <p className="text-2xl font-bold text-green-600 mt-1">Rs. {totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Outstanding</p>
            <p className={`text-2xl font-bold mt-1 ${outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>Rs. {outstanding.toLocaleString()}</p>
            {outstanding > 0 && (
              <div className="mt-2 flex items-center text-red-600 bg-red-50 p-1.5 rounded text-xs font-bold">
                <AlertCircle className="w-3 h-3 mr-1" /> Arrears pending
              </div>
            )}
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Paid Amount</p>
            <p className="text-2xl font-bold text-green-600 mt-1">Rs. {paidAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Number of Invoices</p>
            <p className="text-2xl font-bold mt-1">{invoices.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Last Payment</p>
            <p className="text-lg font-bold mt-1">{lastPayment ? new Date(lastPayment.created_at).toLocaleDateString() : 'N/A'}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Balance</p>
            <p className={`text-2xl font-bold mt-1 ${balance && balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {balance !== null ? `Rs. ${balance.toLocaleString()}` : '...'}
            </p>
          </div>
        </div>
        );
      })()}

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex gap-1 sm:gap-2 border-b mb-4 overflow-x-auto whitespace-nowrap scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-colors flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'hardware' && (
            <>
              {client.devices && client.devices.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {client.devices.map((device) => (
                    <div key={device.id} className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-900">{device.device_type?.replace(/_/g, ' ') || 'Device'}</p>
                        <p className="text-[10px] text-gray-700 font-bold uppercase tracking-tighter">SN: {device.serial_number}</p>
                      </div>
                      <span className="px-2 py-1 text-[10px] font-black rounded-full bg-blue-100 text-blue-800 uppercase">
                        {(device.inventory_status || '').replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-700 py-4 italic text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">No hardware devices currently linked.</p>
              )}
            </>
          )}

          {activeTab === 'quotations' && (
            <>
              {quotations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 pr-4 font-bold text-gray-700">Quote #</th>
                        <th className="pb-2 pr-4 font-bold text-gray-700">Amount</th>
                        <th className="pb-2 pr-4 font-bold text-gray-700">Date</th>
                        <th className="pb-2 pr-4 font-bold text-gray-700">Expiry</th>
                        <th className="pb-2 font-bold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotations.map((q) => (
                        <tr key={q.id} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-bold text-gray-900">{q.quote_number}</td>
                          <td className="py-2 pr-4 text-gray-900">Rs. {Number(q.grand_total).toLocaleString()}</td>
                          <td className="py-2 pr-4 text-gray-600">{new Date(q.date).toLocaleDateString()}</td>
                          <td className="py-2 pr-4 text-gray-600">{new Date(q.expiry_date).toLocaleDateString()}</td>
                          <td className="py-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase">{q.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-700 py-4 italic text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">No quotations found.</p>
              )}
            </>
          )}

          {activeTab === 'invoices' && (
            <>
              {invoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 pr-4 font-bold text-gray-700">Amount</th>
                        <th className="pb-2 pr-4 font-bold text-gray-700">Status</th>
                        <th className="pb-2 pr-4 font-bold text-gray-700">Due Date</th>
                        <th className="pb-2 font-bold text-gray-700">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-bold text-gray-900">Rs. {Number(inv.amount).toLocaleString()}</td>
                          <td className="py-2 pr-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              inv.status === 'PAID' ? 'bg-green-100 text-green-800' : inv.status === 'OVERDUE' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-gray-600">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}</td>
                          <td className="py-2 text-gray-600">{new Date(inv.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-700 py-4 italic text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">No invoices found.</p>
              )}
            </>
          )}

          {activeTab === 'payments' && (
            <>
              {[...ledger].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).length > 0 ? (
                <div className="space-y-2">
                  {[...ledger].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((entry, idx) => (
                    <div key={`${entry.type}-${entry.date}-${idx}`} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0 text-sm">
                      <span className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded ${entry.type === 'PAYMENT' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {entry.type}
                      </span>
                      <span className="font-bold text-gray-900">Rs. {Number(entry.amount).toFixed(2)}</span>
                      <span className="text-xs text-gray-500">{new Date(entry.date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-700 py-4 italic text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">No payment entries found.</p>
              )}
            </>
          )}

          {activeTab === 'tasks' && (
            <>
              {tasks.length > 0 ? (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div key={task.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-gray-900">{task.title}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          task.priority === 'HIGH' ? 'bg-red-100 text-red-700' : task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-gray-600">
                        <span className="font-bold uppercase">{task.status.replace(/_/g, ' ')}</span>
                        {task.assigned_to && <span>Assigned to: {task.assigned_to.full_name}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-700 py-4 italic text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">No tasks found.</p>
              )}
            </>
          )}

          {activeTab === 'documents' && (
            <>
              <div className="flex items-center justify-between pb-2 mb-4">
                <h3 className="text-lg font-bold text-gray-900">Documents</h3>
                {user && ['ADMIN', 'MANAGER', 'BUSINESS', 'BDM', 'AGRONOMY', 'ACCOUNTS'].includes(user.role) && (
                  <label className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-bold shadow-sm cursor-pointer">
                    <Upload className="w-3 h-3 mr-1" /> Upload Document
                    <input type="file" className="hidden" onChange={handleUploadDocument} />
                  </label>
                )}
              </div>
              {documents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 pr-4 font-bold text-gray-700">Name</th>
                        <th className="pb-2 pr-4 font-bold text-gray-700">Type</th>
                        <th className="pb-2 pr-4 font-bold text-gray-700">Size</th>
                        <th className="pb-2 pr-4 font-bold text-gray-700">Date</th>
                        <th className="pb-2 font-bold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr key={doc.id} className="border-b last:border-0 hover:bg-slate-50">
                          <td className="py-2 pr-4 font-bold text-gray-900 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <span className="truncate max-w-[200px]">{doc.file_name}</span>
                          </td>
                          <td className="py-2 pr-4 text-gray-600 text-xs">{doc.file_type || 'N/A'}</td>
                          <td className="py-2 pr-4 text-gray-600">
                            {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : 'N/A'}
                          </td>
                          <td className="py-2 pr-4 text-gray-600">{new Date(doc.created_at).toLocaleDateString()}</td>
                          <td className="py-2 flex items-center gap-2">
                            <a
                              href={`${API_BASE}/uploads/documents/${doc.file_path.split('\\').pop()?.split('/').pop()}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            {user && ['ADMIN', 'MANAGER'].includes(user.role) && (
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-sm text-gray-700 font-medium">No documents uploaded for this client.</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'reports' && (
            <>
              <div className="flex items-center justify-between pb-2 mb-4">
                <h3 className="text-lg font-bold text-gray-900">Field Reports</h3>
                {canUploadReport && (
                  <button 
                    onClick={() => setIsReportModalOpen(true)}
                    className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-bold shadow-sm"
                  >
                    <Plus className="w-3 h-3 mr-1" /> New Report
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {reports.length > 0 ? (
                  reports.map((report) => (
                    <div key={report.id} className="flex items-start space-x-4 p-4 rounded-lg bg-gray-50 border border-gray-100 hover:border-green-200 transition-colors">
                      <div className="bg-white p-2 rounded-lg shadow-sm text-green-600 border border-green-50">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-900">{report.title}</h4>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                            report.report_type === 'WEEKLY' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {report.report_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 mt-1 leading-relaxed">{report.notes || 'No additional notes provided.'}</p>
                        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-2">
                          <span className="text-[10px] text-gray-700 font-bold uppercase flex items-center">
                            <Calendar className="w-3 h-3 mr-1" /> {new Date(report.created_at).toLocaleDateString()}
                          </span>
                          {report.attachments && report.attachments.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {report.attachments.map((path, idx) => (
                                <a
                                  key={idx}
                                  href={reportAttachmentUrl(path)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-blue-600 font-bold hover:underline bg-white px-2 py-1 rounded border border-blue-50 shadow-sm"
                                >
                                  View Attachment {report.attachments!.length > 1 ? idx + 1 : ''}
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-sm text-gray-700 font-medium">No field reports logged for this client.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <ClientIssueModal 
        isOpen={isIssueModalOpen} 
        onClose={() => setIsIssueModalOpen(false)} 
        onSuccess={fetchIssues}
        clientId={id}
      />

      <FieldReportModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
        onSuccess={fetchReports}
        clientId={id}
        devices={client.devices.map(d => ({ id: d.id, display_name: `${(d.device_type || '').replace(/_/g, ' ')} - ${d.serial_number}` }))}
      />
    </div>
  );
}
