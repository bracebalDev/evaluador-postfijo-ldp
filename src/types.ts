// Definición de tipos para tokens, operadores, valores en runtime y Result.

import type { EvaluatorError } from './error.js';

export type ArithmeticOp = '+' | '-' | '*' | '/';
export type ComparisonOp = '==' | '!=' | '<' | '>' | '<=' | '>=';
export type BooleanOp = 'and' | 'or' | 'not';
export type AssignmentOp = '=';

export type Operator = ArithmeticOp | ComparisonOp | BooleanOp | AssignmentOp;

export type Command =
  | 'begin'
  | 'end'
  | 'scope'
  | 'endscope'
  | 'vars'
  | 'env'
  | 'symbols'
  | 'stack'
  | 'clear'
  | 'help'
  | 'exit';

// Valores soportados en la pila durante la ejecución
export interface NumberValue {
  readonly kind: 'number';
  readonly value: number;
}

export interface BooleanValue {
  readonly kind: 'boolean';
  readonly value: boolean;
}

// Referencia simbólica a una variable antes de ser resuelta o asignada
export interface VariableRef {
  readonly kind: 'ref';
  readonly name: string;
}

export type RuntimeValue = NumberValue | BooleanValue;
export type StackElement = RuntimeValue | VariableRef;

// Tipos de tokens generados por el lexer
export interface NumberToken {
  readonly kind: 'NUMBER';
  readonly value: number;
  readonly raw: string;
}

export interface BooleanToken {
  readonly kind: 'BOOLEAN';
  readonly value: boolean;
  readonly raw: string;
}

export interface IdentifierToken {
  readonly kind: 'IDENTIFIER';
  readonly name: string;
  readonly raw: string;
}

export interface OperatorToken {
  readonly kind: 'OPERATOR';
  readonly op: Operator;
  readonly raw: string;
}

export interface CommandToken {
  readonly kind: 'COMMAND';
  readonly command: Command;
  readonly raw: string;
}

export type Token =
  | NumberToken
  | BooleanToken
  | IdentifierToken
  | OperatorToken
  | CommandToken;

// Patrón Result para manejo de errores sin excepciones no controladas
export type Result<T, E = EvaluatorError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export interface VariableInfo {
  readonly name: string;
  readonly value: RuntimeValue;
  readonly scopeDepth: number;
}
