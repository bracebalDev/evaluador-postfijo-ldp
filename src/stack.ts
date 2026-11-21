// Pila genérica para la evaluación de expresiones RPN.

export class Stack<T> {
  private readonly stackElements: T[];

  constructor(initialElements: readonly T[] = []) {
    this.stackElements = [...initialElements];
  }

  push(element: T): void {
    this.stackElements.push(element);
  }

  pop(): T | undefined {
    return this.stackElements.pop();
  }

  peek(): T | undefined {
    const totalCount = this.stackElements.length;
    return totalCount > 0 ? this.stackElements[totalCount - 1] : undefined;
  }

  size(): number {
    return this.stackElements.length;
  }

  isEmpty(): boolean {
    return this.stackElements.length === 0;
  }

  clear(): void {
    this.stackElements.length = 0;
  }

  toArray(): T[] {
    return [...this.stackElements];
  }

  clone(): Stack<T> {
    return new Stack<T>(this.stackElements);
  }
}
