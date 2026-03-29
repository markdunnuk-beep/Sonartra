import { AdminShell } from '@/components/admin/admin-shell';
import { requireAdminRequestUserContext } from '@/lib/server/admin-access';

function getAdminShellLabel(params: {
  userId: string;
  userEmail: string | null;
}): string {
  return params.userEmail ?? params.userId;
}

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AdminLayoutInner>{children}</AdminLayoutInner>;
}

async function AdminLayoutInner({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestUser = await requireAdminRequestUserContext();

  return <AdminShell userLabel={getAdminShellLabel(requestUser)}>{children}</AdminShell>;
}
