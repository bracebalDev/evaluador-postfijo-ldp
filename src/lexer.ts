// Analizador léxico para tokenizar la entrada separada por espacios.

import type { Token, Operator, Command, Result } from './types.js';
import { ok, err } from './types.js';
import { EvaluatorError } from './error.js';

const ARITHMETIC_OPS = new Set<Operator>(['+', '-', '*', '/']);
const COMPARISON_OPS = new Set<Operator>(['==', '!=', '<', '>', '<=', '>=']);
const BOOLEAN_OPS = new Set<Operator>(['and', 'or', 'not']);

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

  const rawLexemes = sanitizedLine.split(/\s+/);

  for (const rawLexeme of rawLexemes) {
    if (rawLexeme.startsWith('#') || rawLexeme.startsWith('//')) {
      break;
    }

    const normalizedLexeme = rawLexeme.toLowerCase();

    if (COMMANDS.has(normalizedLexeme as Command)) {
      tokenList.push({
        kind: 'COMMAND',
        command: normalizedLexeme as Command,
        raw: rawLexeme
      });
      continue;
    }

    if (rawLexeme === '=') {
      tokenList.push({
        kind: 'OPERATOR',
        op: '=',
        raw: rawLexeme
      });
      continue;
    }

    if (BOOLEAN_OPS.has(normalizedLexeme as Operator)) {
      tokenList.push({
        kind: 'OPERATOR',
        op: normalizedLexeme as Operator,
        raw: rawLexeme
      });
      continue;
    }

    if (COMPARISON_OPS.has(rawLexeme as Operator)) {
      tokenList.push({
        kind: 'OPERATOR',
        op: rawLexeme as Operator,
        raw: rawLexeme
      });
      continue;
    }

    if (ARITHMETIC_OPS.has(rawLexeme as Operator)) {
      tokenList.push({
        kind: 'OPERATOR',
        op: rawLexeme as Operator,
        raw: rawLexeme
      });
      continue;
    }

    if (normalizedLexeme === 'true' || normalizedLexeme === 'false') {
      tokenList.push({
        kind: 'BOOLEAN',
        value: normalizedLexeme === 'true',
        raw: rawLexeme
      });
      continue;
    }

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

    if (IDENTIFIER_REGEX.test(rawLexeme)) {
      tokenList.push({
        kind: 'IDENTIFIER',
        name: rawLexeme,
        raw: rawLexeme
      });
      continue;
    }

    return err(EvaluatorError.syntaxError(rawLexeme));
  }

  return ok(tokenList);
}
