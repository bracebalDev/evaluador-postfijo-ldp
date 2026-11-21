# Universidad de Carabobo
## Facultad Experimental de Ciencias y Tecnología (FACYT)
### Departamento de Computación — Cátedra de Lenguajes de Programación
### Semestre 1-2026

---

# Reporte Técnico: Implementación y Análisis de un Evaluador Postfijo (RPN) en TypeScript

**Autores:** Brayan Ceballos y Andrés Crespo  
**Docente:** Prof. Jesús Pelay  
**Asignatura:** Lenguajes de Programación (CAO604)  
**Propósito:** Proyecto académico (Asignación #1)  

---

## Introducción

Este informe corresponde a la Parte I de la primera asignación de la materia Lenguajes de Programación. Para el desarrollo del proyecto seleccionamos **TypeScript** (ejecutado sobre Node.js y el motor V8), con el objetivo de construir un evaluador de expresiones en Notación Polaca Inversa (RPN) mediante una interfaz interactiva de consola (REPL).

El desarrollo de este evaluador nos permitió contrastar directamente las características formales del lenguaje (especificación ECMAScript / TypeScript) con su comportamiento en tiempo de ejecución. El análisis cubre cuatro temas clave:

1. Manejo de identificadores, vinculación de variables, estructuras de control y alcance (*scoping*).
2. El sistema de tipos estático de TypeScript frente a la necesidad de verificar tipos en tiempo de ejecución.
3. Subrutinas, paso de parámetros (*call-by-sharing*) y el ciclo de vida de los objetos en memoria.
4. Abstracción de datos, encapsulamiento y modelado mediante tipos algebraicos (*tagged unions*).

---

## 1. Nombres, Vinculación, Control de Flujo y Alcance

### 1.1. Reglas Léxicas para Identificadores

En TypeScript, los identificadores siguen las reglas generales de ECMAScript: deben iniciar con una letra, un guion bajo (`_`) o el signo `$`, seguidos de caracteres alfanuméricos. 

Para nuestro evaluador, construimos un analizador léxico (`src/lexer.ts`) que valida los nombres de variables usando una expresión regular estándar:

```typescript
const IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
```

Esto permite procesar tanto nombres genéricos (`x`, `y`, `total`) como identificadores más largos sin ambigüedad frente a los operadores o literales numéricos.

### 1.2. Declaración y Vinculación (*Binding*)

En el código fuente de TypeScript usamos las tres formas de declaración que ofrece el lenguaje:

- `const`: Crea un enlace inmutable. La variable no se puede reasignar. Si apunta a una estructura compleja (como una clase o un arreglo), el contenido del objeto puede mutar, pero el puntero no.
- `let`: Crea una variable mutable con alcance de bloque. La usamos donde el estado cambia durante la iteración o reevaluación.
- `var`: Alcance de función con *hoisting*. Se evitó por completo en el proyecto, siguiendo las buenas prácticas modernas de TypeScript.

En las interfaces del evaluador usamos `readonly` en cada propiedad:

```typescript
export interface VariableRef {
  readonly kind: 'ref';
  readonly name: string;
}
```

Así el compilador nos advierte si intentamos modificar accidentalmente un token o una referencia una vez creada.

### 1.3. Reglas de Alcance (*Scoping*) y Sombreado (*Shadowing*)

TypeScript utiliza alcance léxico o estático: la visibilidad de una variable queda fijada en el código fuente por la jerarquía de llaves `{ ... }`. Las variables declaradas con `let` o `const` no son accesibles antes de su declaración debido a la *Temporal Dead Zone* (TDZ).

Para cumplir con el requisito de bloques locales en el evaluador RPN (`begin` y `end`), implementamos una clase `Environment` (`src/environment.ts`) que funciona como una lista enlazada de tablas de símbolos:

```typescript
export class Environment {
  private readonly symbolBindings = new Map<string, RuntimeValue>();
  readonly parent: Environment | null;
  readonly depth: number;

  constructor(parentScope: Environment | null = null) {
    this.parent = parentScope;
    this.depth = parentScope ? parentScope.depth + 1 : 0;
  }

  createChildScope(): Environment {
    return new Environment(this);
  }

  popChildScope(): Environment {
    if (this.parent === null) {
      throw EvaluatorError.scopeUnderflow();
    }
    return this.parent;
  }
```

Cuando el usuario escribe `begin`, el evaluador llama a `createChildScope()`, creando un nuevo entorno que apunta al anterior como `parent`. Si se declara o modifica una variable dentro del bloque con `defineVariable`, el cambio se guarda únicamente en el `Map` del ámbito actual:

```typescript
defineVariable(identifierName: string, evaluatedValue: RuntimeValue): void {
  this.symbolBindings.set(identifierName, evaluatedValue);
}

lookupVariable(identifierName: string): RuntimeValue | undefined {
  const localBinding = this.symbolBindings.get(identifierName);
  if (localBinding !== undefined) {
    return localBinding; // Prioridad al ámbito local (Shadowing)
  }
  if (this.parent !== null) {
    return this.parent.lookupVariable(identifierName); // Búsqueda ascendente
  }
  return undefined;
}
```

Al llegar a `end`, la referencia activa vuelve a ser `this.parent`. Como el entorno hijo queda sin referencias, el recolector de basura de V8 lo descarta y las variables globales conservan su valor previo, logrando el sombreado correcto sin efectos secundarios.

### 1.4. Estructuras de Control

En el motor de evaluación usamos principalmente `switch` sobre uniones discriminadas. TypeScript comprueba de forma exhaustiva los casos posibles según el discriminador `token.kind` o `token.command`, lo que ayuda a evitar ramas olvidadas durante la tokenización o la ejecución.

---

## 2. Sistema de Tipos y Chequeo

### 2.1. Tipado Estático y Borrado de Tipos (*Type Erasure*)

El sistema de tipos de TypeScript opera únicamente en tiempo de compilación. Cuando el código pasa por `tsc`, todas las anotaciones de tipos e interfaces desaparecen por completo, dejando JavaScript plano.

Esto genera una situación interesante para un evaluador de expresiones: TypeScript no puede chequear en compilación los datos que el usuario introduce en la consola. Por lo tanto, tuvimos que implementar un sistema de tipos en tiempo de ejecución propio del evaluador.

### 2.2. Tipos de Datos del Evaluador (*Tagged Unions*)

Para diferenciar números de booleanos en la pila, definimos estructuras con un campo discriminador literal `kind`:

```typescript
export interface NumberValue {
  readonly kind: 'number';
  readonly value: number;
}

export interface BooleanValue {
  readonly kind: 'boolean';
  readonly value: boolean;
}

export type RuntimeValue = NumberValue | BooleanValue;
```

Gracias a esto, TypeScript nos permite usar *type narrowing* en el código fuente, y a la vez podemos inspeccionar `kind` en tiempo de ejecución antes de cualquier cálculo:

```typescript
// Chequeo dinámico en operaciones aritméticas
if (leftRuntimeValue.kind !== 'number') {
  return err(EvaluatorError.typeMismatch(operator, 'number', leftRuntimeValue.kind));
}
if (rightRuntimeValue.kind !== 'number') {
  return err(EvaluatorError.typeMismatch(operator, 'number', rightRuntimeValue.kind));
}
```

Si el usuario prueba una instrucción inválida como `5 true +`, el evaluador detecta que el segundo operando no es de tipo `'number'` y devuelve un error descriptivo sin que el programa aborte.

### 2.3. Tipado Estructural frente a Tipado Nominal

A diferencia de lenguajes como C++ o Java, donde dos tipos son distintos si tienen nombres diferentes, TypeScript utiliza equivalencia estructural (*duck typing*). Dos interfaces con exactamente las mismas propiedades son intercambiables. 

Para evitar confusiones entre tipos con estructuras similares, el discriminador literal `kind: 'number'` frente a `kind: 'boolean'` garantiza que el compilador no los considere compatibles entre sí.

---

## 3. Subrutinas, Paso de Parámetros y Manejo de Memoria

### 3.1. Subrutinas como Entidades de Primer Orden

En TypeScript las funciones son ciudadanos de primer orden: pueden pasarse como argumentos, retornarse desde otras funciones y asignarse a variables. En nuestro diseño estructuramos la evaluación dividiendo cada responsabilidad en funciones mnemotécnicas:
- `evaluateArithmeticOperation`
- `evaluateComparisonOperation`
- `evaluateBooleanOperation`
- `evaluateAssignmentOperation`

### 3.2. Paso de Parámetros: *Call-by-Sharing*

El modelo de paso de argumentos en JavaScript y TypeScript es estrictamente *call-by-sharing* (paso por valor de la referencia):

- Los tipos primitivos (`number`, `boolean`) se pasan por copia de valor.
- Los objetos y clases (`Stack`, `Environment`, arreglos) pasan una copia del puntero al objeto en el Heap.

Para cumplir con el Requisito #3 de la asignación, la pila y la tabla de símbolos se pasan de forma explícita como parámetros en cada llamada:

```typescript
export function evaluateToken(
  token: Token,
  evaluationStack: Stack<StackElement>,
  symbolEnvironment: Environment
): Result<{ env: Environment; message?: string; shouldExit?: boolean }, EvaluatorError> {
```

Cuando `evaluateArithmeticOperation` invoca `evaluationStack.pop()` o `push()`, muta directamente el objeto compartido en el Heap. En cambio, para el entorno léxico, cuando cambia el ámbito por un `begin` o `end`, la función retorna explícitamente el nuevo entorno activo dentro de un tipo `Result`, evitando reasignaciones ocultas.

### 3.3. Modelo de Memoria en el Motor V8

El motor V8 organiza la memoria en dos áreas:
1. **Stack (Pila de llamadas):** Registros de activación de las funciones activas, variables locales primitivas y punteros hacia el Heap.
2. **Heap:** Espacio donde residen los objetos dinámicos (instancias de `Stack`, nodos de `Environment`, Maps y closures).

La memoria se administra automáticamente mediante el recolector de basura de V8, que utiliza un esquema generacional (Scavenge para objetos jóvenes y Mark-Sweep-Compact para objetos longevos). Al invocar `end`, la referencia al entorno local hijo se desvincula de la raíz de ejecución, permitiendo que el GC libere la tabla de variables locales en la siguiente pasada.

---

## 4. Abstracción de Datos y Programación Orientada a Objetos

El proyecto combina elementos de programación orientada a objetos clásica con técnicas de programación funcional.

### 4.1. Encapsulamiento en la Pila (`Stack<T>`)

La clase `Stack<T>` encapsula un arreglo de JavaScript y solo expone las operaciones propias de una pila LIFO:

```typescript
export class Stack<T> {
  private readonly stackElements: T[];

  constructor(initialElements: readonly T[] = []) {
    this.stackElements = [...initialElements];
  }

  push(element: T): void { this.stackElements.push(element); }
  pop(): T | undefined { return this.stackElements.pop(); }
  peek(): T | undefined { ... }
  size(): number { return this.stackElements.length; }
  isEmpty(): boolean { return this.stackElements.length === 0; }
  clear(): void { this.stackElements.length = 0; }
  clone(): Stack<T> { return new Stack<T>(this.stackElements); }
}
```

El modificador `private` impide acceder o modificar arbitrariamente los índices internos del arreglo, asegurando que la pila solo se manipule mediante `push` y `pop`.

### 4.2. Polimorfismo Paramétrico

El uso del genérico `<T>` en `Stack<T>` permite que la misma implementación sirva para guardar elementos en tiempo de ejecución (`Stack<StackElement>`) o tokens intermedios, manteniendo el chequeo estático de tipos sin duplicar código.

### 4.3. Jerarquía de Errores y Manejo Funcional con `Result<T, E>`

Para el manejo de errores decidimos no lanzar excepciones arbitrarias con `throw`. En su lugar, utilizamos el patrón `Result<T, E>` habitual en lenguajes como Rust o Kotlin:

```typescript
export type Result<T, E = EvaluatorError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

Esto ofrece dos ventajas concretas:
1. Las funciones declaran explícitamente en su firma que pueden fallar y qué tipo de error devuelven.
2. El REPL puede controlar cualquier error (división por cero, pila insuficiente, tipos incompatibles) mostrándole un mensaje al usuario sin cerrar la sesión interactiva ni abortar el proceso.

Además, creamos una clase especializada `EvaluatorError` que extiende de `Error` (`src/error.ts`) con métodos estáticos para construir cada tipo de fallo de forma consistente.

---

## 5. Resumen de Requisitos Cumplidos

| Requisito de la Asignación | Módulos del Proyecto | Mecanismo Implementado |
|---|---|---|
| **1. Evaluación en Pila y Errores** | `src/stack.ts`, `src/evaluator.ts`, `src/error.ts` | Pila genérica `Stack<T>`. Operaciones RPN (+, -, *, /, comparaciones). Errores controlados con `Result<T, E>`. |
| **2. Sistema de Tipos del Evaluador** | `src/types.ts`, `src/evaluator.ts` | Uniones discriminadas (`NumberValue`, `BooleanValue`). Chequeo dinámico estricto antes de cada operación. |
| **3. Variables y Paso de Parámetros** | `src/environment.ts`, `src/evaluator.ts` | Asignación en RPN (`x 10 =`, `x 5 2 + =`). Comando `vars`. Paso explícito de parámetros por referencia (*call-by-sharing*). |
| **4. Scoping y Shadowing** | `src/environment.ts` (`begin` / `end`) | Tabla de símbolos jerárquica con puntero al padre. Las variables locales no sobrescriben las globales tras cerrar el bloque. |

---

## Conclusiones

La construcción de este evaluador postfijo en TypeScript nos permitió comprobar en la práctica las diferencias entre el chequeo estático durante el desarrollo y las necesidades de validación dinámica que exige un intérprete interactivo. 

El modelo de *call-by-sharing* de ECMAScript facilitó la mutación controlada de la pila entre llamadas a subrutinas, mientras que el uso de uniones discriminadas y el patrón `Result` permitió estructurar un código modular, predecible y con un manejo de errores robusto.

---
**FACYT — Universidad de Carabobo — Noviembre 2026**
