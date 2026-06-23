import DashboardLayout from '@/components/layout/DashboardLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import CalendarView from '@/modules/calendar/CalendarView';

export default function CalendarPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'AGRONOMY', 'BUSINESS']}>
      <DashboardLayout>
        <div className="p-4 space-y-6 sm:p-6 lg:p-8">
          <h1 className="text-3xl font-bold text-gray-900">Reporting Calendar</h1>
          <CalendarView />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
