'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api/axios';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Link from 'next/link';
import { toast } from '@/lib/toast';
import { formatApiError } from '@/lib/formatApiError';
import { useAuthStore } from '@/store/auth/useAuthStore';
import FarmerFormModal from '@/modules/farmers/FarmerFormModal';
import { Eye, Plus, Trash2, Edit3 } from 'lucide-react';

interface Farmer {
  id: string;
  name: string;
  contact_mobile: string | null;
  village: string | null;
  district: string | null;
  assigned_agent_name: string | null;
  pipeline_stage: string | null;
  client_id?: string | null;
}

export default function FarmersPage() {
  const { user } = useAuthStore();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFarmer, setEditingFarmer] = useState<Farmer | null>(null);

  useEffect(() => {
    fetchFarmers();
  }, []);

  const fetchFarmers = async () => {
    try {
      const res = await api.get('/farmers');
      setFarmers(Array.isArray(res.data) ? res.data : (res.data?.items ?? []));
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to load farmers'));
    } finally {
      setIsLoading(false);
    }
  };

  const deleteFarmer = async (farmerId: string) => {
    if (!confirm('Are you sure you want to delete this farmer?')) return;
    try {
      await api.delete(`/farmers/${farmerId}`);
      setFarmers(prev => prev.filter(f => f.id !== farmerId));
      toast.success('Farmer deleted');
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to delete farmer'));
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading farmers...</div>;

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'BUSINESS', 'AGRONOMY', 'ACCOUNTS']}>
      <DashboardLayout>
        <div className="p-4 space-y-6 sm:p-6 lg:p-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Farmers</h1>
            {user && ['ADMIN', 'MANAGER', 'BUSINESS', 'AGRONOMY'].includes(user.role) && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-bold shadow-sm"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Create Farmer
              </button>
            )}
          </div>

          <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Phone</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Village</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">District</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Assigned Agent</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Pipeline Stage</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {farmers.map((farmer) => (
                  <tr key={farmer.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-900">{farmer.name}</td>
                    <td className="px-4 py-3 text-gray-700">{farmer.contact_mobile || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-700">{farmer.village || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-700">{farmer.district || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-700">{farmer.assigned_agent_name || 'N/A'}</td>
                    <td className="px-4 py-3">
                      {farmer.pipeline_stage ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase">
                          {farmer.pipeline_stage.replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/farmers/${farmer.id}`}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View
                        </Link>
                        {user && ['ADMIN', 'MANAGER', 'BUSINESS', 'AGRONOMY'].includes(user.role) && (
                          <button onClick={() => { setEditingFarmer(farmer); setIsModalOpen(true); }}
                            className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
                            title="Edit Farmer">
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {user && ['ADMIN', 'MANAGER'].includes(user.role) && (
                          <button onClick={() => deleteFarmer(farmer.id)}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors"
                            title="Delete Farmer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {farmers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-20 text-center text-gray-600 font-medium bg-gray-50">
                      No farmers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <FarmerFormModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingFarmer(null); }}
          onSuccess={fetchFarmers}
          farmerId={editingFarmer?.id}
          initialData={editingFarmer ? {
            name: editingFarmer.name,
            contact_mobile: editingFarmer.contact_mobile || '',
            cnic: '',
            village: editingFarmer.village || '',
            district: editingFarmer.district || '',
            pipeline_stage: (editingFarmer.pipeline_stage as any) || 'prospect',
            client_id: editingFarmer.client_id || '',
          } : null}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
