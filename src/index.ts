/**
 * index.ts
 *
 * Punto de entrada principal para el Evaluador Postfijo.
 * Permite ejecutar en modo REPL interactivo o ejecutar un archivo de script RPN.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { startREPL } from './repl.js';
import { Stack } from './stack.js';
import { Environment } from './environment.js';
import { evaluateLine } from './evaluator.js';
import type { StackElement } from './types.js';

function runScriptFile(filePath: string): void {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: El archivo '${filePath}' no existe.`);
    process.exit(1);
  }

  const content = fs.readFileSync(resolvedPath, 'utf-8');
  const lines = content.split(/\r?\n/);

  const stack = new Stack<StackElement>();
  let env = new Environment();

  console.log(`\n=== Ejecutando script: ${filePath} ===\n`);

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();

    // Mostrar comentarios y líneas vacías
    if (trimmed.length === 0) {
      console.log('');
      continue;
    }

    if (trimmed.startsWith('#') || trimmed.startsWith('//')) {
      console.log(`\x1b[90m${line}\x1b[0m`);
      continue;
    }

    console.log(`\x1b[34m[${idx + 1}] rpn [${env.depth}]>\x1b[0m ${line}`);
    const result = evaluateLine(line, stack, env);

    if (!result.ok) {
      console.log(`\x1b[31m[Error ${result.error.kind}]\x1b[0m ${result.error.message}`);
    } else {
      env = result.value.env;
      if (result.value.message) {
        console.log(`  ${result.value.message}`);
      }
      if (!result.value.message && result.value.topValue !== undefined) {
        console.log(`  => \x1b[36m${result.value.topValue.value}\x1b[0m (${result.value.topValue.kind})`);
      }
    }
  }

  console.log(`\n=== Fin del script ===\n`);
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length > 0 && !args[0].startsWith('-')) {
    runScriptFile(args[0]);
  } else {
    startREPL();
  }
}

main();
