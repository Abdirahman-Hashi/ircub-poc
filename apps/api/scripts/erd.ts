import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { ErdField, ErdModel, ErdRelation } from './erd.types';

/**
 * Renders `prisma/schema.prisma` as a Mermaid `erDiagram` in `docs/erd.md` (D23). The parser
 * reads only what the diagram needs: model names, scalar fields with their attributes, and
 * `@relation(fields: [...], references: [...])` links. Run with `pnpm --filter api erd`.
 */
const SCHEMA_PATH = resolve(__dirname, '..', 'prisma', 'schema.prisma');
const OUTPUT_PATH = resolve(__dirname, '..', '..', '..', 'docs', 'erd.md');
const MODEL_PATTERN = /^model\s+(\w+)\s+\{$/;
const FIELD_PATTERN = /^(\w+)\s+([\w.]+)(\?|\[\])?\s*(.*)$/;
const RELATION_PATTERN = /@relation\((?:"[^"]*",\s*)?fields:\s*\[([^\]]+)\]/;

function parseModels(schema: string): ErdModel[] {
  const models: ErdModel[] = [];
  let current: ErdModel | null = null;
  for (const raw of schema.split('\n')) {
    const line = raw.trim();
    const open = MODEL_PATTERN.exec(line);
    if (open !== null) {
      current = { name: open[1] ?? '', fields: [], relations: [] };
      models.push(current);
      continue;
    }
    if (current === null) {
      continue;
    }
    if (line === '}') {
      current = null;
      continue;
    }
    if (line.startsWith('//') || line.startsWith('@@') || line.length === 0) {
      continue;
    }
    const field = FIELD_PATTERN.exec(line);
    if (field === null) {
      continue;
    }
    const [, name = '', type = '', modifier = '', attributes = ''] = field;
    const relation = RELATION_PATTERN.exec(attributes);
    if (relation !== null) {
      current.relations.push({
        target: type,
        optional: modifier === '?',
        fields: (relation[1] ?? '').split(',').map((f) => f.trim()),
      });
      continue;
    }
    if (/^[A-Z]/.test(type) && !isScalarOrEnum(type, schema)) {
      continue; // the other side of a relation: drawn from the owning side
    }
    current.fields.push({
      name,
      type: `${type}${modifier === '[]' ? '[]' : ''}`,
      optional: modifier === '?',
      key: attributes.includes('@id') ? 'PK' : attributes.includes('@unique') ? 'UK' : '',
    });
  }
  return models;
}

const SCALARS = new Set(['String', 'Int', 'BigInt', 'Boolean', 'DateTime', 'Decimal', 'Json']);

function isScalarOrEnum(type: string, schema: string): boolean {
  return SCALARS.has(type) || new RegExp(`^enum\\s+${type}\\s+\\{`, 'm').test(schema);
}

function renderField(field: ErdField): string {
  const key = field.key === '' ? '' : ` ${field.key}`;
  const note = field.optional ? ' "optional"' : '';
  return `    ${field.type.replace('[]', '_array')} ${field.name}${key}${note}`;
}

function renderRelation(from: ErdModel, relation: ErdRelation): string {
  // Owning side holds the foreign key: many `from` rows point at one `target` row.
  const cardinality = relation.optional ? '}o--o|' : '}o--||';
  return `  ${from.name} ${cardinality} ${relation.target} : "${relation.fields.join(', ')}"`;
}

function render(models: ErdModel[]): string {
  const lines = ['erDiagram'];
  for (const model of models) {
    lines.push(`  ${model.name} {`, ...model.fields.map(renderField), '  }');
  }
  for (const model of models) {
    for (const relation of model.relations) {
      lines.push(renderRelation(model, relation));
    }
  }
  return lines.join('\n');
}

const schema = readFileSync(SCHEMA_PATH, 'utf8');
const models = parseModels(schema);
const diagram = render(models);
writeFileSync(
  OUTPUT_PATH,
  [
    '# Entity relationship diagram',
    '',
    'Generated from `apps/api/prisma/schema.prisma` by `pnpm --filter api erd` (do not edit by',
    'hand). `docs/erd.svg` is the rendered copy; `docs/data-model.md` explains the bounded',
    'contexts and invariants.',
    '',
    '```mermaid',
    diagram,
    '```',
    '',
  ].join('\n'),
);
console.info(
  `erd: ${models.length} models, ${models.reduce((n, m) => n + m.relations.length, 0)} relations → ${OUTPUT_PATH}`,
);
