// Motor de evaluación para expresiones en notación postfija (RPN).

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

// Resuelve una referencia simbólica buscando su valor en la tabla de símbolos
export function resolveStackElementValue(
  stackElement: StackElement,
  symbolEnvironment: Environment
): Result<RuntimeValue, EvaluatorError> {
  if (stackElement.kind === 'number' || stackElement.kind === 'boolean') {
    return ok(stackElement);
  }

  const resolvedBinding = symbolEnvironment.lookupVariable(stackElement.name);
  if (resolvedBinding === undefined) {
    return err(EvaluatorError.undefinedVariable(stackElement.name));
  }
  return ok(resolvedBinding);
}

export const resolveValue = resolveStackElementValue;

// Operaciones aritméticas binarias sobre la pila
function evaluateArithmeticOperation(
  operator: ArithmeticOp,
  evaluationStack: Stack<StackElement>,
  symbolEnvironment: Environment
): Result<void, EvaluatorError> {
  if (evaluationStack.size() < 2) {
    return err(EvaluatorError.stackUnderflow(operator, 2, evaluationStack.size()));
  }

  const rightOperandElement = evaluationStack.pop()!;
  const leftOperandElement = evaluationStack.pop()!;

  const rightResolutionResult = resolveStackElementValue(rightOperandElement, symbolEnvironment);
  if (!rightResolutionResult.ok) return rightResolutionResult;

  const leftResolutionResult = resolveStackElementValue(leftOperandElement, symbolEnvironment);
  if (!leftResolutionResult.ok) return leftResolutionResult;

  const rightRuntimeValue = rightResolutionResult.value;
  const leftRuntimeValue = leftResolutionResult.value;

  // Validación estricta de tipos numéricos
  if (leftRuntimeValue.kind !== 'number') {
    return err(EvaluatorError.typeMismatch(operator, 'number', leftRuntimeValue.kind));
  }
  if (rightRuntimeValue.kind !== 'number') {
    return err(EvaluatorError.typeMismatch(operator, 'number', rightRuntimeValue.kind));
  }

  let calculatedNumber: number;
  switch (operator) {
    case '+':
      calculatedNumber = leftRuntimeValue.value + rightRuntimeValue.value;
      break;
    case '-':
      calculatedNumber = leftRuntimeValue.value - rightRuntimeValue.value;
      break;
    case '*':
      calculatedNumber = leftRuntimeValue.value * rightRuntimeValue.value;
      break;
    case '/':
      if (rightRuntimeValue.value === 0) {
        return err(EvaluatorError.divisionByZero());
      }
      calculatedNumber = leftRuntimeValue.value / rightRuntimeValue.value;
      break;
  }

  const computedValue: NumberValue = { kind: 'number', value: calculatedNumber };
  evaluationStack.push(computedValue);
  return ok(undefined);
}

// Comparaciones lógicas y relacionales
function evaluateComparisonOperation(
  operator: ComparisonOp,
  evaluationStack: Stack<StackElement>,
  symbolEnvironment: Environment
): Result<void, EvaluatorError> {
  if (evaluationStack.size() < 2) {
    return err(EvaluatorError.stackUnderflow(operator, 2, evaluationStack.size()));
  }

  const rightOperandElement = evaluationStack.pop()!;
  const leftOperandElement = evaluationStack.pop()!;

  const rightResolutionResult = resolveStackElementValue(rightOperandElement, symbolEnvironment);
  if (!rightResolutionResult.ok) return rightResolutionResult;

  const leftResolutionResult = resolveStackElementValue(leftOperandElement, symbolEnvironment);
  if (!leftResolutionResult.ok) return leftResolutionResult;

  const rightRuntimeValue = rightResolutionResult.value;
  const leftRuntimeValue = leftResolutionResult.value;

  let evaluatedBoolean: boolean;

  if (operator === '==' || operator === '!=') {
    if (leftRuntimeValue.kind !== rightRuntimeValue.kind) {
      return err(
        EvaluatorError.typeMismatch(
          operator,
          `mismo tipo (${leftRuntimeValue.kind})`,
          `tipo incompatible (${rightRuntimeValue.kind})`
        )
      );
    }
    const areValuesEqual = leftRuntimeValue.value === rightRuntimeValue.value;
    evaluatedBoolean = operator === '==' ? areValuesEqual : !areValuesEqual;
  } else {
    if (leftRuntimeValue.kind !== 'number') {
      return err(EvaluatorError.typeMismatch(operator, 'number', leftRuntimeValue.kind));
    }
    if (rightRuntimeValue.kind !== 'number') {
      return err(EvaluatorError.typeMismatch(operator, 'number', rightRuntimeValue.kind));
    }

    switch (operator) {
      case '<':
        evaluatedBoolean = leftRuntimeValue.value < rightRuntimeValue.value;
        break;
      case '>':
        evaluatedBoolean = leftRuntimeValue.value > rightRuntimeValue.value;
        break;
      case '<=':
        evaluatedBoolean = leftRuntimeValue.value <= rightRuntimeValue.value;
        break;
      case '>=':
        evaluatedBoolean = leftRuntimeValue.value >= rightRuntimeValue.value;
        break;
    }
  }

  const computedValue: BooleanValue = { kind: 'boolean', value: evaluatedBoolean };
  evaluationStack.push(computedValue);
  return ok(undefined);
}

// Operadores booleanos explícitos (and, or, not)
function evaluateBooleanOperation(
  operator: BooleanOp,
  evaluationStack: Stack<StackElement>,
  symbolEnvironment: Environment
): Result<void, EvaluatorError> {
  if (operator === 'not') {
    if (evaluationStack.size() < 1) {
      return err(EvaluatorError.stackUnderflow(operator, 1, evaluationStack.size()));
    }
    const operandElement = evaluationStack.pop()!;
    const resolutionResult = resolveStackElementValue(operandElement, symbolEnvironment);
    if (!resolutionResult.ok) return resolutionResult;

    if (resolutionResult.value.kind !== 'boolean') {
      return err(EvaluatorError.typeMismatch(operator, 'boolean', resolutionResult.value.kind));
    }

    const negatedValue: BooleanValue = { kind: 'boolean', value: !resolutionResult.value.value };
    evaluationStack.push(negatedValue);
    return ok(undefined);
  }

  if (evaluationStack.size() < 2) {
    return err(EvaluatorError.stackUnderflow(operator, 2, evaluationStack.size()));
  }

  const rightOperandElement = evaluationStack.pop()!;
  const leftOperandElement = evaluationStack.pop()!;

  const rightResolutionResult = resolveStackElementValue(rightOperandElement, symbolEnvironment);
  if (!rightResolutionResult.ok) return rightResolutionResult;

  const leftResolutionResult = resolveStackElementValue(leftOperandElement, symbolEnvironment);
  if (!leftResolutionResult.ok) return leftResolutionResult;

  const rightRuntimeValue = rightResolutionResult.value;
  const leftRuntimeValue = leftResolutionResult.value;

  if (leftRuntimeValue.kind !== 'boolean') {
    return err(EvaluatorError.typeMismatch(operator, 'boolean', leftRuntimeValue.kind));
  }
  if (rightRuntimeValue.kind !== 'boolean') {
    return err(EvaluatorError.typeMismatch(operator, 'boolean', rightRuntimeValue.kind));
  }

  const evaluatedBoolean =
    operator === 'and'
      ? leftRuntimeValue.value && rightRuntimeValue.value
      : leftRuntimeValue.value || rightRuntimeValue.value;

  const computedValue: BooleanValue = { kind: 'boolean', value: evaluatedBoolean };
  evaluationStack.push(computedValue);
  return ok(undefined);
}

// Asignación de variables en postfijo: <id> <valor> =
function evaluateAssignmentOperation(
  evaluationStack: Stack<StackElement>,
  symbolEnvironment: Environment
): Result<string, EvaluatorError> {
  if (evaluationStack.size() < 2) {
    return err(EvaluatorError.stackUnderflow('=', 2, evaluationStack.size()));
  }

  const valueElement = evaluationStack.pop()!;
  const targetElement = evaluationStack.pop()!;

  if (targetElement.kind !== 'ref') {
    return err(
      EvaluatorError.invalidAssignment(
        `valor de tipo '${targetElement.kind}' en lugar de identificador`
      )
    );
  }

  const valueResolutionResult = resolveStackElementValue(valueElement, symbolEnvironment);
  if (!valueResolutionResult.ok) return valueResolutionResult;

  const resolvedRuntimeValue = valueResolutionResult.value;
  symbolEnvironment.defineVariable(targetElement.name, resolvedRuntimeValue);

  return ok(
    `[Asignación] ${targetElement.name} = ${resolvedRuntimeValue.value} (${resolvedRuntimeValue.kind})`
  );
}

// Procesa un token individual contra la pila y el entorno
export function evaluateToken(
  token: Token,
  evaluationStack: Stack<StackElement>,
  symbolEnvironment: Environment
): Result<{ env: Environment; message?: string; shouldExit?: boolean }, EvaluatorError> {
  switch (token.kind) {
    case 'NUMBER': {
      evaluationStack.push({ kind: 'number', value: token.value });
      return ok({ env: symbolEnvironment });
    }

    case 'BOOLEAN': {
      evaluationStack.push({ kind: 'boolean', value: token.value });
      return ok({ env: symbolEnvironment });
    }

    case 'IDENTIFIER': {
      // Se apila como referencia simbólica para ser evaluada o asignada
      evaluationStack.push({ kind: 'ref', name: token.name });
      return ok({ env: symbolEnvironment });
    }

    case 'OPERATOR': {
      if (token.op === '=') {
        const assignmentResult = evaluateAssignmentOperation(evaluationStack, symbolEnvironment);
        if (!assignmentResult.ok) return assignmentResult;
        return ok({ env: symbolEnvironment, message: assignmentResult.value });
      }

      if (token.op === '+' || token.op === '-' || token.op === '*' || token.op === '/') {
        const arithmeticResult = evaluateArithmeticOperation(token.op, evaluationStack, symbolEnvironment);
        if (!arithmeticResult.ok) return arithmeticResult;
        return ok({ env: symbolEnvironment });
      }

      if (
        token.op === '==' ||
        token.op === '!=' ||
        token.op === '<' ||
        token.op === '>' ||
        token.op === '<=' ||
        token.op === '>='
      ) {
        const comparisonResult = evaluateComparisonOperation(token.op, evaluationStack, symbolEnvironment);
        if (!comparisonResult.ok) return comparisonResult;
        return ok({ env: symbolEnvironment });
      }

      if (token.op === 'and' || token.op === 'or' || token.op === 'not') {
        const booleanResult = evaluateBooleanOperation(token.op, evaluationStack, symbolEnvironment);
        if (!booleanResult.ok) return booleanResult;
        return ok({ env: symbolEnvironment });
      }

      return err(EvaluatorError.syntaxError(token.raw));
    }

    case 'COMMAND': {
      switch (token.command) {
        case 'begin':
        case 'scope': {
          const childEnvironment = symbolEnvironment.createChildScope();
          return ok({
            env: childEnvironment,
            message: `[Scope] Bloque local iniciado (Nivel ${childEnvironment.depth}).`
          });
        }

        case 'end':
        case 'endscope': {
          const popResult = symbolEnvironment.popChildScope();
          if (!popResult.ok) {
            return popResult;
          }
          const parentEnvironment = popResult.value;
          return ok({
            env: parentEnvironment,
            message: `[Scope] Bloque local cerrado. Restaurado a Nivel ${parentEnvironment.depth}.`
          });
        }

        case 'vars':
        case 'env':
        case 'symbols': {
          const activeVariables = symbolEnvironment.getActiveVariables();
          if (activeVariables.length === 0) {
            return ok({
              env: symbolEnvironment,
              message: '[Variables] No hay variables definidas en memoria.'
            });
          }
          const formattedVariables = activeVariables
            .map((variableInfo) => {
              const scopeLabel =
                variableInfo.scopeDepth === 0
                  ? 'global [0]'
                  : `local [${variableInfo.scopeDepth}]`;
              return `  ${variableInfo.name} = ${variableInfo.value.value} (${variableInfo.value.kind}, ${scopeLabel})`;
            })
            .join('\n');
          return ok({ env: symbolEnvironment, message: `[Variables Activas]\n${formattedVariables}` });
        }

        case 'stack': {
          if (evaluationStack.isEmpty()) {
            return ok({ env: symbolEnvironment, message: '[Pila] (vacía)' });
          }
          const formattedStackElements = evaluationStack.toArray().map((element, index) => {
            if (element.kind === 'ref') {
              const resolved = symbolEnvironment.lookupVariable(element.name);
              const valueDescription =
                resolved !== undefined ? `${resolved.value} (${resolved.kind})` : 'no definida';
              return `  [${index}]: Ref('${element.name}') -> ${valueDescription}`;
            }
            return `  [${index}]: ${element.value} (${element.kind})`;
          });
          return ok({
            env: symbolEnvironment,
            message: `[Contenido de la Pila]\n${formattedStackElements.join('\n')}`
          });
        }

        case 'clear': {
          evaluationStack.clear();
          return ok({ env: symbolEnvironment, message: '[Pila] Pila vaciada correctamente.' });
        }

        case 'help': {
          const helpMessage = [
            'Comandos del Evaluador Postfijo (RPN):',
            '  <núm> <núm> + | - | * | /    : Operaciones aritméticas',
            '  <val> <val> == | !=          : Comparaciones de igualdad',
            '  <núm> <núm> < | > | <= | >=  : Comparaciones relacionales',
            '  <bool> <bool> and | or       : Operaciones lógicas booleanas',
            '  <bool> not                   : Negación lógica',
            '  <id> <expr> =                : Asignación de variables (ej. x 10 =, total 5 2 + =)',
            '  begin / end                  : Control de ámbito local (shadowing)',
            '  vars                         : Listar variables activas y nivel de scope',
            '  stack                        : Ver el estado de la pila',
            '  clear                        : Limpiar la pila',
            '  help                         : Mostrar esta ayuda',
            '  exit                         : Salir del REPL'
          ].join('\n');
          return ok({ env: symbolEnvironment, message: helpMessage });
        }

        case 'exit': {
          return ok({ env: symbolEnvironment, shouldExit: true });
        }
      }
    }
  }
}

// Evalúa una línea completa de texto
export function evaluateLine(
  expressionLine: string,
  evaluationStack: Stack<StackElement>,
  symbolEnvironment: Environment
): Result<EvaluationResult, EvaluatorError> {
  const tokenizationResult = tokenize(expressionLine);
  if (!tokenizationResult.ok) {
    return tokenizationResult;
  }

  const tokens = tokenizationResult.value;
  if (tokens.length === 0) {
    return ok({ env: symbolEnvironment });
  }

  // Respaldo de la pila para restaurarla en caso de error en la línea
  const backupEvaluationStack = evaluationStack.clone();
  let activeEnvironment = symbolEnvironment;
  const collectedMessages: string[] = [];
  let shouldTerminateExecution = false;

  for (const token of tokens) {
    const tokenEvaluationResult = evaluateToken(token, evaluationStack, activeEnvironment);
    if (!tokenEvaluationResult.ok) {
      evaluationStack.clear();
      for (const item of backupEvaluationStack.toArray()) {
        evaluationStack.push(item);
      }
      return tokenEvaluationResult;
    }

    activeEnvironment = tokenEvaluationResult.value.env;
    if (tokenEvaluationResult.value.message) {
      collectedMessages.push(tokenEvaluationResult.value.message);
    }
    if (tokenEvaluationResult.value.shouldExit) {
      shouldTerminateExecution = true;
    }
  }

  let topRuntimeValue: RuntimeValue | undefined = undefined;
  if (!evaluationStack.isEmpty()) {
    const topElement = evaluationStack.peek()!;
    const resolvedResult = resolveStackElementValue(topElement, activeEnvironment);
    if (resolvedResult.ok) {
      topRuntimeValue = resolvedResult.value;
    }
  }

  return ok({
    env: activeEnvironment,
    topValue: topRuntimeValue,
    message: collectedMessages.length > 0 ? collectedMessages.join('\n') : undefined,
    shouldExit: shouldTerminateExecution
  });
}
