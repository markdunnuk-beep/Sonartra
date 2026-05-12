import {
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  type SupportCategory,
  type SupportPriority,
  type SupportStatus,
  type SupportMessageAuthorType,
} from '@/lib/server/support-service';
import { SUPPORT_REQUEST_CATEGORY_OPTIONS } from '@/lib/support/support-request-action-state';

export const SUPPORT_STATUS_OPTIONS: readonly {
  value: SupportStatus;
  label: string;
}[] = [
  { value: 'open', label: 'Open' },
  { value: 'waiting_on_sonartra', label: 'Waiting on Sonartra' },
  { value: 'waiting_on_user', label: 'Waiting on you' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export const ADMIN_SUPPORT_STATUS_OPTIONS: readonly {
  value: SupportStatus;
  label: string;
}[] = [
  { value: 'open', label: 'Open' },
  { value: 'waiting_on_sonartra', label: 'Waiting on Sonartra' },
  { value: 'waiting_on_user', label: 'Waiting on user' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export const SUPPORT_PRIORITY_OPTIONS: readonly {
  value: SupportPriority;
  label: string;
}[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function formatSupportCategory(value: SupportCategory): string {
  return SUPPORT_REQUEST_CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function formatSupportStatus(value: SupportStatus): string {
  return SUPPORT_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function formatAdminSupportStatus(value: SupportStatus): string {
  return ADMIN_SUPPORT_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function formatSupportPriority(value: SupportPriority): string {
  return SUPPORT_PRIORITY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function formatSupportDate(value: string | null): string {
  if (!value) {
    return 'Not set';
  }

  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatSupportDateTime(value: string): string {
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatSupportAuthorType(value: SupportMessageAuthorType): string {
  if (value === 'user') {
    return 'You';
  }

  if (value === 'admin') {
    return 'Sonartra support';
  }

  return 'System';
}

export function parseSupportStatusFilter(value: string | string[] | undefined): SupportStatus | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return SUPPORT_STATUSES.includes(raw as SupportStatus) ? (raw as SupportStatus) : undefined;
}

export function parseSupportPriorityFilter(value: string | string[] | undefined): SupportPriority | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return SUPPORT_PRIORITIES.includes(raw as SupportPriority) ? (raw as SupportPriority) : undefined;
}

export function parseSupportCategoryFilter(value: string | string[] | undefined): SupportCategory | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return SUPPORT_REQUEST_CATEGORY_OPTIONS.some((option) => option.value === raw)
    ? (raw as SupportCategory)
    : undefined;
}
