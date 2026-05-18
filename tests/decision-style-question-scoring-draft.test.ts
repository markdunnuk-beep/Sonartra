import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const base = path.join(process.cwd(), 'content/assessment-packages/decision-style');
const requiredFiles = [
  '00-assessment.psv','01-signals.psv','02-questions.psv','03-options.psv','04-option-weights.psv','05-ranked-patterns.psv','07-report-qa-cases.psv','README.md'
];
const parsePsv = (file: string) => {
  const text = fs.readFileSync(file, 'utf8').trim();
  const [header, ...rows] = text.split('\n');
  const keys = header.split('|');
  return rows.map((r) => {
    const vals = r.split('|');
    return Object.fromEntries(keys.map((k, i) => [k, vals[i] ?? '']));
  });
};

test('decision style package draft integrity', () => {
  requiredFiles.forEach((f) => assert.ok(fs.existsSync(path.join(base, f)), `missing ${f}`));
  const signals = parsePsv(path.join(base, '01-signals.psv'));
  assert.equal(signals.length, 4);
  assert.deepEqual(signals.map((s) => s.signal_key).sort(), ['evidence','instinct','pragmatism','principle']);

  const questions = parsePsv(path.join(base, '02-questions.psv'));
  assert.equal(questions.length, 24);

  const options = parsePsv(path.join(base, '03-options.psv'));
  assert.equal(options.length, 96);

  const weights = parsePsv(path.join(base, '04-option-weights.psv'));
  assert.equal(weights.length, 96);

  const perQuestionOptions = new Map<string, number>();
  const optionSignalsByQuestion = new Map<string, Set<string>>();
  const optionMap = new Map<string, string>();
  for (const o of options) {
    perQuestionOptions.set(o.question_key, (perQuestionOptions.get(o.question_key) ?? 0) + 1);
    optionMap.set(`${o.question_key}:${o.option_key}`, '');
  }
  for (const [q, count] of perQuestionOptions) assert.equal(count, 4, `${q} must have 4 options`);

  const signalCounts = new Map<string, number>();
  const letterSignal = new Map<string, Set<string>>();
  for (const w of weights) {
    assert.equal(w.weight, '1');
    assert.ok(optionMap.has(`${w.question_key}:${w.option_key}`));
    optionSignalsByQuestion.set(w.question_key, optionSignalsByQuestion.get(w.question_key) ?? new Set());
    optionSignalsByQuestion.get(w.question_key)!.add(w.signal_key);
    signalCounts.set(w.signal_key, (signalCounts.get(w.signal_key) ?? 0) + 1);
    letterSignal.set(w.option_key, letterSignal.get(w.option_key) ?? new Set());
    letterSignal.get(w.option_key)!.add(w.signal_key);
  }
  for (const q of questions) assert.equal(optionSignalsByQuestion.get(q.question_key)?.size, 4);
  ['evidence','instinct','principle','pragmatism'].forEach((s) => assert.equal(signalCounts.get(s), 24));
  ['A','B','C','D'].forEach((l) => assert.ok((letterSignal.get(l)?.size ?? 0) > 1));

  const patterns = parsePsv(path.join(base, '05-ranked-patterns.psv'));
  assert.equal(patterns.length, 24);
  const unique = new Set(patterns.map((p) => p.pattern_key));
  assert.equal(unique.size, 24);
  for (const p of patterns) {
    const tuple = [p.rank_1_signal_key,p.rank_2_signal_key,p.rank_3_signal_key,p.rank_4_signal_key];
    assert.equal(new Set(tuple).size, 4);
  }

  const qa = parsePsv(path.join(base, '07-report-qa-cases.psv'));
  assert.ok(qa.length >= 8);
  qa.forEach((q) => assert.ok(unique.has(q.pattern_key)));

  const packageText = requiredFiles.filter(f => f.endsWith('.psv')).map((f) => fs.readFileSync(path.join(base, f),'utf8').toLowerCase()).join('\n');
  assert.equal(packageText.includes('score_shape'), false);
  const forbiddenVariantTokens = ['|concentrated|','|paired|','|graduated|','|balanced|','report_variant','score_shape'];
  forbiddenVariantTokens.forEach((v) => assert.equal(packageText.includes(v), false));
});
