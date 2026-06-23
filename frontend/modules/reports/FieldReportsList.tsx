'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api/axios';
import { useAuthStore } from '@/store/auth/useAuthStore';
import { toast } from '@/lib/toast';
import { formatApiError } from '@/lib/formatApiError';
import { FileText, Plus, Calendar, Tag, Trash2, Edit3, Eye, X, Download, ExternalLink } from 'lucide-react';

interface FieldReport {
  id: string;
  title: string;
  report_type: 'WEEKLY' | 'BI_WEEKLY' | 'FIELD_OPERATION' | 'QA';
  summary: string | null;
  notes: string | null;
  report_date: string;
  client_id: string | null;
  created_at: string;
  attachments: string[] | null;
}

const PRODUCTION_API_URL = 'https://sohaib125-crm-operations-management-system.hf.space';
const API_BASE = (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
  ? PRODUCTION_API_URL
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/').replace(/\/$/, '');

function attachmentUrl(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  if (normalized.startsWith('http')) return normalized;
  return `${API_BASE}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
}

interface Client {
  id: string;
  name: string;
  company_name: string;
}

const TYPE_COLORS: Record<string, string> = {
  WEEKLY:          'bg-blue-100 text-blue-700',
  BI_WEEKLY:       'bg-purple-100 text-purple-700',
  FIELD_OPERATION: 'bg-green-100 text-green-700',
  QA:              'bg-orange-100 text-orange-700',
};

function ReportFormModal({
  isOpen, onClose, onSuccess, clients, report, canUploadAttachment,
}: {
  isOpen: boolean; onClose: () => void; onSuccess: () => void; clients: Client[];
  report?: FieldReport | null; canUploadAttachment: boolean;
}) {
  const [form, setForm] = useState({
    client_id: '', report_type: 'WEEKLY', title: '', summary: '', notes: '',
    report_date: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const isEditing = !!report;

  useEffect(() => {
    if (isOpen && report) {
      setForm({
        client_id: report.client_id || '',
        report_type: report.report_type,
        title: report.title,
        summary: report.summary || '',
        notes: report.notes || '',
        report_date: report.report_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      });
    } else if (isOpen) {
      setForm({ client_id: '', report_type: 'WEEKLY', title: '', summary: '', notes: '',
        report_date: new Date().toISOString().split('T')[0] });
      setAttachment(null);
    }
  }, [isOpen, report]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_id || !form.title) {
      toast.warning('Client and title are required');
      setError('Client and title are required');
      return;
    }
    setLoading(true); setError('');
    try {
      if (isEditing) {
        await api.patch(`/reports/${report.id}`, form);
        toast.success('Field report updated successfully');
      } else {
        const res = await api.post('/reports', form);
        if (attachment) {
          const formData = new FormData();
          formData.append('file', attachment);
          await api.post(`/uploads/reports/${res.data.id}/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
        toast.success('Field report created successfully');
      }
      onSuccess(); onClose();
    } catch (err: unknown) {
      const message = formatApiError(err, isEditing ? 'Failed to update report' : 'Failed to create report');
      toast.error(message);
      setError(message);
    } finally { setLoading(false); }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-8 max-w-lg w-full shadow-2xl">
        <h2 className="text-xl font-bold text-gray-900 mb-6">{isEditing ? 'Edit Field Report' : 'New Field Report'}</h2>
        {error && <p className="text-red-600 text-sm mb-4 bg-red-50 p-3 rounded">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
            <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Select client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.company_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Type *</label>
              <select value={form.report_type} onChange={e => setForm(f => ({ ...f, report_type: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="WEEKLY">Weekly</option>
                <option value="BI_WEEKLY">Bi-Weekly</option>
                <option value="FIELD_OPERATION">Field Operation</option>
                <option value="QA">QA</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Date *</label>
              <input type="date" value={form.report_date} onChange={e => setForm(f => ({ ...f, report_date: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Report title" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
            <textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
              rows={2} className="w-full border rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder="Brief summary..." />
          </div>
          {canUploadAttachment && !isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Attachment (PDF / Image)</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-700"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3} className="w-full border rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder="Detailed notes..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 font-medium cursor-pointer">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold disabled:opacity-50 cursor-pointer">
              {loading ? 'Saving...' : isEditing ? 'Update Report' : 'Create Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ViewReportModal({ report, onClose }: { report: FieldReport | null; onClose: () => void }) {
  if (!report) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Field Report Details</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">{report.title}</h3>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${TYPE_COLORS[report.report_type]}`}>
              {report.report_type.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(report.report_date).toLocaleDateString()}</span>
            <span>Created: {new Date(report.created_at).toLocaleString()}</span>
          </div>
          {report.summary && (
            <div>
              <h4 className="text-sm font-bold text-gray-700 mb-1">Summary</h4>
              <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{report.summary}</p>
            </div>
          )}
          {report.notes && (
            <div>
              <h4 className="text-sm font-bold text-gray-700 mb-1">Notes</h4>
              <p className="text-gray-600 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{report.notes}</p>
            </div>
          )}
          {report.attachments && report.attachments.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-gray-700 mb-2">Attachments ({report.attachments.length})</h4>
              <div className="space-y-2">
                {report.attachments.map((path, idx) => (
                  <a key={idx} href={attachmentUrl(path)} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline bg-blue-50 p-2 rounded">
                    <Download className="w-4 h-4" />
                    Attachment {report.attachments!.length > 1 ? idx + 1 : ''}
                    <ExternalLink className="w-3 h-3 ml-auto" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="mt-6 pt-4 border-t">
          <button onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FieldReportsList() {
  const { user } = useAuthStore();
  const [reports, setReports] = useState<FieldReport[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [editingReport, setEditingReport] = useState<FieldReport | null>(null);
  const [viewingReport, setViewingReport] = useState<FieldReport | null>(null);

  const canCreate = user && ['ADMIN', 'MANAGER', 'AGRONOMY'].includes(user.role);
  const canEdit = user && ['ADMIN', 'MANAGER', 'AGRONOMY'].includes(user.role);
  const canDelete = user && ['ADMIN', 'MANAGER'].includes(user.role);

  const fetchReports = async () => {
    try {
      const res = await api.get('/reports');
      setReports(res.data);
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to load reports'));
    }
    finally { setIsLoading(false); }
  };

  const deleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this field report?')) return;
    try {
      await api.delete(`/reports/${reportId}`);
      setReports(prev => prev.filter(r => r.id !== reportId));
      toast.success('Field report deleted');
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to delete field report'));
    }
  };

  useEffect(() => {
    fetchReports();
    api.get('/clients').then(r => setClients(r.data)).catch(() => {});
  }, []);

  const filtered = typeFilter === 'ALL' ? reports : reports.filter(r => r.report_type === typeFilter);

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading reports...</div>;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {['ALL', 'WEEKLY', 'BI_WEEKLY', 'FIELD_OPERATION', 'QA'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer ${
                typeFilter === t ? 'bg-blue-600 text-white' : 'bg-white border text-gray-700 hover:bg-gray-50'
              }`}>
              {t.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        {canCreate && (
          <button onClick={() => { setEditingReport(null); setIsModalOpen(true); }}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-sm text-sm cursor-pointer">
            <Plus className="w-4 h-4 mr-2" /> New Report
          </button>
        )}
      </div>

      <div className="space-y-4">
        {filtered.map(report => (
          <div key={report.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="p-2 bg-green-50 rounded-lg border border-green-100 flex-shrink-0">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 truncate">{report.title}</h3>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase flex-shrink-0 ${TYPE_COLORS[report.report_type]}`}>
                      {report.report_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {report.summary && <p className="text-sm text-gray-600 truncate">{report.summary}</p>}
                  {report.notes && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{report.notes}</p>}
                  {report.attachments && report.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {report.attachments.map((path, idx) => (
                        <a key={idx} href={attachmentUrl(path)} target="_blank" rel="noreferrer"
                          className="text-[10px] font-bold text-blue-600 hover:underline">
                          Attachment {report.attachments!.length > 1 ? idx + 1 : ''}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <div className="text-right text-xs text-gray-500 mr-2">
                  <div className="flex items-center gap-1 justify-end">
                    <Calendar className="w-3 h-3" />
                    {new Date(report.report_date).toLocaleDateString()}
                  </div>
                  <div className="text-gray-400 mt-1">
                    Added {new Date(report.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button onClick={() => setViewingReport(report)}
                  className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                  title="View Report">
                  <Eye className="w-4 h-4" />
                </button>
                {canEdit && (
                  <button onClick={() => { setEditingReport(report); setIsModalOpen(true); }}
                    className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
                    title="Edit Report">
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => deleteReport(report.id)}
                    className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors"
                    title="Delete Report">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-20 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No field reports found.</p>
          </div>
        )}
      </div>

      <ReportFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingReport(null); }}
        onSuccess={fetchReports}
        clients={clients}
        report={editingReport}
        canUploadAttachment={false}
      />

      <ViewReportModal
        report={viewingReport}
        onClose={() => setViewingReport(null)}
      />
    </>
  );
}
