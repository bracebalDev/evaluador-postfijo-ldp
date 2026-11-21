/**
 * test/environment.test.ts
 *
 * Pruebas unitarias para la tabla de símbolos (Environment),
 * asignación de variables en RPN, ámbitos locales (Scoping)
 * y sombreado de variables (Shadowing) con 'begin' y 'end'.
 * Desarrollado con fines académicos por Brayan Ceballos y Andrés Crespo.
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
    assert.equal(env.hasVariable('x'), true);
    assert.deepEqual(env.lookupVariable('x'), { kind: 'number', value: 10 });
  });

  it('debe evaluar una expresión compuesta y asignarla a una variable (x 5 2 + =)', () => {
    const stack = new Stack<StackElement>();
    const env = new Environment();

    const res = evaluateLine('x 5 2 + =', stack, env);
    assert.equal(res.ok, true);
    assert.deepEqual(env.lookupVariable('x'), { kind: 'number', value: 7 });
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
    if (!resultNotOk(res)) return;
    assert.equal(res.error.kind, 'UNDEFINED_VARIABLE');
  });

  it('debe fallar si el destino de asignación no es un identificador (10 20 =)', () => {
    const stack = new Stack<StackElement>();
    const env = new Environment();

    const res = evaluateLine('10 20 =', stack, env);
    assert.equal(res.ok, false);
    if (!resultNotOk(res)) return;
    assert.equal(res.error.kind, 'INVALID_ASSIGNMENT');
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

  it('debe implementar Shadowing sin alterar la variable global x al salir del bloque', () => {
    const stack = new Stack<StackElement>();
    let env = new Environment();

    // 1. Declarar x = 10 en global
    evaluateLine('x 10 =', stack, env);
    assert.deepEqual(env.lookupVariable('x'), { kind: 'number', value: 10 });

    // 2. Abrir ámbito local con begin
    const beginRes = evaluateLine('begin', stack, env);
    if (beginRes.ok) env = beginRes.value.env;

    // 3. Sombreado: x = 99 y z = 500 en ámbito local
    evaluateLine('x 99 =', stack, env);
    evaluateLine('z 500 =', stack, env);
    assert.deepEqual(env.lookupVariable('x'), { kind: 'number', value: 99 });
    assert.deepEqual(env.lookupVariable('z'), { kind: 'number', value: 500 });

    // 4. Cerrar ámbito local con end
    const endRes = evaluateLine('end', stack, env);
    if (endRes.ok) env = endRes.value.env;

    // 5. x retoma su valor global (10) y z ya no existe
    assert.deepEqual(env.lookupVariable('x'), { kind: 'number', value: 10 });
    assert.equal(env.lookupVariable('z'), undefined);
  });

  it('debe soportar múltiples niveles anidados de begin/end con shadowing de x', () => {
    const stack = new Stack<StackElement>();
    let env = new Environment();

    // Nivel 0 (Global)
    evaluateLine('x 100 =', stack, env);

    // Nivel 1
    let r1 = evaluateLine('begin', stack, env);
    if (r1.ok) env = r1.value.env;
    evaluateLine('x 200 =', stack, env);
    assert.deepEqual(env.lookupVariable('x'), { kind: 'number', value: 200 });

    // Nivel 2
    let r2 = evaluateLine('begin', stack, env);
    if (r2.ok) env = r2.value.env;
    evaluateLine('x 300 =', stack, env);
    assert.deepEqual(env.lookupVariable('x'), { kind: 'number', value: 300 });

    // Salir de Nivel 2 -> Nivel 1
    let c2 = evaluateLine('end', stack, env);
    if (c2.ok) env = c2.value.env;
    assert.deepEqual(env.lookupVariable('x'), { kind: 'number', value: 200 });

    // Salir de Nivel 1 -> Nivel 0
    let c1 = evaluateLine('end', stack, env);
    if (c1.ok) env = c1.value.env;
    assert.deepEqual(env.lookupVariable('x'), { kind: 'number', value: 100 });
  });

  it('debe emitir error SCOPE_ERROR si se ejecuta end en el ámbito global', () => {
    const stack = new Stack<StackElement>();
    const env = new Environment();

    const res = evaluateLine('end', stack, env);
    assert.equal(res.ok, false);
    if (!resultNotOk(res)) return;
    assert.equal(res.error.kind, 'SCOPE_ERROR');
  });

  it('el comando vars debe listar variables activas y sus niveles de scope', () => {
    const stack = new Stack<StackElement>();
    let env = new Environment();

    evaluateLine('x 10 =', stack, env);
    let rScope = evaluateLine('begin', stack, env);
    if (rScope.ok) env = rScope.value.env;
    evaluateLine('y 20 =', stack, env);

    const varsRes = evaluateLine('vars', stack, env);
    assert.equal(varsRes.ok, true);
    if (varsRes.ok) {
      assert.match(varsRes.value.message ?? '', /x = 10 \(number, global \[0\]\)/);
      assert.match(varsRes.value.message ?? '', /y = 20 \(number, local \[1\]\)/);
    }
  });
});

function resultNotOk<T, E>(result: { ok: true; value: T } | { ok: false; error: E }): result is { ok: false; error: E } {
  return !result.ok;
}
