# Universidad de Carabobo
## Facultad Experimental de Ciencias y Tecnología (FACYT)
### Departamento de Computación — U.A. de Algoritmos, Programación y Lenguajes
### CAO604: Lenguajes de Programación — Semestre 1-2026
---
# Reporte Técnico: Análisis del Diseño e Implementación de TypeScript a través de un Evaluador Postfijo (RPN)

**Autores:** Brayan Ceballos y Andrés Crespo  
**Docente:** Prof. Jesús Pelay  
**Propósito:** Desarrollado exclusivamente con fines académicos  
**Lenguaje Seleccionado:** TypeScript (v5.x / ECMAScript 2022+)  
**Entorno de Ejecución:** Node.js (Motor V8)  
**Proyecto:** Mini-REPL y Evaluador en Notación Polaca Inversa (`evaluador-postfijo-ldp`)  

---

## Resumen Ejecutivo

El presente informe constituye la **Parte I** de la Asignación #1 de la cátedra de *Lenguajes de Programación*. En este documento se examinan los fundamentos teóricos y prácticos de **TypeScript**, un superconjunto tipado de JavaScript desarrollado por Microsoft que añade tipado estático opcional, abstracciones algebraicas y contratos estructurales sobre la semántica de ejecución de ECMAScript.

Esta aplicación y su respectivo informe han sido elaborados por **Brayan Ceballos** y **Andrés Crespo** con fines estrictamente pedagógicos y de investigación formativa.

El análisis se estructura en cuatro ejes fundamentales del diseño de lenguajes de programación:
1. Nombres, vinculación (*binding*), estructuras de control y reglas de alcance (*scoping*).
2. Sistema de tipos de datos, chequeo de tipos (estático vs. dinámico), inferencia y equivalencia de tipos.
3. Subrutinas, paso de parámetros (*call-by-sharing* / valor vs. referencia) y modelo de memoria en el motor V8.
4. Abstracción de datos, programación orientada a objetos (POO), interfaces y unión discriminada (*tagged unions*).

Cada sección se encuentra respaldada teóricamente con la especificación del lenguaje y contrastada directamente con la implementación del evaluador postfijo (*Mini-REPL en RPN*) desarrollado en la **Parte II**. La arquitectura del software implementa intencionalmente **funciones con nombres mnemotécnicos** (`evaluateArithmeticOperation`, `evaluateComparisonOperation`, `evaluateBooleanOperation`, `evaluateAssignmentOperation`, `createChildScope`, `popChildScope`, `defineVariable`, `lookupVariable`), manteniendo a la vez los identificadores estándar indicados en la especificación del proyecto (`x 10 =`, `x 5 + 2 *`, `begin`/`end`, `vars`).

---

## 1. Nombres, Vinculación (*Binding*), Estructuras de Control y Reglas de Alcance (*Scoping*)

### 1.1. Nombres y Reglas Léxicas de Identificadores
En TypeScript, los identificadores siguen la especificación de identificadores Unicode de ECMAScript. Un identificador debe comenzar con una letra, un guion bajo (`_`) o el signo de dólar (`$`), seguido de caracteres alfanuméricos. 

En nuestro evaluador, esta regla léxica se modela de forma determinista en el analizador léxico (`src/lexer.ts`), soportando identificadores como `x`, `y`, `z`, `total` o nombres compuestos:
```typescript
// src/lexer.ts
const IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
```

### 1.2. Mecanismos de Vinculación (*Binding*) en TypeScript
TypeScript hereda tres palabras clave para la declaración de enlaces en el entorno de ejecución:
1. `const`: Establece una vinculación inmutable (*immutable binding*). La referencia no puede ser reasignada, aunque si el valor referenciado es un objeto compuesto (como un arreglo o instancia de clase), las propiedades internas del objeto siguen siendo mutables.
2. `let`: Vinculación mutable con alcance de bloque (*block-scoped binding*). Permite reasignación de valor dentro de su ámbito de vida.
3. `var`: Vinculación histórica con alcance de función (*function-scoped*) y elevación (*hoisting*) implícita. Desaconsejada en TypeScript moderno.

En el diseño de nuestro evaluador, se adoptó la política de inmutabilidad en la vinculación (`const`) para todas las referencias de módulos, tipos y funciones:
```typescript
// src/types.ts
export interface VariableRef {
  readonly kind: 'ref';
  readonly name: string;
}
```
El modificador `readonly` garantiza a nivel de compilación que los campos de una estructura no sufran reasignación no autorizada tras su instanciación.

### 1.3. Reglas de Alcance (*Scoping*) y Temporal Dead Zone (TDZ)
TypeScript implementa **alcance léxico o estático** (*lexical scoping*). El ámbito de una variable queda determinado durante la fase de compilación según la estructura anidada de bloques (`{ ... }`) en el código fuente.

Las variables declaradas con `let` y `const` residen en la *Temporal Dead Zone* (TDZ) desde el inicio del bloque hasta que se evalúa la instrucción de inicialización, impidiendo lecturas accidentales de variables no inicializadas.

#### Reflejo en el Evaluador: Scoping y Shadowing en el Mini-REPL
Para cumplir con el Requisito #4 de la asignación, implementamos una estructura de datos jerárquica `Environment` (`src/environment.ts`) que reproduce exactamente la semántica de la cadena de ámbitos léxicos (*scope chain*) con métodos mnemotécnicos:

```typescript
// src/environment.ts
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

Cuando el usuario ingresa el comando de apertura de bloque `begin`, se genera un nuevo entorno local hijo:
```typescript
// src/evaluator.ts
case 'begin':
case 'scope': {
  const childEnvironment = symbolEnvironment.createChildScope();
  return ok({
    env: childEnvironment,
    message: `[Scope] Bloque local iniciado (Nivel ${childEnvironment.depth}).`
  });
}
```

#### Sombreado de Variables (*Shadowing*):
Si una variable (como `x`) se define o actualiza dentro del bloque `begin ... end`, se vincula en el `Map` del ámbito local actual:
```typescript
// src/environment.ts
defineVariable(identifierName: string, evaluatedValue: RuntimeValue): void {
  this.symbolBindings.set(identifierName, evaluatedValue);
}

lookupVariable(identifierName: string): RuntimeValue | undefined {
  const localBinding = this.symbolBindings.get(identifierName);
  if (localBinding !== undefined) {
    return localBinding; // Resolución local prioritaria (Shadowing)
  }
  if (this.parent !== null) {
    return this.parent.lookupVariable(identifierName); // Ascenso por la cadena de ámbitos
  }
  return undefined;
}
```
Al invocar `end`, la referencia del entorno actual regresa a `this.parent`, descartando el mapa de variables locales y liberándolo para el recolector de basura (*Garbage Collector*). De esta forma, la variable global homónima (`x`) retoma su valor original (ej. 10) sin haber sido sobrescrita.

### 1.4. Estructuras de Control
TypeScript cuenta con estructuras de control tradicionales condicionales (`if/else`, `switch`) y de iteración (`for`, `for...of`, `while`). 

En nuestro evaluador, combinamos la estructura `switch` con *Discriminated Unions*, permitiendo que el compilador realice **análisis de control de flujo estricto** (*exhaustiveness checking*), alertando en tiempo de compilación si algún caso de operador o comando quedara sin manejar.

---

## 2. Sistema de Tipos de Datos y Chequeo de Tipos

### 2.1. Naturaleza del Sistema de Tipos en TypeScript
El sistema de tipos de TypeScript presenta tres características determinantes:
1. **Estático y Opcional:** El chequeo formal se produce en tiempo de compilación.
2. **Borrado de Tipos (*Type Erasure*):** Los tipos de TypeScript no existen en tiempo de ejecución. El compilador (`tsc`) verifica los contratos y remueve toda anotación de tipos, generando código JavaScript puro.
3. **Equivalencia Estructural (*Structural Typing* o *Duck Typing*):** Dos tipos son compatibles si sus miembros son compatibles, a diferencia de lenguajes de tipado nominal como Java o C++ donde deben compartir un nombre o herencia explícita.

### 2.2. Chequeo Estático vs. Chequeo Dinámico del Evaluador
Dado que en tiempo de ejecución las anotaciones de TypeScript desaparecen, un evaluador de expresiones interpretadas requiere implementar su propio **sistema de tipos dinámico de dominio** (*domain runtime type system*).

Para lograr esto de forma idiomática, utilizamos el patrón de **Tagged Unions (Uniones Discriminadas o Tipos de Datos Algebraicos / ADTs)**:

```typescript
// src/types.ts
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

La propiedad literal `kind` actúa como **discriminador de tipo**. En tiempo de compilación, TypeScript utiliza `kind` para estrechar el tipo (*type narrowing*). En tiempo de ejecución, la función evaluadora mnemotécnica `evaluateArithmeticOperation` consulta `kind` para validar las restricciones semánticas de las operaciones:

```typescript
// src/evaluator.ts: Chequeo dinámico estricto en operaciones aritméticas
if (leftRuntimeValue.kind !== 'number') {
  return err(EvaluatorError.typeMismatch(operator, 'number', leftRuntimeValue.kind));
}
if (rightRuntimeValue.kind !== 'number') {
  return err(EvaluatorError.typeMismatch(operator, 'number', rightRuntimeValue.kind));
}
```
Si el usuario intenta ejecutar la expresión de prueba `5 true +`, el evaluador intercepta la incompatibilidad de tipos antes de realizar cualquier cálculo en el motor anfitrión, emitiendo un `EvaluatorError` estructurado sin abortar el proceso.

### 2.3. Inferencia de Tipos
El compilador de TypeScript calcula automáticamente los tipos sin necesidad de anotaciones redundantes mediante algoritmos de flujo de control. Por ejemplo:
```typescript
const isEven = (n: number) => n % 2 === 0; // TypeScript infiere: (n: number) => boolean
```
En el evaluador, aprovechamos la inferencia de tipos en funciones genéricas como `ok<T>` y `err<E>`:
```typescript
// src/types.ts
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}
```
Al invocar `ok(childEnvironment)`, TypeScript infiere que el tipo retornado es exactamente `Result<Environment, never>`.

### 2.4. Equivalencia de Tipos: Estructural vs. Nominal
En TypeScript, dos interfaces con la misma estructura son mutuamente asignables:
```typescript
interface Point2D { x: number; y: number; }
interface Coordinates { x: number; y: number; }
const p: Point2D = { x: 10, y: 20 };
const c: Coordinates = p; // Totalmente válido por compatibilidad estructural
```
Para evitar mezclas accidentales entre tipos de estructura similar en el evaluador, se añadió la propiedad constante discriminadora `kind: 'number'` vs `kind: 'boolean'`, forzando una diferenciación inequívoca entre tipos.

---

## 3. Subrutinas, Mecanismos de Paso de Parámetros y Manejo de Memoria

### 3.1. Subrutinas y Funciones de Primer Orden
En TypeScript, las funciones son entidades de **primer orden** (*first-class citizens*). Pueden ser asignadas a variables, almacenadas en arreglos o mapas, y pasadas como argumentos (*callbacks* o funciones de orden superior).

### 3.2. Mecanismo de Paso de Parámetros: *Call-by-Sharing*
Un concepto medular en la teoría de lenguajes de programación es cómo se transmiten los argumentos a los procedimientos. En TypeScript / ECMAScript, el mecanismo de evaluación es estrictamente **Call-by-Sharing** (o paso por valor de la referencia):
- **Valores Primitivos (`number`, `boolean`, `string`):** Se pasan por copia de valor. Las modificaciones locales dentro de la función no afectan al llamante.
- **Objetos e Instancias (`Stack`, `Environment`, arreglos, mapas):** Se pasa una **copia del puntero de referencia** al objeto en el Heap. 
  - La función *no puede reasignar el puntero original* del llamante para que apunte a otro objeto.
  - Sin embargo, la función *sí puede mutar el estado interno* del objeto apuntado por la referencia.

#### Demostración Explícita en el Evaluador:
El Requisito #3 de la asignación exige que la tabla de símbolos y la pila se pasen explícitamente a las subrutinas:

```typescript
// src/evaluator.ts
export function evaluateToken(
  token: Token,
  evaluationStack: Stack<StackElement>,
  symbolEnvironment: Environment
): Result<{ env: Environment; message?: string; shouldExit?: boolean }, EvaluatorError> {
  // evaluationStack es una referencia mutada explícitamente (push/pop)
  // symbolEnvironment se consulta o se genera un nuevo nodo de la cadena de ámbitos
```

Al invocar `evaluationStack.push(...)` o `evaluationStack.pop()`, la mutación se refleja de inmediato en la pila del llamante gracias a que se opera sobre el objeto compartido en el Heap. 

En contraste, para el entorno léxico (`Environment`), al crear o cerrar ámbitos (`begin`/`end`), la subrutina no reasigna la variable del llamante en silencio; retorna explícitamente la nueva referencia activa encapsulada en la mónada `Result`:
```typescript
// src/evaluator.ts (en evaluateLine)
let activeEnvironment = symbolEnvironment;
for (const token of tokens) {
  const tokenEvaluationResult = evaluateToken(token, evaluationStack, activeEnvironment);
  if (!tokenEvaluationResult.ok) { ... }
  activeEnvironment = tokenEvaluationResult.value.env; // Actualización explícita de referencia
}
```

### 3.3. Modelo de Memoria y Recolección de Basura (*Garbage Collection* en V8)
El motor V8 organiza la memoria del proceso en dos regiones principales:
1. **Call Stack:** Almacena los marcos de pila (*stack frames*) de las llamadas a funciones activas, tipos primitivos y punteros al Heap.
2. **Memory Heap:** Almacena objetos de tamaño dinámico, instancias de clases (`new Stack()`, `new Environment()`) y clausuras (*closures*).

#### Gestión Automática de Memoria:
TypeScript delega la administración de memoria en el recolector de basura de V8, el cual opera bajo un esquema generacional (*Generational Garbage Collection*):
- **New Space (Scavenger):** Objetos de vida corta (como los objetos `{ ok: true, value }` o arreglos de tokens recién creados). Se limpian rápidamente mediante copiado seminario.
- **Old Space (Mark-Sweep & Compact):** Objetos que sobreviven múltiples ciclos (como la instancia global de `Environment` o la `Stack` principal).

#### Liberación de Memoria al Cerrar Ámbitos (`end`):
Cuando un bloque local finaliza mediante `end`:
```typescript
case 'end':
case 'endscope': {
  const parentEnvironment = symbolEnvironment.popChildScope();
  return ok({ env: parentEnvironment, ... });
}
```
La referencia al entorno local hijo deja de ser alcanzable desde el árbol de raíces (*GC Roots*). En el siguiente ciclo de recolección de basura, V8 detecta que el mapa de variables locales no tiene referencias activas y libera su memoria automáticamente, evitando fugas de memoria (*memory leaks*).

---

## 4. Abstracción de Datos y Conceptos de Programación Orientada a Objetos (POO)

TypeScript ofrece una síntesis poderosa entre el paradigma orientado a objetos clásico basado en clases e interfaces, y el paradigma funcional basado en composición y tipos algebraicos.

### 4.1. Encapsulamiento y Ocultación de Información
La clase `Stack<T>` encapsula la estructura subyacente de arreglo y expone una API canónica que protege la integridad de la estructura de datos:

```typescript
// src/stack.ts
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
El modificador de visibilidad `private` restringe el acceso directo al arreglo interno `stackElements`, impidiendo que el consumidor altere índices arbitrarios y garantizando la semántica estricta LIFO (*Last-In, First-Out*).

### 4.2. Polimorfismo Paramétrico (Genéricos)
La clase `Stack<T>` implementa polimorfismo paramétrico mediante el parámetro de tipo genérico `T`. Esto permite reutilizar la misma estructura para almacenar tokens léxicos, valores en tiempo de ejecución (`Stack<StackElement>`) o cualquier otro tipo, garantizando seguridad estática de tipos sin costo en tiempo de ejecución.

### 4.3. Herencia y Jerarquía de Clases
En el módulo de errores (`src/error.ts`), aplicamos herencia orientada a objetos extendiendo la clase base de la plataforma `Error`:

```typescript
// src/error.ts
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
  // Métodos factoría estáticos mnemotécnicos (Design Pattern: Factory Method)
  static stackUnderflow(operation: string, required: number, found: number): EvaluatorError { ... }
  static divisionByZero(): EvaluatorError { ... }
}
```
La invocación a `super(message)` asegura la correcta captura del *stack trace* en el motor V8, mientras que los métodos de factoría estáticos (`static divisionByZero()`) centralizan la construcción homogénea de errores tipados.

### 4.4. Manejo Funcional de Errores vs. Excepciones
Un principio fundamental de diseño aplicado en el proyecto es el manejo de fallos mediante el tipo algebraico `Result<T, E>` en lugar del lanzamiento ciego de excepciones con `throw`:

```typescript
// src/types.ts
export type Result<T, E = EvaluatorError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

#### Ventajas Académicas y Prácticas:
1. **Tipado Explícito del Error:** Las excepciones tradicionales en JavaScript son de tipo `unknown` o `any` y no pueden ser tipadas estáticamente en la firma de una función. Con `Result<T, E>`, el tipo de error es explícito en el contrato de la función.
2. **Prevención de Abortos Abruptos:** La aplicación interactiva (REPL) nunca experimenta caídas no controladas, cumpliendo a cabalidad con el Requisito #1 de la especificación de la cátedra.
3. **Composición Monádica:** Permite propagar errores tempranos de manera limpia mediante verificaciones `if (!result.ok) return result;`.

---

## 5. Matriz Comparativa: Requisitos de la Asignación vs. Implementación

| Requisito de la Cátedra | Componente en el Código | Justificación Teórica y Mecanismo en TypeScript |
|---|---|---|
| **1. Evaluación en Pila y Errores** | `src/stack.ts`, `src/evaluator.ts`, `src/error.ts` | Pila genérica `Stack<T>`. Errores representados mediante `Result<T, E>` y clase `EvaluatorError`. Manejo de división por cero y stack underflow sin abortos. |
| **2. Sistema de Tipos del Evaluador** | `src/types.ts`, `src/evaluator.ts` | Tipos compuestos y *Tagged Unions* (`NumberValue`, `BooleanValue`, `VariableRef`). Chequeo dinámico en tiempo de ejecución con error de tipos controlado (`TYPE_ERROR`). |
| **3. Variables y Paso de Parámetros** | `src/environment.ts`, `src/evaluator.ts` | Asignación postfija (`x 10 =`, `x 5 2 + =`, `x 5 + 2 *`). Consulta de memoria (`vars`). Paso explícito de `evaluationStack` y `symbolEnvironment` (*Call-by-Sharing*). |
| **4. Scoping y Shadowing** | `src/environment.ts` (`begin`/`end`) | Ámbitos anidados mediante lista ligada de entornos (`parent`). Variables locales (`x 99 =`) enmascaran globales sin sobrescribirlas al salir del bloque con `end`. |

---

## 6. Conclusiones

La implementación del Evaluador Postfijo en **TypeScript** evidencia las fortalezas del lenguaje al conjugar la flexibilidad y universalidad del modelo de ejecución de ECMAScript con la robustez y disciplina de un sistema de tipos estático y moderno.

Desarrollado por **Brayan Ceballos** y **Andrés Crespo**, este proyecto demuestra cómo el empleo de **uniones discriminadas**, **inmutabilidad léxica**, **funciones mnemotécnicas altamente legibles**, **paso explícito de referencias** y el **patrón Result** permite construir una herramienta académica rigurosa, elegante y libre de fallos imprevistos, satisfaciendo la totalidad de los requisitos formativos de la cátedra *Lenguajes de Programación*.

---
**Universidad de Carabobo — Facultad Experimental de Ciencias y Tecnología — 2026**
