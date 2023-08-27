import { expect } from "chai";
import { NewLexer  } from "../src/sjs-lexer.mjs";
import { InternalError, NewParser, Parse
       , Just, None
       , New_Unit, New_ModuleName
       , New_Declaration_Function, New_Declaration_Variable, New_Declaration_Variables
       , New_Declaration_Statement
       , New_FunctionSignature, New_Statement_Block
       , New_Statement_If, New_Statement_Return, New_Statement_While, New_Statement_Throw
       , New_Statement_Expression
       , New_Expression_Symbol, New_Expression_Literal
       , New_Expression_List, New_Expression_Array, New_Expression_Object, New_Expression_Pair
       , New_Expression_UnaryPrefix, New_Expression_Binary
       , New_Expression_Apply
       , New_Literal_Fixnum, New_Literal_Boolean, New_Literal_String
       , New_Literal_Function, New_Literal_ArrowFunctionExpression
       , describe_value, parseString
       } from "../src/sjs-parser.mjs";
import * as fs from 'fs';

// Build an Expression containing an integer literal.
function int(spelling) {
  return New_Expression_Literal(New_Literal_Fixnum(parseInt(spelling), spelling));
}

// Build an Expression containing a string literal.
function str(spelling) {
  return New_Expression_Literal(New_Literal_String(parseString(spelling), spelling));
}

function sym(spelling) {
  return New_Expression_Symbol(spelling);
}

function pair(k, v) {
  return New_Expression_Pair(k, v);
}

function list(exprs) {
  return New_Expression_List(exprs);
}

function let_statement(lhs, rhs) {
  if (typeof(lhs) === 'string') {
    rhs = rhs === null ? None('Expression') : Just(rhs);
    return New_Declaration_Variable('let', lhs, rhs, false);
  } else if (typeof(lhs) === 'object' && Array.isArray(lhs)) {
    //assert_is_list_of("lhs", lhs, 'string');
    return New_Declaration_Variables('let', lhs, rhs, false);
  } else {
    console.error(`let_statement: unexpected type of lhs: ${describe_value(lhs)}`);
  }
}

// Build a Unit for a program that contains only a single definition
// (e.g., an input file that contains only "function f() { }").
function singleDefinitionProgram(definition) {
  let name = None('ModuleName');
  let imports = [ ];
  let decls = [definition] ;
  return New_Unit(name, imports, decls);
}

// Build a Unit for a program that contains only an expression
// (e.g., an input file that contains only "7").
function expressionProgram(expr) {
  return singleDefinitionProgram(New_Declaration_Statement(New_Statement_Expression(expr)));
}

// Expressions like `a  +  b * c`, where the right-hand op has higher precedence.
function aBC(a, op1, b, op2, c) {
  return New_Expression_Binary(op1, a, New_Expression_Binary(op2, b, c));
}

// Expressions like `a  *  b - c`, where the left-hand op has higher precedence.
function ABc(a, op1, b, op2, c) {
  return New_Expression_Binary(op2, New_Expression_Binary(op1, a, b), c);
}


describe("SimpleJS Parser", function () {

  it("should build a Lexer", function () {
    let emptyStringLexer = () => NewLexer("");
    expect(emptyStringLexer).not.to.throw(TypeError);
  });

  it("should throw TypeError on non-string input", function () {
    expect(() => NewParser(NewLexer(null))).to.throw(TypeError);
  });

  it("should return null on an empty string", function () {
    let parser = NewParser(NewLexer(""));
    expect(Parse(parser).Tag).to.equal('None');
  });

  it("should throw SyntaxError on `a+`", function () {
    let parser = NewParser(NewLexer("a+"));
    expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('unexpected end.of.input'));
  });

  it("should throw SyntaxError on `(a`", function () {
    let parser = NewParser(NewLexer("(a"));
    expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected .\\).'));
  });

  it("should throw SyntaxError on `)`", function () {
    let parser = NewParser(NewLexer(")"));
    expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected DECLARATION'));
  });

  it("should not allow `export` before ExpressionStatement", function () {
    let parser = NewParser(NewLexer("export 99"));
    expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('cannot be exported'));
  });

  it("should return ExpressionStatement on '44'", function () {
    let parser = NewParser(NewLexer("44;"));
    expect(Parse(parser).Just).to.deep.equal(expressionProgram(int("44")));
  });

  it("should return ExpressionStatement on '-1'", function () {
    let parser = NewParser(NewLexer("-002;"));
    let neg1 = New_Expression_UnaryPrefix('-', int("002"));
    expect(Parse(parser).Just).to.deep.equal(expressionProgram(neg1));
  });

  it("should return ExpressionStatement on '+1'", function () {
    let parser = NewParser(NewLexer("+003;"));
    let neg1 = New_Expression_UnaryPrefix('+', int("003"));
    expect(Parse(parser).Just).to.deep.equal(expressionProgram(neg1));
  });

  it("should get the precedence right on '1+2*3'", function () {
    let parser = NewParser(NewLexer("1+2*3;"));
    let one = int("1");
    let two = int("2");
    let three = int("3");
    expect(Parse(parser).Just).to.deep.equal(expressionProgram(aBC(one, '+', two, '*', three)));
  });

  it("should get the precedence right on '4/5-6'", function () {
    let parser = NewParser(NewLexer("4/5-6;"));
    let four = int("4");
    let five = int("5");
    let six = int("6");
    expect(Parse(parser).Just).to.deep.equal(expressionProgram(ABc(four, '/', five, '-', six)));
  });

  it("should get the precedence right on '1+2*3/4-5'", function () {
    let parser = NewParser(NewLexer("1+2*3/4-5;"));
    let x234 = ABc(int("2"), '*', int("3"), '/', int("4"));
    let expr = ABc(int("1"), '+', x234, '-', int("5"));
    expect(Parse(parser).Just).to.deep.equal(expressionProgram(expr));
  });

  it("should give unary minus highest precedence in '-x*y'", function () {
    let parser = NewParser(NewLexer("-x*y;"));
    let negX = New_Expression_UnaryPrefix('-', sym("x"));
    let expr = New_Expression_Binary('*', negX, sym("y"));
    expect(Parse(parser).Just).to.deep.equal(expressionProgram(expr));
  });

  it("should parse parenthesized expression lists", function() {
    let parser = NewParser(NewLexer('(1, 2, 3);'));
    let expr = list([int("1"), int("2"), int("3")]);
    expect(Parse(parser).Just).to.deep.equal(expressionProgram(expr));
  });

  describe("should parse array constructors", function() {
    it("that are empty", function() {
      let parser = NewParser(NewLexer('[ ];'));
      let expr = New_Expression_Array([ ]);
      expect(Parse(parser).Just).to.deep.equal(expressionProgram(expr));
    });
    it("that have contents", function() {
      let parser = NewParser(NewLexer('[p, (q,r), s];'));
      let a1 = sym("p");
      let a2 = list([sym("q"), sym("r")]);
      let a3 = sym("s");
      let expr = New_Expression_Array([a1, a2, a3]);
      expect(Parse(parser).Just).to.deep.equal(expressionProgram(expr));
    });
  });

  describe("should parse object constructors", function() {
    it("that are empty", function() {
      let parser = NewParser(NewLexer('{ };'));
      let expr = New_Expression_Object([ ]);
      expect(Parse(parser).Just).to.deep.equal(expressionProgram(expr));
    });
    it("that have contents", function() {
      let parser = NewParser(NewLexer('{H: 1, "He": 2, Li: (3,4), Be};'));
      let a1 = pair(sym("H"), Just(int("1")));
      let a2 = pair(str('"He"'), Just(int("2")));
      let a3 = pair(sym("Li"), Just(list([int("3"), int("4")])));
      let a4 = pair(sym("Be"), None('Expression'));
      let expr = New_Expression_Object([a1, a2, a3, a4]);
      expect(Parse(parser).Just).to.deep.equal(expressionProgram(expr));
    });
  });

  it("should handle accessor chains", function() {
    let parser = NewParser(NewLexer('f("s", function (){g(t).a.b.c([]);});'));
    expect(() => Parse(parser)).to.not.throw();
  });

  describe("should parse variable declarations", function() {
    it("with a single variable", function() {
      let parser = NewParser(NewLexer("let x = 54;"));
      let stmt = let_statement('x', int("54"));
      let unit = singleDefinitionProgram(stmt);
      expect(Parse(parser).Just).to.deep.equal(unit);
    });
    it("with multiple variables", function() {
      let parser = NewParser(NewLexer("let [x, y] = [55, 56];"));
      let functor = sym("f");
      let stmt = let_statement(["x", "y"], New_Expression_Array([int("55"), int("56")]));
      let unit = singleDefinitionProgram(stmt);
      expect(Parse(parser).Just).to.deep.equal(unit);
    });
    it("does not allow list lhs without any rhs", function() {
      let parser = NewParser(NewLexer("let [x, y];"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp("expected '='"));
    });
  });

  describe("should parse function application", function() {
    it("with zero arguments", function() {
      let parser = NewParser(NewLexer("f();"));
      let functor = sym("f");
      let stmt = New_Statement_Expression(New_Expression_Apply(functor, []));
      let unit = singleDefinitionProgram(New_Declaration_Statement(stmt));
      expect(Parse(parser).Just).to.deep.equal(unit);
    });
    it("with one argument", function() {
      let parser = NewParser(NewLexer("f(48);"));
      let functor = sym("f");
      let stmt = New_Statement_Expression(New_Expression_Apply(functor, [int("48")]));
      let unit = singleDefinitionProgram(New_Declaration_Statement(stmt));
      expect(Parse(parser).Just).to.deep.equal(unit);
    });
    it("with two arguments", function() {
      let parser = NewParser(NewLexer("f(49,50);"));
      let functor = sym("f");
      let stmt = New_Statement_Expression(New_Expression_Apply(functor, [int("49"), int("50")]));
      let unit = singleDefinitionProgram(New_Declaration_Statement(stmt));
      expect(Parse(parser).Just).to.deep.equal(unit);
    });
    it("with three arguments", function() {
      let parser = NewParser(NewLexer("f(49,(56,57),50);"));
      let functor = sym("f");
      let args = [int("49"), list([int("56"), int("57")]), int("50")];
      let stmt = New_Statement_Expression(New_Expression_Apply(functor, args));
      let unit = singleDefinitionProgram(New_Declaration_Statement(stmt));
      expect(Parse(parser).Just).to.deep.equal(unit);
    });
  });

  describe("should parse `new` expression", function() {
    it("with no parameter list", function() {
      let parser = NewParser(NewLexer("new X;"));
      let stmt = New_Statement_Expression(New_Expression_UnaryPrefix('new', sym("X")));
      let unit = singleDefinitionProgram(New_Declaration_Statement(stmt));
      expect(Parse(parser).Just).to.deep.equal(unit);
    });
    it("with zero arguments", function() {
      let parser = NewParser(NewLexer("new X();"));
      let stmt = New_Statement_Expression(New_Expression_Binary('new', sym("X"), list([])));
      let unit = singleDefinitionProgram(New_Declaration_Statement(stmt));
      expect(Parse(parser).Just).to.deep.equal(unit);
    });
    it("with one argument", function() {
      let parser = NewParser(NewLexer("new X(51);"));
      let stmt = New_Statement_Expression(New_Expression_Binary('new', sym("X"), list([int("51")])));
      let unit = singleDefinitionProgram(New_Declaration_Statement(stmt));
      expect(Parse(parser).Just).to.deep.equal(unit);
    });
    it("with two arguments", function() {
      let parser = NewParser(NewLexer("new X(52, 53);"));
      let stmt = New_Statement_Expression(New_Expression_Binary('new', sym("X"), list([int("52"), int("53")])));
      let unit = singleDefinitionProgram(New_Declaration_Statement(stmt));
      expect(Parse(parser).Just).to.deep.equal(unit);
    });
  });

  describe("should parse if statements correctly", function() {
    it("should require a parenthesis after `if`", function() {
      let parser = NewParser(NewLexer("if [ ] { }"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected `\\(`'));
    });
    it("should require a parenthesis after test expression", function() {
      let parser = NewParser(NewLexer("if (true { }"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected `\\)`'));
    });
    it("should require a curly brace to start body", function() {
      let parser = NewParser(NewLexer("if (true) [ ]"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected `{`'));
    });
    it("should require a curly brace to end body", function() {
      let parser = NewParser(NewLexer("if (true) { ]"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected DECLARATION or `}`'));
    });
    it("should handle a single statement in body of `if`", function() {
      let parser = NewParser(NewLexer("if (true) { 43; }"));
      let test = New_Expression_Literal(New_Literal_Boolean(true, "true"));
      let body = New_Statement_Block([New_Declaration_Statement(New_Statement_Expression(int("43")))]);
      let stmt = New_Statement_If(test, body, None('Statement'));
      let unit = singleDefinitionProgram(New_Declaration_Statement(stmt));
      expect(Parse(parser).Just).to.deep.equal(unit);
    });
  });

  describe("should parse while statements correctly", function() {
    it("should require a parenthesis after `while`", function() {
      let parser = NewParser(NewLexer("while [ ] { }"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected `\\(`'));
    });
    it("should require a parenthesis after test expression", function() {
      let parser = NewParser(NewLexer("while (true { }"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected `\\)`'));
    });
    it("should require a curly brace to start body", function() {
      let parser = NewParser(NewLexer("while (true) [ ]"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected `{`'));
    });
    it("should require a curly brace to end body", function() {
      let parser = NewParser(NewLexer("while (true) { ]"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected DECLARATION or `}`'));
    });
    it("should handle a single statement in body of `while`", function() {
      let parser = NewParser(NewLexer("while (true) { 43; }"));
      let test = New_Expression_Literal(New_Literal_Boolean(true, "true"));
      let body = New_Statement_Block([New_Declaration_Statement(New_Statement_Expression(int("43")))]);
      let stmt = New_Statement_While(test, body);
      let unit = singleDefinitionProgram(New_Declaration_Statement(stmt));
      expect(Parse(parser).Just).to.deep.equal(unit);
    });
  });

  describe("should parse functions correctly", function() {
    it("should require a name after `function`", function() {
      let parser = NewParser(NewLexer("function *;"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected SYMBOL'));
    });
    it("should require a parenthesis after function name", function() {
      let parser = NewParser(NewLexer("function f { };"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected `\\(`'));
    });
    it("should require opening curly brace", function () {
      let parser = NewParser(NewLexer("function f() [ ]"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected `{`'));
    });
    it("should require closing curly brace", function () {
      let parser = NewParser(NewLexer("function f() { ]"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected DECLARATION or `}`'));
    });
    it("should parse a function", function () {
      let parser = NewParser(NewLexer("function f() { }"));
      let sig = New_FunctionSignature([]);
      let body = New_Statement_Block([]);
      let decl = New_Declaration_Function("f", sig, body, false);
      let unit = singleDefinitionProgram(decl);
      expect(Parse(parser).Just).to.deep.equal(unit);
    });
    it("should handle a function literal", function () {
      let parser = NewParser(NewLexer("let f = function () { return 45; };"));
      let sig = New_FunctionSignature([]);
      let ret = New_Declaration_Statement(New_Statement_Return(Just(int("45"))));
      let body = New_Statement_Block([ret]);
      let expr = New_Expression_Literal(New_Literal_Function('', sig, body));
      let decl = let_statement('f', expr);
      let unit = singleDefinitionProgram(decl);
      expect(Parse(parser).Just).to.deep.equal(unit);
    });
  });

  it("should parse arrow functions", function() {
    let parser = NewParser(NewLexer("let x = () => f(46, 47);"));
    let functor = sym("f");
    let body = New_Expression_Apply(functor, [int("46"), int("47")]);
    let expr = New_Expression_Literal(New_Literal_ArrowFunctionExpression([], body));
    let decl = let_statement('x', expr);
    let unit = singleDefinitionProgram(decl);
    expect(Parse(parser).Just).to.deep.equal(unit);
  });

  describe("should parse modules correctly", function() {
    it("should require identifier after `module`", function() {
      let parser = NewParser(NewLexer("module import;"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected SYMBOL'));
    });

    it("should require semicolon after `module SYMBOL`", function() {
      let parser = NewParser(NewLexer("module xyz import"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected SEMICOLON'));
    });

    it("should recognize an empty module xyz", function() {
      let parser = NewParser(NewLexer("module xyz;"));
      let name = Just(New_ModuleName('xyz'));
      expect(Parse(parser).Just).to.deep.equal(New_Unit(name, [], []));
    });

    it("should build an AST for a module", function () {
      let parser = NewParser(NewLexer("module testModule; function douglas() { return 42; }"));
      let ast = Parse(parser).Just;
      let json = JSON.stringify(ast, null, 2);
      let expectedAST =
`{
  "Kind": "Unit",
  "Tag": "Unit",
  "Module": {
    "Kind": "Maybe",
    "Tag": "Just",
    "Just": {
      "Kind": "ModuleName",
      "Tag": "ModuleName",
      "Name": "testModule"
    }
  },
  "ImportList": [],
  "DeclarationList": [
    {
      "Kind": "Declaration",
      "Tag": "Function",
      "Name": "douglas",
      "Signature": {
        "Kind": "FunctionSignature",
        "Tag": "FunctionSignature",
        "FormalParameters": []
      },
      "Body": {
        "Kind": "Statement",
        "Tag": "Block",
        "Declarations": [
          {
            "Kind": "Declaration",
            "Tag": "Statement",
            "Statement": {
              "Kind": "Statement",
              "Tag": "Return",
              "Expression": {
                "Kind": "Maybe",
                "Tag": "Just",
                "Just": {
                  "Kind": "Expression",
                  "Tag": "Literal",
                  "Literal": {
                    "Kind": "Literal",
                    "Tag": "Fixnum",
                    "Value": 42,
                    "Text": "42"
                  }
                }
              }
            }
          }
        ]
      },
      "Exported": false
    }
  ]
}`;
      expect(json).to.equal(expectedAST);
    });
  });

  describe("should parse all source files without syntax error", function() {
    let files = [
      'test/resources/test-01.sjs',
      'test/resources/test-03.sjs',
      'test/resources/test-02.sjs',
      'src/sjs-to-js.mjs',
      // 'src/run-tests.mjs',  /* contains `async` and `await`
      'src/sjs-lexer.mjs',
      'test/sjs-lexer-spec.mjs',
      'src/emit-sjs.mjs',
      'test/sjs-parser-spec.mjs',
      'src/sjs-parser.mjs',
    ];
    let index = -1;
    while (index + 1 < files.length) {
      index++;
      let file = files[index];
      it(`should parse ${file}`, function () {
        fs.readFile(file, 'utf8', (err, file_content) => {
          if (err) {
            console.error(err);
            throw new SyntaxError(`could not read ${file}`);
          }
          //console.log(`file length is ${file_content.length}`);
          //console.log(`content: '${file_content.substring(0, 100)}...'`);
          let parser = NewParser(NewLexer(file_content));
          expect(() => Parse(parser)).not.to.throw();
        });
      });

  /////      fs.readFile(file, 'utf8', (err, file_content) => {
  /////        if (err) {
  /////          console.error(err);
  /////          throw new SyntaxError(`could not read ${file}`);
  /////        }
  /////        //console.log(`file length is ${file_content.length}`);
  /////        //console.log(`content: '${file_content.substring(0, 100)}...'`);
  /////        let parser = NewParser(NewLexer(file_content));
  /////        Parse(parser);
  /////      });

    }
  });

});
