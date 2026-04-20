export type UserAppNavItem = {
  key: string;
  href: string;
  label: string;
  icon: 'workspace' | 'assessments' | 'voice' | 'results' | 'settings' | 'admin';
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
    key: 'assessments',
    href: '/app/assessments',
    label: 'Assessments',
    icon: 'assessments',
    match: ['/app/assessments'],
  },
];

const voiceItem: UserAppNavItem = {
  key: 'voice-assessments',
  href: '/app/voice-assessments',
  label: 'Voice Assessment',
  icon: 'voice',
  match: ['/app/voice-assessments'],
};

const trailingPrimaryItems: readonly UserAppNavItem[] = [
  {
    key: 'results',
    href: '/app/results',
    label: 'Results',
    icon: 'results',
    match: ['/app/results'],
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
      items: [
        ...primaryItems,
        ...(params.canAccessVoice ? [voiceItem] : []),
        ...trailingPrimaryItems,
      ],
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
