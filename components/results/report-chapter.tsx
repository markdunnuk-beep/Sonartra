import type { CSSProperties, ReactNode } from 'react';

import { cn } from '@/components/shared/user-app-ui';

type ReportChapterVariant = 'default' | 'feature' | 'accent' | 'warning';

type ReportChapterProps = {
  id: string;
  titleId?: string;
  eyebrow?: ReactNode;
  title?: ReactNode;
  lead?: ReactNode;
  children: ReactNode;
  variant?: ReportChapterVariant;
  className?: string;
  headerClassName?: string;
  titleClassName?: string;
  leadClassName?: string;
  contentClassName?: string;
  style?: CSSProperties;
};

type ReportHeaderProps = {
  id: string;
  titleId: string;
  eyebrow?: ReactNode;
  meta?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
  className?: string;
  headerClassName?: string;
  titleClassName?: string;
  leadClassName?: string;
  contentClassName?: string;
};

function variantClassName(variant: ReportChapterVariant) {
  return {
    default: '',
    feature: 'sonartra-report-chapter-feature',
    accent: 'sonartra-report-chapter-accent',
    warning: 'sonartra-report-chapter-warning',
  }[variant];
}

export function ReportHeader({
  id,
  titleId,
  eyebrow,
  meta,
  title,
  lead,
  children,
  className,
  headerClassName,
  titleClassName,
  leadClassName,
  contentClassName,
}: ReportHeaderProps) {
  return (
    <header
      id={id}
      aria-labelledby={titleId}
      className={cn(
        'results-anchor-target sonartra-motion-reveal sonartra-report-header sonartra-single-domain-section',
        className,
      )}
    >
      <div className={cn('sonartra-report-header-stack', headerClassName)}>
        {eyebrow ? <p className="sonartra-report-kicker">{eyebrow}</p> : null}
        {meta}
        <div className="sonartra-report-title-stack">
          <h1 id={titleId} className={cn('sonartra-report-page-title', titleClassName)}>
            {title}
          </h1>
          {lead ? (
            <div className={cn('sonartra-report-header-lead', leadClassName)}>{lead}</div>
          ) : null}
        </div>
      </div>
      {children ? (
        <div className={cn('sonartra-report-header-content', contentClassName)}>{children}</div>
      ) : null}
    </header>
  );
}

export function ReportChapter({
  id,
  titleId = `${id}-heading`,
  eyebrow,
  title,
  lead,
  children,
  variant = 'default',
  className,
  headerClassName,
  titleClassName,
  leadClassName,
  contentClassName,
  style,
}: ReportChapterProps) {
  return (
    <section
      id={id}
      aria-labelledby={title ? titleId : undefined}
      className={cn(
        'results-anchor-target sonartra-motion-reveal sonartra-report-chapter sonartra-single-domain-section',
        variantClassName(variant),
        className,
      )}
      style={style}
    >
      {eyebrow || title || lead ? (
        <div className={cn('sonartra-report-chapter-header', headerClassName)}>
          {eyebrow ? <p className="sonartra-report-kicker">{eyebrow}</p> : null}
          {title ? (
            <h2 id={titleId} className={cn('sonartra-report-chapter-title', titleClassName)}>
              {title}
            </h2>
          ) : null}
          {lead ? (
            <div className={cn('sonartra-report-chapter-lead', leadClassName)}>{lead}</div>
          ) : null}
        </div>
      ) : null}
      <div className={cn('sonartra-report-chapter-content', contentClassName)}>{children}</div>
    </section>
  );
}
