import DashboardLayout from '@/components/layout/DashboardLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import InvoiceList from '@/modules/invoices/InvoiceList';

export default function InvoicesPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'ACCOUNTS', 'BDM', 'BUSINESS']}>
      <DashboardLayout>
        <div className="p-4 space-y-6 sm:p-6 lg:p-8">
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <InvoiceList />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
