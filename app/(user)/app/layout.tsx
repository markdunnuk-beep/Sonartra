import { UserAppShell } from '@/components/user/user-app-shell';
import { isApprovedAdminEmail } from '@/lib/server/admin-access';
import { getRequestUserContext } from '@/lib/server/request-user';

function getUserShellLabel(params: {
  userId: string;
  userEmail: string | null;
}): string {
  return params.userEmail ?? params.userId;
}

export default async function UserAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestUser = await getRequestUserContext();

  return (
    <UserAppShell
      canAccessAdmin={isApprovedAdminEmail(requestUser.userEmail)}
      userLabel={getUserShellLabel(requestUser)}
    >
      {children}
    </UserAppShell>
  );
}
