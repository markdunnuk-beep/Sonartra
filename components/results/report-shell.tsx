import type { ReactNode } from 'react';

import { PageFrame, cn } from '@/components/shared/user-app-ui';

type ReportShellProps = {
  children: ReactNode;
  rail?: ReactNode;
  className?: string;
  bodyClassName?: string;
};

type ReportBodyProps = {
  children: ReactNode;
  className?: string;
};

export function ReportShell({ children, rail, className, bodyClassName }: ReportShellProps) {
  return (
    <PageFrame className={cn('sonartra-report-page-frame', className)}>
      <article className="sonartra-report-shell sonartra-single-domain-report relative isolate">
        <div className={cn('sonartra-report-shell-layout', bodyClassName)}>
          {children}
          {rail ? <div className="sonartra-report-shell-rail">{rail}</div> : null}
        </div>
      </article>
    </PageFrame>
  );
}

export function ReportBody({ children, className }: ReportBodyProps) {
  return <div className={cn('sonartra-report-body-flow', className)}>{children}</div>;
}
