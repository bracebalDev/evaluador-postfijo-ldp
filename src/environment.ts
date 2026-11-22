// Tabla de símbolos con soporte para ámbitos anidados y shadowing.

import type { RuntimeValue, VariableInfo, Result } from './types.js';
import { ok, err } from './types.js';
import { EvaluatorError } from './error.js';

export class Environment {
  private readonly symbolBindings = new Map<string, RuntimeValue>();
  readonly parent: Environment | null;
  readonly depth: number;

  constructor(parentScope: Environment | null = null) {
    this.parent = parentScope;
    this.depth = parentScope ? parentScope.depth + 1 : 0;
  }

  get parentScope(): Environment | null {
    return this.parent;
  }

  get nestingDepth(): number {
    return this.depth;
  }

  // Crea un nuevo ámbito hijo (usado por begin / scope)
  createChildScope(): Environment {
    return new Environment(this);
  }

  createChild(): Environment {
    return this.createChildScope();
  }

  // Cierra el ámbito actual y regresa al padre (usado por end / endscope)
  popChildScope(): Result<Environment, EvaluatorError> {
    if (this.parent === null) {
      return err(EvaluatorError.scopeUnderflow());
    }
    return ok(this.parent);
  }

  popChild(): Result<Environment, EvaluatorError> {
    return this.popChildScope();
  }

  // Registra o actualiza una variable en el ámbito local actual
  defineVariable(identifierName: string, evaluatedValue: RuntimeValue): void {
    this.symbolBindings.set(identifierName, evaluatedValue);
  }

  define(identifierName: string, evaluatedValue: RuntimeValue): void {
    this.defineVariable(identifierName, evaluatedValue);
  }

  // Busca una variable primero en el entorno local y luego en la cadena de padres
  lookupVariable(identifierName: string): RuntimeValue | undefined {
    const localBinding = this.symbolBindings.get(identifierName);
    if (localBinding !== undefined) {
      return localBinding;
    }
    if (this.parent !== null) {
      return this.parent.lookupVariable(identifierName);
    }
    return undefined;
  }

  lookup(identifierName: string): RuntimeValue | undefined {
    return this.lookupVariable(identifierName);
  }

  hasVariable(identifierName: string): boolean {
    return this.lookupVariable(identifierName) !== undefined;
  }

  has(identifierName: string): boolean {
    return this.hasVariable(identifierName);
  }

  // Retorna todas las variables visibles actualmente en memoria
  getActiveVariables(): VariableInfo[] {
    const resolvedSymbolTable = new Map<string, VariableInfo>();

    let currentScopeNode: Environment | null = this;
    while (currentScopeNode !== null) {
      for (const [identifierName, evaluatedValue] of currentScopeNode.symbolBindings.entries()) {
        if (!resolvedSymbolTable.has(identifierName)) {
          resolvedSymbolTable.set(identifierName, {
            name: identifierName,
            value: evaluatedValue,
            scopeDepth: currentScopeNode.depth
          });
        }
      }
      currentScopeNode = currentScopeNode.parent;
    }

    return Array.from(resolvedSymbolTable.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  getLocalBindings(): ReadonlyMap<string, RuntimeValue> {
    return this.symbolBindings;
  }
}
