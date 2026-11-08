// Package only public website files; keep credentials and repository tools out.
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'dist');
const pages = readdirSync(root).filter((file) => file.endsWith('.html'));

// Refuse a linked output directory before clearing the fixed build location.
if (existsSync(output) && lstatSync(output).isSymbolicLink()) {
  throw new Error('dist must be a regular directory, not a symbolic link.');
}
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

for (const page of pages) {
  cpSync(resolve(root, page), resolve(output, page));
}
if (existsSync(resolve(root, 'CNAME'))) {
  cpSync(resolve(root, 'CNAME'), resolve(output, 'CNAME'));
}
cpSync(resolve(root, 'src'), resolve(output, 'src'), { recursive: true });

console.log(`Static website packaged in dist/ (${pages.length} HTML pages and src/).`);
