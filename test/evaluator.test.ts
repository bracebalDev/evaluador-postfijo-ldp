/**
 * test/evaluator.test.ts
 *
 * Pruebas unitarias para el motor de evaluación postfijo:
 * Aritmética, comparaciones, operadores booleanos, manejo de errores de ejecución
 * (división por cero, stack underflow, tokens inválidos).
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { Stack } from '../src/stack.js';
import { Environment } from '../src/environment.js';
import { evaluateLine } from '../src/evaluator.js';
import type { StackElement } from '../src/types.js';

describe('Evaluador Postfijo - Operaciones Aritméticas', () => {
  it('debe sumar dos números correctamente (15 5 +)', () => {
    const stack = new Stack<StackElement>();
    const env = new Environment();

    const result = evaluateLine('15 5 +', stack, env);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.value.topValue, { kind: 'number', value: 20 });
    }
  });

  it('debe restar dos números correctamente respetando orden de pila (20 4 -)', () => {
    const stack = new Stack<StackElement>();
    const env = new Environment();

    const result = evaluateLine('20 4 -', stack, env);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.value.topValue, { kind: 'number', value: 16 });
    }
  });

  it('debe multiplicar correctamente (6 7 *)', () => {
    const stack = new Stack<StackElement>();
    const env = new Environment();

    const result = evaluateLine('6 7 *', stack, env);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.value.topValue, { kind: 'number', value: 42 });
    }
  });

  it('debe dividir correctamente (40 8 /)', () => {
    const stack = new Stack<StackElement>();
    const env = new Environment();

    const result = evaluateLine('40 8 /', stack, env);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.value.topValue, { kind: 'number', value: 5 });
    }
  });

  it('debe reportar error de división por cero controlado (10 0 /)', () => {
    const stack = new Stack<StackElement>();
    const env = new Environment();

    const result = evaluateLine('10 0 /', stack, env);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.kind, 'DIVISION_BY_ZERO');
    }
  });

  it('debe reportar error de stack underflow cuando faltan operandos (+ con 1 elemento)', () => {
    const stack = new Stack<StackElement>();
    const env = new Environment();

    const result = evaluateLine('10 +', stack, env);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.kind, 'STACK_UNDERFLOW');
    }
  });

  it('debe soportar números flotantes y negativos (-3.5 2.5 +)', () => {
    const stack = new Stack<StackElement>();
    const env = new Environment();

    const result = evaluateLine('-3.5 2.5 +', stack, env);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.value.topValue, { kind: 'number', value: -1 });
    }
  });
});

describe('Evaluador Postfijo - Comparaciones Lógicas', () => {
  it('debe evaluar igualdad y desigualdad numéricas (==, !=)', () => {
    const stack = new Stack<StackElement>();
    const env = new Environment();

    let res = evaluateLine('10 10 ==', stack, env);
    assert.equal(res.ok, true);
    if (res.ok) assert.deepEqual(res.value.topValue, { kind: 'boolean', value: true });

    res = evaluateLine('10 20 !=', stack, env);
    assert.equal(res.ok, true);
    if (res.ok) assert.deepEqual(res.value.topValue, { kind: 'boolean', value: true });
  });

  it('debe evaluar comparaciones relacionales (<, >, <=, >=)', () => {
    const stack = new Stack<StackElement>();
    const env = new Environment();

    let res = evaluateLine('5 10 <', stack, env);
    assert.equal(res.ok, true);
    if (res.ok) assert.deepEqual(res.value.topValue, { kind: 'boolean', value: true });

    res = evaluateLine('5 10 >', stack, env);
    assert.equal(res.ok, true);
    if (res.ok) assert.deepEqual(res.value.topValue, { kind: 'boolean', value: false });

    res = evaluateLine('10 10 <=', stack, env);
    assert.equal(res.ok, true);
    if (res.ok) assert.deepEqual(res.value.topValue, { kind: 'boolean', value: true });

    res = evaluateLine('10 9 >=', stack, env);
    assert.equal(res.ok, true);
    if (res.ok) assert.deepEqual(res.value.topValue, { kind: 'boolean', value: true });
  });
});

describe('Evaluador Postfijo - Operadores Booleanos Explícitos (and, or, not)', () => {
  it('debe evaluar conjunción y disyunción (and, or)', () => {
    const stack = new Stack<StackElement>();
    const env = new Environment();

    let res = evaluateLine('true false and', stack, env);
    assert.equal(res.ok, true);
    if (res.ok) assert.deepEqual(res.value.topValue, { kind: 'boolean', value: false });

    res = evaluateLine('true false or', stack, env);
    assert.equal(res.ok, true);
    if (res.ok) assert.deepEqual(res.value.topValue, { kind: 'boolean', value: true });
  });

  it('debe evaluar negación unaria (not)', () => {
    const stack = new Stack<StackElement>();
    const env = new Environment();

    let res = evaluateLine('true not', stack, env);
    assert.equal(res.ok, true);
    if (res.ok) assert.deepEqual(res.value.topValue, { kind: 'boolean', value: false });

    res = evaluateLine('false not', stack, env);
    assert.equal(res.ok, true);
    if (res.ok) assert.deepEqual(res.value.topValue, { kind: 'boolean', value: true });
  });

  it('debe evaluar expresiones booleanas combinadas con comparaciones', () => {
    const stack = new Stack<StackElement>();
    const env = new Environment();

    const res = evaluateLine('10 5 > 20 15 > and', stack, env);
    assert.equal(res.ok, true);
    if (res.ok) assert.deepEqual(res.value.topValue, { kind: 'boolean', value: true });
  });
});
