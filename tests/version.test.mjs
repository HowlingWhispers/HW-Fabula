import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { FABULA_VERSION, FABULA_VERSION_LABEL } from '../src/version.mjs';

test('package version and runtime version stay in sync', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(FABULA_VERSION, pkg.version);
});

test('display label is derived from the runtime version', () => {
  assert.equal(FABULA_VERSION_LABEL, 'PRE-ALPHA 0.0.4');
});
