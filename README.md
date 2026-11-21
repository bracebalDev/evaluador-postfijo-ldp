# Evaluador Postfijo (Mini-REPL en RPN) en TypeScript

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-green.svg?logo=node.js)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/Tests-Passing-brightgreen.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Asignación #1 — Lenguajes de Programación (CAO604)**  
> **Facultad Experimental de Ciencias y Tecnología (FACYT) — Universidad de Carabobo**  
> **Semestre 1-2026**  
> **Desarrollado con fines académicos por:** Brayan Ceballos y Andrés Crespo  

---

## 📖 Descripción del Proyecto

Este proyecto implementa una aplicación interactiva de consola (**Mini-REPL**) desarrollada en **TypeScript** que evalúa expresiones matemáticas y lógicas utilizando **Notación Polaca Inversa (Postfija / RPN)** basada en una pila (*stack*).

La aplicación fue desarrollada con **fines estrictamente académicos** para ilustrar de forma práctica los conceptos nucleares de la teoría de lenguajes de programación:
- **Evaluación en Pila y Manejo de Errores Controlado**: Sin caídas abruptas, mediante el patrón funcional `Result<T, E>`.
- **Sistema de Tipos del Evaluador**: Representación con tipos algebraicos (*Tagged / Discriminated Unions*), diferenciando estrictamente entre números (`Int/Float`) y booleanos (`Bool`) con chequeo de tipos en tiempo de ejecución.
- **Variables y Paso Explícito de Parámetros**: Declaración y asignación postfija (`x 10 =`, `x 5 2 + =`, `x 5 + 2 *`), consulta de variables en memoria (`vars`) y paso por referencia explícita de la pila y el entorno léxico (*call-by-sharing*).
- **Alcance Local (*Scoping*) y Sombreado (*Shadowing*)**: Bloques locales temporales mediante `begin` y `end`, donde las variables definidas o modificadas no sobrescriben permanentemente el entorno global tras cerrar el bloque.
- **Operadores Booleanos Explícitos**: Soporte para `and`, `or`, `not` y comparaciones lógicas (`==`, `!=`, `<`, `>`, `<=`, `>=`).
- **Funciones Mnemotécnicas**: La arquitectura del código fuente implementa subrutinas con nombres mnemotécnicos altamente descriptivos (`evaluateArithmeticOperation`, `evaluateComparisonOperation`, `evaluateBooleanOperation`, `evaluateAssignmentOperation`, `defineVariable`, `lookupVariable`, `createChildScope`, `popChildScope`), logrando un código claro y auto-documentado.

Adicionalmente, se incluye el **Reporte Técnico completo (Parte I)** en [docs/REPORTE_TECNICO.md](docs/REPORTE_TECNICO.md).

---

## 👥 Autores y Propósito Académico

- **Brayan Ceballos**
- **Andrés Crespo**

> **Nota:** Esta aplicación fue desarrollada exclusivamente con fines académicos como parte de la Asignación #1 de la asignatura **Lenguajes de Programación (CAO604)**, bajo la tutoría académica del Prof. Jesús Pelay en la **Universidad de Carabobo (FACYT)**.

---

## 🚀 Requisitos Previos e Instalación

### Requisitos:
- **Node.js** v20 o superior (recomendado v22 o v26).
- **npm** v10 o superior.

### Instalación:
Clona el repositorio e instala las dependencias de desarrollo:
```bash
git clone https://github.com/bracebalDev/evaluador-postfijo-ldp.git
cd evaluador-postfijo-ldp
npm install
```

---

## 💻 Comandos Principales

| Comando | Descripción |
|---|---|
| `npm start` | Inicia el **REPL interactivo** en la consola con colores e indicador de ámbito. |
| `npm test` | Ejecuta la suite de **pruebas unitarias automatizadas**. |
| `npm run demo` | Ejecuta el script de demostración guiada `examples/demo.rpn`. |
| `npm run typecheck` | Ejecuta el análisis estático de tipos de TypeScript con `tsc --noEmit`. |

---

## 🕹️ Guía de Sintaxis y Operadores

### 1. Operaciones Aritméticas
Operan sobre dos números en el tope de la pila en orden postfijo:
```text
15 5 +     => 20
20 4 -     => 16
6 7 *      => 42
40 8 /     => 5
```

### 2. Comparaciones Lógicas
Comparan dos valores y apilan un resultado booleano (`true` / `false`):
```text
10 10 ==   => true
10 20 !=   => true
5 10 <     => true
25 15 >    => true
10 10 <=   => true
7 8 >=     => false
```

### 3. Operadores Booleanos Explícitos
```text
true false and    => false
true false or     => true
true not          => false
false not         => true
10 5 > 20 15 > and => true
```

### 4. Variables y Asignación Postfija
Para asignar: `<identificador> <valor_o_expresión> =`
```text
x 10 =           # Asigna 10 a la variable x
y 20 =           # Asigna 20 a la variable y
x y +            # Suma x + y => 30
x 5 + 2 *        # Evalúa (x + 5) * 2 => (10 + 5) * 2 = 30
total 5 2 + =    # Evalúa 5 + 2 = 7 y lo asigna a total
```

### 5. Ámbitos Locales y Shadowing (`begin` / `end`)
```text
x 10 =           # x global vale 10
begin            # Inicia bloque local nivel 1
  x 99 =         # Sombra (shadows) a la x global en este ámbito
  z 500 =        # Variable exclusiva del ámbito local
  x              # Retorna 99
end              # Cierra el bloque local
x                # Retorna 10 (la variable global quedó intacta, z ya no existe)
```

### 6. Comandos del Sistema en el REPL
- `vars`: Muestra todas las variables activas en memoria, sus valores, tipos y niveles de ámbito.
- `stack`: Muestra el contenido detallado de la pila actual.
- `clear`: Vacía todos los elementos de la pila.
- `help`: Despliega la ayuda rápida de sintaxis.
- `exit` o `quit`: Sale del REPL.

---

## 📋 Sesión de Prueba Interactiva de Ejemplo

A continuación se muestra una sesión interactiva real paso a paso:

```text
================================================================
   Evaluador Postfijo (Mini-REPL en RPN) - TypeScript
   Asignación #1 - Lenguajes de Programación (CAO604) | FACYT - UC
   Desarrollado con fines académicos por: Brayan Ceballos y Andrés Crespo
================================================================
Escriba expresiones en Notación Polaca Inversa (ej. x 10 =, x 5 + 2 *)
Comandos útiles: vars, stack, begin, end, clear, help, exit

rpn [0]> 15 5 + 2 *
=> 40 (number)

rpn [0]> clear
[Pila] Pila vaciada correctamente.

rpn [0]> x 10 =
[Asignación] x = 10 (number)

rpn [0]> x 5 + 2 *
=> 30 (number)

rpn [0]> vars
[Variables Activas]
  x = 10 (number, global [0])

rpn [0]> begin
[Scope] Bloque local iniciado (Nivel 1).

rpn [1]> x 99 =
[Asignación] x = 99 (number)

rpn [1]> z 500 =
[Asignación] z = 500 (number)

rpn [1]> vars
[Variables Activas]
  x = 99 (number, local [1])
  z = 500 (number, local [1])

rpn [1]> end
[Scope] Bloque local cerrado. Restaurado a Nivel 0.

rpn [0]> vars
[Variables Activas]
  x = 10 (number, global [0])

rpn [0]> 5 true +
[Error TYPE_ERROR] Error de tipos en '+': se esperaba tipo 'number', pero se recibió 'boolean'.

rpn [0]> exit
¡Hasta luego!
```

---

## 🧪 Pruebas Automatizadas

El proyecto incluye pruebas unitarias completas desarrolladas con el ejecutor nativo de Node.js (`node:test` y `node:assert/strict`):

- **Aritmética y Errores:** Adición, sustracción, multiplicación, división, flotantes, división por cero controlada y *stack underflow*.
- **Comparaciones y Lógica:** Operadores relacionales (`<`, `>`, `<=`, `>=`), igualdad de tipos y operadores booleanos (`and`, `or`, `not`).
- **Sistema de Tipos:** Rechazo controlado de operaciones heterogéneas inválidas (ej. `5 true +`).
- **Variables y Scoping:** Asignación postfija con variables (`x 10 =`, `x 5 2 + =`), encadenamiento de entornos, sombreado (*shadowing*) multinivel y comando `vars`.

Para ejecutarlas:
```bash
npm test
```
