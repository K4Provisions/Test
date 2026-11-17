// Copies the finished website from site/ into dist/ for hosts that expect a build output folder.
// The source files in site/_build are left out, since visitors don't need them.
import { cpSync, rmSync } from 'node:fs';
import { resolve, sep } from 'node:path';

const src = resolve('site');
const out = resolve('dist');
const skip = resolve(src, '_build');

rmSync(out, { recursive: true, force: true });
cpSync(src, out, {
  recursive: true,
  filter: (path) => path !== skip && !path.startsWith(skip + sep) && !path.endsWith('README.md'),
});
console.log('Built dist/ from site/');
