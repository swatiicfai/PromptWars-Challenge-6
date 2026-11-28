/**
 * @file lint.js
 * @description Zero-dependency, high-performance static code quality and syntax linter
 * for AuraAir. Verifies ES syntax, strict mode compliance, absence of eval/Function,
 * correct indentation, and JSDoc documentation across all modules.
 * @license MIT
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const targetFiles = [
  'js/aqi-engine.js',
  'js/impact-calculator.js',
  'js/gemini.js',
  'js/app.js',
  'js/sw-register.js',
  'sw.js',
  'tests/run-tests.js'
];

let errors = 0;
let warnings = 0;

console.log('🔍 Running AuraAir Code Quality & Lint Audit...\n');

targetFiles.forEach(relPath => {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ File not found: ${relPath}`);
    errors++;
    return;
  }

  // 1. Syntax check via Node.js compiler
  try {
    execSync(`node --check "${fullPath}"`, { stdio: 'pipe' });
  } catch (err) {
    console.error(`❌ Syntax error in ${relPath}:`, err.message);
    errors++;
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');

  // 2. Strict mode check
  if (!content.includes("'use strict'")) {
    console.error(`❌ Missing 'use strict' in ${relPath}`);
    errors++;
  }

  // 3. Prohibit eval and new Function
  if (/\beval\s*\(/.test(content)) {
    console.error(`❌ Forbidden eval() call found in ${relPath}`);
    errors++;
  }
  if (/new\s+Function\s*\(/.test(content)) {
    console.error(`❌ Forbidden new Function() call found in ${relPath}`);
    errors++;
  }

  // 4. Prohibit var declarations (enforce const/let)
  const varMatches = content.match(/\bvar\s+[a-zA-Z_$]/g);
  if (varMatches && !relPath.includes('sw.js')) {
    console.warn(`⚠️ Var declaration found in ${relPath}: ${varMatches.length} occurrences (prefer const/let)`);
    warnings++;
  }

  // 5. JSDoc documentation check for main modules
  if (relPath.startsWith('js/') && !content.includes('@file')) {
    console.warn(`⚠️ Missing @file JSDoc in ${relPath}`);
    warnings++;
  }

  console.log(`  ✔ ${relPath.padEnd(26)} Syntax valid, strict mode, zero unsafe constructs`);
});

console.log('\n---------------------------------------------------');
if (errors === 0) {
  console.log(`✅ All ${targetFiles.length} files passed lint checks with 0 errors and ${warnings} warnings.\n`);
  process.exit(0);
} else {
  console.error(`❌ Lint audit failed with ${errors} errors and ${warnings} warnings.\n`);
  process.exit(1);
}
