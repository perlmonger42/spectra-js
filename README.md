yagni-js
========================================================================
[2023-08-11 (Fri)]

This project is a Spectra transpiler implemented in "SimpleJS".

Run the `Mocha` / `Chai` tests via `npm test`.

This project, `yagni-js`, borrows from and is the successor to `spectra-js`.


"You Ain't Gonna Need It" / "Keep It Simple, Stupid" (YAGNI / KISS)
========================================================================

The focus of `yagni-js` is to implement "the simplest thing that could possibly
work". It will implement a very simple language using the simplest code possible.

Mantra
------------------------------------------------------------------------

> You ain't gonna need it.
> You ain't gonna need it.
> You ain't gonna need it.
> .
> .


SimpleJS Transpiler
========================================================================

SimpleJS is a very simple language, and is a strict subset of JavaScript.

This is a transpiler of SimpleJS to JavaScript, written in SimpleJS.
Therefore, it is executable by NodeJS. But it will also be able to transpile
itself into JavaScript. The emitted JavaScript need not be SimpleJS.

The transpiler will not do any semantic analysis. It will simply read SimpleJS
code and emit JavaScript code. The first version may well be effectively
nothing more than a SimpleJS pretty-printer (or uglifier, perhaps).


SimpleJS
========================================================================
[2023-08-09 (Wed)]

SimpleJS will support only these features:
  - expressions
  - string ("...", '...', \`...\`), fixnum, flonum, and regexp literals
  - assignment
  - semicolon terminated statements
  - `let x;` for variable declaration
  - array and map constructors
  - if-then-else: `if (expr) { stmts } else if (expr) { stmts } else { stmts }`
  - while loop: `while (expr) { stmts }`
  - for loop (but only the `of` form): `for (let x in collection) { stmts }`
  - break and continue
  - subroutines, using `[export] function f(a, b) {...}` syntax
  - `return` and `return expr`
  - `throw EXPR` (but not `try` / `catch` / `finally`)
  - `new C(...)`
