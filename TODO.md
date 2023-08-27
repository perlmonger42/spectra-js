Project Plans
========================================================================
[2023-08-09 (Wed)]

See [INVEST](https://en.wikipedia.org/wiki/INVEST_(mnemonic)) for advice on
creating good PBI's ("Product Backlog Item": a generic term for bugs,
stories, tasks, etc).


Work Breakdown Structure
------------------------------------------------------------------------

### Main tasks
* Define the SpectraJS syntax
* Implement a parser for SpecraJS which builds AST
* Implement a code generator from AST to JavaScript

### Subsidiary Tasks
* Ensure grammar is LALR(1)
* How to grow from a single-file program to a multi-file program?
* Interfaces (no classes, no inheritance)

### Becoming Spectra
* Replace `break` & `continue` with `last` & `next`; add `redo`
* Semicolon insertion
* Composition
* Remove `===` and `!==` operators from the compiler
* Remove `new` expressions
* Remove `export`; implement golang-style capitalization rule
* Support `kebab-case-identifiers`
* Add `module Foo` at beginning of file (optional; default is `module main`).

Questions to Resolve
========================================================================

Should Spectra use the JavaScript rule that `x.anIdentifier` is equivalent
to `x['anIdentifier']`?


TODO's
========================================================================

* Reject `export`, during semantic checking, on non-toplevel declarations and
  on expression statements
* Restructure lexer and parser to use Reader as input
* Restructure lexer and parser to use some kind of ErrorEmitter instead of console
* Decorate parse tree with token positions for better error messages
* Keep comment text stashed away in the parse tree for transmission to target language
* Keep newline-break information stashed away in theparse tree for better pretty-printing
