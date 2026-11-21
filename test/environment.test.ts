/**
 * test/environment.test.ts
 *
 * Pruebas unitarias para la tabla de símbolos (Environment),
 * asignación de variables en RPN, ámbitos locales (Scoping)
 * y sombreado de variables (Shadowing) con 'begin' y 'end'.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { Stack } from '../src/stack.js';
import { Environment } from '../src/environment.js';
import { evaluateLine } from '../src/evaluator.js';
import type { StackElement } from '../src/types.js';

describe('Variables y Asignación en RPN', () => {
  it('debe declarar y asignar una variable (x 10 =)', () => {
    const stack = new Stack<StackElement>();
    const env = new Environment();

    const res = evaluateLine('x 10 =', stack, env);
    assert.equal(res.ok, true);
    assert.equal(env.has('x'), true);
    assert.deepEqual(env.lookup('x'), { kind: 'number', value: 10 });
  });

  it('debe evaluar una expresión compuesta y asignarla a una variable (x 5 2 + =)', () => {
    const stack = new Stack<StackElement>();
    const env = new Environment();

    const res = evaluateLine('x 5 2 + =', stack, env);
    assert.equal(res.ok, true);
    assert.deepEqual(env.lookup('x'), { kind: 'number', value: 7 });
  });

  it('debe evaluar expresiones aritméticas usando variables (x 5 + 2 *)', () => {
    const stack = new Stack<StackElement>();
    const env = new Environment();

    // x = 10
    evaluateLine('x 10 =', stack, env);
    // (x + 5) * 2 = (10 + 5) * 2 = 30
    const res = evaluateLine('x 5 + 2 *', stack, env);
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.deepEqual(res.value.topValue, { kind: 'number', value: 30 });
    }
  });

  it('debe fallar si se utiliza una variable no definida', () => {
    const stack = new Stack<StackElement>();
    const env = new Environment();

    const res = evaluateLine('no_existe 5 +', stack, env);
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.equal(res.error.kind, 'UNDEFINED_VARIABLE');
    }
  });

  it('debe fallar si el destino de asignación no es un identificador (10 20 =)', () => {
    const stack = new Stack<StackElement>();
    const env = new Environment();

    const res = evaluateLine('10 20 =', stack, env);
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.equal(res.error.kind, 'INVALID_ASSIGNMENT');
    }
  });
});

describe('Ámbitos Locales (Scoping) y Sombreado (Shadowing)', () => {
  it('debe crear un entorno hijo con begin y restaurar con end', () => {
    const stack = new Stack<StackElement>();
    let env = new Environment();

    assert.equal(env.depth, 0);

    const beginRes = evaluateLine('begin', stack, env);
    assert.equal(beginRes.ok, true);
    if (beginRes.ok) {
      env = beginRes.value.env;
    }
    assert.equal(env.depth, 1);

    const endRes = evaluateLine('end', stack, env);
    assert.equal(endRes.ok, true);
    if (endRes.ok) {
      env = endRes.value.env;
    }
    assert.equal(env.depth, 0);
  });

  it('debe implementar Shadowing sin alterar la variable global al salir del bloque', () => {
    const stack = new Stack<StackElement>();
    let env = new Environment();

    // 1. Declarar x = 10 en global
    evaluateLine('x 10 =', stack, env);
    assert.deepEqual(env.lookup('x'), { kind: 'number', value: 10 });

    // 2. Abrir bloque local
    const bRes = evaluateLine('begin', stack, env);
    if (bRes.ok) env = bRes.value.env;

    // 3. Modificar x en el ámbito local a 99
    evaluateLine('x 99 =', stack, env);
    assert.deepEqual(env.lookup('x'), { kind: 'number', value: 99 });

    // 4. Declarar variable local z = 500
    evaluateLine('z 500 =', stack, env);
    assert.deepEqual(env.lookup('z'), { kind: 'number', value: 500 });

    // 5. Cerrar bloque local
    const eRes = evaluateLine('end', stack, env);
    if (eRes.ok) env = eRes.value.env;

    // 6. Verificar que la global x sigue intacta con 10 y z ya no existe
    assert.deepEqual(env.lookup('x'), { kind: 'number', value: 10 });
    assert.equal(env.has('z'), false);
  });

  it('debe soportar múltiples niveles anidados de begin/end', () => {
    const stack = new Stack<StackElement>();
    let env = new Environment();

    evaluateLine('x 1 =', stack, env);

    // Nivel 1
    let res = evaluateLine('begin', stack, env);
    if (res.ok) env = res.value.env;
    evaluateLine('x 2 =', stack, env);
    assert.deepEqual(env.lookup('x'), { kind: 'number', value: 2 });

    // Nivel 2
    res = evaluateLine('begin', stack, env);
    if (res.ok) env = res.value.env;
    evaluateLine('x 3 =', stack, env);
    assert.deepEqual(env.lookup('x'), { kind: 'number', value: 3 });

    // Salir de Nivel 2
    res = evaluateLine('end', stack, env);
    if (res.ok) env = res.value.env;
    assert.deepEqual(env.lookup('x'), { kind: 'number', value: 2 });

    // Salir de Nivel 1
    res = evaluateLine('end', stack, env);
    if (res.ok) env = res.value.env;
    assert.deepEqual(env.lookup('x'), { kind: 'number', value: 1 });
  });

  it('debe emitir error SCOPE_ERROR si se ejecuta end en el ámbito global', () => {
    const stack = new Stack<StackElement>();
    const env = new Environment();

    const res = evaluateLine('end', stack, env);
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.equal(res.error.kind, 'SCOPE_ERROR');
    }
  });

  it('el comando vars debe listar variables activas y sus niveles de scope', () => {
    const stack = new Stack<StackElement>();
    let env = new Environment();

    evaluateLine('a 10 =', stack, env);
    const bRes = evaluateLine('begin', stack, env);
    if (bRes.ok) env = bRes.value.env;
    evaluateLine('b 20 =', stack, env);

    const vars = env.getActiveVariables();
    assert.equal(vars.length, 2);
    assert.equal(vars[0].name, 'a');
    assert.equal(vars[0].scopeDepth, 0);
    assert.equal(vars[1].name, 'b');
    assert.equal(vars[1].scopeDepth, 1);
  });
});
