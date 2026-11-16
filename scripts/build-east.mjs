import { cp, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const portal = path.join(repo, 'east-portal')
const source = path.join(repo, 'east-data')
const output = path.resolve(repo, process.argv[2] ?? 'public/east')
const catalog = JSON.parse(await readFile(path.join(source, 'catalog.json'), 'utf8'))
if (catalog.schemaVersion !== 1 || !catalog.persons.length || !catalog.works.length) {
  throw new Error('EAST catalog is missing or invalid. Run scripts/import-east.py first.')
}
for (const entry of [...catalog.persons, ...catalog.works]) {
  const relative = entry.localUrl
  if (!relative.startsWith('archive/pages/') || relative.includes('..')) {
    throw new Error(`Unsafe EAST reading path: ${relative}`)
  }
  await stat(path.join(source, relative))
}
await mkdir(output, { recursive: true })
await cp(portal, output, { recursive: true })
await cp(path.join(source, 'archive'), path.join(output, 'archive'), { recursive: true })
await writeFile(path.join(output, 'catalog.json'), JSON.stringify(catalog))
await writeFile(path.join(output, '.nojekyll'), '')
console.log(`EAST: ${catalog.persons.length} persons / ${catalog.works.length} works → ${output}`)
