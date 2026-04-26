import { SignIn } from '@clerk/nextjs';
import type { Metadata } from 'next';

import { AuthPageShell } from '@/components/auth/auth-page-shell';

const AUTH_FALLBACK_REDIRECT = '/app/workspace';

export const metadata: Metadata = {
  title: 'Sign in | Sonartra',
  description: 'Access your Sonartra workspace.',
};

export default function SignInPage() {
  return (
    <AuthPageShell
      alternateCta="Create an account"
      alternateHref="/sign-up"
      alternateLabel="New to Sonartra?"
      description="Continue to your assessments, results, and development insights."
      title="Access your Sonartra workspace"
    >
      <SignIn
        appearance={{
          elements: {
            rootBox: 'w-full',
            cardBox: 'w-full shadow-none',
            card: 'w-full bg-transparent p-0 shadow-none',
            footer: 'hidden',
            footerAction: 'hidden',
            formButtonPrimary:
              'h-11 rounded-xl bg-white text-slate-950 hover:bg-white/90 shadow-none font-semibold',
            formFieldInput:
              'h-11 rounded-xl bg-white/[0.045] border-white/12 text-white placeholder:text-white/38 focus:border-[#85d8c8]/70 focus:ring-[#85d8c8]/20',
            formFieldLabel: 'text-white/74 text-sm',
            headerTitle: 'hidden',
            headerSubtitle: 'hidden',
            socialButtonsBlockButton:
              'h-11 rounded-xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.07]',
            socialButtonsBlockButtonText: 'text-white',
            dividerLine: 'bg-white/10',
            dividerText: 'text-white/38',
            identityPreviewText: 'text-white/68',
            formResendCodeLink: 'text-white',
            otpCodeFieldInput:
              'rounded-xl bg-white/[0.045] border-white/12 text-white',
            alertText: 'text-white',
            alert: 'rounded-xl bg-white/[0.045] border-white/10',
            formFieldAction: 'text-white/80 hover:text-white',
            formFieldSuccessText: 'text-[#85d8c8]',
            formFieldErrorText: 'text-red-200',
            formHeader: 'hidden',
            main: 'gap-4',
            form: 'gap-4',
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
