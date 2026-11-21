/**
 * repl.ts
 *
 * Interfaz interactiva de consola (REPL) para el evaluador postfijo en TypeScript.
 * Incorpora formato con códigos de escape ANSI, indicador visual de profundidad
 * de ámbito léxico, visualización del tope de pila e historial de comandos.
 *
 * Desarrollado con fines académicos por:
 *  - Brayan Ceballos
 *  - Andrés Crespo
 */

import * as readline from 'node:readline';
import { Stack } from './stack.js';
import { Environment } from './environment.js';
import { evaluateLine } from './evaluator.js';
import type { StackElement, RuntimeValue } from './types.js';

// --- Códigos ANSI para formato de texto en terminal ---
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function formatValue(val: RuntimeValue): string {
  if (val.kind === 'number') {
    return `${ANSI.cyan}${val.value}${ANSI.reset} ${ANSI.dim}(number)${ANSI.reset}`;
  }
  return `${ANSI.yellow}${val.value}${ANSI.reset} ${ANSI.dim}(boolean)${ANSI.reset}`;
}

export function printBanner(): void {
  console.log(`${ANSI.cyan}${ANSI.bold}================================================================${ANSI.reset}`);
  console.log(`${ANSI.magenta}${ANSI.bold}   Evaluador Postfijo (Mini-REPL en RPN) - TypeScript${ANSI.reset}`);
  console.log(`${ANSI.dim}   Asignación #1 - Lenguajes de Programación (CAO604) | FACYT - UC${ANSI.reset}`);
  console.log(`${ANSI.dim}   Desarrollado con fines académicos por: Brayan Ceballos y Andrés Crespo${ANSI.reset}`);
  console.log(`${ANSI.cyan}${ANSI.bold}================================================================${ANSI.reset}`);
  console.log(`Escriba expresiones en Notación Polaca Inversa (ej. ${ANSI.green}x 10 =${ANSI.reset}, ${ANSI.green}x 5 + 2 *${ANSI.reset})`);
  console.log(`Comandos útiles: ${ANSI.yellow}vars${ANSI.reset}, ${ANSI.yellow}stack${ANSI.reset}, ${ANSI.yellow}begin${ANSI.reset}, ${ANSI.yellow}end${ANSI.reset}, ${ANSI.yellow}clear${ANSI.reset}, ${ANSI.yellow}help${ANSI.reset}, ${ANSI.yellow}exit${ANSI.reset}\n`);
}

/**
 * Inicia el bucle de lectura, evaluación e impresión interactivo (REPL).
 */
export function startREPL(): void {
  const stack = new Stack<StackElement>();
  let env = new Environment();

  printBanner();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: getPrompt(env.depth)
  });

  function getPrompt(depth: number): string {
    const scopeColor = depth === 0 ? ANSI.blue : ANSI.magenta;
    return `${scopeColor}${ANSI.bold}rpn [${depth}]>${ANSI.reset} `;
  }

  rl.prompt();

  rl.on('line', (line: string) => {
    const trimmed = line.trim();

    if (trimmed === 'exit' || trimmed === 'quit') {
      console.log(`\n${ANSI.green}¡Hasta luego!${ANSI.reset}`);
      rl.close();
      return;
    }

    const evalResult = evaluateLine(line, stack, env);

    if (!evalResult.ok) {
      console.log(`${ANSI.red}${ANSI.bold}[Error ${evalResult.error.kind}]${ANSI.reset} ${ANSI.red}${evalResult.error.message}${ANSI.reset}`);
    } else {
      env = evalResult.value.env;

      if (evalResult.value.shouldExit) {
        console.log(`\n${ANSI.green}¡Hasta luego!${ANSI.reset}`);
        rl.close();
        return;
      }

      if (evalResult.value.message) {
        console.log(evalResult.value.message);
      }

      // Si no hubo mensaje especial de comando y hay un valor en el tope, mostrarlo
      if (!evalResult.value.message && evalResult.value.topValue !== undefined) {
        console.log(`=> ${formatValue(evalResult.value.topValue)}`);
      }
    }

    rl.setPrompt(getPrompt(env.depth));
    rl.prompt();
  });

  rl.on('close', () => {
    process.exit(0);
  });
}
