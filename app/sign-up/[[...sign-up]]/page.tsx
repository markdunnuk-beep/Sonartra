import { SignUp } from '@clerk/nextjs';

import { AuthPageShell } from '@/components/auth/auth-page-shell';

const AUTH_FALLBACK_REDIRECT = '/app/workspace';

export default function SignUpPage() {
  return (
    <AuthPageShell
      alternateCta="Sign in"
      alternateHref="/sign-in"
      alternateLabel="Already have access?"
      description="Create a Sonartra account and land directly in the application. If Clerk sends a protected return path, that handoff still takes precedence."
      title="Create your Sonartra account"
    >
      <SignUp
        appearance={{
          elements: {
            card: 'bg-transparent shadow-none',
            footer: 'hidden',
            footerAction: 'hidden',
            formButtonPrimary:
              'bg-white text-slate-950 hover:bg-white/90 shadow-none',
            formFieldInput:
              'bg-white/[0.04] border-white/10 text-white placeholder:text-white/38',
            formFieldLabel: 'text-white/74',
            headerTitle: 'hidden',
            headerSubtitle: 'hidden',
            socialButtonsBlockButton:
              'border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06]',
            socialButtonsBlockButtonText: 'text-white',
            dividerLine: 'bg-white/10',
            dividerText: 'text-white/38',
            identityPreviewText: 'text-white/68',
            formResendCodeLink: 'text-white',
            otpCodeFieldInput:
              'bg-white/[0.04] border-white/10 text-white',
            alertText: 'text-white',
            alert: 'bg-white/[0.04] border-white/10',
          },
        }}
        fallbackRedirectUrl={AUTH_FALLBACK_REDIRECT}
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
      />
    </AuthPageShell>
  );
}
