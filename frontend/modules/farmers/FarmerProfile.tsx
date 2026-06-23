'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api/axios';
import { toast } from '@/lib/toast';
import { formatApiError } from '@/lib/formatApiError';
import { useAuthStore } from '@/store/auth/useAuthStore';
import FarmFormModal from '@/modules/farmers/FarmFormModal';
import { MapPin, Plus } from 'lucide-react';

interface Farm {
  id: string;
  farm_name: string;
  total_acreage: number;
  location_address: string | null;
  farmer_id: string;
}

interface Farmer {
  id: string;
  name: string;
  cnic: string | null;
  contact_mobile: string | null;
  phone_whatsapp: string | null;
  village: string | null;
  tehsil: string | null;
  district: string | null;
  pipeline_stage: string | null;
  lead_source: string | null;
  tags: string[] | null;
  total_credit_limit: number | null;
  assigned_agent_name: string | null;
  created_at: string;
}

export default function FarmerProfile({ id }: { id: string }) {
  const { user } = useAuthStore();
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFarmModalOpen, setIsFarmModalOpen] = useState(false);

  const fetchFarms = async () => {
    try {
      const res = await api.get('/farms', { params: { farmer_id: id } });
      setFarms(Array.isArray(res.data) ? res.data : (res.data?.items ?? []));
    } catch {
      setFarms([]);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [farmerRes, farmsRes] = await Promise.all([
          api.get(`/farmers/${id}`),
          api.get('/farms', { params: { farmer_id: id } }),
        ]);
        setFarmer(farmerRes.data);
        setFarms(Array.isArray(farmsRes.data) ? farmsRes.data : (farmsRes.data?.items ?? []));
      } catch (error) {
        toast.error(formatApiError(error, 'Failed to load farmer data'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (isLoading) return <div className="p-8 text-center text-gray-700">Loading farmer profile...</div>;
  if (!farmer) return <div className="p-8 text-center text-gray-900 font-bold">Farmer not found.</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 border-t-4 border-blue-600">
          <h2 className="text-2xl font-bold text-gray-900">{farmer.name}</h2>
          {farmer.assigned_agent_name && (
            <p className="text-gray-700 font-medium text-sm mt-1">Agent: {farmer.assigned_agent_name}</p>
          )}
          <div className="space-y-3 pt-4 border-t mt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 font-medium">CNIC:</span>
              <span className="text-gray-900 font-bold">{farmer.cnic || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 font-medium">Phone (Primary):</span>
              <span className="text-gray-900">{farmer.contact_mobile || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 font-medium">Phone (WhatsApp):</span>
              <span className="text-gray-900">{farmer.phone_whatsapp || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 font-medium">Village:</span>
              <span className="text-gray-900">{farmer.village || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 font-medium">Tehsil:</span>
              <span className="text-gray-900">{farmer.tehsil || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 font-medium">District:</span>
              <span className="text-gray-900">{farmer.district || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 font-medium">Pipeline Stage:</span>
              <span className="text-gray-900">{farmer.pipeline_stage || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 font-medium">Lead Source:</span>
              <span className="text-gray-900">{farmer.lead_source || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 font-medium">Total Credit Limit:</span>
              <span className="text-gray-900 font-bold">
                {farmer.total_credit_limit != null ? `Rs. ${Number(farmer.total_credit_limit).toLocaleString()}` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 font-medium">Created:</span>
              <span className="text-gray-900">{new Date(farmer.created_at).toLocaleDateString()}</span>
            </div>
            {farmer.tags && farmer.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2">
                {farmer.tags.map((tag) => (
                  <span key={tag} className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between border-b pb-2 mb-4">
            <h3 className="text-lg font-bold text-gray-900">Farms</h3>
            {user && ['ADMIN', 'MANAGER', 'BUSINESS', 'AGRONOMY', 'HARDWARE'].includes(user.role) && (
              <button
                onClick={() => setIsFarmModalOpen(true)}
                className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-bold shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Farm
              </button>
            )}
          </div>
          {farms.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {farms.map((farm) => (
                <div key={farm.id} className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="font-bold text-gray-900">{farm.farm_name}</p>
                  <p className="text-sm text-gray-600 mt-1">{farm.total_acreage} Acres</p>
                  {farm.location_address && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center">
                      <MapPin className="w-3 h-3 mr-1" /> {farm.location_address}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-700 py-4 italic text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
              No farms registered for this farmer.
            </p>
          )}
        </div>
      </div>

      <FarmFormModal
        isOpen={isFarmModalOpen}
        onClose={() => setIsFarmModalOpen(false)}
        onSuccess={fetchFarms}
        farmerId={id}
      />
    </div>
  );
}
