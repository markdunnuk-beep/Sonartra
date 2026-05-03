import type { LibraryArticle } from './types';

export const LIBRARY_ARTICLES: readonly LibraryArticle[] = [
  {
    slug: 'what-is-a-behavioural-assessment',
    category: 'behavioural-assessments',
    title: 'What is a behavioural assessment?',
    description:
      'A behaviour-first guide to how structured assessments help people notice repeatable working patterns without turning them into fixed labels.',
    heroSummary:
      'A behavioural assessment gives language to how someone tends to work, decide, respond under pressure, relate to others, and turn awareness into practical action.',
    publishedAt: '2026-05-03',
    updatedAt: '2026-05-03',
    readingTimeMinutes: 7,
    assessmentKey: 'wplp80',
    signalKeys: ['lead_direction', 'style_adaptation', 'stress_pressure'],
    featured: true,
    featuredOrder: 10,
    sections: [
      {
        id: 'what-it-means',
        eyebrow: 'Meaning',
        title: 'What this means',
        summary:
          'A behavioural assessment is a structured way to notice patterns in action, not a diagnosis or a permanent identity statement.',
        body: 'The useful question is not simply what kind of person someone is. It is how they tend to behave in recurring work situations: how they make decisions, create momentum, respond to uncertainty, handle tension, and relate to others. A good behavioural assessment gives those patterns clearer language while leaving room for context, skill, intention, and change.',
      },
      {
        id: 'how-it-shows-up',
        eyebrow: 'Behaviour',
        title: 'How it shows up at work',
        summary:
          'Patterns become visible through repeated choices: what someone clarifies first, avoids, protects, challenges, or follows through on.',
        body: 'At work, behaviour is rarely isolated. A person may bring structure when others want pace, seek harmony when pressure rises, or push for action before everyone feels ready. None of those patterns is automatically good or bad. They become useful to understand when they repeat across meetings, decisions, deadlines, feedback, and collaboration.',
      },
      {
        id: 'why-it-matters',
        eyebrow: 'Use',
        title: 'Why it matters',
        summary:
          'The value of assessment language is practical: it should help people make better choices and have clearer conversations.',
        body: 'Assessment output matters when it helps someone recognise what their pattern enables and where it may need support. It can make a development conversation more specific, help a manager adapt conditions, or give a team shared language for friction that was previously vague. The result should move from self-awareness to usable action.',
      },
      {
        id: 'blind-spots',
        eyebrow: 'Limit',
        title: 'Where it can become a blind spot',
        summary:
          'Assessment language becomes less useful when it is treated as a box, an excuse, or a final explanation.',
        body: 'A behavioural pattern is not the whole person. If a report is read too rigidly, it can narrow how someone sees themselves or how others see them. The strongest patterns can also be overused: decisiveness may become impatience, care may become avoidance, and structure may become resistance to change. Good interpretation keeps both usefulness and limitation in view.',
      },
      {
        id: 'use-it-well',
        eyebrow: 'Practice',
        title: 'How to use it well',
        summary:
          'Use the result as a prompt: compare it with real examples, discuss the pattern, and choose one practical adjustment.',
        body: 'Start by asking where the result fits your experience and where it does not. Look for recent examples rather than abstract agreement. Then choose one setting where the pattern matters: a meeting, a decision, a feedback conversation, or a stretch project. The assessment becomes valuable when it changes one observable behaviour or makes one conversation clearer.',
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
      'A practical distinction between personality labels, behavioural evidence, context, and work-relevant interpretation.',
    heroSummary:
      'Personality language often describes traits. Behavioural assessment language is most useful when it stays closer to observable patterns, context, and practical application.',
    publishedAt: '2026-05-03',
    updatedAt: '2026-05-03',
    readingTimeMinutes: 7,
    assessmentKey: 'wplp80',
    signalKeys: ['style_structure', 'culture_collaboration'],
    featured: true,
    featuredOrder: 20,
    sections: [
      {
        id: 'different-question',
        eyebrow: 'Distinction',
        title: 'They answer a different question',
        summary:
          'Personality tests often describe traits; behavioural assessments should explain how patterns tend to appear in action.',
        body: 'A personality test may offer a broad description of preference or temperament. That can be interesting, but it can also drift towards fixed identity language. A behavioural assessment asks a more practical question: what does this person tend to do in particular settings, especially when decisions, pressure, collaboration, or conflict are involved?',
      },
      {
        id: 'closer-to-evidence',
        eyebrow: 'Evidence',
        title: 'Behavioural assessment should stay closer to evidence',
        summary:
          'The strongest assessment language connects claims to observable work behaviour rather than abstract labels.',
        body: 'A work-relevant result should be easy to test against experience. Does this person usually create structure before acting? Do they move quickly when stakes rise? Do they challenge assumptions, protect relationships, or wait for more information? Behavioural language becomes stronger when it points to patterns that can be noticed and discussed.',
      },
      {
        id: 'context-matters',
        eyebrow: 'Context',
        title: 'Context changes the meaning',
        summary:
          'The same behaviour can be a strength or a limitation depending on the setting, role, pressure, and team around it.',
        body: 'Directness may help a team face reality, or it may close down quieter voices. Caution may protect quality, or it may slow momentum. Collaboration may create buy-in, or it may blur ownership. A behaviour-first assessment should not flatten those differences. It should help the reader ask where the pattern works, where it strains, and what context changes it.',
      },
      {
        id: 'avoid-fixed-labels',
        eyebrow: 'Care',
        title: 'Good reports leave room for range',
        summary:
          'Useful reports describe tendencies without turning them into permanent labels or narrow expectations.',
        body: 'People adapt. They learn, compensate, respond to different cultures, and behave differently under different kinds of pressure. A result should describe likely patterns without implying that someone can only operate in one way. The aim is to improve self-awareness and choice, not to reduce a person to a category.',
      },
      {
        id: 'how-sonartra-uses-it',
        eyebrow: 'Application',
        title: 'How to use the distinction',
        summary:
          'Read behavioural assessment output as a practical map for reflection, conversation, and adjustment.',
        body: 'The distinction matters because it shapes how the result is used. If the language becomes identity, the conversation narrows. If it stays behavioural, the conversation can become more useful: what pattern is showing up, what does it enable, what does it cost, and what would more range look like in this situation?',
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
      'A practical guide to leadership style as repeatable patterns in direction, judgement, influence, and pressure.',
    heroSummary:
      'Leadership style describes how someone tends to create direction, make decisions, work through others, and respond when responsibility becomes heavier.',
    publishedAt: '2026-05-03',
    updatedAt: '2026-05-03',
    readingTimeMinutes: 7,
    assessmentKey: 'wplp80',
    signalKeys: ['lead_direction', 'lead_judgement', 'lead_influence'],
    featured: true,
    featuredOrder: 30,
    sections: [
      {
        id: 'what-it-means',
        eyebrow: 'Meaning',
        title: 'What this means',
        summary:
          'Leadership style is not a title or a best-fit label; it is the pattern behind how someone carries influence and responsibility.',
        body: 'Some people lead by clarifying direction early. Others lead by asking better questions, creating trust, protecting standards, or drawing out the judgement of the group. Leadership style is the repeatable pattern behind those choices. It becomes visible when there is ambiguity, pressure, disagreement, or a need for shared commitment.',
      },
      {
        id: 'how-it-shows-up',
        eyebrow: 'Behaviour',
        title: 'How it shows up',
        summary:
          'Leadership style appears in what someone clarifies first, how they involve others, and how they act when the stakes rise.',
        body: 'A leader may move quickly to set direction, pause to gather evidence, create space for others, challenge weak thinking, or hold the team to a standard. These behaviours shape the tone of work around them. People often experience leadership style less through declared values and more through repeated moments of decision, attention, pressure, and repair.',
      },
      {
        id: 'no-best-style',
        eyebrow: 'Range',
        title: 'There is no single best style',
        summary:
          'The strongest leadership style depends on the work, the team, the moment, and what the situation needs.',
        body: 'A decisive style can be exactly right when clarity is missing. A facilitative style can be essential when expertise is distributed. A challenging style can protect quality, while a steady style can reduce unnecessary noise. The useful question is not which style is best. It is whether the leader can recognise what their pattern naturally gives and what the situation is asking for now.',
      },
      {
        id: 'blind-spots',
        eyebrow: 'Limit',
        title: 'Where strengths can become limitations',
        summary:
          'A leadership strength can create a blind spot when it is overused or applied in the wrong setting.',
        body: 'Direction can become control. Inclusion can become delay. Challenge can become pressure without enough care. Calm can become avoidance of necessary urgency. A mature reading of leadership style holds both sides at once: the value of the pattern and the cost when it becomes the only move available.',
      },
      {
        id: 'use-it-well',
        eyebrow: 'Practice',
        title: 'How to use it well',
        summary:
          'Use leadership style language to expand range, not to chase a perfect profile.',
        body: 'A useful leadership assessment should help someone notice the conditions where their style works well and the moments where another response may be needed. Start with one recurring leadership situation: a decision, a conflict, a delegation moment, or a pressure point. Then ask what your default pattern does for the group and what a more deliberate choice might improve.',
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
      'A behaviourally grounded explainer on how people organise effort, attention, pace, collaboration, and execution.',
    heroSummary:
      'Work style describes how someone tends to organise effort, manage attention, make progress, use structure, and work with others day to day.',
    publishedAt: '2026-05-03',
    updatedAt: '2026-05-03',
    readingTimeMinutes: 7,
    assessmentKey: 'wplp80',
    signalKeys: ['style_structure', 'style_pace', 'culture_collaboration'],
    featured: true,
    featuredOrder: 40,
    sections: [
      {
        id: 'what-it-means',
        eyebrow: 'Meaning',
        title: 'What this means',
        summary:
          'Work style is the pattern behind how someone turns attention, energy, and structure into progress.',
        body: 'Work style is not simply whether someone is organised, creative, fast, or collaborative. It is the way those tendencies combine in real work. It includes how a person starts, plans, focuses, communicates, changes direction, handles interruption, and decides when something is ready to move forward.',
      },
      {
        id: 'how-it-shows-up',
        eyebrow: 'Behaviour',
        title: 'How it shows up',
        summary:
          'Work style becomes visible in planning habits, communication rhythms, decision pace, and the conditions that make progress easier.',
        body: 'Some people need a clear plan before momentum builds. Others find clarity by moving, testing, and adapting. Some work best with deep quiet; others think better through visible collaboration. These differences affect meetings, deadlines, handovers, feedback, and the way a team experiences reliability.',
      },
      {
        id: 'why-it-matters',
        eyebrow: 'Use',
        title: 'Why it matters for individuals and managers',
        summary:
          'Understanding work style helps people create better conditions for focus, communication, and execution.',
        body: 'For individuals, work style language can explain why certain conditions create energy and others create friction. For managers, it can make support more specific: clearer priorities, better handover rhythms, different meeting structures, or more deliberate autonomy. The aim is not to make everyone work the same way. It is to make the conditions of work more intelligent.',
      },
      {
        id: 'blind-spots',
        eyebrow: 'Limit',
        title: 'Where work style can become a blind spot',
        summary:
          'A preferred way of working can become limiting when it is treated as the only effective way to make progress.',
        body: 'A person who values pace may miss the need for alignment. A person who values structure may struggle when a situation needs experimentation. A collaborative worker may blur ownership, while an independent worker may underuse the team. Work style becomes more useful when it is understood as a preference to manage, not a rule to impose.',
      },
      {
        id: 'use-it-well',
        eyebrow: 'Practice',
        title: 'How to use it well',
        summary:
          'Use work style insight to adjust the working environment, not to excuse poor follow-through or force false fit.',
        body: 'A practical next step is to identify one condition that reliably improves your work and one condition that reliably undermines it. Then translate that into a clear working agreement: how you prepare, how you communicate progress, what kind of feedback helps, and where you may need to stretch beyond your default pattern.',
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
      'A practical guide to how people tend to respond to tension, disagreement, pressure, and repair at work.',
    heroSummary:
      'Conflict style describes what someone tends to do when tension rises: challenge, avoid, smooth, analyse, repair, or push for clarity.',
    publishedAt: '2026-05-03',
    updatedAt: '2026-05-03',
    readingTimeMinutes: 7,
    assessmentKey: 'wplp80',
    signalKeys: ['conflict_challenge', 'conflict_repair', 'stress_pressure'],
    sections: [
      {
        id: 'what-it-means',
        eyebrow: 'Meaning',
        title: 'What this means',
        summary:
          'Conflict style is the pattern behind how someone responds when needs, views, standards, or pressures compete.',
        body: 'Conflict is not only open disagreement. It can appear as hesitation, silence, over-explaining, sharp challenge, quick compromise, or a push to settle the issue. A conflict style describes the response someone tends to use when there is tension, risk, uncertainty, or competing expectations.',
      },
      {
        id: 'conflict-is-data',
        eyebrow: 'Reframe',
        title: 'Conflict is not automatically negative',
        summary:
          'Handled well, conflict can reveal unclear expectations, competing priorities, and work that needs better alignment.',
        body: 'A team without visible disagreement is not necessarily healthy. Sometimes tension shows that people care about quality, speed, fairness, risk, or ownership. The question is not whether conflict appears. It is whether people can work with it directly enough to learn from it and carefully enough to preserve trust.',
      },
      {
        id: 'different-routes',
        eyebrow: 'Patterns',
        title: 'Different routes can all be useful',
        summary:
          'Avoidance, directness, accommodation, analysis, and repair can each help or hinder depending on the situation.',
        body: 'Avoidance can create space when emotions are high, but it can also let important issues drift. Directness can create clarity, but it can also overwhelm. Accommodation can protect a relationship, but it may hide a real disagreement. Analysis can slow the heat, but it may delay a needed conversation. Each route has value when used deliberately.',
      },
      {
        id: 'blind-spots',
        eyebrow: 'Limit',
        title: 'Where conflict style becomes a blind spot',
        summary:
          'The default response can become limiting when it protects comfort more than it serves the work.',
        body: 'Under pressure, people often return to their most familiar pattern. That pattern may reduce immediate discomfort while creating a longer-term cost. A person may keep the peace but leave standards unclear, challenge quickly but miss the relational impact, or analyse carefully while the team needs a decision. The blind spot is usually the cost of overusing the default.',
      },
      {
        id: 'use-it-well',
        eyebrow: 'Practice',
        title: 'How to use it well',
        summary:
          'Use conflict style language to choose a response more deliberately before, during, and after tension.',
        body: 'A useful assessment can help someone notice their first move under tension and choose whether that move fits the moment. Before a difficult conversation, ask what you are likely to protect: speed, harmony, accuracy, control, or fairness. Afterwards, ask what needs repair, clarification, or follow-through. Conflict style becomes useful when it improves the next conversation.',
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
      'A calm guide to flow state, deep focus, creative momentum, physical engagement, social energy, and the conditions that support high-quality work.',
    heroSummary:
      'Flow state is absorbed, high-quality engagement where challenge, clarity, skill, energy, and feedback line up enough for sustained progress.',
    publishedAt: '2026-05-03',
    updatedAt: '2026-05-03',
    readingTimeMinutes: 7,
    assessmentKey: null,
    signalKeys: ['style_focus', 'mot_energy'],
    featured: true,
    featuredOrder: 50,
    sections: [
      {
        id: 'what-it-means',
        eyebrow: 'Meaning',
        title: 'What this means',
        summary:
          'Flow is a state of absorbed engagement, not simply being busy, productive, or cut off from interruption.',
        body: 'Flow tends to appear when the work is challenging enough to matter, clear enough to pursue, and matched closely enough to skill that progress feels possible. It can feel quiet and focused, expressive and creative, physically engaged, or socially energised. The shared feature is a high-quality attention that carries the work forward.',
      },
      {
        id: 'routes-into-flow',
        eyebrow: 'Patterns',
        title: 'Different people reach flow differently',
        summary:
          'Some people enter flow through deep focus, some through creative movement, some through physical rhythm, and some through social exchange.',
        body: 'One person may need silence, time, and a demanding problem. Another may need visible progress, shared energy, or the chance to build ideas aloud. Some forms of flow are cognitive, some creative, some physical, and some social. These routes may become useful future Sonartra signal language when they can be defined carefully and linked to observable behaviour.',
      },
      {
        id: 'conditions',
        eyebrow: 'Conditions',
        title: 'Flow depends on conditions',
        summary:
          'Flow becomes more likely when challenge, clarity, feedback, energy, and freedom from avoidable interruption are in balance.',
        body: 'The same person can move in and out of flow depending on the environment around the work. Unclear priorities, constant switching, unresolved tension, or too little challenge can break the conditions. So can too much pressure, not enough feedback, or a task that does not connect to skill. Flow is partly personal pattern and partly designed condition.',
      },
      {
        id: 'blind-spots',
        eyebrow: 'Limit',
        title: 'Where flow can become a blind spot',
        summary:
          'Flow is valuable, but chasing it can obscure coordination, recovery, handover, and the work that still needs deliberate structure.',
        body: 'A person in strong flow may resist interruption even when alignment is needed. They may overvalue the work that gives them energy and avoid the tasks that require slower coordination. Flow can also make effort feel self-sustaining until recovery is neglected. The point is not to stay in flow constantly, but to understand when it helps and what else the work requires.',
      },
      {
        id: 'use-it-well',
        eyebrow: 'Practice',
        title: 'How to use it well',
        summary:
          'Use flow insight to identify the conditions that support sustained attention and the signals that show when those conditions are missing.',
        body: 'Start by noticing the last time work felt absorbed and high quality. What kind of task was it? What level of challenge? What feedback? What interruptions were absent? Then notice the opposite: what reliably breaks your attention or drains momentum. Flow becomes practical when it helps you shape better working conditions without making every task depend on ideal conditions.',
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
      'A practical guide to using assessment results as mirrors for reflection, conversation, and action rather than fixed identity labels.',
    heroSummary:
      'A useful assessment report should help you notice patterns, test them against real examples, and choose better next steps without treating one result as permanent identity.',
    publishedAt: '2026-05-03',
    updatedAt: '2026-05-03',
    readingTimeMinutes: 8,
    assessmentKey: 'wplp80',
    featured: true,
    featuredOrder: 60,
    sections: [
      {
        id: 'mirror-not-box',
        eyebrow: 'Principle',
        title: 'Treat the report as a mirror, not a box',
        summary:
          'An assessment report should reflect patterns you can examine, not define the limits of who you are.',
        body: 'A good report can make familiar behaviour easier to see. It may name a pattern in how you decide, relate, focus, lead, or respond under pressure. That does not make the pattern permanent or complete. The best reading stance is curious and grounded: this may be showing me something useful, and I still need to test it against life and work.',
      },
      {
        id: 'look-for-patterns',
        eyebrow: 'Reading',
        title: 'Look for patterns, not isolated phrases',
        summary:
          'One sentence should not carry the whole interpretation; look for repeated themes across the result.',
        body: 'A report can contain language that feels immediately accurate, partly accurate, or uncomfortable. Before accepting or rejecting it, look across the whole result. What repeats? What connects? What appears in more than one setting? Pattern-based reading prevents one strong phrase from becoming a label and helps you separate useful signal from overreach.',
      },
      {
        id: 'test-in-context',
        eyebrow: 'Evidence',
        title: 'Test the result against real situations',
        summary:
          'The result becomes more useful when it is checked against specific examples rather than general agreement.',
        body: 'Choose two or three recent situations: a decision, a tense conversation, a project that gained momentum, or a moment where work stalled. Ask where the report fits those examples and where it does not. Context matters. You may behave differently with different people, under different pressure, or when the work asks for a different kind of attention.',
      },
      {
        id: 'ask-where-it-overreaches',
        eyebrow: 'Care',
        title: 'Ask where the language overreaches',
        summary:
          'Every assessment has limits, so part of using a report well is noticing where it is too broad, too narrow, or missing context.',
        body: 'A report can be directionally useful and still incomplete. It may understate a skill you have developed, overstate a pattern that only appears under pressure, or miss the conditions that shape your behaviour. Instead of forcing the result to fit, mark the edges. The edges are often where the best reflection happens.',
      },
      {
        id: 'use-in-conversation',
        eyebrow: 'Conversation',
        title: 'Use it as a prompt for better conversations',
        summary:
          'Assessment language is strongest when it helps people talk more clearly about work, not when it becomes private self-labelling.',
        body: 'A report can help you explain what supports your best work, what you may overuse, and what kind of feedback or structure helps. It can also help a manager or teammate ask better questions. Keep the language provisional: this is a pattern I am noticing, here is where it helps, here is where I am testing it, and here is what I want to practise next.',
      },
      {
        id: 'choose-one-next-step',
        eyebrow: 'Action',
        title: 'Choose one practical next step',
        summary:
          'The most useful interpretation leads to one behaviour, working agreement, or conversation you can actually try.',
        body: 'Do not try to act on the whole report at once. Choose one pattern that matters now and one small experiment. That might mean pausing before a decision, asking for earlier feedback, naming tension sooner, creating clearer handovers, or protecting focus differently. The result becomes meaningful when it supports a better choice in a real situation.',
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
