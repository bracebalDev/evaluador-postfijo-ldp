/**
 * types.ts
 *
 * Definición del sistema de tipos algebraicos (Tagged / Discriminated Unions)
 * para el evaluador postfijo (RPN), tokens, valores en tiempo de ejecución,
 * operadores y resultados funcionales (Result<T, E>).
 */

import type { EvaluatorError } from './error.js';

// --- Operadores ---
export type ArithmeticOp = '+' | '-' | '*' | '/';
export type ComparisonOp = '==' | '!=' | '<' | '>' | '<=' | '>=';
export type BooleanOp = 'and' | 'or' | 'not';
export type AssignmentOp = '=';

export type Operator = ArithmeticOp | ComparisonOp | BooleanOp | AssignmentOp;

// --- Comandos Especiales del REPL / Evaluador ---
export type Command =
  | 'begin'
  | 'end'
  | 'vars'
  | 'stack'
  | 'clear'
  | 'help'
  | 'exit';

// --- Valores en Tiempo de Ejecución (Tagged Unions) ---

export interface NumberValue {
  readonly kind: 'number';
  readonly value: number;
}

export interface BooleanValue {
  readonly kind: 'boolean';
  readonly value: boolean;
}

/**
 * Representa una referencia simbólica a un identificador en la pila.
 * Permite sintaxis de asignación postfija directa como: `x 10 =` o `x 5 2 + =`.
 * Si se utiliza en una operación que requiere evaluación, se resuelve en el entorno.
 */
export interface VariableRef {
  readonly kind: 'ref';
  readonly name: string;
}

/**
 * Tipo algebraico compuesto que representa los valores computados válidos.
 */
export type RuntimeValue = NumberValue | BooleanValue;

/**
 * Elementos que pueden residir en la pila de evaluación.
 */
export type StackElement = RuntimeValue | VariableRef;

// --- Tokens Léxicos (Tagged Unions) ---

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

// --- Patrón Result Funcional ---

export type Result<T, E = EvaluatorError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// --- Metadatos de Variables para el Comando 'vars' ---
export interface VariableInfo {
  readonly name: string;
  readonly value: RuntimeValue;
  readonly scopeDepth: number;
}
