/**
 * evaluator.ts
 *
 * Motor de evaluación para Notación Polaca Inversa (RPN) basada en pila.
 * Demuestra:
 *  - Paso explícito de la pila y tabla de símbolos como referencias mutables.
 *  - Chequeo dinámico de tipos con discriminated unions.
 *  - Manejo funcional de errores mediante el tipo Result<T, E>.
 *  - Operaciones aritméticas (+, -, *, /), comparaciones (==, !=, <, >, <=, >=)
 *    y booleanas explícitas (and, or, not).
 *  - Asignación de variables (x 10 =, x 5 2 + =) y resolución léxica.
 *  - Comandos de control de ámbito (begin, end) y visualización (vars, stack, clear).
 */

import type {
  Token,
  StackElement,
  RuntimeValue,
  NumberValue,
  BooleanValue,
  ArithmeticOp,
  ComparisonOp,
  BooleanOp,
  Result
} from './types.js';
import { ok, err } from './types.js';
import { Stack } from './stack.js';
import { Environment } from './environment.js';
import { EvaluatorError } from './error.js';
import { tokenize } from './lexer.js';

export interface EvaluationResult {
  readonly env: Environment;
  readonly topValue?: RuntimeValue | undefined;
  readonly message?: string | undefined;
  readonly shouldExit?: boolean | undefined;
}

/**
 * Resuelve un elemento de la pila a su valor final en tiempo de ejecución.
 * Si es un NumberValue o BooleanValue, lo retorna directamente.
 * Si es un VariableRef, busca su definición en el entorno léxico (Environment).
 */
export function resolveValue(
  element: StackElement,
  env: Environment
): Result<RuntimeValue, EvaluatorError> {
  if (element.kind === 'number' || element.kind === 'boolean') {
    return ok(element);
  }

  // element.kind === 'ref'
  const found = env.lookup(element.name);
  if (found === undefined) {
    return err(EvaluatorError.undefinedVariable(element.name));
  }
  return ok(found);
}

/**
 * Ejecuta una operación aritmética binaria (+, -, *, /).
 * Extrae dos operandos de la pila, verifica que ambos sean numéricos
 * y apila el resultado numérico correspondiente.
 */
function executeArithmetic(
  op: ArithmeticOp,
  stack: Stack<StackElement>,
  env: Environment
): Result<void, EvaluatorError> {
  if (stack.size() < 2) {
    return err(EvaluatorError.stackUnderflow(op, 2, stack.size()));
  }

  const rightElem = stack.pop()!;
  const leftElem = stack.pop()!;

  const rightRes = resolveValue(rightElem, env);
  if (!rightRes.ok) return rightRes;

  const leftRes = resolveValue(leftElem, env);
  if (!leftRes.ok) return leftRes;

  const right = rightRes.value;
  const left = leftRes.value;

  // Chequeo dinámico de tipos estricto
  if (left.kind !== 'number') {
    return err(EvaluatorError.typeMismatch(op, 'number', left.kind));
  }
  if (right.kind !== 'number') {
    return err(EvaluatorError.typeMismatch(op, 'number', right.kind));
  }

  let resultNum: number;
  switch (op) {
    case '+':
      resultNum = left.value + right.value;
      break;
    case '-':
      resultNum = left.value - right.value;
      break;
    case '*':
      resultNum = left.value * right.value;
      break;
    case '/':
      if (right.value === 0) {
        return err(EvaluatorError.divisionByZero());
      }
      resultNum = left.value / right.value;
      break;
  }

  const resValue: NumberValue = { kind: 'number', value: resultNum };
  stack.push(resValue);
  return ok(undefined);
}

/**
 * Ejecuta una operación de comparación (==, !=, <, >, <=, >=).
 * Para <, >, <=, >= requiere que ambos operandos sean numéricos.
 * Para == y != permite comparar valores del mismo tipo.
 */
function executeComparison(
  op: ComparisonOp,
  stack: Stack<StackElement>,
  env: Environment
): Result<void, EvaluatorError> {
  if (stack.size() < 2) {
    return err(EvaluatorError.stackUnderflow(op, 2, stack.size()));
  }

  const rightElem = stack.pop()!;
  const leftElem = stack.pop()!;

  const rightRes = resolveValue(rightElem, env);
  if (!rightRes.ok) return rightRes;

  const leftRes = resolveValue(leftElem, env);
  if (!leftRes.ok) return leftRes;

  const right = rightRes.value;
  const left = leftRes.value;

  let boolResult: boolean;

  if (op === '==' || op === '!=') {
    // Si los tipos no coinciden, reportamos error de tipo para reforzar chequeo estricto
    if (left.kind !== right.kind) {
      return err(
        EvaluatorError.typeMismatch(
          op,
          `mismo tipo (${left.kind})`,
          `tipo incompatible (${right.kind})`
        )
      );
    }
    const isEqual = left.value === right.value;
    boolResult = op === '==' ? isEqual : !isEqual;
  } else {
    // Relacionales: <, >, <=, >=
    if (left.kind !== 'number') {
      return err(EvaluatorError.typeMismatch(op, 'number', left.kind));
    }
    if (right.kind !== 'number') {
      return err(EvaluatorError.typeMismatch(op, 'number', right.kind));
    }

    switch (op) {
      case '<':
        boolResult = left.value < right.value;
        break;
      case '>':
        boolResult = left.value > right.value;
        break;
      case '<=':
        boolResult = left.value <= right.value;
        break;
      case '>=':
        boolResult = left.value >= right.value;
        break;
    }
  }

  const resValue: BooleanValue = { kind: 'boolean', value: boolResult };
  stack.push(resValue);
  return ok(undefined);
}

/**
 * Ejecuta operaciones booleanas explícitas (and, or, not).
 */
function executeBoolean(
  op: BooleanOp,
  stack: Stack<StackElement>,
  env: Environment
): Result<void, EvaluatorError> {
  if (op === 'not') {
    if (stack.size() < 1) {
      return err(EvaluatorError.stackUnderflow(op, 1, stack.size()));
    }
    const elem = stack.pop()!;
    const res = resolveValue(elem, env);
    if (!res.ok) return res;

    if (res.value.kind !== 'boolean') {
      return err(EvaluatorError.typeMismatch(op, 'boolean', res.value.kind));
    }

    const value: BooleanValue = { kind: 'boolean', value: !res.value.value };
    stack.push(value);
    return ok(undefined);
  }

  // and, or (binarios)
  if (stack.size() < 2) {
    return err(EvaluatorError.stackUnderflow(op, 2, stack.size()));
  }

  const rightElem = stack.pop()!;
  const leftElem = stack.pop()!;

  const rightRes = resolveValue(rightElem, env);
  if (!rightRes.ok) return rightRes;

  const leftRes = resolveValue(leftElem, env);
  if (!leftRes.ok) return leftRes;

  const right = rightRes.value;
  const left = leftRes.value;

  if (left.kind !== 'boolean') {
    return err(EvaluatorError.typeMismatch(op, 'boolean', left.kind));
  }
  if (right.kind !== 'boolean') {
    return err(EvaluatorError.typeMismatch(op, 'boolean', right.kind));
  }

  const boolVal = op === 'and' ? left.value && right.value : left.value || right.value;
  const value: BooleanValue = { kind: 'boolean', value: boolVal };
  stack.push(value);
  return ok(undefined);
}

/**
 * Ejecuta la asignación postfija de variables (operador '=').
 * Sintaxis esperada:
 *   x 10 =
 *   x 5 2 + =
 * En la pila, el tope es el valor asignado y el elemento anterior es la referencia destino.
 */
function executeAssignment(
  stack: Stack<StackElement>,
  env: Environment
): Result<string, EvaluatorError> {
  if (stack.size() < 2) {
    return err(EvaluatorError.stackUnderflow('=', 2, stack.size()));
  }

  // Extraer valor (derecho)
  const valElem = stack.pop()!;
  // Extraer destino (izquierdo)
  const targetElem = stack.pop()!;

  if (targetElem.kind !== 'ref') {
    return err(
      EvaluatorError.invalidAssignment(
        `valor de tipo '${targetElem.kind}' en lugar de identificador`
      )
    );
  }

  const valRes = resolveValue(valElem, env);
  if (!valRes.ok) return valRes;

  const runtimeValue = valRes.value;
  env.define(targetElem.name, runtimeValue);

  return ok(`[Asignación] ${targetElem.name} = ${runtimeValue.value} (${runtimeValue.kind})`);
}

/**
 * Evalúa un único token sobre la pila y el entorno proporcionados explícitamente.
 * Retorna un Result indicando éxito o error, junto con el entorno activo (que puede cambiar con begin/end).
 */
export function evaluateToken(
  token: Token,
  stack: Stack<StackElement>,
  env: Environment
): Result<{ env: Environment; message?: string; shouldExit?: boolean }, EvaluatorError> {
  switch (token.kind) {
    case 'NUMBER': {
      stack.push({ kind: 'number', value: token.value });
      return ok({ env });
    }

    case 'BOOLEAN': {
      stack.push({ kind: 'boolean', value: token.value });
      return ok({ env });
    }

    case 'IDENTIFIER': {
      // Se coloca como referencia simbólica en la pila.
      // Se resolverá a su valor cuando sea requerida por un operador,
      // o servirá como destino si le sigue una asignación '='.
      stack.push({ kind: 'ref', name: token.name });
      return ok({ env });
    }

    case 'OPERATOR': {
      if (token.op === '=') {
        const assignRes = executeAssignment(stack, env);
        if (!assignRes.ok) return assignRes;
        return ok({ env, message: assignRes.value });
      }

      if (token.op === '+' || token.op === '-' || token.op === '*' || token.op === '/') {
        const arithRes = executeArithmetic(token.op, stack, env);
        if (!arithRes.ok) return arithRes;
        return ok({ env });
      }

      if (
        token.op === '==' ||
        token.op === '!=' ||
        token.op === '<' ||
        token.op === '>' ||
        token.op === '<=' ||
        token.op === '>='
      ) {
        const compRes = executeComparison(token.op, stack, env);
        if (!compRes.ok) return compRes;
        return ok({ env });
      }

      if (token.op === 'and' || token.op === 'or' || token.op === 'not') {
        const boolRes = executeBoolean(token.op, stack, env);
        if (!boolRes.ok) return boolRes;
        return ok({ env });
      }

      return err(EvaluatorError.syntaxError(token.raw));
    }

    case 'COMMAND': {
      switch (token.command) {
        case 'begin': {
          const childEnv = env.createChild();
          return ok({
            env: childEnv,
            message: `[Scope] Bloque local iniciado (Nivel ${childEnv.depth}).`
          });
        }

        case 'end': {
          try {
            const parentEnv = env.popChild();
            return ok({
              env: parentEnv,
              message: `[Scope] Bloque local cerrado. Restaurado a Nivel ${parentEnv.depth}.`
            });
          } catch (e) {
            if (e instanceof EvaluatorError) {
              return err(e);
            }
            throw e;
          }
        }

        case 'vars': {
          const vars = env.getActiveVariables();
          if (vars.length === 0) {
            return ok({ env, message: '[Variables] No hay variables definidas en memoria.' });
          }
          const formatted = vars
            .map((v) => {
              const scopeLabel = v.scopeDepth === 0 ? 'global [0]' : `local [${v.scopeDepth}]`;
              return `  ${v.name} = ${v.value.value} (${v.value.kind}, ${scopeLabel})`;
            })
            .join('\n');
          return ok({ env, message: `[Variables Activas]\n${formatted}` });
        }

        case 'stack': {
          if (stack.isEmpty()) {
            return ok({ env, message: '[Pila] (vacía)' });
          }
          const elements = stack.toArray().map((elem, idx) => {
            if (elem.kind === 'ref') {
              const res = env.lookup(elem.name);
              const valDesc = res !== undefined ? `${res.value} (${res.kind})` : 'no definida';
              return `  [${idx}]: Ref('${elem.name}') -> ${valDesc}`;
            }
            return `  [${idx}]: ${elem.value} (${elem.kind})`;
          });
          return ok({ env, message: `[Contenido de la Pila]\n${elements.join('\n')}` });
        }

        case 'clear': {
          stack.clear();
          return ok({ env, message: '[Pila] Pila vaciada correctamente.' });
        }

        case 'help': {
          const helpText = [
            'Comandos del Evaluador Postfijo (RPN):',
            '  <núm> <núm> + | - | * | /    : Operaciones aritméticas',
            '  <val> <val> == | !=          : Comparaciones de igualdad',
            '  <núm> <núm> < | > | <= | >=  : Comparaciones relacionales',
            '  <bool> <bool> and | or       : Operaciones lógicas booleanas',
            '  <bool> not                   : Negación lógica',
            '  <id> <expr> =                : Asignación de variables (ej. x 10 =)',
            '  begin / end                  : Apertura y cierre de ámbito local (shadowing)',
            '  vars                         : Listar variables activas y sus niveles de scope',
            '  stack                        : Inspeccionar el estado de la pila',
            '  clear                        : Limpiar todos los elementos de la pila',
            '  help                         : Mostrar esta ayuda',
            '  exit                         : Salir del REPL'
          ].join('\n');
          return ok({ env, message: helpText });
        }

        case 'exit': {
          return ok({ env, shouldExit: true });
        }
      }
    }
  }
}

/**
 * Evalúa una línea de texto completa en notación postfija.
 * Pasa de forma explícita las referencias a la pila y a la tabla de símbolos.
 * En caso de error, restaura el estado previo de la pila para prevenir corrupción.
 */
export function evaluateLine(
  line: string,
  stack: Stack<StackElement>,
  env: Environment
): Result<EvaluationResult, EvaluatorError> {
  const tokenResult = tokenize(line);
  if (!tokenResult.ok) {
    return tokenResult;
  }

  const tokens = tokenResult.value;
  if (tokens.length === 0) {
    return ok({ env });
  }

  // Clon de respaldo de la pila para atomicidad por línea en caso de error
  const backupStack = stack.clone();
  let currentEnv = env;
  const messages: string[] = [];
  let shouldExit = false;

  for (const token of tokens) {
    const res = evaluateToken(token, stack, currentEnv);
    if (!res.ok) {
      // Restauramos la pila para evitar estados inconsistentes
      stack.clear();
      for (const item of backupStack.toArray()) {
        stack.push(item);
      }
      return res;
    }

    currentEnv = res.value.env;
    if (res.value.message) {
      messages.push(res.value.message);
    }
    if (res.value.shouldExit) {
      shouldExit = true;
    }
  }

  // Inspección del tope de la pila tras evaluar la línea
  let topValue: RuntimeValue | undefined = undefined;
  if (!stack.isEmpty()) {
    const topElem = stack.peek()!;
    const resolved = resolveValue(topElem, currentEnv);
    if (resolved.ok) {
      topValue = resolved.value;
    }
  }

  return ok({
    env: currentEnv,
    topValue,
    message: messages.length > 0 ? messages.join('\n') : undefined,
    shouldExit
  });
}
