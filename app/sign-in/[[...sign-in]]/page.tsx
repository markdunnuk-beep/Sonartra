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
      description="Continue to your private behavioural intelligence workspace."
      eyebrow="Private workspace access"
      formDescription="Sign in to continue."
      formTitle="Secure access"
      title="Access your Sonartra workspace"
      trustTitle="Your workspace, reports, and progress remain protected."
      variant="brandAccess"
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
              'h-11 rounded-full bg-[#32D6B0] text-[#07100f] hover:bg-[#52E1C0] shadow-none font-semibold',
            formFieldInput:
              'h-11 rounded-xl bg-[#F5F1EA]/[0.045] border-[#F5F1EA]/12 text-[#F5F1EA] placeholder:text-[#D8D0C3]/38 focus:border-[#32D6B0]/70 focus:ring-[#32D6B0]/20',
            formFieldLabel: 'text-[#D8D0C3]/78 text-sm',
            headerTitle: 'hidden',
            headerSubtitle: 'hidden',
            socialButtonsBlockButton:
              'h-11 rounded-full border-[#F5F1EA]/10 bg-[#F5F1EA]/[0.04] text-[#F5F1EA] hover:bg-[#F5F1EA]/[0.07]',
            socialButtonsBlockButtonText: 'text-[#F5F1EA]',
            dividerLine: 'bg-[#F5F1EA]/10',
            dividerText: 'text-[#D8D0C3]/42',
            identityPreviewText: 'text-[#D8D0C3]/72',
            formResendCodeLink: 'text-[#F5F1EA]',
            otpCodeFieldInput:
              'rounded-xl bg-[#F5F1EA]/[0.045] border-[#F5F1EA]/12 text-[#F5F1EA]',
            alertText: 'text-[#F5F1EA]',
            alert: 'rounded-xl bg-[#F5F1EA]/[0.045] border-[#F5F1EA]/10',
            formFieldAction: 'text-[#F5F1EA]/80 hover:text-[#F5F1EA]',
            formFieldSuccessText: 'text-[#32D6B0]',
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
