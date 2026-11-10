#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skill = path.join(root, 'SKILL.md');
const errors = [];
if (!fs.existsSync(skill)) errors.push('SKILL.md is missing.');
else {
  const content = fs.readFileSync(skill, 'utf8');
  if (!/^---\r?\n[\s\S]*?^---\r?\n/m.test(content)) errors.push('SKILL.md requires YAML frontmatter.');
  if (!/^name: scroll-3d-experiences$/m.test(content)) errors.push('SKILL.md name must be scroll-3d-experiences.');
  if ((content.match(/\n/g) ?? []).length + 1 > 500) errors.push('SKILL.md exceeds 500 lines.');
  for (const match of content.matchAll(/`([^`]+\.md)`/g)) {
    const reference = match[1];
    if (!reference.startsWith('references/') && !reference.startsWith('assets/')) continue;
    const target = path.join(root, reference);
    if (!fs.existsSync(target)) errors.push(`Missing referenced file: ${reference}`);
  }
}
for (const file of [
  'assets/templates/EXPERIENCE-BRIEF.template.md',
  'assets/templates/PRODUCT.template.md',
  'assets/templates/DESIGN.template.md',
  'assets/templates/EXPERIENCE.template.md',
]) if (!fs.existsSync(path.join(root, file))) errors.push(`Missing template: ${file}`);

if (errors.length) {
  console.error(`Skill validation failed (${errors.length}):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log('skill OK');
