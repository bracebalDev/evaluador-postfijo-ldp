/**
 * stack.ts
 *
 * Implementación de la estructura de datos Pila (Stack) genérica en TypeScript.
 * Se diseñó para ser pasada como referencia explícita a las funciones evaluadoras,
 * permitiendo demostrar el manejo de mutabilidad y estado en TypeScript / V8.
 */

export class Stack<T> {
  private readonly items: T[];

  constructor(initialItems: readonly T[] = []) {
    this.items = [...initialItems];
  }

  /**
   * Inserta un elemento en el tope de la pila.
   */
  push(item: T): void {
    this.items.push(item);
  }

  /**
   * Extrae y devuelve el elemento del tope de la pila, o undefined si está vacía.
   */
  pop(): T | undefined {
    return this.items.pop();
  }

  /**
   * Consulta el elemento en el tope sin extraerlo.
   */
  peek(): T | undefined {
    return this.items.length > 0 ? this.items[this.items.length - 1] : undefined;
  }

  /**
   * Cantidad actual de elementos en la pila.
   */
  size(): number {
    return this.items.length;
  }

  /**
   * Determina si la pila está vacía.
   */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Vacía todos los elementos de la pila.
   */
  clear(): void {
    this.items.length = 0;
  }

  /**
   * Devuelve una copia superficial de los elementos desde el fondo hasta el tope.
   */
  toArray(): T[] {
    return [...this.items];
  }

  /**
   * Crea una copia profunda o independiente de la pila.
   */
  clone(): Stack<T> {
    return new Stack<T>(this.items);
  }
}
