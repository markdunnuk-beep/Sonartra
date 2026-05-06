import { pathToFileURL } from 'node:url';

export type PatternListOptions = {
  readonly signals: readonly string[];
  readonly primary?: string;
};

export function parseSignalList(value: string | undefined): string[] {
  if (!value) {
    throw new Error('Missing required --signals value.');
  }

  return value
    .split(',')
    .map((signal) => signal.trim())
    .filter(Boolean);
}

export function validateSignals(signals: readonly string[]): void {
  if (signals.length !== 4) {
    throw new Error(`Expected exactly four signal keys, received ${signals.length}.`);
  }

  const uniqueSignals = new Set(signals);

  if (uniqueSignals.size !== signals.length) {
    throw new Error('Signal keys must be unique.');
  }
}

function permuteSignals(signals: readonly string[]): string[][] {
  if (signals.length === 0) {
    return [[]];
  }

  return signals.flatMap((signal, index) => {
    const remaining = [...signals.slice(0, index), ...signals.slice(index + 1)];
    return permuteSignals(remaining).map((permutation) => [signal, ...permutation]);
  });
}

export function listReaderFirstPatterns(options: PatternListOptions): string[] {
  validateSignals(options.signals);

  if (options.primary && !options.signals.includes(options.primary)) {
    throw new Error(`Primary signal "${options.primary}" is not present in --signals.`);
  }

  return permuteSignals(options.signals)
    .filter((pattern) => !options.primary || pattern[0] === options.primary)
    .map((pattern) => pattern.join('_'));
}

function readArgument(name: string): string | undefined {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function runCli(): void {
  try {
    const signals = parseSignalList(readArgument('--signals'));
    const primary = readArgument('--primary');
    const patterns = listReaderFirstPatterns({ signals, primary });

    process.stdout.write(`${patterns.join('\n')}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error.';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

const isCli = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isCli) {
  runCli();
}
