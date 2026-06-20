'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/services/api/axios';
import LeadFormModal, { type LeadFormData } from './LeadFormModal';
import { useAuthStore } from '@/store/auth/useAuthStore';
import { toast } from '@/lib/toast';
import { formatApiError } from '@/lib/formatApiError';
import { FileText, Plus, UserCheck, Calendar, Trash2, XCircle } from 'lucide-react';

// ── Spec-defined stages ──────────────────────────────────
const STAGES = [
  { key: 'discovery',            label: 'Discovery',            color: 'bg-slate-200 text-slate-700' },
  { key: 'outreach',             label: 'Outreach',             color: 'bg-blue-200 text-blue-800' },
  { key: 'quotation_requested',  label: 'Quotation Requested',  color: 'bg-yellow-200 text-yellow-800' },
  { key: 'quotation_forwarded',  label: 'Quotation Forwarded',  color: 'bg-orange-200 text-orange-800' },
  { key: 'in-negotiation',       label: 'In Negotiation',       color: 'bg-purple-200 text-purple-800' },
  { key: 'won',                  label: 'Won',                  color: 'bg-green-200 text-green-800' },
  { key: 'lost',                 label: 'Lost',                 color: 'bg-red-200 text-red-800' },
];

// Front-end transitions mirror backend
const TRANSITIONS: Record<string, string[]> = {
  'discovery':            ['outreach', 'lost'],
  'outreach':             ['quotation_requested', 'lost'],
  'quotation_requested':  ['quotation_forwarded', 'lost'],
  'quotation_forwarded':  ['in-negotiation', 'won', 'lost'],
  'in-negotiation':       ['won', 'lost'],
  'won':                  [],
  'lost':                 ['discovery'],
};

interface LeadActivity {
  id: string;
  activity_type: string;
  scheduled_at: string | null;
  notes: string | null;
  created_at: string;
}

interface Lead {
  id: string;
  name: string;
  company_name?: string;
  contact_mobile: string;
  location: string;
  stage: string;
  assigned_to_id: string;
  next_follow_up?: string;
  services_interested?: string[];
  quotation_file_url?: string;
  created_at: string;
  activities?: LeadActivity[];
}

const STORAGE_KEY = 'leads_kanban_collapsed';

export default function LeadsKanban() {
  const { user } = useAuthStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activityLog, setActivityLog] = useState<Record<string, LeadActivity[]>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
    }
    return {};
  });

  const canManage = user && ['ADMIN', 'MANAGER', 'BUSINESS', 'BDM'].includes(user.role);
  const canDelete = user && ['ADMIN', 'MANAGER'].includes(user.role);
  const canUploadQuotation = user && ['ADMIN', 'ACCOUNTS'].includes(user.role);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/leads');
      setLeads(res.data);
    } catch (err: unknown) {
      toast.error(formatApiError(err, 'Failed to load leads'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed));
  }, [collapsed]);

  const handleStageChange = async (leadId: string, newStage: string) => {
    try {
      await api.patch(`/leads/${leadId}`, { stage: newStage });

      // If moving to quotation_requested and user is Accounts, allow quotation upload
      if (newStage === 'quotation_requested' && canUploadQuotation) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.pdf';
        fileInput.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return;
          const formData = new FormData();
          formData.append('file', file);
          try {
            await api.post(`/leads/${leadId}/quotation`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('Quotation uploaded & status updated');
            fetchLeads();
          } catch (err) {
            toast.error(formatApiError(err, 'Failed to upload quotation'));
          }
        };
        fileInput.click();
      }

      toast.success('Stage updated');
      fetchLeads();
    } catch (err: unknown) {
      toast.error(formatApiError(err, 'Failed to update stage'));
    }
  };

  const handleDelete = async (leadId: string) => {
    if (!confirm('Delete this lead?')) return;
    try {
      await api.delete(`/leads/${leadId}`);
      toast.success('Lead deleted');
      fetchLeads();
    } catch (err: unknown) {
      toast.error(formatApiError(err, 'Failed to delete lead'));
    }
  };

  const toggleCollapse = (stage: string) => {
    setCollapsed(prev => ({ ...prev, [stage]: !prev[stage] }));
  };

  const leadsByStage = STAGES.reduce((acc, s) => {
    acc[s.key] = leads.filter(l => l.stage === s.key);
    return acc;
  }, {} as Record<string, Lead[]>);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{leads.length} lead{leads.length !== 1 ? 's' : ''}</p>
        {canManage && (
          <button onClick={() => { setSelectedLead(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm transition-colors shadow-sm">
            <Plus size={18} /> New Lead
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : STAGES.map(stage => {
        const stageLeads = leadsByStage[stage.key];
        const isCollapsed = collapsed[stage.key];

        return (
          <div key={stage.key} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Column Header */}
            <button onClick={() => toggleCollapse(stage.key)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className={`text-xs font-black px-2.5 py-1 rounded-full ${stage.color}`}>
                  {stage.label}
                </span>
                <span className="text-sm font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {stageLeads.length}
                </span>
              </div>
              <XCircle size={16} className={`text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-45'}`} />
            </button>

            {/* Cards */}
            {!isCollapsed && (
              <div className="px-4 pb-4 space-y-2">
                {stageLeads.length === 0 ? (
                  <p className="text-sm text-gray-400 italic py-2 text-center">No leads in this stage</p>
                ) : stageLeads.map(lead => (
                  <div key={lead.id} className="p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all bg-white">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 truncate">{lead.name}</p>
                        {lead.company_name && (
                          <p className="text-xs text-gray-500 truncate">{lead.company_name}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">{lead.location}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {canManage && stage.key !== 'won' && TRANSITIONS[stage.key]?.map(nextStage => (
                          <button key={nextStage} onClick={() => handleStageChange(lead.id, nextStage)}
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors whitespace-nowrap">
                            {STAGES.find(s => s.key === nextStage)?.label || nextStage}
                          </button>
                        ))}
                        {canDelete && (
                          <button onClick={() => handleDelete(lead.id)}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-gray-500">
                      {lead.next_follow_up && (
                        <span className="flex items-center gap-1">
                          <Calendar size={10} /> {lead.next_follow_up}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <UserCheck size={10} /> ID: {lead.assigned_to_id?.slice(0, 8)}
                      </span>
                    </div>

                    {lead.services_interested && lead.services_interested.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {lead.services_interested.map(s => (
                          <span key={s} className="text-[9px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded-full font-medium">{s}</span>
                        ))}
                      </div>
                    )}

                    {lead.quotation_file_url && (
                      <div className="mt-2 flex items-center gap-1">
                        <FileText size={12} className="text-blue-500" />
                        <a href={lead.quotation_file_url} target="_blank" rel="noreferrer"
                          className="text-[10px] text-blue-600 font-medium hover:underline">View Quotation</a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <LeadFormModal isOpen={showForm} onClose={() => setShowForm(false)}
        onSuccess={fetchLeads} initialData={selectedLead ? { ...selectedLead, stage: selectedLead.stage as LeadFormData['stage'], assigned_to_id: selectedLead.assigned_to_id } : undefined} />
    </div>
  );
}
