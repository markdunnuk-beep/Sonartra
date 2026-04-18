import { AdminUsersRegistry } from '@/components/admin/admin-users-registry';
import { buildAdminUsersListPageViewModel } from '@/lib/server/admin-users-list';
import { getDbPool } from '@/lib/server/db';

type AdminUsersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const viewModel = await buildAdminUsersListPageViewModel({
    db: getDbPool(),
    searchParams: await searchParams,
  });

  return <AdminUsersRegistry viewModel={viewModel} />;
}
