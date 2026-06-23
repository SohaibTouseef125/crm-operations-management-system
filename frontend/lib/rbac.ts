import { UserRole } from '@/types/auth';

export interface NavItem {
  name: string;
  href: string;
  iconName: string;
  roles: UserRole[];
}

/**
 * Master navigation config.
 * Each item declares exactly which roles can see it.
 * The sidebar renders only items the current user's role is in.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    iconName: 'LayoutDashboard',
    roles: ['ADMIN', 'MANAGER', 'BUSINESS', 'BDM', 'AGRONOMY', 'HARDWARE', 'ACCOUNTS', 'EMPLOYEE'],
  },
  // ── Clients ──
  {
    name: 'Clients',
    href: '/clients',
    iconName: 'Users',
    roles: ['ADMIN', 'MANAGER', 'BUSINESS', 'BDM', 'AGRONOMY', 'ACCOUNTS'],
  },
  // ── Farmers ──
  {
    name: 'Farmers',
    href: '/farmers',
    iconName: 'Users',
    roles: ['ADMIN', 'MANAGER', 'BUSINESS', 'AGRONOMY', 'ACCOUNTS'],
  },
  // ── Leads / Sales ──
  {
    name: 'Leads & Pipeline',
    href: '/leads',
    iconName: 'TrendingUp',
    roles: ['ADMIN', 'MANAGER', 'BUSINESS', 'BDM', 'ACCOUNTS'],
  },
  // ── Agronomy ──
  {
    name: 'Field Reports',
    href: '/reports',
    iconName: 'FileText',
    roles: ['ADMIN', 'MANAGER', 'AGRONOMY', 'BUSINESS', 'ACCOUNTS'],
  },
  // ── Devices ──
  {
    name: 'Devices',
    href: '/devices',
    iconName: 'Cpu',
    roles: ['ADMIN', 'MANAGER', 'HARDWARE', 'AGRONOMY'],
  },
  // ── Calendar / Visits ──
  {
    name: 'Calendar',
    href: '/calendar',
    iconName: 'Calendar',
    roles: ['ADMIN', 'MANAGER', 'AGRONOMY', 'BUSINESS'],
  },
  // ── Inventory / Components ──
  {
    name: 'Inventory',
    href: '/inventory',
    iconName: 'Package',
    roles: ['ADMIN', 'MANAGER', 'HARDWARE'],
  },
  {
    name: 'Components',
    href: '/components',
    iconName: 'CircuitBoard',
    roles: ['ADMIN', 'MANAGER', 'HARDWARE'],
  },
  // ── Issues / Tickets ──
  {
    name: 'Issues & Tickets',
    href: '/issues',
    iconName: 'AlertCircle',
    roles: ['ADMIN', 'MANAGER', 'BUSINESS'],
  },
  // ── Products ──
  {
    name: 'Products',
    href: '/products',
    iconName: 'Package',
    roles: ['ADMIN', 'MANAGER', 'BDM', 'BUSINESS', 'ACCOUNTS', 'AGRONOMY', 'HARDWARE'],
  },
  // ── Services ──
  {
    name: 'Services',
    href: '/services',
    iconName: 'Wrench',
    roles: ['ADMIN', 'MANAGER', 'BDM', 'BUSINESS', 'ACCOUNTS', 'AGRONOMY', 'HARDWARE'],
  },
  // ── Quotations ──
  {
    name: 'Quotations',
    href: '/quotations',
    iconName: 'FileText',
    roles: ['ADMIN', 'MANAGER', 'ACCOUNTS', 'BUSINESS'],
  },
  // ── Billing ──
  {
    name: 'Billing',
    href: '/billing',
    iconName: 'CreditCard',
    roles: ['ADMIN', 'MANAGER', 'ACCOUNTS', 'BDM', 'BUSINESS'],
  },
  {
    name: 'Invoices',
    href: '/invoices',
    iconName: 'FileText',
    roles: ['ADMIN', 'MANAGER', 'ACCOUNTS', 'BDM', 'BUSINESS'],
  },
  // ── Financial Reports ──
  {
    name: 'Financial Reports',
    href: '/financial-reports',
    iconName: 'BarChart2',
    roles: ['ADMIN', 'MANAGER', 'ACCOUNTS', 'BUSINESS', 'BDM'],
  },
  // ── Tasks ──
  {
    name: 'Tasks',
    href: '/tasks',
    iconName: 'CheckSquare',
    roles: ['ADMIN', 'MANAGER', 'BUSINESS', 'ACCOUNTS', 'AGRONOMY'],
  },
  // ── Performance ──
  {
    name: 'Performance',
    href: '/performance',
    iconName: 'BarChart2',
    roles: ['ADMIN', 'MANAGER', 'BUSINESS', 'BDM', 'AGRONOMY', 'HARDWARE', 'ACCOUNTS', 'EMPLOYEE'],
  },
  // ── Notifications ──
  {
    name: 'Notifications',
    href: '/notifications',
    iconName: 'Bell',
    roles: ['ADMIN', 'MANAGER', 'BUSINESS', 'BDM', 'AGRONOMY', 'HARDWARE', 'ACCOUNTS', 'EMPLOYEE'],
  },
  // ── Admin-only ──
  {
    name: 'Activity Logs',
    href: '/activity-logs',
    iconName: 'Activity',
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    name: 'Users',
    href: '/users',
    iconName: 'UserCog',
    roles: ['ADMIN'],
  },
];

/**
 * Route-to-allowed-roles map used by ProtectedRoute.
 * Prefix matching: /devices matches /devices/[id] etc.
 */
export const ROUTE_ROLES: Record<string, UserRole[]> = {
  '/dashboard':      ['ADMIN', 'MANAGER', 'BUSINESS', 'BDM', 'AGRONOMY', 'HARDWARE', 'ACCOUNTS', 'EMPLOYEE'],
  '/clients':        ['ADMIN', 'MANAGER', 'BUSINESS', 'BDM', 'AGRONOMY', 'ACCOUNTS'],
  '/farmers':        ['ADMIN', 'MANAGER', 'BUSINESS', 'AGRONOMY', 'ACCOUNTS'],
  '/leads':          ['ADMIN', 'MANAGER', 'BUSINESS', 'BDM', 'ACCOUNTS'],
  '/reports':        ['ADMIN', 'MANAGER', 'AGRONOMY', 'BUSINESS', 'ACCOUNTS'],
  '/devices':        ['ADMIN', 'MANAGER', 'HARDWARE', 'AGRONOMY'],
  '/calendar':       ['ADMIN', 'MANAGER', 'AGRONOMY', 'BUSINESS'],
  '/inventory':      ['ADMIN', 'MANAGER', 'HARDWARE'],
  '/components':     ['ADMIN', 'MANAGER', 'HARDWARE'],
  '/issues':         ['ADMIN', 'MANAGER', 'BUSINESS'],
  '/invoices':            ['ADMIN', 'MANAGER', 'ACCOUNTS', 'BDM', 'BUSINESS'],
  '/billing':             ['ADMIN', 'MANAGER', 'ACCOUNTS', 'BDM', 'BUSINESS'],
  '/products':            ['ADMIN', 'MANAGER', 'BDM', 'BUSINESS', 'ACCOUNTS', 'AGRONOMY', 'HARDWARE'],
  '/services':            ['ADMIN', 'MANAGER', 'BDM', 'BUSINESS', 'ACCOUNTS', 'AGRONOMY', 'HARDWARE'],
  '/quotations':          ['ADMIN', 'MANAGER', 'ACCOUNTS', 'BUSINESS'],
  '/financial-reports':   ['ADMIN', 'MANAGER', 'ACCOUNTS', 'BUSINESS', 'BDM'],
  '/tasks':          ['ADMIN', 'MANAGER', 'BUSINESS', 'ACCOUNTS', 'AGRONOMY'],
  '/performance':    ['ADMIN', 'MANAGER', 'BUSINESS', 'BDM', 'AGRONOMY', 'HARDWARE', 'ACCOUNTS', 'EMPLOYEE'],
  '/notifications':  ['ADMIN', 'MANAGER', 'BUSINESS', 'BDM', 'AGRONOMY', 'HARDWARE', 'ACCOUNTS', 'EMPLOYEE'],
  '/activity-logs':  ['ADMIN', 'MANAGER'],
  '/users':          ['ADMIN'],
  '/unauthorized':   ['ADMIN', 'MANAGER', 'BUSINESS', 'BDM', 'AGRONOMY', 'HARDWARE', 'ACCOUNTS', 'EMPLOYEE'],
};

export function hasRouteAccess(pathname: string, role: UserRole): boolean {
  // Find matching route (prefix match for dynamic routes)
  const matchingRoute = Object.keys(ROUTE_ROLES).find((route) =>
    pathname === route || pathname.startsWith(route + '/')
  );
  if (!matchingRoute) return true; // public route
  return ROUTE_ROLES[matchingRoute]?.includes(role) ?? false;
}
