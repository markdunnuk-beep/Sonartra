import Link from 'next/link';
import type { ReactNode } from 'react';

import type { WorkspaceAssessmentStatus } from '@/lib/server/workspace-service';

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function PageFrame({
  children,
  className,
}: Readonly<{
  children: ReactNode;
  className?: string;
}>) {
  return <main className={cn('sonartra-page', className)}>{children}</main>;
}

export function PageHeader({
  eyebrow = 'User App',
  title,
  description,
}: Readonly<{
  eyebrow?: string;
  title: string;
  description: string;
}>) {
  return (
    <header className="sonartra-page-header">
      <p className="sonartra-page-eyebrow">{eyebrow}</p>
      <h1 className="sonartra-page-title">{title}</h1>
      <p className="sonartra-page-description">{description}</p>
    </header>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
}: Readonly<{
  eyebrow: string;
  title: string;
  description?: string;
}>) {
  return (
    <div className="sonartra-section-header">
      <p className="sonartra-page-eyebrow">{eyebrow}</p>
      <h2 className="sonartra-section-title">{title}</h2>
      {description ? <p className="sonartra-section-description">{description}</p> : null}
    </div>
  );
}

export function SurfaceCard({
  children,
  className,
  accent = false,
  muted = false,
  dashed = false,
  interactive = false,
}: Readonly<{
  children: ReactNode;
  className?: string;
  accent?: boolean;
  muted?: boolean;
  dashed?: boolean;
  interactive?: boolean;
}>) {
  return (
    <article
      className={cn(
        'sonartra-card',
        accent && 'sonartra-card-hero',
        muted && 'sonartra-card-muted',
        dashed && 'sonartra-card-dashed',
        interactive && 'sonartra-card-interactive',
        className,
      )}
    >
      {children}
    </article>
  );
}

export function MetaItem({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="sonartra-meta-card">
      <p className="sonartra-meta-label">{label}</p>
      <p className="sonartra-meta-value">{value}</p>
    </div>
  );
}

export function ButtonLink({
  href,
  children,
  variant = 'secondary',
  className,
}: Readonly<{
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  className?: string;
}>) {
  return (
    <Link
      href={href}
      className={cn(
        'sonartra-button',
        variant === 'primary' ? 'sonartra-button-primary' : 'sonartra-button-secondary',
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function StatusPill({
  status,
  label,
}: Readonly<{
  status: WorkspaceAssessmentStatus | 'ready';
  label: string;
}>) {
  const toneClass =
    status === 'results_ready' || status === 'ready'
      ? 'sonartra-status-ready'
      : status === 'in_progress'
        ? 'sonartra-status-progress'
        : 'sonartra-status-neutral';

  return <span className={cn('sonartra-status', toneClass)}>{label}</span>;
}
