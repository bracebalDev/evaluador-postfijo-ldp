/**
 * lexer.ts
 *
 * Tokenizador para el lenguaje postfijo (RPN).
 * Divide la entrada por espacios en blanco, ignora comentarios (# o //)
 * y clasifica cada componente en un tipo de Token fuertemente tipado.
 */

import type { Token, Operator, Command, Result } from './types.js';
import { ok, err } from './types.js';
import { EvaluatorError } from './error.js';

const ARITHMETIC_OPS = new Set<Operator>(['+', '-', '*', '/']);
const COMPARISON_OPS = new Set<Operator>(['==', '!=', '<', '>', '<=', '>=']);
const BOOLEAN_OPS = new Set<Operator>(['and', 'or', 'not']);

// Incluye los comandos del enunciado (begin, end, vars) y alias mnemotécnicos
// alternativos (scope, endscope, env, symbols) para brindar diferenciación semántica.
const COMMANDS = new Set<Command>([
  'begin',
  'end',
  'scope',
  'endscope',
  'vars',
  'env',
  'symbols',
  'stack',
  'clear',
  'help',
  'exit'
]);

const IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const NUMBER_REGEX = /^-?(?:\d+(?:\.\d+)?|\.\d+)$/;

/**
 * Tokeniza una línea de texto en una secuencia de tokens fuertemente tipados.
 */
export function tokenize(sourceLine: string): Result<Token[], EvaluatorError> {
  const tokenList: Token[] = [];
  const sanitizedLine = sourceLine.trim();

  if (
    sanitizedLine.length === 0 ||
    sanitizedLine.startsWith('#') ||
    sanitizedLine.startsWith('//')
  ) {
    return ok(tokenList);
  }

  // Dividir por secuencias de espacios en blanco
  const rawLexemes = sanitizedLine.split(/\s+/);

  for (const rawLexeme of rawLexemes) {
    // Si encontramos el inicio de un comentario en línea, ignoramos el resto
    if (rawLexeme.startsWith('#') || rawLexeme.startsWith('//')) {
      break;
    }

    const normalizedLexeme = rawLexeme.toLowerCase();

    // 1. Comandos del REPL / Sistema (incluyendo alias mnemotécnicos)
    if (COMMANDS.has(normalizedLexeme as Command)) {
      tokenList.push({
        kind: 'COMMAND',
        command: normalizedLexeme as Command,
        raw: rawLexeme
      });
      continue;
    }

    // 2. Operador de Asignación
    if (rawLexeme === '=') {
      tokenList.push({
        kind: 'OPERATOR',
        op: '=',
        raw: rawLexeme
      });
      continue;
    }

    // 3. Operadores Booleanos Explícitos (and, or, not)
    if (BOOLEAN_OPS.has(normalizedLexeme as Operator)) {
      tokenList.push({
        kind: 'OPERATOR',
        op: normalizedLexeme as Operator,
        raw: rawLexeme
      });
      continue;
    }

    // 4. Operadores de Comparación (==, !=, <=, >=, <, >)
    if (COMPARISON_OPS.has(rawLexeme as Operator)) {
      tokenList.push({
        kind: 'OPERATOR',
        op: rawLexeme as Operator,
        raw: rawLexeme
      });
      continue;
    }

    // 5. Operadores Aritméticos (+, -, *, /)
    if (ARITHMETIC_OPS.has(rawLexeme as Operator)) {
      tokenList.push({
        kind: 'OPERATOR',
        op: rawLexeme as Operator,
        raw: rawLexeme
      });
      continue;
    }

    // 6. Booleanos literales (true, false)
    if (normalizedLexeme === 'true' || normalizedLexeme === 'false') {
      tokenList.push({
        kind: 'BOOLEAN',
        value: normalizedLexeme === 'true',
        raw: rawLexeme
      });
      continue;
    }

    // 7. Números (enteros o flotantes, positivos o negativos)
    if (NUMBER_REGEX.test(rawLexeme)) {
      const parsedNumber = Number(rawLexeme);
      if (Number.isNaN(parsedNumber)) {
        return err(EvaluatorError.syntaxError(rawLexeme));
      }
      tokenList.push({
        kind: 'NUMBER',
        value: parsedNumber,
        raw: rawLexeme
      });
      continue;
    }

    // 8. Identificadores mnemotécnicos (variables)
    if (IDENTIFIER_REGEX.test(rawLexeme)) {
      tokenList.push({
        kind: 'IDENTIFIER',
        name: rawLexeme,
        raw: rawLexeme
      });
      continue;
    }

    // 9. Si no coincide con ninguna regla léxica, reportamos error sintáctico
    return err(EvaluatorError.syntaxError(rawLexeme));
  }

  return ok(tokenList);
}
