import { notFound } from 'next/navigation';

import { AdminUserDetail } from '@/components/admin/admin-user-detail';
import { buildAdminUserDetailViewModel } from '@/lib/server/admin-user-detail';
import { getDbPool } from '@/lib/server/db';

export default async function AdminUserDetailPage({
  params,
}: Readonly<{
  params: Promise<{ userId: string }>;
}>) {
  const { userId } = await params;
  const viewModel = await buildAdminUserDetailViewModel({
    db: getDbPool(),
    userId,
  });

  if (!viewModel) {
    notFound();
  }

  return <AdminUserDetail viewModel={viewModel} />;
}
