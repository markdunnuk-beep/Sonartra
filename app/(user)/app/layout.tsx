import { UserAppShell } from '@/components/user/user-app-shell';
import { requireUserAppRequestUserContext } from '@/lib/server/user-app-access';
import { isVoiceAssessmentFeatureEnabled } from '@/lib/server/voice/voice-feature';

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
