/**
 * test/types.test.ts
 *
 * Pruebas unitarias para el sistema de tipos del evaluador:
 * Distinción de tipos en tiempo de ejecución (Number vs Bool)
 * y detección controlada de incompatibilidades de tipo.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { Stack } from '../src/stack.js';
import { Environment } from '../src/environment.js';
import { evaluateLine } from '../src/evaluator.js';
import type { StackElement } from '../src/types.js';

describe('Sistema de Tipos del Evaluador', () => {
  it('debe rechazar suma entre número y booleano (5 true +)', () => {
    const stack = new Stack<StackElement>();
    const env = new Environment();

    const result = evaluateLine('5 true +', stack, env);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.kind, 'TYPE_ERROR');
      assert.match(result.error.message, /se esperaba tipo 'number', pero se recibió 'boolean'/);
    }
  });

  it('debe rechazar multiplicación entre booleanos (true false *)', () => {
    const stack = new Stack<StackElement>();
    const env = new Environment();

    const result = evaluateLine('true false *', stack, env);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.kind, 'TYPE_ERROR');
    }
  });

  it('debe rechazar operadores relacionales en booleanos (true false <)', () => {
    const stack = new Stack<StackElement>();
    const env = new Environment();

    const result = evaluateLine('true false <', stack, env);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.kind, 'TYPE_ERROR');
    }
  });

  it('debe rechazar operador lógico and en números (5 10 and)', () => {
    const stack = new Stack<StackElement>();
    const env = new Environment();

    const result = evaluateLine('5 10 and', stack, env);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.kind, 'TYPE_ERROR');
      assert.match(result.error.message, /se esperaba tipo 'boolean', pero se recibió 'number'/);
    }
  });

  it('debe rechazar operador not en números (42 not)', () => {
    const stack = new Stack<StackElement>();
    const env = new Environment();

    const result = evaluateLine('42 not', stack, env);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.kind, 'TYPE_ERROR');
    }
  });

  it('debe rechazar comparación de igualdad entre tipos incompatibles (5 true ==)', () => {
    const stack = new Stack<StackElement>();
    const env = new Environment();

    const result = evaluateLine('5 true ==', stack, env);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.kind, 'TYPE_ERROR');
    }
  });
});
