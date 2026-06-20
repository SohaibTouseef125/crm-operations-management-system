import DashboardLayout from '@/components/layout/DashboardLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import QuotationsList from '@/modules/quotations/QuotationsList';

export default function QuotationsPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'ACCOUNTS', 'BUSINESS']}>
      <DashboardLayout>
        <div className="p-4 space-y-6 sm:p-6 lg:p-8">
          <h1 className="text-3xl font-bold text-gray-900">Quotations</h1>
          <QuotationsList />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
