/**
 * environment.ts
 *
 * Implementación del Entorno Léxico (Tabla de Símbolos) con soporte para
 * encadenamiento de ámbitos (Scoping), sombreado de variables (Shadowing)
 * y bloques locales mediante 'begin' y 'end'.
 */

import type { RuntimeValue, VariableInfo } from './types.js';
import { EvaluatorError } from './error.js';

export class Environment {
  private readonly bindings = new Map<string, RuntimeValue>();
  readonly parent: Environment | null;
  readonly depth: number;

  constructor(parent: Environment | null = null) {
    this.parent = parent;
    this.depth = parent ? parent.depth + 1 : 0;
  }

  /**
   * Crea un nuevo ámbito hijo anidado (activado por 'begin').
   */
  createChild(): Environment {
    return new Environment(this);
  }

  /**
   * Cierra el ámbito local actual y retorna el ámbito padre (activado por 'end').
   * Lanza un error controlado si se intenta cerrar el ámbito global.
   */
  popChild(): Environment {
    if (this.parent === null) {
      throw EvaluatorError.scopeUnderflow();
    }
    return this.parent;
  }

  /**
   * Define o asigna una variable en el ámbito local actual.
   * Conforme al requerimiento de la asignación: las variables definidas o modificadas
   * dentro de un bloque local 'begin'...'end' residen en dicho ámbito (shadowing),
   * garantizando que no sobrescriban permanentemente variables homónimas del entorno global.
   */
  define(name: string, value: RuntimeValue): void {
    this.bindings.set(name, value);
  }

  /**
   * Busca el valor de una variable, resolviendo primero en el ámbito actual
   * y ascendiendo en la cadena de padres si no se encuentra (resolución léxica).
   */
  lookup(name: string): RuntimeValue | undefined {
    const local = this.bindings.get(name);
    if (local !== undefined) {
      return local;
    }
    if (this.parent !== null) {
      return this.parent.lookup(name);
    }
    return undefined;
  }

  /**
   * Verifica si una variable existe en este ámbito o en sus ancestros.
   */
  has(name: string): boolean {
    return this.lookup(name) !== undefined;
  }

  /**
   * Retorna una lista con todas las variables visibles actualmente en memoria,
   * indicando su nombre, valor y nivel de profundidad de ámbito.
   * Si una variable local sombrea a una global, se muestra la versión activa.
   */
  getActiveVariables(): VariableInfo[] {
    const resolved = new Map<string, VariableInfo>();

    // Recorremos desde el ámbito actual hacia los padres.
    // De esta forma, el ámbito más interno tiene precedencia (shadowing).
    let current: Environment | null = this;
    while (current !== null) {
      for (const [name, value] of current.bindings.entries()) {
        if (!resolved.has(name)) {
          resolved.set(name, {
            name,
            value,
            scopeDepth: current.depth
          });
        }
      }
      current = current.parent;
    }

    return Array.from(resolved.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Retorna las variables definidas exclusivamente en este nivel de ámbito.
   */
  getLocalBindings(): ReadonlyMap<string, RuntimeValue> {
    return this.bindings;
  }
}
