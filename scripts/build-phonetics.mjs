import { cp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appDir = path.join(repo, 'tibetan-phonetics-app');
const output = path.resolve(repo, process.argv[2] ?? 'public/tibetan-phonetics');

await mkdir(output, { recursive: true });

await esbuild.build({
  entryPoints: [path.join(appDir, 'src/main.mjs')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  outfile: path.join(output, 'app.js'),
});

await cp(path.join(appDir, 'index.html'), path.join(output, 'index.html'));
await cp(path.join(appDir, 'styles.css'), path.join(output, 'styles.css'));
await writeFile(path.join(output, '.nojekyll'), '');

console.log(`Tibetan Inline Phonetics → ${output}`);
