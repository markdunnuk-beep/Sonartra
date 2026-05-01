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
    <header className="sonartra-page-header sonartra-motion-reveal">
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
    <div className="sonartra-section-header sonartra-motion-reveal-soft">
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

export function LabelPill({
  children,
  className,
}: Readonly<{
  children: ReactNode;
  className?: string;
}>) {
  return <span className={cn('sonartra-chip', className)}>{children}</span>;
}

export function ButtonLink({
  href,
  children,
  variant = 'secondary',
  className,
  ariaLabel,
}: Readonly<{
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  className?: string;
  ariaLabel?: string;
}>) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={cn(
        'sonartra-button sonartra-focus-ring',
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

export function EmptyState({
  title,
  description,
  action,
  className,
}: Readonly<{
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}>) {
  return (
    <SurfaceCard
      dashed
      muted
      className={cn('sonartra-empty-state sonartra-motion-reveal-soft p-6', className)}
    >
      <div className="space-y-2">
        <h2 className="sonartra-empty-title">{title}</h2>
        <p className="sonartra-empty-copy">{description}</p>
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </SurfaceCard>
  );
}

export function CardTitle({
  children,
  className,
}: Readonly<{
  children: ReactNode;
  className?: string;
}>) {
  return <h3 className={cn('sonartra-type-card-title', className)}>{children}</h3>;
}

export function BodyText({
  children,
  className,
}: Readonly<{
  children: ReactNode;
  className?: string;
}>) {
  return <p className={cn('sonartra-type-body', className)}>{children}</p>;
}

export function SecondaryText({
  children,
  className,
}: Readonly<{
  children: ReactNode;
  className?: string;
}>) {
  return <p className={cn('sonartra-type-body-secondary', className)}>{children}</p>;
}
