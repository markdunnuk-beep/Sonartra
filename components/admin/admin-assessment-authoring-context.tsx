'use client';

import { createContext, useContext } from 'react';

import type { AdminAssessmentDetailViewModel } from '@/lib/server/admin-assessment-detail';

const AdminAssessmentAuthoringContext = createContext<AdminAssessmentDetailViewModel | null>(null);

export function AdminAssessmentAuthoringProvider({
  assessment,
  children,
}: Readonly<{
  assessment: AdminAssessmentDetailViewModel;
  children: React.ReactNode;
}>) {
  return (
    <AdminAssessmentAuthoringContext.Provider value={assessment}>
      {children}
    </AdminAssessmentAuthoringContext.Provider>
  );
}

export function useAdminAssessmentAuthoring(): AdminAssessmentDetailViewModel {
  const context = useContext(AdminAssessmentAuthoringContext);

  if (!context) {
    throw new Error('AdminAssessmentAuthoringContext is unavailable outside the authoring layout.');
  }

  return context;
}
