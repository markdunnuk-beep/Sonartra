import { notFound } from 'next/navigation';

import { AdminUserDetail } from '@/components/admin/admin-user-detail';
import { buildAdminUserDetailViewModel } from '@/lib/server/admin-user-detail';
import { getDbPool } from '@/lib/server/db';

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ assignmentMutation?: string }>;
}>) {
  const { userId } = await params;
  const resolvedSearchParams = await searchParams;
  const viewModel = await buildAdminUserDetailViewModel({
    db: getDbPool(),
    userId,
  });

  if (!viewModel) {
    notFound();
  }

  return (
    <AdminUserDetail
      mutationFeedbackKey={resolvedSearchParams.assignmentMutation ?? null}
      viewModel={viewModel}
    />
  );
}
