export type AdminNavItem = {
  key: 'dashboard' | 'assessments' | 'organisations' | 'users';
  href: string;
  label: string;
  description: string;
  match: readonly string[];
};

export const adminNavItems: readonly AdminNavItem[] = [
  {
    key: 'dashboard',
    href: '/admin',
    label: 'Dashboard',
    description: 'Admin workspace overview and navigation.',
    match: ['/admin', '/admin/dashboard'],
  },
  {
    key: 'assessments',
    href: '/admin/assessments',
    label: 'Assessments',
    description: 'Build assessments, manage versions, and publish.',
    match: ['/admin/assessments'],
  },
  {
    key: 'organisations',
    href: '/admin/organisations',
    label: 'Organisations',
    description: 'Organisation administration and assignment controls.',
    match: ['/admin/organisations'],
  },
  {
    key: 'users',
    href: '/admin/users',
    label: 'Users',
    description: 'User access, roles, and workspace administration.',
    match: ['/admin/users'],
  },
];

export function isAdminNavItemActive(pathname: string, item: AdminNavItem): boolean {
  return item.match.some((candidate) => {
    if (candidate === '/admin') {
      return pathname === candidate;
    }

    return pathname === candidate || pathname.startsWith(`${candidate}/`);
  });
}
