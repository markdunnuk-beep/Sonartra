import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { Instrument_Sans } from 'next/font/google';

import './globals.css';

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sonartra-sans',
});

export const metadata: Metadata = {
  applicationName: 'Sonartra',
  title: 'Sonartra',
  description: 'Assessment intelligence for behavioural insight and applied development.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={instrumentSans.variable}>
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
