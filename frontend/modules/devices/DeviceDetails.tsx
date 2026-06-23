'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api/axios';
import { toast } from '@/lib/toast';
import { formatApiError } from '@/lib/formatApiError';
import { useAuthStore } from '@/store/auth/useAuthStore';
import DeviceFormModal from './DeviceFormModal';
import { Edit3, ArrowRight, History } from 'lucide-react';

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
  name: string;
  serial_number: string;
  status: string;
  installation_location: string | null;
  notes: string | null;
  history: HistoryEntry[];
}

const STATUS_LABELS: Record<string, string> = {
  UNDER_DEVELOPMENT: 'Under Development',
  QA_FOR_AGRONOMIST: 'QA for Agronomist',
  QA_PASSED_IN_INVENTORY: 'QA Passed in Inventory',
  INSTALLED: 'Installed',
  BACK_AT_OFFICE: 'Back at Office',
};

const STATUS_COLORS: Record<string, string> = {
  UNDER_DEVELOPMENT: 'bg-yellow-100 text-yellow-800',
  QA_FOR_AGRONOMIST: 'bg-blue-100 text-blue-800',
  QA_PASSED_IN_INVENTORY: 'bg-green-100 text-green-800',
  INSTALLED: 'bg-purple-100 text-purple-800',
  BACK_AT_OFFICE: 'bg-red-100 text-red-800',
};

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  UNDER_DEVELOPMENT: ['QA_FOR_AGRONOMIST'],
  QA_FOR_AGRONOMIST: ['QA_PASSED_IN_INVENTORY', 'UNDER_DEVELOPMENT'],
  QA_PASSED_IN_INVENTORY: ['INSTALLED', 'UNDER_DEVELOPMENT'],
  INSTALLED: ['BACK_AT_OFFICE', 'QA_FOR_AGRONOMIST'],
  BACK_AT_OFFICE: ['QA_FOR_AGRONOMIST', 'UNDER_DEVELOPMENT', 'INSTALLED'],
};

export default function DeviceDetails({ id }: { id: string }) {
  const { user } = useAuthStore();
  const [device, setDevice] = useState<Device | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);

  const canManage = user && ['ADMIN', 'MANAGER', 'HARDWARE'].includes(user.role);
  const canChangeStatus = user && ['ADMIN', 'MANAGER', 'HARDWARE'].includes(user.role);

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

  const handleStatusChange = async (newStatus: string) => {
    if (!confirm(`Change status to "${STATUS_LABELS[newStatus] || newStatus}"?`)) return;
    setChangingStatus(newStatus);
    try {
      await api.patch(`/devices/${id}/status`, { new_status: newStatus });
      toast.success(`Status changed to ${STATUS_LABELS[newStatus] || newStatus}`);
      fetchDevice();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to change status'));
    } finally {
      setChangingStatus(null);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-700">Loading device details...</div>;
  if (!device) return <div className="p-8 text-center text-gray-900 font-bold">Device not found.</div>;

  const nextStatuses = ALLOWED_TRANSITIONS[device.status] || [];

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
            <p className="text-sm text-gray-700 font-medium">Name</p>
            <p className="font-bold text-gray-900 mt-0.5">{device.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-700 font-medium">Serial Number</p>
            <p className="font-bold text-gray-900 mt-0.5">{device.serial_number}</p>
          </div>
          <div>
            <p className="text-sm text-gray-700 font-medium">Current Status</p>
            <span className={`inline-block mt-0.5 text-xs font-black px-2.5 py-1 rounded-full uppercase ${STATUS_COLORS[device.status] || 'bg-gray-100 text-gray-800'}`}>
              {STATUS_LABELS[device.status] || device.status.replace(/_/g, ' ')}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-700 font-medium">Location</p>
            <p className="font-bold text-gray-900 mt-0.5">{device.installation_location || 'N/A'}</p>
          </div>
        </div>
        {device.notes && (
          <div>
            <p className="text-sm text-gray-700 font-medium">Notes</p>
            <p className="text-sm text-gray-900 mt-0.5">{device.notes}</p>
          </div>
        )}
      </div>

      {canChangeStatus && nextStatuses.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Change Status</h2>
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map(s => (
              <button key={s} onClick={() => handleStatusChange(s)} disabled={changingStatus === s}
                className="flex items-center gap-1 px-4 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 bg-blue-50 text-blue-700 hover:bg-blue-100">
                {changingStatus === s ? 'Changing...' : <><ArrowRight className="w-3.5 h-3.5" /> {STATUS_LABELS[s] || s.replace(/_/g, ' ')}</>}
              </button>
            ))}
          </div>
        </div>
      )}

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
                      <><span className="text-gray-400">{STATUS_LABELS[entry.previous_status] || entry.previous_status.replace(/_/g,' ')}</span> → {STATUS_LABELS[entry.new_status] || entry.new_status.replace(/_/g,' ')}</>
                    ) : STATUS_LABELS[entry.new_status] || entry.new_status.replace(/_/g,' ')}
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

      <DeviceFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={fetchDevice}
        deviceId={device.id}
        initialData={{
          name: device.name,
          serial_number: device.serial_number,
          status: device.status as any,
          installation_location: device.installation_location ?? undefined,
          notes: device.notes ?? undefined,
        }}
      />
    </div>
  );
}
