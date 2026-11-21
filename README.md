# Evaluador Postfijo (Mini-REPL en RPN) - TypeScript

**Asignación #1 — Lenguajes de Programación (CAO604)**  
**Facultad Experimental de Ciencias y Tecnología (FACYT) — Universidad de Carabobo**  
**Semestre 1-2026**  

**Desarrollado con fines académicos por:**
- Brayan Ceballos
- Andrés Crespo

---

## Descripción

Este proyecto consiste en un evaluador interactivo de expresiones en Notación Polaca Inversa (Postfija / RPN) basado en pila, desarrollado en **TypeScript** sobre **Node.js**.

La aplicación fue desarrollada para la primera asignación de la materia *Lenguajes de Programación*, con el propósito de analizar de forma práctica los conceptos de diseño e implementación del lenguaje:
- Evaluación en pila y manejo de errores controlado mediante el patrón funcional `Result<T, E>`.
- Sistema de tipos en tiempo de ejecución basado en uniones discriminadas (`Tagged Unions`), diferenciando entre números y booleanos.
- Declaración y asignación de variables en RPN (`x 10 =`, `x 5 2 + =`, `x 5 + 2 *`) y consulta de memoria con el comando `vars`.
- Control de ámbitos locales (`begin` y `end`) con soporte para sombreado de variables (*shadowing*).
- Operadores lógicos explícitos (`and`, `or`, `not`) y comparaciones relacionales (`==`, `!=`, `<`, `>`, `<=`, `>=`).
- Arquitectura modular con funciones mnemotécnicas para la evaluación de operaciones y el manejo de la tabla de símbolos.

El informe técnico detallado (Parte I de la asignación) se encuentra en [docs/REPORTE_TECNICO.md](docs/REPORTE_TECNICO.md).

---

## Requisitos e Instalación

### Requisitos
- **Node.js**: versión 20 o superior.
- **npm**: versión 10 o superior.

### Instalación
Clonar el repositorio e instalar las dependencias:
```bash
git clone https://github.com/bracebalDev/evaluador-postfijo-ldp.git
cd evaluador-postfijo-ldp
npm install
```

---

## Comandos Disponibles

| Comando | Descripción |
|---|---|
| `npm start` | Inicia el REPL interactivo en la terminal. |
| `npm test` | Ejecuta las pruebas unitarias automatizadas con `node:test`. |
| `npm run demo` | Corre el archivo de prueba guiado `examples/demo.rpn`. |
| `npm run typecheck` | Ejecuta la verificación estática de tipos con `tsc --noEmit`. |

---

## Sintaxis de Expresiones RPN

### Aritmética
Operan sobre dos números en el tope de la pila:
```text
15 5 +     => 20
20 4 -     => 16
6 7 *      => 42
40 8 /     => 5
```

### Comparaciones
Comparan valores compatibles y devuelven un booleano:
```text
10 10 ==   => true
10 20 !=   => true
5 10 <     => true
25 15 >    => true
10 10 <=   => true
7 8 >=     => false
```

### Operadores Booleanos
```text
true false and    => false
true false or     => true
true not          => false
false not         => true
10 5 > 20 15 > and => true
```

### Variables y Asignación Postfija
Sintaxis: `<variable> <expresion> =`
```text
x 10 =           # Asigna 10 a x
y 20 =           # Asigna 20 a y
x y +            # Suma x + y => 30
x 5 + 2 *        # Evalúa (x + 5) * 2 => 30
total 5 2 + =    # Evalúa 5 + 2 y lo asigna a total (7)
```

### Ámbitos Locales y Shadowing (`begin` / `end`)
```text
x 10 =           # x global vale 10
begin            # Inicia bloque local nivel 1
  x 99 =         # Sombra a x en este ámbito
  z 500 =        # Variable local temporal
  x              # Retorna 99
end              # Cierra el bloque local
x                # Retorna 10 (la variable global no se alteró)
```

### Comandos del REPL
- `vars`: Muestra las variables activas en memoria, sus valores, tipos y niveles de alcance.
- `stack`: Muestra el contenido actual de la pila.
- `clear`: Vacía la pila de evaluación.
- `help`: Muestra la guía rápida de comandos.
- `exit`: Cierra la sesión interactiva.

---

## Sesión de Prueba de Ejemplo

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

## Pruebas Automatizadas

El proyecto incluye 28 pruebas unitarias usando `node:test` y `node:assert/strict` que verifican:
- Operaciones aritméticas y manejo de división por cero y stack underflow.
- Comparaciones lógicas y operaciones booleanas (`and`, `or`, `not`).
- Chequeo de tipos en tiempo de ejecución (rechazo de operaciones heterogéneas inválidas).
- Declaración y evaluación de variables en RPN.
- Ámbitos anidados con `begin`/`end` y sombreado de variables.

Para ejecutarlas:
```bash
npm test
```
