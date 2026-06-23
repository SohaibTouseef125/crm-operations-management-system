import DashboardLayout from '@/components/layout/DashboardLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import FarmerProfile from '@/modules/farmers/FarmerProfile';
import Link from 'next/link';

export default async function FarmerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'BUSINESS', 'AGRONOMY']}>
      <DashboardLayout>
        <div className="p-4 space-y-6 sm:p-6 lg:p-8">
          <div className="flex items-center space-x-4">
            <Link href="/farmers" className="text-blue-600 hover:underline">← Back to Farmers</Link>
            <h1 className="text-3xl font-bold text-gray-900">Farmer Profile</h1>
          </div>
          <FarmerProfile id={id} />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
