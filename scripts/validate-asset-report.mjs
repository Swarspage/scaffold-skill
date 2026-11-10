#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const input = process.argv[2];
if (!input || input === '--help' || input === '-h') {
  console.log('Usage: node scripts/validate-asset-report.mjs path/to/asset-research-report.json');
  process.exit(input ? 0 : 2);
}
let report;
try { report = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8')); }
catch (error) { console.error(`Could not read valid JSON: ${error.message}`); process.exit(2); }
const errors = [];
const warnings = [];
const requireText = (value, name) => { if (typeof value !== 'string' || !value.trim()) errors.push(`${name} must be a non-empty string.`); };
const validUrl = (value) => { try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; } };
if (!report || typeof report !== 'object' || Array.isArray(report)) errors.push('Root must be an object.');
if (report?.reportVersion !== '1.0') errors.push('reportVersion must be "1.0".');
requireText(report?.subject?.name, 'subject.name');
requireText(report?.subject?.intendedUse, 'subject.intendedUse');
for (const key of ['webSearch', 'imageSearch', 'browserOpen']) if (!['available', 'unavailable'].includes(report?.toolAccess?.[key])) errors.push(`toolAccess.${key} must be available or unavailable.`);
if (!Array.isArray(report?.queries)) errors.push('queries must be an array.');
if (!Array.isArray(report?.visualReferences)) errors.push('visualReferences must be an array.');
else {
  if (report.toolAccess?.imageSearch === 'available' && report.visualReferences.length < 3) warnings.push('Fewer than three visual references. Record the limitation or continue research.');
  report.visualReferences.forEach((ref, i) => {
    requireText(ref?.title, `visualReferences[${i}].title`);
    if (!validUrl(ref?.sourceUrl)) errors.push(`visualReferences[${i}].sourceUrl must be an HTTP(S) source-page URL.`);
    if (!['front', 'side', 'back', 'top', 'bottom', 'detail', 'three-quarter', 'technical-drawing', 'unknown'].includes(ref?.view)) errors.push(`visualReferences[${i}].view is invalid.`);
    if (!Array.isArray(ref?.supports) || !ref.supports.length) errors.push(`visualReferences[${i}].supports must name at least one evidence type.`);
    requireText(ref?.notes, `visualReferences[${i}].notes`);
  });
}
if (!Array.isArray(report?.modelCandidates)) errors.push('modelCandidates must be an array.');
else report.modelCandidates.forEach((c, i) => {
  requireText(c?.title, `modelCandidates[${i}].title`);
  if (!validUrl(c?.sourceUrl)) errors.push(`modelCandidates[${i}].sourceUrl must be an HTTP(S) listing URL.`);
  if (!['verified', 'restricted', 'unknown'].includes(c?.licenseStatus)) errors.push(`modelCandidates[${i}].licenseStatus is invalid.`);
  if (c?.licenseStatus === 'verified' && !validUrl(c?.licenseUrl)) errors.push(`modelCandidates[${i}] is verified but has no licenseUrl.`);
  if (c?.separability === 'not-inspected') warnings.push(`Candidate "${c.title}" has not been structurally inspected.`);
  requireText(c?.notes, `modelCandidates[${i}].notes`);
});
const strategy = report?.selectedAsset?.strategy;
if (!['user-supplied-model', 'licensed-model', 'procedural-from-reference', 'image-sequence-or-video', 'blocked-awaiting-asset'].includes(strategy)) errors.push('selectedAsset.strategy is invalid.');
requireText(report?.selectedAsset?.license, 'selectedAsset.license');
requireText(report?.selectedAsset?.rationale, 'selectedAsset.rationale');
if (strategy === 'licensed-model' && (!validUrl(report.selectedAsset.candidateUrl) || !validUrl(report.selectedAsset.licenseUrl))) errors.push('licensed-model requires candidateUrl and licenseUrl.');
if (strategy === 'procedural-from-reference' && !report.visualReferences?.length) errors.push('procedural-from-reference requires visual evidence or an explicit evidence limitation.');
if (strategy === 'blocked-awaiting-asset') warnings.push('Asset selection is blocked. Do not proceed with a falsely faithful model.');
if (report.toolAccess?.webSearch === 'unavailable' && report.queries?.length) warnings.push('Queries exist while webSearch is unavailable; do not present them as executed searches.');
if (!Array.isArray(report?.knownUnknowns)) errors.push('knownUnknowns must be an array.');
if (!Array.isArray(report?.decisionNotes)) errors.push('decisionNotes must be an array.');
for (const warning of warnings) console.warn(`WARN: ${warning}`);
for (const error of errors) console.error(`ERROR: ${error}`);
console.log(JSON.stringify({ status: errors.length ? 'failed' : 'passed-with-review', errors: errors.length, warnings: warnings.length }, null, 2));
process.exit(errors.length ? 1 : 0);
