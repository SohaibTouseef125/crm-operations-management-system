import DashboardLayout from '@/components/layout/DashboardLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import ServicesList from '@/modules/services/ServicesList';

export default function ServicesPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'BDM', 'BUSINESS', 'ACCOUNTS', 'AGRONOMY', 'HARDWARE']}>
      <DashboardLayout>
        <div className="p-4 space-y-6 sm:p-6 lg:p-8">
          <h1 className="text-3xl font-bold text-gray-900">Services</h1>
          <ServicesList />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}