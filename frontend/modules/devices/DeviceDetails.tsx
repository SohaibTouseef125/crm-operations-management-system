'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api/axios';
import { toast } from '@/lib/toast';
import { formatApiError } from '@/lib/formatApiError';
import { useAuthStore } from '@/store/auth/useAuthStore';
import DeviceFormModal from './DeviceFormModal';
import { Edit3, History, X } from 'lucide-react';

interface HistoryEntry {
  id: string;
  new_status: string;
  previous_status: string | null;
  notes: string | null;
  created_at: string;
  changed_by?: { full_name: string } | null;
}

interface Device {
  id: string;
  serial_number: string;
  device_type: string;
  inventory_status: string;
  client_op_status: string | null;
  hw_developer_id: string | null;
  hw_qa_report_url: string | null;
  agro_qa_by: string | null;
  agro_qa_report_url: string | null;
  client_id: string | null;
  installation_location: string | null;
  notes: string | null;
  repair_receipt_timestamp: string | null;
  fault_cause_report_url: string | null;
  estimated_repair_date: string | null;
  created_at: string;
  updated_at: string;
  history: HistoryEntry[];
}

interface ClientOption {
  id: string;
  name: string;
  company_name: string;
}

const INVENTORY_STATUS_LABELS: Record<string, string> = {
  under_hw_development: 'Under HW Development',
  pending_agro_qa: 'Pending Agro QA',
  ready_to_assign: 'Ready to Assign',
  assigned_to_client: 'Assigned to Client',
  under_repair: 'Under Repair',
};

const INVENTORY_STATUS_COLORS: Record<string, string> = {
  under_hw_development: 'bg-yellow-100 text-yellow-800',
  pending_agro_qa: 'bg-blue-100 text-blue-800',
  ready_to_assign: 'bg-green-100 text-green-800',
  assigned_to_client: 'bg-purple-100 text-purple-800',
  under_repair: 'bg-red-100 text-red-800',
};

const CLIENT_OP_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive_crop_pause: 'Inactive (Crop Pause)',
  faulty: 'Faulty',
};

const CLIENT_OP_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive_crop_pause: 'bg-gray-100 text-gray-800',
  faulty: 'bg-red-100 text-red-800',
};

const DEVICE_TYPE_LABELS: Record<string, string> = {
  MOBILE_DEVICE: 'Mobile Device',
  AQUASAVE_PRO: 'AquaSave Pro',
};

function InputPrompt({ title, label, onSubmit, onCancel }: {
  title: string; label: string; onSubmit: (val: string) => void; onCancel: () => void;
}) {
  const [val, setVal] = useState('');
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={onCancel}>
      <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
        <input value={val} onChange={e => setVal(e.target.value)} placeholder={label}
          className="w-full px-4 py-2 border rounded-md text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 mb-4" autoFocus />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={() => { if (val.trim()) onSubmit(val.trim()); }}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50" disabled={!val.trim()}>Submit</button>
        </div>
      </div>
    </div>
  );
}

function ClientAssignModal({ onAssign, onCancel }: {
  onAssign: (clientId: string, location: string) => void; onCancel: () => void;
}) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [location, setLocation] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/clients').then(r => setClients(r.data)).catch(() => toast.error('Failed to load clients'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={onCancel}>
      <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-xl mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Assign to Client</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..."
          className="w-full px-4 py-2 border rounded-md text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 mb-3" />

        <div className="flex-1 overflow-y-auto space-y-2 mb-4 min-h-0">
          {loading ? (
            <p className="text-center text-gray-400 py-8">Loading clients...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No clients found.</p>
          ) : filtered.map(c => (
            <label key={c.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedId === c.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" name="client" value={c.id} checked={selectedId === c.id} onChange={() => setSelectedId(c.id)} className="accent-blue-600" />
              <div>
                <p className="font-bold text-gray-900 text-sm">{c.name}</p>
                {c.company_name && <p className="text-xs text-gray-500">{c.company_name}</p>}
              </div>
            </label>
          ))}
        </div>

        <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Installation Location (optional)"
          className="w-full px-4 py-2 border rounded-md text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 mb-4" />

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={() => { if (selectedId) onAssign(selectedId, location); }}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50" disabled={!selectedId}>Assign</button>
        </div>
      </div>
    </div>
  );
}

export default function DeviceDetails({ id }: { id: string }) {
  const { user } = useAuthStore();
  const [device, setDevice] = useState<Device | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [inputPrompt, setInputPrompt] = useState<{ title: string; label: string; onAction: (url: string) => void } | null>(null);
  const [showClientPicker, setShowClientPicker] = useState(false);

  const fetchDevice = async () => {
    try {
      const res = await api.get(`/devices/${id}`);
      setDevice(res.data);
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to load device details'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDevice(); }, [id]);

  const handleAction = async (url: string, successMsg: string, body?: Record<string, unknown>) => {
    try {
      await api.post(url, body || {});
      toast.success(successMsg);
      fetchDevice();
    } catch (err: any) {
      const msg = err?.response?.status === 422
        ? (err?.response?.data?.detail || 'Action not allowed at this stage')
        : formatApiError(err, 'Action failed');
      toast.error(msg);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-700">Loading device details...</div>;
  if (!device) return <div className="p-8 text-center text-gray-900 font-bold">Device not found.</div>;

  const role = user?.role;
  const isAdminMgr = role === 'ADMIN' || role === 'MANAGER';
  const isHardware = isAdminMgr || role === 'HARDWARE';
  const isAgronomy = isAdminMgr || role === 'AGRONOMY';
  const isBusiness = isAdminMgr || role === 'BUSINESS';
  const canManage = isHardware || isAgronomy;
  const status = device.inventory_status;

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-2xl font-bold text-gray-900">Device Information</h2>
          {canManage && (
            <button onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer">
              <Edit3 className="w-3.5 h-3.5" /> Edit
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-700 font-medium">Device Type</p>
            <p className="font-bold text-gray-900 mt-0.5">{DEVICE_TYPE_LABELS[device.device_type] || device.device_type}</p>
          </div>
          <div>
            <p className="text-sm text-gray-700 font-medium">Serial Number</p>
            <p className="font-bold text-gray-900 mt-0.5">{device.serial_number}</p>
          </div>
          <div>
            <p className="text-sm text-gray-700 font-medium">Inventory Status</p>
            <span className={`inline-block mt-0.5 text-xs font-black px-2.5 py-1 rounded-full uppercase ${INVENTORY_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'}`}>
              {INVENTORY_STATUS_LABELS[status] || status.replace(/_/g, ' ')}
            </span>
          </div>
          {device.client_op_status && (
            <div>
              <p className="text-sm text-gray-700 font-medium">Client Status</p>
              <span className={`inline-block mt-0.5 text-xs font-black px-2.5 py-1 rounded-full uppercase ${CLIENT_OP_STATUS_COLORS[device.client_op_status] || 'bg-gray-100 text-gray-800'}`}>
                {CLIENT_OP_STATUS_LABELS[device.client_op_status] || device.client_op_status.replace(/_/g, ' ')}
              </span>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-700 font-medium">Location</p>
            <p className="font-bold text-gray-900 mt-0.5">{device.installation_location || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-700 font-medium">Client</p>
            <p className="font-bold text-gray-900 mt-0.5">{device.client_id || 'Not assigned'}</p>
          </div>
          {device.hw_qa_report_url && (
            <div className="col-span-2">
              <p className="text-sm text-gray-700 font-medium">HW QA Report</p>
              <a href={device.hw_qa_report_url} target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm font-bold mt-0.5 inline-block">
                View Report →
              </a>
            </div>
          )}
          {device.agro_qa_report_url && (
            <div className="col-span-2">
              <p className="text-sm text-gray-700 font-medium">Agro QA Report</p>
              <a href={device.agro_qa_report_url} target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm font-bold mt-0.5 inline-block">
                View Report →
              </a>
            </div>
          )}
          {device.fault_cause_report_url && (
            <div className="col-span-2">
              <p className="text-sm text-gray-700 font-medium">Fault Cause Report</p>
              <a href={device.fault_cause_report_url} target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm font-bold mt-0.5 inline-block">
                View Report →
              </a>
            </div>
          )}
          {device.estimated_repair_date && (
            <div>
              <p className="text-sm text-gray-700 font-medium">Estimated Repair Date</p>
              <p className="font-bold text-gray-900 mt-0.5">{device.estimated_repair_date}</p>
            </div>
          )}
        </div>
        {device.notes && (
          <div>
            <p className="text-sm text-gray-700 font-medium">Notes</p>
            <p className="text-sm text-gray-900 mt-0.5">{device.notes}</p>
          </div>
        )}
      </div>

      {/* Lifecycle Actions */}
      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Lifecycle Actions</h2>
        <div className="flex flex-wrap gap-2">
          {status === 'under_hw_development' && isHardware && (
            <button onClick={() => setInputPrompt({
              title: 'Upload HW QA Report', label: 'Report URL',
              onAction: (url) => handleAction(`/devices/${device.id}/hw-qa`, 'HW QA uploaded', { hw_qa_report_url: url }),
            })} className="px-4 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer bg-blue-50 text-blue-700 hover:bg-blue-100">
              Upload HW QA
            </button>
          )}
          {status === 'pending_agro_qa' && isAgronomy && (
            <button onClick={() => setInputPrompt({
              title: 'Upload Agro QA Report', label: 'Report URL',
              onAction: (url) => handleAction(`/devices/${device.id}/agro-qa`, 'Agro QA uploaded', { agro_qa_report_url: url }),
            })} className="px-4 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
              Upload Agro QA
            </button>
          )}
          {status === 'pending_agro_qa' && isHardware && (
            <button onClick={() => {
              if (confirm('Send device back to HW Development for rework?'))
                handleAction(`/devices/${device.id}/status`, 'Moved back to HW Development',
                  { new_status: 'under_hw_development', notes: 'Sent back to HW for rework' });
            }} className="px-4 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer bg-orange-50 text-orange-700 hover:bg-orange-100">
              Send Back to HW
            </button>
          )}
          {status === 'ready_to_assign' && isHardware && (
            <button onClick={() => setShowClientPicker(true)}
              className="px-4 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer bg-purple-50 text-purple-700 hover:bg-purple-100">
              Assign to Client
            </button>
          )}
          {status === 'assigned_to_client' && (isHardware || isAgronomy || isBusiness) && (
            <button onClick={() => {
              if (confirm('Mark this device as faulty? This will move it to Under Repair.'))
                handleAction(`/devices/${device.id}/mark-faulty`, 'Device marked as faulty');
            }} className="px-4 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer bg-red-50 text-red-700 hover:bg-red-100">
              Mark Faulty
            </button>
          )}
          {status === 'under_repair' && isHardware && (
            <>
              <button onClick={() => setInputPrompt({
                title: 'Confirm Repair Receipt', label: 'Fault Cause Report URL (optional)',
                onAction: (url) => handleAction(`/devices/${device.id}/repair-receipt`, 'Repair receipt confirmed',
                  url ? { fault_cause_report_url: url } : {}),
              })} className="px-4 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer bg-amber-50 text-amber-700 hover:bg-amber-100">
                Confirm Repair Receipt
              </button>
              <button onClick={() => {
                if (confirm('Complete repair? Device will return to Pending Agro QA.'))
                  handleAction(`/devices/${device.id}/repair-complete`, 'Repair completed');
              }} className="px-4 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer bg-green-50 text-green-700 hover:bg-green-100">
                Complete Repair
              </button>
            </>
          )}
        </div>
        {((status === 'under_hw_development' && !isHardware) ||
          (status === 'pending_agro_qa' && !isAgronomy && !isHardware) ||
          (status === 'ready_to_assign' && !isHardware) ||
          (status === 'assigned_to_client' && !isHardware && !isAgronomy && !isBusiness) ||
          (status === 'under_repair' && !isHardware)) && (
          <p className="text-sm text-gray-500 italic">No actions available for your role at this stage.</p>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <History className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-bold text-gray-900">Lifecycle Timeline</h2>
        </div>
        {device.history.length === 0 ? (
          <p className="text-sm text-gray-700 italic py-4 text-center">No history recorded yet.</p>
        ) : (
          <div className="relative border-l-2 border-gray-200 ml-4 space-y-6">
            {device.history.map((entry) => (
              <div key={entry.id} className="mb-8 ml-6">
                <span className="absolute flex items-center justify-center w-4 h-4 bg-blue-100 rounded-full -left-[9px] ring-4 ring-white">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-900">
                    {entry.previous_status ? (
                      <><span className="text-gray-400">{INVENTORY_STATUS_LABELS[entry.previous_status] || entry.previous_status.replace(/_/g,' ')}</span> → {INVENTORY_STATUS_LABELS[entry.new_status] || entry.new_status.replace(/_/g,' ')}</>
                    ) : INVENTORY_STATUS_LABELS[entry.new_status] || entry.new_status.replace(/_/g,' ')}
                  </span>
                  <span className="text-xs text-gray-700 font-medium mt-0.5">
                    {new Date(entry.created_at).toLocaleString()}
                    {entry.changed_by && <span className="ml-1 text-gray-500">by {entry.changed_by.full_name}</span>}
                  </span>
                  {entry.notes && <p className="mt-1 text-sm text-gray-800 italic">"{entry.notes}"</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Prompt Modal */}
      {inputPrompt && (
        <InputPrompt title={inputPrompt.title} label={inputPrompt.label}
          onSubmit={(val) => { inputPrompt.onAction(val); setInputPrompt(null); }}
          onCancel={() => setInputPrompt(null)} />
      )}

      {/* Client Picker Modal */}
      {showClientPicker && (
        <ClientAssignModal
          onAssign={(clientId, location) => {
            handleAction(`/devices/${device.id}/assign`, 'Device assigned to client',
              { client_id: clientId, installation_location: location || undefined });
            setShowClientPicker(false);
          }}
          onCancel={() => setShowClientPicker(false)} />
      )}

      <DeviceFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={fetchDevice}
        deviceId={device.id}
        initialData={{
          serial_number: device.serial_number,
          device_type: device.device_type as 'MOBILE_DEVICE' | 'AQUASAVE_PRO',
          installation_location: device.installation_location ?? undefined,
          notes: device.notes ?? undefined,
        }}
      />
    </div>
  );
}
