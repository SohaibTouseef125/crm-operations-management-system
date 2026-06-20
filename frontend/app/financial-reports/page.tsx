import DashboardLayout from '@/components/layout/DashboardLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import FinancialReports from '@/modules/reports/FinancialReports';

export default function FinancialReportsPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'ACCOUNTS', 'BUSINESS', 'BDM']}>
      <DashboardLayout>
        <div className="p-4 space-y-6 sm:p-6 lg:p-8">
          <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
          <FinancialReports />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
