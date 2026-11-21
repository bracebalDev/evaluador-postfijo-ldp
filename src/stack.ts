/**
 * stack.ts
 *
 * Implementación de la estructura de datos Pila (Stack) genérica en TypeScript.
 * Se diseñó para ser pasada como referencia explícita a las funciones evaluadoras,
 * permitiendo demostrar el manejo de mutabilidad y estado en TypeScript / V8.
 */

export class Stack<T> {
  private readonly stackElements: T[];

  constructor(initialElements: readonly T[] = []) {
    this.stackElements = [...initialElements];
  }

  /**
   * Inserta un elemento en el tope de la pila.
   */
  push(element: T): void {
    this.stackElements.push(element);
  }

  /**
   * Extrae y devuelve el elemento del tope de la pila, o undefined si está vacía.
   */
  pop(): T | undefined {
    return this.stackElements.pop();
  }

  /**
   * Consulta el elemento en el tope sin extraerlo.
   */
  peek(): T | undefined {
    const totalCount = this.stackElements.length;
    return totalCount > 0 ? this.stackElements[totalCount - 1] : undefined;
  }

  /**
   * Cantidad actual de elementos en la pila.
   */
  size(): number {
    return this.stackElements.length;
  }

  /**
   * Determina si la pila está vacía.
   */
  isEmpty(): boolean {
    return this.stackElements.length === 0;
  }

  /**
   * Vacía todos los elementos de la pila.
   */
  clear(): void {
    this.stackElements.length = 0;
  }

  /**
   * Devuelve una copia superficial de los elementos desde el fondo hasta el tope.
   */
  toArray(): T[] {
    return [...this.stackElements];
  }

  /**
   * Crea una copia profunda o independiente de la pila.
   */
  clone(): Stack<T> {
    return new Stack<T>(this.stackElements);
  }
}
