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
const COMMANDS = new Set<Command>(['begin', 'end', 'vars', 'stack', 'clear', 'help', 'exit']);

const IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const NUMBER_REGEX = /^-?(?:\d+(?:\.\d+)?|\.\d+)$/;

/**
 * Tokeniza una línea de texto en un arreglo de tokens tipados.
 */
export function tokenize(line: string): Result<Token[], EvaluatorError> {
  const tokens: Token[] = [];
  const trimmed = line.trim();

  if (trimmed.length === 0 || trimmed.startsWith('#') || trimmed.startsWith('//')) {
    return ok(tokens);
  }

  // Dividir por secuencias de espacios en blanco
  const rawParts = trimmed.split(/\s+/);

  for (const part of rawParts) {
    // Si encontramos el inicio de un comentario en línea, ignoramos el resto
    if (part.startsWith('#') || part.startsWith('//')) {
      break;
    }

    const lower = part.toLowerCase();

    // 1. Comandos del REPL / Sistema
    if (COMMANDS.has(lower as Command)) {
      tokens.push({
        kind: 'COMMAND',
        command: lower as Command,
        raw: part
      });
      continue;
    }

    // 2. Operador de Asignación
    if (part === '=') {
      tokens.push({
        kind: 'OPERATOR',
        op: '=',
        raw: part
      });
      continue;
    }

    // 3. Operadores Booleanos Explícitos (and, or, not)
    if (BOOLEAN_OPS.has(lower as Operator)) {
      tokens.push({
        kind: 'OPERATOR',
        op: lower as Operator,
        raw: part
      });
      continue;
    }

    // 4. Operadores de Comparación (==, !=, <=, >=, <, >)
    if (COMPARISON_OPS.has(part as Operator)) {
      tokens.push({
        kind: 'OPERATOR',
        op: part as Operator,
        raw: part
      });
      continue;
    }

    // 5. Operadores Aritméticos (+, -, *, /)
    if (ARITHMETIC_OPS.has(part as Operator)) {
      tokens.push({
        kind: 'OPERATOR',
        op: part as Operator,
        raw: part
      });
      continue;
    }

    // 6. Booleanos literales (true, false)
    if (lower === 'true' || lower === 'false') {
      tokens.push({
        kind: 'BOOLEAN',
        value: lower === 'true',
        raw: part
      });
      continue;
    }

    // 7. Números (enteros o flotantes, positivos o negativos)
    if (NUMBER_REGEX.test(part)) {
      const parsedNum = Number(part);
      if (Number.isNaN(parsedNum)) {
        return err(EvaluatorError.syntaxError(part));
      }
      tokens.push({
        kind: 'NUMBER',
        value: parsedNum,
        raw: part
      });
      continue;
    }

    // 8. Identificadores (variables)
    if (IDENTIFIER_REGEX.test(part)) {
      tokens.push({
        kind: 'IDENTIFIER',
        name: part,
        raw: part
      });
      continue;
    }

    // 9. Si no coincide con ninguna regla, es un token sintácticamente inválido
    return err(EvaluatorError.syntaxError(part));
  }

  return ok(tokens);
}
