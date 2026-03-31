import fs from 'node:fs';
import path from 'node:path';

const INPUT_PATH = path.resolve('data/imports/Sonartra_Weights.csv');
const OUTPUT_TXT_PATH = path.resolve('data/imports/sonartra_production_weight_import.txt');
const OUTPUT_CSV_PATH = path.resolve('data/imports/sonartra_production_weight_import.csv');
const REVIEW_CSV_PATH = path.resolve('data/imports/sonartra_weight_review.csv');
const SUMMARY_MD_PATH = path.resolve('data/imports/sonartra_weight_summary.md');

const REQUIRED_SOURCE_COLUMNS = [
  'Question',
  'Answer',
  'Question Text',
  'Response',
  'Domain',
] as const;

const VALID_OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;
const VALID_DOMAINS = [
  'Operating Style',
  'Core Drivers',
  'Leadership Approach',
  'Tension Response',
  'Environment Fit',
  'Pressure Response',
] as const;

type OptionLabel = (typeof VALID_OPTION_LABELS)[number];
type DomainName = (typeof VALID_DOMAINS)[number];
type SignalKey =
  | 'driver'
  | 'influencer'
  | 'implementer'
  | 'analyst'
  | 'achievement'
  | 'influence'
  | 'stability'
  | 'mastery'
  | 'results'
  | 'vision'
  | 'people'
  | 'process'
  | 'compete'
  | 'collaborate'
  | 'compromise'
  | 'avoidance'
  | 'competitive'
  | 'creative'
  | 'collaborative'
  | 'structured'
  | 'control'
  | 'scatter'
  | 'withdrawal'
  | 'critical';

type SourceRow = {
  sourceIndex: number;
  questionNumber: number;
  optionLabel: OptionLabel;
  questionText: string;
  responseText: string;
  domain: DomainName;
};

type ValidationIssue = {
  rowNumber: number;
  code:
    | 'MISSING_REQUIRED_COLUMN'
    | 'INVALID_QUESTION_NUMBER'
    | 'INVALID_OPTION_LABEL'
    | 'INVALID_DOMAIN'
    | 'BLANK_QUESTION_TEXT'
    | 'BLANK_RESPONSE_TEXT';
  message: string;
};

type KeywordRule = {
  signal: SignalKey;
  strong: readonly string[];
  soft?: readonly string[];
  stems?: readonly string[];
};

type DomainConfig = {
  signals: readonly SignalKey[];
  rules: readonly KeywordRule[];
  lowConfidenceFallback: SignalKey;
};

type SignalScore = {
  signal: SignalKey;
  score: number;
  strongMatches: string[];
  softMatches: string[];
};

type DerivedWeightSet = {
  primarySignal: SignalKey;
  secondarySignal: SignalKey | null;
  needsReview: boolean;
  notes: string;
  scores: readonly SignalScore[];
};

type ReviewRow = {
  questionNumber: number;
  optionLabel: OptionLabel;
  domain: DomainName;
  questionText: string;
  responseText: string;
  primarySignal: SignalKey;
  secondarySignal: SignalKey | '';
  needsReview: boolean;
  notes: string;
};

type OutputWeightRow = {
  questionNumber: number;
  optionLabel: OptionLabel;
  signalKey: SignalKey;
  weight: number;
};

const OPERATING_STYLE_RULES: readonly KeywordRule[] = [
  {
    signal: 'driver',
    strong: [
      'start quickly',
      'keep urgency high',
      'pivot quickly',
      'lose momentum',
      'measured and careful with words',
      'thoughtful measured and careful with words',
      'a chance worth taking if upside is strong',
      'quick calls with limited delay',
      'move fast to keep options open',
      'pattern recognition and lived judgement',
      'high uncertainty with big upside potential',
      'high-stakes work',
      'pick a direction',
      'prioritise speed',
      'improve quickly',
      'quick judgement',
      'set direction',
      'direct and concise',
      'take charge',
      'move forward',
      'keep moving',
      'visible outcomes',
    ],
    soft: ['quick', 'fast', 'urgent', 'direct', 'ownership', 'pace'],
    stems: ['quick', 'fast', 'urgent', 'direct', 'owner', 'pace', 'speed', 'decis', 'mov'],
  },
  {
    signal: 'influencer',
    strong: [
      'check with key people',
      'check who will be affected',
      'strong collaboration',
      'take it personally at first',
      'necessary if the mission is worth it',
      'shared calls with key people aligned',
      'build alignment so execution holds',
      'input from people i trust',
      'frequent change with room to adapt',
      'check with others',
      'support others',
      'draw quieter voices in',
      'persuasive and expressive',
      'social energy',
      'engaging others',
      'build momentum',
    ],
    soft: ['people', 'others', 'voices', 'collaboration', 'persuasive', 'expressive'],
    stems: ['people', 'other', 'voice', 'collabor', 'persua', 'express', 'social', 'engag', 'energ'],
  },
  {
    signal: 'implementer',
    strong: [
      'plan the full approach',
      'steady, reliable pace',
      'work with clear structure',
      'pace shifts with the environment',
      'fine when exposure is understood and managed',
      'low-risk calls with predictable outcomes',
      'with a stable team and clear norms',
      'protect stability and avoid major disruption',
      'what keeps the system stable',
      'moderate uncertainty with clear guardrails',
      'hold the line',
      'balance detail with delivery speed',
      'turn it into a better plan',
      'mix instinct, input, and available facts',
      'patient and empathetic',
      'reliable pace',
      'follow-through',
    ],
    soft: ['steady', 'reliable', 'structure', 'stabilise', 'balance', 'patient'],
    stems: ['steady', 'reli', 'struct', 'stabil', 'balanc', 'patient', 'plan', 'practic', 'follow'],
  },
  {
    signal: 'analyst',
    strong: [
      'wait until direction is fully clear',
      'work calmly and think things through',
      'pause to rework the plan',
      'thoughtful measured',
      'a threat unless controls are in place',
      'evidence-led calls with clear assumptions tested',
      'with people who challenge my thinking',
      'compare scenarios before committing resources',
      'data quality and decision evidence',
      'low uncertainty with strong structure',
      'technical work that needs deep analysis',
      'gather more information',
      'go deep on details early',
      'need clear evidence',
      'slow down to avoid costly mistakes',
      'evidence, patterns, and hard data',
      'challenging assumptions',
      'deep analysis',
    ],
    soft: ['analysis', 'evidence', 'data', 'details', 'reasoning', 'precision', 'caution'],
    stems: ['analys', 'evid', 'data', 'detail', 'reason', 'precis', 'caut', 'fact', 'inform', 'mistak'],
  },
];

const CORE_DRIVERS_RULES: readonly KeywordRule[] = [
  {
    signal: 'achievement',
    strong: [
      'hitting clear targets',
      'seeing results',
      'work led to results',
      'stretch goals and clear stakes',
      'compete hard and track where i stand',
      'goals achieved and outcomes delivered',
      'work where winning is clearly visible',
      'meaningful responsibility and trust',
      'creating momentum when progress stalls',
      'results delivered against clear goals',
      'progress',
      'winning',
      'ambition',
      'stretch goals',
      'advancing quickly',
      'high standards',
      'outperform',
    ],
    soft: ['results', 'targets', 'progress', 'win', 'ambition', 'achievement'],
    stems: ['result', 'target', 'progress', 'win', 'ambit', 'achiev', 'perform', 'advanc', 'outcome'],
  },
  {
    signal: 'influence',
    strong: [
      'shaping decisions',
      'others follow',
      'raises my visibility',
      'expands my influence network',
      'build new things and bring others in',
      'positive impact on people and business',
      'work where i can energise others',
      'my input is ignored repeatedly',
      'asked for input on important calls',
      'reach and influence across the business',
      'building engagement that lifts team effort',
      'influence created across key stakeholders',
      'bigger opportunities',
      'recognition',
      'impact',
      'persuasion',
      'be noticed',
      'visible influence',
    ],
    soft: ['visibility', 'influence', 'impact', 'persuade', 'recognition'],
    stems: ['visib', 'influ', 'impact', 'persua', 'recogn', 'notic', 'opportun'],
  },
  {
    signal: 'stability',
    strong: [
      'security and a predictable base',
      'reinforces trust',
      'long-term security',
      'protect what works and reduce risk',
      'healthy relationships and low friction',
      'work where i can support the team',
      'conflict stays unresolved and keeps spreading',
      'included in conversations that affect me',
      'belonging and mutual trust',
      'delivering reliably under pressure',
      'relationships maintained under pressure',
      'people around me',
      'steady ground',
      'security',
      'predictable',
      'reliable environment',
      'harmony',
      'dependable',
    ],
    soft: ['security', 'predictable', 'trust', 'stable', 'steady', 'harmony'],
    stems: ['secure', 'predict', 'trust', 'stabl', 'steady', 'harmon', 'depend', 'reliab'],
  },
  {
    signal: 'mastery',
    strong: [
      'getting better at something difficult',
      'expertise is respected',
      'builds deep specialist skills',
      'improve systems until they run better',
      'high standards met without shortcuts',
      'work where i can solve complex problems',
      'standards drop and nobody addresses it',
      'recognised for depth of expertise',
      'mastery and strong capability growth',
      'bringing precision to important decisions',
      'quality of thinking behind decisions',
      'expertise',
      'learning',
      'quality',
      'craft',
      'understanding deeply',
      'improve capability',
      'mastery',
    ],
    soft: ['expertise', 'better', 'difficult', 'learning', 'quality', 'depth'],
    stems: ['expert', 'better', 'difficult', 'learn', 'qualit', 'depth', 'craft', 'master'],
  },
];

const LEADERSHIP_APPROACH_RULES: readonly KeywordRule[] = [
  {
    signal: 'results',
    strong: [
      'ambitious targets',
      'clear ownership',
      'takes charge',
      'set direction and make key calls',
      'address the issue directly with them',
      'set direction and deliver measurable results',
      'set clear consequences and raise expectations',
      'setting direction and making decisions',
      'authority should be used decisively when needed',
      'in a crisis that needs fast calls',
      'expectations are explicit and hard to ignore',
      'progress is measured with clear metrics',
      'clear momentum and disciplined execution',
      'when clear performance lift is needed',
      'avoiding decisions when clarity is needed',
      'delivery',
      'outcomes',
      'accountability',
      'keep people focused on the objective',
      'performance and delivery',
    ],
    soft: ['targets', 'ownership', 'outcomes', 'delivery', 'accountability', 'results'],
    stems: ['target', 'owner', 'outcome', 'deliver', 'account', 'result', 'perform', 'execut'],
  },
  {
    signal: 'vision',
    strong: [
      'clear, compelling direction',
      'build energy and commitment around the work',
      'connect people and keep momentum up',
      'encourage them and reset expectations together',
      'create belief people want to follow',
      'reconnect effort to purpose and momentum',
      'creating energy and visible momentum',
      'authority should be earned through trust',
      'in growth phases that need energy',
      'people own outcomes because purpose is clear',
      'shared energy and belief in the mission',
      'the original vision gets diluted over time',
      'when people need confidence and direction',
      'making it about ego over outcomes',
      'future direction',
      'possibility',
      'innovation',
      'big picture',
      'build energy and commitment',
      'new direction',
      'inspire around a direction',
    ],
    soft: ['direction', 'future', 'innovation', 'possibility', 'big picture', 'vision'],
    stems: ['direct', 'future', 'innov', 'possib', 'vision', 'inspir', 'idea', 'energy'],
  },
  {
    signal: 'people',
    strong: [
      'everyone is heard and included',
      'develops people with consistency',
      'make sure everyone is heard and included',
      'keep the team stable and coordinated',
      'offer support privately before escalating',
      'grow people so the team gets stronger',
      'coach directly and remove blockers',
      'supporting people through pressure',
      'authority should be shared where possible',
      'in steady periods that need consistency',
      'accountability is fair and applied evenly',
      'trust, cohesion, and mutual support',
      'culture fractures across teams and layers',
      'when the team needs steadiness and trust',
      'losing touch with team reality',
      'support',
      'morale',
      'development',
      'relationships',
      'coaching',
      'heard and included',
      'bring people with you',
    ],
    soft: ['people', 'included', 'development', 'relationships', 'support', 'morale'],
    stems: ['people', 'includ', 'develop', 'relationship', 'support', 'moral', 'coach', 'team'],
  },
  {
    signal: 'process',
    strong: [
      'solid system with clear standards',
      'clarity and sound judgement',
      'go deep as the subject specialist',
      'check whether process gaps caused the drop',
      'build systems that scale reliably',
      'fix process issues driving the problem',
      'bringing expertise to hard problems',
      'authority should be clear in the structure',
      'in complex situations needing careful judgement',
      'high standards and technical precision',
      'core systems fail under added scale',
      'when problems require deep expert judgement',
      'repeated poor judgement on key calls',
      'systems',
      'structure',
      'consistency',
      'governance',
      'process discipline',
      'clear standards',
      'bring clarity',
    ],
    soft: ['system', 'standards', 'structure', 'consistency', 'governance', 'process'],
    stems: ['system', 'standard', 'struct', 'consist', 'govern', 'process', 'clarit', 'judg'],
  },
];

const TENSION_RESPONSE_RULES: readonly KeywordRule[] = [
  {
    signal: 'compete',
    strong: [
      'ask directly',
      'ask directly why i was excluded',
      'push for my view',
      'push for my position and try to win',
      'i reacted before i had the full picture',
      'i voiced frustration immediately and strongly',
      'hold my ground and respond directly',
      'the issue did not justify a fight',
      'stayed direct even when it was uncomfortable',
      'defended my view and argued my case',
      'stated my decision and expected alignment',
      'said the hard thing clearly and early',
      'make my case strongly',
      'push back',
      'assert',
      'confront',
      'win the argument',
      'stand my ground',
    ],
    soft: ['directly', 'push', 'assert', 'confront', 'win', 'ground'],
    stems: ['direct', 'push', 'assert', 'confront', 'win', 'ground', 'firm'],
  },
  {
    signal: 'collaborate',
    strong: [
      're-enter quickly through discussion',
      're-enter quickly and rebuild alignment',
      'lower the temperature before discussing details',
      'framed the message to gain buy-in',
      'tried to understand their perspective first',
      'reframed it to build broader support',
      'talked it through with too many people',
      'worked to win them over to my view',
      'explored their concerns before deciding next',
      'framed it to keep them engaged',
      'work together',
      'discuss openly',
      'align',
      'talk it through',
      'solve it together',
      'shared solution',
    ],
    soft: ['discussion', 'together', 'align', 'shared', 'talk', 'collaborate'],
    stems: ['discuss', 'together', 'align', 'share', 'talk', 'collabor', 're enter'],
  },
  {
    signal: 'compromise',
    strong: [
      'look for middle ground',
      'look for middle ground we can both accept',
      'preserving the relationship mattered more',
      'lowered tension so we could keep talking',
      'closely with others through active collaboration',
      'protected the relationship while raising the issue',
      'ease tension',
      'accommodate',
      'meet halfway',
      'practical compromise',
      'find a workable middle ground',
    ],
    soft: ['middle ground', 'halfway', 'workable', 'ease tension', 'compromise'],
    stems: ['middle', 'halfway', 'workabl', 'comprom', 'accommod'],
  },
  {
    signal: 'avoidance',
    strong: [
      'step back',
      'step back and observe',
      'step back and wait for a better moment',
      'review what happened before responding',
      'step back to avoid making it worse',
      'slow down and clarify what is factual',
      'i worried it would become personal',
      'the argument was too weak to pursue',
      'kept to facts and separated emotion',
      'i avoid it and hope it passes',
      'i kept it to myself and stewed',
      'i stayed polite but became emotionally distant',
      'i overthink and respond too late',
      'tested their reasoning before responding',
      'compared assumptions and logic together',
      'kept to facts and avoided exaggeration',
      'delay',
      'disengage',
      'sidestep',
      'avoid hard conversations',
      'wait for things to cool down',
    ],
    soft: ['step back', 'delay', 'avoid', 'withdraw', 'cool down', 'sidestep'],
    stems: ['step', 'delay', 'avoid', 'withdraw', 'cool', 'sidestep', 'retreat', 'back'],
  },
];

const ENVIRONMENT_FIT_RULES: readonly KeywordRule[] = [
  {
    signal: 'competitive',
    strong: [
      'clear authority and ownership boundaries',
      'flat energy and low personal ownership',
      'mostly independently with clear ownership',
      'endless delays and no clear decisions',
      'pace',
      'challenge',
      'edge',
      'performance',
      'clear wins',
      'stretch environment',
    ],
    soft: ['authority', 'ownership', 'challenge', 'performance', 'decisions', 'competitive'],
    stems: ['author', 'owner', 'challeng', 'perform', 'decis', 'compet', 'pace', 'stretch'],
  },
  {
    signal: 'creative',
    strong: [
      'room to influence people and decisions',
      'build new things',
      'with people who challenge my thinking',
      'novelty',
      'experimentation',
      'freedom',
      'new ideas',
      'space to explore',
      'creative freedom',
      'shape things',
    ],
    soft: ['influence', 'ideas', 'freedom', 'explore', 'creative', 'novelty'],
    stems: ['influ', 'idea', 'freedom', 'explor', 'creativ', 'novel', 'experi', 'shape'],
  },
  {
    signal: 'collaborative',
    strong: [
      'stable routines and dependable expectations',
      'tension that turns personal or hostile',
      'low friction',
      'closely with others through active collaboration',
      'teamwork',
      'inclusion',
      'connection',
      'support',
      'sense of belonging',
      'healthy relationships',
    ],
    soft: ['team', 'inclusion', 'connection', 'support', 'relationships', 'collaborative'],
    stems: ['team', 'inclus', 'connect', 'support', 'relationship', 'collabor', 'belong', 'hostil'],
  },
  {
    signal: 'structured',
    strong: [
      'space for deep thinking and analysis',
      'decisions made without sound reasoning',
      'deep thinking',
      'with a stable team and clear norms',
      'order',
      'routine',
      'clarity',
      'predictability',
      'well-defined processes',
      'clear expectations',
    ],
    soft: ['analysis', 'reasoning', 'order', 'routine', 'clarity', 'predictability'],
    stems: ['analys', 'reason', 'order', 'routine', 'clarit', 'predict', 'process', 'defin'],
  },
];

const PRESSURE_RESPONSE_RULES: readonly KeywordRule[] = [
  {
    signal: 'control',
    strong: [
      'raise intensity and push harder',
      'become controlling',
      'raise intensity and push',
      'i took over tasks instead of delegating',
      'more intense and harder to approach',
      'i rush people when progress feels slow',
      'go on the offensive and push back hard',
      'justify myself and protect my position',
      'tighten grip',
      'direct more closely',
      'contain the situation',
      'take over',
    ],
    soft: ['controlling', 'control', 'direct', 'contain', 'intensity', 'tighten'],
    stems: ['control', 'direct', 'contain', 'intens', 'tight', 'push', 'oversee'],
  },
  {
    signal: 'scatter',
    strong: [
      'keep people motivated and moving',
      'show my frustration',
      'jump between issues',
      'i talked it through with too many people',
      'more reactive and emotionally visible',
      'i assume things will work out too easily',
      'distraction',
      'overextension',
      'jumping around',
      'lose focus',
      'too many threads',
    ],
    soft: ['jump', 'distraction', 'overextend', 'moving', 'threads', 'scatter'],
    stems: ['jump', 'distract', 'overextend', 'moving', 'thread', 'scatter', 'switch'],
  },
  {
    signal: 'withdrawal',
    strong: [
      'protect morale so pressure stays manageable',
      'protect morale',
      'avoid hard conversations',
      'i pulled back and reduced communication',
      'quieter and slower to engage',
      'i sidestep tension instead of addressing it',
      'shut down and struggle to respond',
      'pull back',
      'detach',
      'retreat',
      'shut down',
      'go quiet',
      'step away',
    ],
    soft: ['pull back', 'detach', 'retreat', 'quiet', 'withdraw', 'manageable'],
    stems: ['pull', 'detach', 'retreat', 'quiet', 'withdraw', 'manag', 'avoid', 'away'],
  },
  {
    signal: 'critical',
    strong: [
      'slow down enough to avoid mistakes',
      'clarify what is factual',
      'overly critical',
      'i kept analysing instead of deciding',
      'detached and focused only on facts',
      'i chase perfect instead of good enough',
      'overanalyse every possible downside',
      'fault-finding',
      'sharp judgment',
      'over-analysis',
      'scrutinise everything',
      'point out flaws',
    ],
    soft: ['mistakes', 'critical', 'fault', 'judgment', 'analysis', 'flaws'],
    stems: ['mistak', 'critic', 'fault', 'judg', 'analys', 'flaw', 'scrutin'],
  },
];

const DOMAIN_CONFIG: Record<DomainName, DomainConfig> = {
  'Operating Style': {
    signals: ['driver', 'influencer', 'implementer', 'analyst'],
    rules: OPERATING_STYLE_RULES,
    lowConfidenceFallback: 'driver',
  },
  'Core Drivers': {
    signals: ['achievement', 'influence', 'stability', 'mastery'],
    rules: CORE_DRIVERS_RULES,
    lowConfidenceFallback: 'achievement',
  },
  'Leadership Approach': {
    signals: ['results', 'vision', 'people', 'process'],
    rules: LEADERSHIP_APPROACH_RULES,
    lowConfidenceFallback: 'results',
  },
  'Tension Response': {
    signals: ['compete', 'collaborate', 'compromise', 'avoidance'],
    rules: TENSION_RESPONSE_RULES,
    lowConfidenceFallback: 'compete',
  },
  'Environment Fit': {
    signals: ['competitive', 'creative', 'collaborative', 'structured'],
    rules: ENVIRONMENT_FIT_RULES,
    lowConfidenceFallback: 'competitive',
  },
  'Pressure Response': {
    signals: ['control', 'scatter', 'withdrawal', 'critical'],
    rules: PRESSURE_RESPONSE_RULES,
    lowConfidenceFallback: 'control',
  },
};

function fail(message: string): never {
  throw new Error(message);
}

function main(): void {
  const rawCsv = readRequiredFile(INPUT_PATH);
  const rows = parseCsv(rawCsv);
  if (rows.length === 0) {
    fail(`Input file is empty: ${INPUT_PATH}`);
  }

  const [headerRow, ...dataRows] = rows;
  const headerIndexes = mapRequiredColumns(headerRow);
  const { validRows, validationIssues } = validateSourceRows(dataRows, headerIndexes);

  const reviewRows: ReviewRow[] = [];
  const outputRows: OutputWeightRow[] = [];

  for (const row of validRows) {
    const weights = deriveWeights(row);
    reviewRows.push({
      questionNumber: row.questionNumber,
      optionLabel: row.optionLabel,
      domain: row.domain,
      questionText: row.questionText,
      responseText: row.responseText,
      primarySignal: weights.primarySignal,
      secondarySignal: weights.secondarySignal ?? '',
      needsReview: weights.needsReview,
      notes: weights.notes,
    });

    const signalWeights = new Map<SignalKey, number>();
    signalWeights.set(weights.primarySignal, 3);
    if (weights.secondarySignal) {
      signalWeights.set(weights.secondarySignal, 1);
    }

    for (const signalKey of DOMAIN_CONFIG[row.domain].signals) {
      outputRows.push({
        questionNumber: row.questionNumber,
        optionLabel: row.optionLabel,
        signalKey,
        weight: signalWeights.get(signalKey) ?? 0,
      });
    }
  }

  const duplicateSummary = buildDuplicateSummary(validRows);
  const summary = buildSummary(validRows, outputRows, reviewRows, validationIssues, duplicateSummary);

  writeTextFile(
    OUTPUT_TXT_PATH,
    outputRows.map((row) => `${row.questionNumber}|${row.optionLabel}|${row.signalKey}|${row.weight}`).join('\n'),
  );
  writeTextFile(
    OUTPUT_CSV_PATH,
    [
      'question_number,option_label,signal_key,weight',
      ...outputRows.map((row) =>
        [row.questionNumber, row.optionLabel, row.signalKey, row.weight].join(','),
      ),
    ].join('\n'),
  );
  writeTextFile(
    REVIEW_CSV_PATH,
    serializeCsv([
      [
        'question_number',
        'option_label',
        'domain',
        'question_text',
        'response_text',
        'primary_signal',
        'secondary_signal',
        'needs_review',
        'notes',
      ],
      ...reviewRows.map((row) => [
        String(row.questionNumber),
        row.optionLabel,
        row.domain,
        row.questionText,
        row.responseText,
        row.primarySignal,
        row.secondarySignal,
        row.needsReview ? 'true' : 'false',
        row.notes,
      ]),
    ]),
  );
  writeTextFile(SUMMARY_MD_PATH, summary);

  console.log('Sonartra production weight export complete');
  console.log(`Source rows processed: ${validRows.length}`);
  console.log(`Output rows generated: ${outputRows.length}`);
  console.log(`Rows flagged for review: ${reviewRows.filter((row) => row.needsReview).length}`);
  console.log(`Validation issues: ${validationIssues.length}`);
  console.log(`TXT output: ${OUTPUT_TXT_PATH}`);
  console.log(`CSV output: ${OUTPUT_CSV_PATH}`);
  console.log(`Review output: ${REVIEW_CSV_PATH}`);
  console.log(`Summary output: ${SUMMARY_MD_PATH}`);
}

function readRequiredFile(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    fail(`Input file not found: ${filePath}`);
  }

  return fs.readFileSync(filePath, 'utf8');
}

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = '';
  let insideQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index] ?? '';
    const nextCharacter = input[index + 1] ?? '';

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        currentValue += '"';
        index += 1;
        continue;
      }

      insideQuotes = !insideQuotes;
      continue;
    }

    if (character === ',' && !insideQuotes) {
      currentRow.push(currentValue);
      currentValue = '';
      continue;
    }

    if ((character === '\n' || character === '\r') && !insideQuotes) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1;
      }

      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = '';
      continue;
    }

    currentValue += character;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((value) => value.trim().length > 0));
}

function mapRequiredColumns(headerRow: string[] | undefined): Record<(typeof REQUIRED_SOURCE_COLUMNS)[number], number> {
  if (!headerRow) {
    fail('Input file does not contain a header row.');
  }

  const indexes = {} as Record<(typeof REQUIRED_SOURCE_COLUMNS)[number], number>;

  for (const requiredColumn of REQUIRED_SOURCE_COLUMNS) {
    const index = headerRow.findIndex((header) => header.trim() === requiredColumn);
    if (index === -1) {
      fail(`Missing required column "${requiredColumn}" in ${INPUT_PATH}.`);
    }
    indexes[requiredColumn] = index;
  }

  return indexes;
}

function validateSourceRows(
  dataRows: string[][],
  headerIndexes: Record<(typeof REQUIRED_SOURCE_COLUMNS)[number], number>,
): {
  validRows: SourceRow[];
  validationIssues: ValidationIssue[];
} {
  const validRows: SourceRow[] = [];
  const validationIssues: ValidationIssue[] = [];

  dataRows.forEach((rawRow, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const questionNumberRaw = getCell(rawRow, headerIndexes.Question);
    const optionLabelRaw = getCell(rawRow, headerIndexes.Answer);
    const questionText = normalizeText(getCell(rawRow, headerIndexes['Question Text']));
    const responseText = normalizeText(getCell(rawRow, headerIndexes.Response));
    const domainRaw = normalizeText(getCell(rawRow, headerIndexes.Domain));

    const questionNumber = parseQuestionNumber(questionNumberRaw);
    const optionLabel = normalizeOptionLabel(optionLabelRaw);
    const domain = normalizeDomain(domainRaw);

    if (questionNumber === null) {
      validationIssues.push({
        rowNumber,
        code: 'INVALID_QUESTION_NUMBER',
        message: `Row ${rowNumber}: question_number must be numeric. Received "${questionNumberRaw}".`,
      });
    }

    if (optionLabel === null) {
      validationIssues.push({
        rowNumber,
        code: 'INVALID_OPTION_LABEL',
        message: `Row ${rowNumber}: option_label must be one of A, B, C, or D. Received "${optionLabelRaw}".`,
      });
    }

    if (domain === null) {
      validationIssues.push({
        rowNumber,
        code: 'INVALID_DOMAIN',
        message: `Row ${rowNumber}: domain "${domainRaw}" is not valid.`,
      });
    }

    if (questionText.length === 0) {
      validationIssues.push({
        rowNumber,
        code: 'BLANK_QUESTION_TEXT',
        message: `Row ${rowNumber}: question_text is blank.`,
      });
    }

    if (responseText.length === 0) {
      validationIssues.push({
        rowNumber,
        code: 'BLANK_RESPONSE_TEXT',
        message: `Row ${rowNumber}: response_text is blank.`,
      });
    }

    if (
      questionNumber === null ||
      optionLabel === null ||
      domain === null ||
      questionText.length === 0 ||
      responseText.length === 0
    ) {
      return;
    }

    validRows.push({
      sourceIndex: validRows.length,
      questionNumber,
      optionLabel,
      questionText,
      responseText,
      domain,
    });
  });

  return { validRows, validationIssues };
}

function getCell(row: string[], index: number): string {
  return row[index] ?? '';
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function parseQuestionNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeOptionLabel(value: string): OptionLabel | null {
  const normalized = value.trim().toUpperCase();
  return VALID_OPTION_LABELS.includes(normalized as OptionLabel) ? (normalized as OptionLabel) : null;
}

function normalizeDomain(value: string): DomainName | null {
  const normalized = value.trim();
  return VALID_DOMAINS.includes(normalized as DomainName) ? (normalized as DomainName) : null;
}

function deriveWeights(row: SourceRow): DerivedWeightSet {
  const config = DOMAIN_CONFIG[row.domain];
  const normalizedResponse = normalizeForMatch(row.responseText);
  const responseTokens = tokenizeForMatch(row.responseText);
  const scores = config.signals.map((signal) =>
    scoreSignal(signal, config.rules, normalizedResponse, responseTokens),
  );
  const sortedScores = [...scores].sort(
    (left, right) =>
      right.score - left.score || config.signals.indexOf(left.signal) - config.signals.indexOf(right.signal),
  );

  const topScore = sortedScores[0]?.score ?? 0;
  const tiedTopSignals = sortedScores.filter((score) => score.score === topScore);
  const positiveSignals = sortedScores.filter((score) => score.score > 0);
  const primarySignal =
    topScore > 0 ? sortedScores[0].signal : config.lowConfidenceFallback;

  const secondaryCandidate = sortedScores.find(
    (score) => score.signal !== primarySignal && score.score >= 2 && topScore - score.score <= 3,
  );
  const secondarySignal = topScore > 0 ? secondaryCandidate?.signal ?? null : null;

  const reviewReasons: string[] = [];

  if (topScore === 0) {
    reviewReasons.push(`No direct keyword match. Defaulted to ${primarySignal}.`);
  }

  if (tiedTopSignals.length > 1 && topScore > 0) {
    reviewReasons.push(
      `Top score tie across ${tiedTopSignals.map((score) => score.signal).join(', ')}.`,
    );
  }

  if (positiveSignals.length >= 3) {
    reviewReasons.push('Three or more in-domain signals matched the wording.');
  }

  if (!secondarySignal && topScore > 0 && topScore <= 2) {
    reviewReasons.push('Primary assigned with limited evidence and no clear secondary signal.');
  }

  if (secondarySignal && (sortedScores.find((score) => score.signal === secondarySignal)?.score ?? 0) === topScore) {
    reviewReasons.push('Primary and secondary were both strongly plausible.');
  }

  const notes =
    reviewReasons.length > 0
      ? reviewReasons.join(' ')
      : buildConfidentNote(primarySignal, secondarySignal, sortedScores);

  return {
    primarySignal,
    secondarySignal,
    needsReview: reviewReasons.length > 0,
    notes,
    scores: sortedScores,
  };
}

function normalizeForMatch(value: string): string {
  return ` ${value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
}

function scoreSignal(
  signal: SignalKey,
  rules: readonly KeywordRule[],
  responseText: string,
  responseTokens: readonly string[],
): SignalScore {
  const rule = rules.find((entry) => entry.signal === signal);
  if (!rule) {
    return { signal, score: 0, strongMatches: [], softMatches: [] };
  }

  const strongMatches = collectPhraseMatches(rule.strong, responseText);
  const softMatches = [
    ...collectPhraseMatches(rule.soft ?? [], responseText),
    ...collectStemMatches(rule.stems ?? [], responseTokens),
  ];

  return {
    signal,
    score: strongMatches.length * 3 + softMatches.length,
    strongMatches,
    softMatches,
  };
}

function collectPhraseMatches(
  phrases: readonly string[],
  responseText: string,
): string[] {
  const matches: string[] = [];

  for (const phrase of phrases) {
    const normalizedPhrase = normalizeForMatch(phrase);
    if (responseText.includes(normalizedPhrase)) {
      matches.push(phrase);
    }
  }

  return matches;
}

function collectStemMatches(stems: readonly string[], responseTokens: readonly string[]): string[] {
  const matches: string[] = [];

  for (const stem of stems) {
    if (responseTokens.some((token) => token.startsWith(stem))) {
      matches.push(stem);
    }
  }

  return matches;
}

function tokenizeForMatch(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

function buildConfidentNote(
  primarySignal: SignalKey,
  secondarySignal: SignalKey | null,
  scores: readonly SignalScore[],
): string {
  const primaryScore = scores.find((score) => score.signal === primarySignal);
  const evidence = [
    ...(primaryScore?.strongMatches ?? []),
    ...(primaryScore?.softMatches ?? []),
  ].slice(0, 3);

  const evidenceText = evidence.length > 0 ? ` via ${evidence.join('; ')}` : '';
  if (secondarySignal) {
    return `Primary ${primarySignal}, secondary ${secondarySignal}${evidenceText}.`;
  }

  return `Primary ${primarySignal}${evidenceText}.`;
}

function buildDuplicateSummary(validRows: readonly SourceRow[]): {
  duplicateQuestionOptionGroups: string[];
  exactDuplicateRows: string[];
} {
  const byQuestionOption = new Map<string, number>();
  const byExactRow = new Map<string, number>();

  for (const row of validRows) {
    const groupKey = `${row.questionNumber}|${row.optionLabel}`;
    const exactKey = `${groupKey}|${row.domain}|${row.questionText}|${row.responseText}`;
    byQuestionOption.set(groupKey, (byQuestionOption.get(groupKey) ?? 0) + 1);
    byExactRow.set(exactKey, (byExactRow.get(exactKey) ?? 0) + 1);
  }

  return {
    duplicateQuestionOptionGroups: [...byQuestionOption.entries()]
      .filter(([, count]) => count > 1)
      .map(([key, count]) => `${key} (${count})`)
      .sort((left, right) => left.localeCompare(right)),
    exactDuplicateRows: [...byExactRow.entries()]
      .filter(([, count]) => count > 1)
      .map(([key, count]) => `${key} (${count})`)
      .sort((left, right) => left.localeCompare(right)),
  };
}

function buildSummary(
  validRows: readonly SourceRow[],
  outputRows: readonly OutputWeightRow[],
  reviewRows: readonly ReviewRow[],
  validationIssues: readonly ValidationIssue[],
  duplicateSummary: {
    duplicateQuestionOptionGroups: string[];
    exactDuplicateRows: string[];
  },
): string {
  const rowsFlaggedForReview = reviewRows.filter((row) => row.needsReview).length;
  const domainBreakdown = VALID_DOMAINS.map((domain) => {
    const count = validRows.filter((row) => row.domain === domain).length;
    return `- ${domain}: ${count}`;
  }).join('\n');

  const primarySignalCounts = reviewRows.reduce<Record<string, number>>((counts, row) => {
    counts[row.primarySignal] = (counts[row.primarySignal] ?? 0) + 1;
    return counts;
  }, {});

  const primarySignalBreakdown = Object.entries(primarySignalCounts)
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([signal, count]) => `- ${signal}: ${count}`)
    .join('\n');

  const validationIssueLines =
    validationIssues.length === 0
      ? '- None'
      : validationIssues.map((issue) => `- ${issue.message}`).join('\n');

  const duplicateLines = [
    `- Duplicate question|option groups: ${
      duplicateSummary.duplicateQuestionOptionGroups.length === 0
        ? 'none'
        : duplicateSummary.duplicateQuestionOptionGroups.join(', ')
    }`,
    `- Exact duplicate rows: ${
      duplicateSummary.exactDuplicateRows.length === 0
        ? 'none'
        : duplicateSummary.exactDuplicateRows.join(', ')
    }`,
  ].join('\n');

  return [
    '# Sonartra Production Weight Summary',
    '',
    `- Total source rows processed: ${validRows.length}`,
    `- Total output rows generated: ${outputRows.length}`,
    `- Rows flagged for review: ${rowsFlaggedForReview}`,
    '',
    '## Breakdown By Domain',
    domainBreakdown,
    '',
    '## Count By Primary Signal',
    primarySignalBreakdown || '- None',
    '',
    '## Duplicate Row Summary',
    duplicateLines,
    '',
    '## Validation Issues',
    validationIssueLines,
  ].join('\n');
}

function serializeCsv(rows: readonly (readonly string[])[]): string {
  return rows
    .map((row) =>
      row
        .map((value) => {
          if (/[",\n]/.test(value)) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(','),
    )
    .join('\n');
}

function writeTextFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

try {
  main();
} catch (error) {
  console.error(`Sonartra production weight export failed: ${(error as Error).message}`);
  process.exit(1);
}
