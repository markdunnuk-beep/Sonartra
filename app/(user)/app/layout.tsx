import { UserAppShell } from '@/components/user/user-app-shell';
import { requireUserAppRequestUserContext } from '@/lib/server/user-app-access';
import { isVoiceAssessmentFeatureEnabled } from '@/lib/server/voice/voice-feature';

function getUserShellLabel(params: {
  userId: string;
  userEmail: string | null;
  userName: string | null;
}): string {
  return params.userName ?? params.userEmail ?? params.userId ?? 'Workspace user';
}

export default async function UserAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestUser = await requireUserAppRequestUserContext();

  return (
    <UserAppShell
      canAccessAdmin={requestUser.isAdmin}
      canAccessVoice={isVoiceAssessmentFeatureEnabled()}
      userLabel={getUserShellLabel(requestUser)}
    >
      {children}
    </UserAppShell>
  );
}
