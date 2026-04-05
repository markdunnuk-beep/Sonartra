import type { ReactNode } from 'react';

import { cn } from '@/components/shared/user-app-ui';

type AdminFeedbackTone = 'danger' | 'warning' | 'success' | 'neutral';

export function AdminFeedbackNotice({
  tone,
  title,
  children,
  className,
}: Readonly<{
  tone: AdminFeedbackTone;
  title?: string;
  children: ReactNode;
  className?: string;
}>) {
  return (
    <div
      className={cn(
        'sonartra-admin-feedback-notice',
        tone === 'danger' && 'sonartra-admin-feedback-notice-danger',
        tone === 'warning' && 'sonartra-admin-feedback-notice-warning',
        tone === 'success' && 'sonartra-admin-feedback-notice-success',
        tone === 'neutral' && 'sonartra-admin-feedback-notice-neutral',
        className,
      )}
    >
      {title ? <p className="sonartra-admin-feedback-notice-title">{title}</p> : null}
      <div className="text-sm leading-6">{children}</div>
    </div>
  );
}

export function AdminFeedbackSection({
  title,
  children,
}: Readonly<{
  title: string;
  children: ReactNode;
}>) {
  return (
    <section className="space-y-3">
      <h4 className="sonartra-admin-feedback-section-title">{title}</h4>
      {children}
    </section>
  );
}

export function AdminFeedbackStat({
  label,
  value,
  detail,
}: Readonly<{
  label: string;
  value: string;
  detail?: string;
}>) {
  return (
    <div className="sonartra-admin-feedback-stat">
      <p className="sonartra-admin-feedback-stat-label">{label}</p>
      <p className="sonartra-admin-feedback-stat-value">{value}</p>
      {detail ? <p className="sonartra-admin-feedback-stat-detail">{detail}</p> : null}
    </div>
  );
}
