Syntax Tree Format
========================================================================

This parser returns syntax trees inspired by the [Esprima format](
https://docs.esprima.org/en/latest/syntax-tree-format.html).

Interfaces are described here using the TypeScript syntax.

### Node
Each node is represented as a regular JavaScript object that implements the interface:
```typescript
    interface Node {
      type: string;
    }
```
The type property is a string that contains the variant type of the node. Each
subtype of Node is explained in the subsequent sections.

When the node is annotated with its location, the interface becomes:

```typescript
    interface Node {
      type: string;
      range?: [number, number];  // [at, after] indices of the characters in the Node
      loc?: SourceLocation;
    }
```

The `range` provides the character offsets of the first character of the Node's
text and the first character after the Node's text. In other words, the
indicated range is inclusive of the lower endpoint, and exclusive of the upper
endpoint.

### SourceLocation
Source locations are defined as:
```typescript
    interface SourceLocation {
        start: Position;
        end: Position;
        source?: string | null;
    }
```

### Position
```typescript
    interface Position {
        line: number;    // one-based (first line of input is line #1)
        column: number;  // zero-based (first column of each line is column #0)
    }
```


Units
------------------------------------------------------------------------

An input text (usually a file's content) is a Unit.

```typescript
    interface Unit {
      type: 'Unit';
      body: UnitItem[];
    }

    type UnitItem = Statement | TopLevelDeclaration;
```

Statements and Declarations
------------------------------------------------------------------------

```typescript
    type Statement = ExpressionStatement | VariableDeclaration;
```

### ExpressionStatement
```typescript
    interface ExpressionStatement {
      type: 'ExpressionStatement';
      expression: Expression;
    }
```


Expressions and Patterns
------------------------------------------------------------------------

An expression can be one of the following:
```typescript
    type Expression = Identifier | Literal; // plus many more, eventually
```

### Literal
```typescript
    interface Literal {
      type: 'Literal';
      kind: 'BOOLEAN' | 'FIXNUM' | 'FLONUM' | 'STRING' | 'REGEX' | 'NULL';
      value: boolean | number | string | RegExp | null;
      text: string;
      regex?: { pattern: string, flags: string };
    }
```
The `regex` property only applies to regular expression literals.



