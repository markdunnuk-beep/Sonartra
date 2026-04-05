import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentPath = join(
  process.cwd(),
  'components',
  'admin',
  'admin-assessment-language-editor.tsx',
);

function readSource(): string {
  return readFileSync(componentPath, 'utf8');
}

test('assessment language editor resets draft state by remount key instead of sync effect state', () => {
  const source = readSource();

  assert.match(
    source,
    /<AdminAssessmentLanguageEditorFields[\s\S]*key=\{`\$\{assessmentVersionId\}:\$\{initialValue \?\? ''\}`\}/,
  );
  assert.match(source, /const \[savedValue, setSavedValue\] = useState\(initialValue \?\? ''\);/);
  assert.match(source, /const \[draftValue, setDraftValue\] = useState\(initialValue \?\? ''\);/);
  assert.doesNotMatch(
    source,
    /useEffect\(\(\) => \{\s*setSavedValue\(initialValue \?\? ''\);\s*setDraftValue\(initialValue \?\? ''\);/s,
  );
});
