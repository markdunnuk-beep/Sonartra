import type { LibraryArticle } from './types';

export const LIBRARY_ARTICLES: readonly LibraryArticle[] = [
  {
    slug: 'what-is-a-behavioural-assessment',
    category: 'behavioural-assessments',
    title: 'What is a behavioural assessment?',
    description:
      'A concise introduction to behavioural assessment and how it differs from general self-description.',
    heroSummary:
      'A behavioural assessment looks for repeatable working patterns: how people decide, adapt, lead, handle pressure, and create momentum.',
    publishedAt: '2026-05-03',
    updatedAt: '2026-05-03',
    readingTimeMinutes: 4,
    assessmentKey: 'wplp80',
    signalKeys: ['lead_direction', 'style_adaptation', 'stress_pressure'],
    featured: true,
    featuredOrder: 10,
    sections: [
      {
        id: 'definition',
        eyebrow: 'Definition',
        title: 'It focuses on working behaviour',
        summary: 'The emphasis is practical behaviour rather than a fixed personality type.',
        body: 'A behavioural assessment asks how someone is likely to act in recurring work situations. It looks for patterns in judgement, energy, communication, tension, and follow-through.',
      },
      {
        id: 'use',
        title: 'The result should support better conversations',
        body: 'The best use of an assessment is not to label a person. It is to create clearer language for reflection, development, and practical next steps.',
      },
    ],
    relatedArticleSlugs: [
      'behavioural-assessment-vs-personality-test',
      'how-to-use-an-assessment-report-without-over-labelling-yourself',
    ],
    cta: {
      label: 'Explore Sonartra Signals',
      href: '/sonartra-signals',
      assessmentKey: 'wplp80',
      supportingText: 'See how Sonartra turns structured responses into a readable behavioural profile.',
    },
  },
  {
    slug: 'behavioural-assessment-vs-personality-test',
    category: 'behavioural-assessments',
    title: 'Behavioural assessment vs personality test',
    description:
      'A simple distinction between behavioural evidence, personality labels, and practical interpretation.',
    heroSummary:
      'Personality language often describes identity. Behavioural assessment language should describe patterns that can be understood, tested, and used carefully.',
    publishedAt: '2026-05-03',
    updatedAt: '2026-05-03',
    readingTimeMinutes: 5,
    assessmentKey: 'wplp80',
    signalKeys: ['style_structure', 'culture_collaboration'],
    featured: true,
    featuredOrder: 20,
    sections: [
      {
        id: 'comparison',
        eyebrow: 'Comparison',
        title: 'Behavioural assessment should stay closer to evidence',
        body: 'A personality test can drift towards fixed descriptions. A behavioural assessment is more useful when it stays close to what someone tends to do in context.',
      },
      {
        id: 'range',
        title: 'Good reports leave room for range',
        body: 'People adapt. A useful report should describe likely patterns while leaving space for context, skill, intention, and change.',
      },
    ],
    relatedArticleSlugs: [
      'what-is-a-behavioural-assessment',
      'how-to-use-an-assessment-report-without-over-labelling-yourself',
    ],
    cta: {
      label: 'Read the assessment guide',
      href: '/library/assessment-guides/how-to-use-an-assessment-report-without-over-labelling-yourself',
      supportingText: 'Use assessment language carefully and avoid turning a result into a label.',
    },
  },
  {
    slug: 'what-is-leadership-style',
    category: 'leadership-style',
    title: 'What is leadership style?',
    description:
      'A practical definition of leadership style as a pattern of direction, judgement, influence, and responsibility.',
    heroSummary:
      'Leadership style is the pattern behind how someone creates direction, handles judgement, influences others, and carries responsibility.',
    publishedAt: '2026-05-03',
    updatedAt: '2026-05-03',
    readingTimeMinutes: 4,
    assessmentKey: 'wplp80',
    signalKeys: ['lead_direction', 'lead_judgement', 'lead_influence'],
    featured: true,
    featuredOrder: 30,
    sections: [
      {
        id: 'pattern',
        title: 'Leadership style appears in repeated choices',
        body: 'It shows up in what a person clarifies first, where they place attention, how they involve others, and how they respond when stakes rise.',
      },
      {
        id: 'development',
        title: 'The aim is range, not a perfect style',
        body: 'A strong leadership pattern can be useful and limiting. Development starts by knowing what the pattern enables and where more range may be needed.',
      },
    ],
    relatedArticleSlugs: ['what-is-work-style', 'what-is-conflict-style'],
    cta: {
      label: 'Explore leadership signals',
      href: '/sonartra-signals',
      assessmentKey: 'wplp80',
      supportingText: 'Review the broader assessment model that includes leadership tendencies.',
    },
  },
  {
    slug: 'what-is-work-style',
    category: 'work-style',
    title: 'What is work style?',
    description:
      'An introduction to work style as the pattern behind pace, structure, collaboration, and execution.',
    heroSummary:
      'Work style describes the way someone tends to organise effort, make progress, use structure, and work with others.',
    publishedAt: '2026-05-03',
    updatedAt: '2026-05-03',
    readingTimeMinutes: 4,
    assessmentKey: 'wplp80',
    signalKeys: ['style_structure', 'style_pace', 'culture_collaboration'],
    featured: true,
    featuredOrder: 40,
    sections: [
      {
        id: 'habits',
        title: 'It is visible in everyday habits',
        body: 'Work style appears in planning, prioritising, communication, follow-through, and the conditions that make progress easier or harder.',
      },
      {
        id: 'fit',
        title: 'Fit matters as much as preference',
        body: 'A work style may fit some roles, teams, and phases better than others. The useful question is how to create the right conditions for the work.',
      },
    ],
    relatedArticleSlugs: ['what-is-flow-state', 'what-is-leadership-style'],
    cta: {
      label: 'View the platform model',
      href: '/platform',
      supportingText: 'See how Sonartra keeps assessment output structured and reusable.',
    },
  },
  {
    slug: 'what-is-conflict-style',
    category: 'conflict-style',
    title: 'What is conflict style?',
    description:
      'A practical explainer on how people tend to respond to tension, challenge, and repair.',
    heroSummary:
      'Conflict style describes what someone tends to do when tension rises: challenge, avoid, smooth, repair, pause, or push for clarity.',
    publishedAt: '2026-05-03',
    updatedAt: '2026-05-03',
    readingTimeMinutes: 4,
    assessmentKey: 'wplp80',
    signalKeys: ['conflict_challenge', 'conflict_repair', 'stress_pressure'],
    sections: [
      {
        id: 'tension',
        title: 'Conflict style is not only about disagreement',
        body: 'It can show up in small moments: delayed decisions, unclear ownership, competing standards, or pressure that changes how people communicate.',
      },
      {
        id: 'repair',
        title: 'Repair is part of the pattern',
        body: 'A useful conflict profile should describe not only how tension starts, but how someone restores clarity and trust afterwards.',
      },
    ],
    relatedArticleSlugs: ['what-is-leadership-style', 'what-is-work-style'],
    cta: {
      label: 'Explore assessment concepts',
      href: '/library/behavioural-assessments/what-is-a-behavioural-assessment',
      supportingText: 'Start with the foundations before interpreting conflict patterns.',
    },
  },
  {
    slug: 'what-is-flow-state',
    category: 'flow-state',
    title: 'What is flow state?',
    description:
      'A concise guide to flow state, focus, energy, and the conditions that support deep work.',
    heroSummary:
      'Flow state is a period of absorbed, productive focus where challenge, clarity, skill, and energy are aligned enough for sustained progress.',
    publishedAt: '2026-05-03',
    updatedAt: '2026-05-03',
    readingTimeMinutes: 4,
    assessmentKey: null,
    signalKeys: ['style_focus', 'mot_energy'],
    featured: true,
    featuredOrder: 50,
    sections: [
      {
        id: 'conditions',
        title: 'Flow depends on conditions',
        body: 'Flow is easier when the work has enough challenge, clear feedback, limited interruption, and a level of skill that makes progress possible.',
      },
      {
        id: 'patterns',
        title: 'Different people reach flow differently',
        body: 'Some people need structure and quiet. Others need urgency, collaboration, or visible progress. Behavioural patterns help explain those differences.',
      },
    ],
    relatedArticleSlugs: ['what-is-work-style', 'what-is-a-behavioural-assessment'],
    cta: {
      label: 'Explore work style',
      href: '/library/work-style/what-is-work-style',
      supportingText: 'Understand the working conditions that support sustained momentum.',
    },
  },
  {
    slug: 'how-to-use-an-assessment-report-without-over-labelling-yourself',
    category: 'assessment-guides',
    title: 'How to use an assessment report without over-labelling yourself',
    description:
      'A practical guide to reading assessment language as evidence, not identity.',
    heroSummary:
      'A useful assessment report should help you notice patterns, ask better questions, and choose next steps without turning the result into a fixed label.',
    publishedAt: '2026-05-03',
    updatedAt: '2026-05-03',
    readingTimeMinutes: 5,
    assessmentKey: 'wplp80',
    featured: true,
    featuredOrder: 60,
    sections: [
      {
        id: 'read-as-pattern',
        title: 'Read the report as a pattern, not a verdict',
        body: 'Look for what appears consistently across the result. Treat the language as a starting point for reflection rather than a final statement about who you are.',
      },
      {
        id: 'test-in-context',
        title: 'Test the pattern against real situations',
        body: 'Ask where the result fits your experience, where it does not, and what context changes the behaviour. That keeps interpretation grounded.',
      },
      {
        id: 'choose-action',
        title: 'Choose one practical next step',
        body: 'The report becomes useful when it leads to a better conversation, a clearer working agreement, or one deliberate behaviour to practise.',
      },
    ],
    relatedArticleSlugs: [
      'what-is-a-behavioural-assessment',
      'behavioural-assessment-vs-personality-test',
    ],
    cta: {
      label: 'Start with Sonartra Signals',
      href: '/sonartra-signals',
      assessmentKey: 'wplp80',
      supportingText: 'Use structured assessment output as a careful starting point for reflection.',
    },
  },
] as const;
