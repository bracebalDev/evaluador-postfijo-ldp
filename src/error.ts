/**
 * error.ts
 *
 * Jerarquía de errores tipados y estructurados para el evaluador postfijo.
 * Permite capturar fallos en tiempo de ejecución de forma controlada sin abortar el REPL.
 */

export type ErrorKind =
  | 'STACK_UNDERFLOW'
  | 'TYPE_ERROR'
  | 'DIVISION_BY_ZERO'
  | 'UNDEFINED_VARIABLE'
  | 'INVALID_ASSIGNMENT'
  | 'SCOPE_ERROR'
  | 'SYNTAX_ERROR';

export class EvaluatorError extends Error {
  readonly kind: ErrorKind;
  readonly details?: string | undefined;

  constructor(kind: ErrorKind, message: string, details?: string | undefined) {
    super(message);
    this.name = 'EvaluatorError';
    this.kind = kind;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static stackUnderflow(operation: string, required: number, found: number): EvaluatorError {
    return new EvaluatorError(
      'STACK_UNDERFLOW',
      `Stack underflow en la operación '${operation}': se requieren ${required} operando(s), pero se encontraron ${found}.`
    );
  }

  static typeMismatch(operation: string, expected: string, actual: string): EvaluatorError {
    return new EvaluatorError(
      'TYPE_ERROR',
      `Error de tipos en '${operation}': se esperaba tipo '${expected}', pero se recibió '${actual}'.`
    );
  }

  static divisionByZero(): EvaluatorError {
    return new EvaluatorError(
      'DIVISION_BY_ZERO',
      'Error aritmético: División por cero.'
    );
  }

  static undefinedVariable(name: string): EvaluatorError {
    return new EvaluatorError(
      'UNDEFINED_VARIABLE',
      `Variable no definida: '${name}'.`
    );
  }

  static invalidAssignment(targetDesc: string): EvaluatorError {
    return new EvaluatorError(
      'INVALID_ASSIGNMENT',
      `Asignación inválida: el operando izquierdo debe ser un identificador válido, se recibió ${targetDesc}.`
    );
  }

  static scopeUnderflow(): EvaluatorError {
    return new EvaluatorError(
      'SCOPE_ERROR',
      "Error de ámbito: 'end' ejecutado sin un bloque 'begin' activo previo."
    );
  }

  static syntaxError(token: string): EvaluatorError {
    return new EvaluatorError(
      'SYNTAX_ERROR',
      `Token no reconocido o sintaxis inválida: '${token}'.`
    );
  }
}
