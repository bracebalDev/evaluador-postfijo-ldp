/**
 * environment.ts
 *
 * Implementación del Entorno Léxico (Tabla de Símbolos) con soporte para
 * encadenamiento de ámbitos (Scoping), sombreado de variables (Shadowing)
 * y bloques locales mediante 'begin'/'scope' y 'end'/'endscope'.
 * 
 * Utiliza identificadores y métodos mnemotécnicos para reflejar claramente
 * la semántica formal de la tabla de símbolos.
 */

import type { RuntimeValue, VariableInfo } from './types.js';
import { EvaluatorError } from './error.js';

export class Environment {
  private readonly symbolBindings = new Map<string, RuntimeValue>();
  readonly parent: Environment | null;
  readonly depth: number;

  constructor(parentScope: Environment | null = null) {
    this.parent = parentScope;
    this.depth = parentScope ? parentScope.depth + 1 : 0;
  }

  // Alias mnemotécnicos de propiedades para expresividad del código
  get parentScope(): Environment | null {
    return this.parent;
  }

  get nestingDepth(): number {
    return this.depth;
  }

  /**
   * Crea un nuevo ámbito hijo anidado (activado por 'begin' o 'scope').
   */
  createChildScope(): Environment {
    return new Environment(this);
  }

  createChild(): Environment {
    return this.createChildScope();
  }

  /**
   * Cierra el ámbito local actual y retorna el ámbito padre (activado por 'end' o 'endscope').
   * Lanza un error controlado si se intenta cerrar el ámbito raíz o global.
   */
  popChildScope(): Environment {
    if (this.parent === null) {
      throw EvaluatorError.scopeUnderflow();
    }
    return this.parent;
  }

  popChild(): Environment {
    return this.popChildScope();
  }

  /**
   * Define o asigna una variable en la tabla de símbolos del ámbito local actual.
   * Conforme al requerimiento de la asignación: las variables definidas o modificadas
   * dentro de un bloque local 'begin'...'end' residen en dicho ámbito (shadowing),
   * garantizando que no sobrescriban permanentemente variables homónimas del entorno global.
   */
  defineVariable(identifierName: string, evaluatedValue: RuntimeValue): void {
    this.symbolBindings.set(identifierName, evaluatedValue);
  }

  define(identifierName: string, evaluatedValue: RuntimeValue): void {
    this.defineVariable(identifierName, evaluatedValue);
  }

  /**
   * Busca el valor de una variable, resolviendo primero en el ámbito local actual
   * y ascendiendo en la cadena de entornos ancestros si no se encuentra (resolución léxica).
   */
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

  /**
   * Verifica si una variable existe en este ámbito o en sus ancestros.
   */
  hasVariable(identifierName: string): boolean {
    return this.lookupVariable(identifierName) !== undefined;
  }

  has(identifierName: string): boolean {
    return this.hasVariable(identifierName);
  }

  /**
   * Retorna una lista con todas las variables visibles actualmente en memoria,
   * indicando su nombre, valor y nivel de profundidad de ámbito.
   * Si una variable local sombrea a una global, se muestra la versión activa.
   */
  getActiveVariables(): VariableInfo[] {
    const resolvedSymbolTable = new Map<string, VariableInfo>();

    // Recorremos desde el ámbito actual hacia los padres.
    // De esta forma, el ámbito más interno tiene precedencia (shadowing).
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

  /**
   * Retorna las variables definidas exclusivamente en este nivel de ámbito.
   */
  getLocalBindings(): ReadonlyMap<string, RuntimeValue> {
    return this.symbolBindings;
  }
}
