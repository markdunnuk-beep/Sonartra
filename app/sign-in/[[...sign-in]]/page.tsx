import { SignIn } from '@clerk/nextjs';

import { AuthPageShell } from '@/components/auth/auth-page-shell';

const AUTH_FALLBACK_REDIRECT = '/app/workspace';

export default function SignInPage() {
  return (
    <AuthPageShell
      alternateCta="Create an account"
      alternateHref="/sign-up"
      alternateLabel="New to Sonartra?"
      description="Sign in to continue into the Sonartra workspace. Protected route handoff is preserved when Clerk sends a return path."
      title="Access the Sonartra workspace"
    >
      <SignIn
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
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
      />
    </AuthPageShell>
  );
}
