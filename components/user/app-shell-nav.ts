export type UserAppNavItem = {
  key: string;
  href: string;
  label: string;
  icon: 'workspace' | 'library' | 'support' | 'settings' | 'admin';
  match: readonly string[];
};

export type UserAppNavSection = {
  key: string;
  items: readonly UserAppNavItem[];
};

const primaryItems: readonly UserAppNavItem[] = [
  {
    key: 'workspace',
    href: '/app/workspace',
    label: 'Workspace',
    icon: 'workspace',
    match: ['/app/workspace', '/app/dashboard'],
  },
  {
    key: 'library',
    href: '/app/library',
    label: 'Library',
    icon: 'library',
    match: ['/app/library'],
  },
  {
    key: 'support',
    href: '/app/support',
    label: 'Support',
    icon: 'support',
    match: ['/app/support'],
  },
  {
    key: 'settings',
    href: '/app/settings',
    label: 'Settings',
    icon: 'settings',
    match: ['/app/settings'],
  },
];

const secondaryItems: readonly UserAppNavItem[] = [
  {
    key: 'admin',
    href: '/admin',
    label: 'Admin',
    icon: 'admin',
    match: ['/admin'],
  },
];

export function getUserAppNavSections(params: {
  canAccessAdmin: boolean;
  canAccessVoice: boolean;
}): readonly UserAppNavSection[] {
  return [
    {
      key: 'primary',
      items: primaryItems,
    },
    ...(params.canAccessAdmin
      ? [
          {
            key: 'secondary',
            items: secondaryItems,
          } satisfies UserAppNavSection,
        ]
      : []),
  ];
}
