import { expect } from "chai";
import { NewLexer  } from "../src/sjs-lexer.mjs";
import { InternalError, NewParser, Parse
       , Just, None
       , New_Unit, New_ModuleName
       , New_Declaration_Function, New_Declaration_Variable, New_Declaration_Variables
       , New_Declaration_Statement
       , New_FunctionSignature, New_Statement_List, New_Statement_Block
       , New_Statement_If, New_Statement_Return, New_Statement_While, New_Statement_For, New_Statement_Throw
       , New_Statement_Expression
       , New_Expression_Symbol, New_Expression_Literal, New_Expression_Grouping
       , New_Expression_List, New_Expression_Array, New_Expression_Object, New_Expression_Pair
       , New_Expression_UnaryPrefix, New_Expression_PostCircumfix, New_Expression_Binary, New_Expression_Ternary
       , New_Expression_Apply, New_List_Identifiers
       , New_Literal_Fixnum, New_Literal_Boolean, New_Literal_String
       , New_Literal_Function, New_Literal_ArrowFunctionExpression
       , describe_value, parseString
       } from "../src/sjs-parser.mjs";
import * as fs from 'fs';

function SjsLexer(text) {
  return NewLexer('', 'sjs', text);
}

function SjsParser(lexer) {
  return NewParser('sjs', lexer);
}

function strip_locations(tree) {
  if (tree !== null && typeof(tree) === 'object') {
    if (tree.hasOwnProperty('Loc')) {
      delete(tree.Loc);
    }
    for (const key of Object.keys(tree)) {
      strip_locations(tree[key]);
    }
  }
  return tree;
}

function parse(parser) {
  return strip_locations(Parse(parser).Just);
}

let loc = { Kind: 'Loc', File: '', Line: 1, Column: 999, Offset: 999 };
let token = { Kind: 'Token', Type: 'FIXNUM', Text: '', Loc: loc };
let fnToken = { Kind: 'Token', Type: 'function', Text: 'function', Loc: loc };

// Build a Token containing the given Type and Text
function tok(type, text) {
  return { Kind: 'Token', Type: type, Text: text, Loc: loc };
}
let plus = () => tok('PLUS', '+');
let minus = () => tok('MINUS', '-');
let star = () => tok('STAR', '*');
let slash = () => tok('SLASH', '/');
let question = () => tok('QUESTION', '?');
let colon = () => tok('COLON', ':');
let lparen = () => tok('LPAREN', '(');
let rparen = () => tok('RPAREN', ')');
let lbrack = () => tok('LBRACK', '[');
let rbrack = () => tok('RBRACK', ']');
let lbrace = () => tok('LBRACE', '{');
let rbrace = () => tok('RBRACE', '}');
let arrow = () => tok('ARROW', '=>');

function kw(text) {
  return { Kind: 'Token', Type: text, Text: text, Loc: loc };
}

function symtok(text) {
  return tok('SYMBOL', text);
}

// Build an Expression containing an integer literal.
function int(spelling) {
  if (typeof(spelling) === 'number') { spelling = `${spelling}`; }
  let loc = { Kind: 'Loc', File: '', Line: 1, Column: 99, Offset: 99 };
  let token = { Kind: 'Token', Type: 'FIXNUM', Text: spelling, Loc: loc };
  return New_Expression_Literal(New_Literal_Fixnum(token));
}

// Build an Expression containing a string literal.
function str(spelling) {
  let loc = { Kind: 'Loc', File: '', Line: 1, Column: 99, Offset: 99 };
  let token = { Kind: 'Token', Type: 'STRING', Text: spelling, Loc: loc };
  return New_Expression_Literal(New_Literal_String(token));
}

function sym(spelling) {
  let loc = { Kind: 'Loc', File: '', Line: 1, Column: 99, Offset: 99 };
  let token = { Kind: 'Token', Type: 'SYMBOL', Text: spelling, Loc: loc };
  return strip_locations(New_Expression_Symbol(token));
}

function pair(maybe_op, k, v) {
  return New_Expression_Pair(maybe_op, k, v);
}

function plist(exprs) {
  return New_Expression_List(tok('LPAREN', '('), tok('RPAREN', ')'), exprs, false);
}

function blist(exprs) {
  return New_Expression_List(tok('LBRACK', '['), tok('RBRACK', ']'), exprs, false);
}

function let_statement(lhs, rhs) {
  if (typeof(lhs) === 'string') {
    rhs = rhs === null ? None('Expression') : Just(rhs);
    return New_Declaration_Variable(kw('let'), lhs, rhs, false);
  } else if (typeof(lhs) === 'object' && Array.isArray(lhs)) {
    let commas = lhs.map((_) => tok('COMMA', ','));
    commas = commas.slice(0, commas.length - 1);
    let vars = New_List_Identifiers(lhs, commas);
    return New_Declaration_Variables(kw('let'), vars, rhs, false);
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
  return strip_locations(New_Unit(name, imports, decls, ''));
}

// Build a Unit for a program that contains only an expression
// (e.g., an input file that contains only "7").
function expressionProgram(expr) {
  let prog = singleDefinitionProgram(New_Declaration_Statement(New_Statement_Expression(expr)));
  return strip_locations(prog);
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
    let emptyStringLexer = () => SjsLexer("");
    expect(emptyStringLexer).not.to.throw(TypeError);
  });

  it("should throw TypeError on non-string input", function () {
    expect(() => SjsParser(SjsLexer(null))).to.throw(TypeError);
  });

  it("should return null on an empty string", function () {
    let parser = SjsParser(SjsLexer(""));
    expect(Parse(parser).Tag).to.equal('None');
  });

  it("should throw SyntaxError on `a+`", function () {
    let parser = SjsParser(SjsLexer("a+"));
    expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('unexpected end.of.input'));
  });

  it("should throw SyntaxError on `(a`", function () {
    let parser = SjsParser(SjsLexer("(a"));
    expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected .\\).'));
  });

  it("should throw SyntaxError on `)`", function () {
    let parser = SjsParser(SjsLexer(")"));
    expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected DECLARATION'));
  });

  it("should not allow `export` before ExpressionStatement", function () {
    let parser = SjsParser(SjsLexer("export 99"));
    expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('cannot be exported'));
  });

  it("should return ExpressionStatement on '44'", function () {
    let parser = SjsParser(SjsLexer("44;"));
    expect(parse(parser)).to.deep.equal(expressionProgram(int(44)));
  });

  it("should return ExpressionStatement on '-1'", function () {
    let parser = SjsParser(SjsLexer("-002;"));
    let neg1 = New_Expression_UnaryPrefix(minus(), int("002"));
    expect(parse(parser)).to.deep.equal(expressionProgram(neg1));
  });

  it("should return ExpressionStatement on '+1'", function () {
    let parser = SjsParser(SjsLexer("+003;"));
    let neg1 = New_Expression_UnaryPrefix(plus(), int("003"));
    expect(parse(parser)).to.deep.equal(expressionProgram(neg1));
  });

  it("should get the precedence right on '1+2*3'", function () {
    let parser = SjsParser(SjsLexer("1+2*3;"));
    let one = int("1");
    let two = int("2");
    let three = int("3");
    expect(parse(parser)).to.deep.equal(expressionProgram(aBC(one, plus(), two, star(), three)));
  });

  it("should get the precedence right on '4/5-6'", function () {
    let parser = SjsParser(SjsLexer("4/5-6;"));
    let four = int("4");
    let five = int("5");
    let six = int("6");
    expect(parse(parser)).to.deep.equal(expressionProgram(ABc(four, slash(), five, minus(), six)));
  });

  it("should get the precedence right on '1+2*3/4-5'", function () {
    let parser = SjsParser(SjsLexer("1+2*3/4-5;"));
    let x234 = ABc(int("2"), star(), int("3"), slash(), int("4"));
    let expr = ABc(int("1"), plus(), x234, minus(), int("5"));
    expect(parse(parser)).to.deep.equal(expressionProgram(expr));
  });

  it("should give unary minus highest precedence in '-x*y'", function () {
    let parser = SjsParser(SjsLexer("-x*y;"));
    let negX = New_Expression_UnaryPrefix(minus(), sym("x"));
    let expr = New_Expression_Binary(star(), negX, sym("y"));
    expect(parse(parser)).to.deep.equal(expressionProgram(expr));
  });

  it("should parse parenthesized expression lists", function() {
    let parser = SjsParser(SjsLexer('(1, 2, 3);'));
    let expr = plist([int("1"), int("2"), int("3")]);
    expect(parse(parser)).to.deep.equal(expressionProgram(expr));
  });

  it("should parse indexes (subscripts/array access)", function() {
    let parser = SjsParser(SjsLexer('a[1];'));
    let expr = New_Expression_PostCircumfix(lbrack(), rbrack(), sym('a'), int(1));
    expect(parse(parser)).to.deep.equal(expressionProgram(expr));
  });

  describe("should parse ternary operators", function() {
    it("as if-then-elsif-then", function() {
      let parser = SjsParser(SjsLexer('1 ? 2 : 3 ? 4 : 5;'));
      let nestedExpr = New_Expression_Ternary(question(), colon(), int("3"), int("4"), int("5"));
      let expr = New_Expression_Ternary(question(), colon(), int("1"), int("2"), nestedExpr);
      expect(parse(parser)).to.deep.equal(expressionProgram(expr));
    });
  });

  describe("should parse array constructors", function() {
    it("that are empty", function() {
      let parser = SjsParser(SjsLexer('[ ];'));
      let expr = New_Expression_Array(blist([ ]));
      expect(parse(parser)).to.deep.equal(expressionProgram(expr));
    });
    it("that have contents", function() {
      let parser = SjsParser(SjsLexer('[p, (q,r), s];'));
      let a1 = sym("p");
      let a2 = plist([sym("q"), sym("r")]);
      let a3 = sym("s");
      let expr = New_Expression_Array(blist([a1, a2, a3]));
      expect(parse(parser)).to.deep.equal(expressionProgram(expr));
    });
  });

  describe("should parse object constructors", function() {
    it("that are empty", function() {
      let parser = SjsParser(SjsLexer('{ };'));
      let expr = New_Expression_Object(lbrace(), rbrace(), [ ]);
      expect(parse(parser)).to.deep.equal(expressionProgram(expr));
    });
    it("that have contents", function() {
      let parser = SjsParser(SjsLexer('{H: 1, "He": 2, Li: (3,4), Be};'));
      let a1 = pair(Just(colon()), sym("H"), Just(int("1")));
      let a2 = pair(Just(colon()), str('"He"'), Just(int("2")));
      let a3 = pair(Just(colon()), sym("Li"), Just(plist([int("3"), int("4")])));
      let a4 = pair(None('Token'), sym("Be"), None('Expression'));
      let expr = New_Expression_Object(lbrace(), rbrace(), [a1, a2, a3, a4]);
      expect(parse(parser)).to.deep.equal(expressionProgram(expr));
    });
  });

  it("should handle accessor chains", function() {
    let parser = SjsParser(SjsLexer('f("s", function (){g(t).a.b.c([]);});'));
    expect(() => Parse(parser)).to.not.throw();
  });

  describe("should parse variable declarations", function() {
    it("with a single variable", function() {
      let parser = SjsParser(SjsLexer("let x = 54;"));
      let stmt = let_statement('x', int(54));
      let unit = singleDefinitionProgram(stmt);
      expect(parse(parser)).to.deep.equal(unit);
    });
    it("with multiple variables", function() {
      let parser = SjsParser(SjsLexer("let [x, y] = [55, 56];"));
      let functor = sym("f");
      let vars = [tok('SYMBOL', 'x'), tok('SYMBOL', 'y')];
      let stmt = let_statement(vars, New_Expression_Array(blist([int(55), int(56)])));
      let unit = singleDefinitionProgram(stmt);
      expect(parse(parser)).to.deep.equal(unit);
    });
    it("does not allow list lhs without any rhs", function() {
      let parser = SjsParser(SjsLexer("let [x, y];"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp("expected '='"));
    });
  });

  describe("should parse function application", function() {
    it("with zero arguments", function() {
      let parser = SjsParser(SjsLexer("f();"));
      let functor = sym("f");
      let stmt = New_Statement_Expression(New_Expression_Apply(functor, plist([])));
      let unit = singleDefinitionProgram(New_Declaration_Statement(stmt));
      expect(parse(parser)).to.deep.equal(unit);
    });
    it("with one argument", function() {
      let parser = SjsParser(SjsLexer("f(48);"));
      let functor = sym("f");
      let stmt = New_Statement_Expression(New_Expression_Apply(functor, plist([int(48)])));
      let unit = singleDefinitionProgram(New_Declaration_Statement(stmt));
      expect(parse(parser)).to.deep.equal(unit);
    });
    it("with two arguments", function() {
      let parser = SjsParser(SjsLexer("f(49,50);"));
      let functor = sym("f");
      let stmt = New_Statement_Expression(New_Expression_Apply(functor, plist([int(49), int(50)])));
      let unit = singleDefinitionProgram(New_Declaration_Statement(stmt));
      expect(parse(parser)).to.deep.equal(unit);
    });
    it("with three arguments", function() {
      let parser = SjsParser(SjsLexer("f(49,(56,57),50);"));
      let functor = sym("f");
      let args = plist([int(49), plist([int(56), int(57)]), int(50)]);
      let stmt = New_Statement_Expression(New_Expression_Apply(functor, args));
      let unit = singleDefinitionProgram(New_Declaration_Statement(stmt));
      expect(parse(parser)).to.deep.equal(unit);
    });
  });

  describe("should parse `new` expression", function() {
    it("with no parameter list", function() {
      let parser = SjsParser(SjsLexer("new X;"));
      let stmt = New_Statement_Expression(New_Expression_UnaryPrefix(kw('new'), sym("X")));
      let unit = singleDefinitionProgram(New_Declaration_Statement(stmt));
      expect(parse(parser)).to.deep.equal(unit);
    });
    it("with zero arguments", function() {
      let parser = SjsParser(SjsLexer("new X();"));
      let stmt = New_Statement_Expression(New_Expression_Binary(kw('new'), sym("X"), plist([])));
      let unit = singleDefinitionProgram(New_Declaration_Statement(stmt));
      expect(parse(parser)).to.deep.equal(unit);
    });
    it("with one argument", function() {
      let parser = SjsParser(SjsLexer("new X(51);"));
      let stmt = New_Statement_Expression(New_Expression_Binary(kw('new'), sym("X"), plist([int(51)])));
      let unit = singleDefinitionProgram(New_Declaration_Statement(stmt));
      expect(parse(parser)).to.deep.equal(unit);
    });
    it("with two arguments", function() {
      let parser = SjsParser(SjsLexer("new X(52, 53);"));
      let stmt = New_Statement_Expression(New_Expression_Binary(kw('new'), sym("X"), plist([int(52), int(53)])));
      let unit = singleDefinitionProgram(New_Declaration_Statement(stmt));
      expect(parse(parser)).to.deep.equal(unit);
    });
  });

  describe("should parse if statements correctly", function() {
    it("should require a parenthesis after `if`", function() {
      let parser = SjsParser(SjsLexer("if [ ] { }"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected `\\(`'));
    });
    it("should require a parenthesis after test expression", function() {
      let parser = SjsParser(SjsLexer("if (true { }"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected `\\)`'));
    });
    it("should require a curly brace to start body", function() {
      let parser = SjsParser(SjsLexer("if (true) [ ]"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected `{`'));
    });
    it("should require a curly brace to end body", function() {
      let parser = SjsParser(SjsLexer("if (true) { ]"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected DECLARATION or `}`'));
    });
    it("should handle a single statement in body of `if`", function() {
      let parser = SjsParser(SjsLexer("if (true) { 43; }"));
      let loc = { Kind: 'Loc', File: '', Line: 1, Column: 5, Offset: 4 };
      let lit = { Value: true, Text: "true", Loc: loc };
      let test = New_Expression_Grouping(lparen(), rparen(), New_Expression_Literal(New_Literal_Boolean(lit)));
      let body = New_Statement_Block(lbrace(), rbrace(),
        [New_Declaration_Statement(New_Statement_Expression(int(43)))]);
      let stmt = New_Statement_If(kw('if'), None('Token'), None('Token'), test, body, None('Statement'));
      let unit = strip_locations(singleDefinitionProgram(New_Declaration_Statement(stmt)));
      expect(parse(parser)).to.deep.equal(unit);
    });
  });

  describe("should parse while statements correctly", function() {
    it("should require a parenthesis after `while`", function() {
      let parser = SjsParser(SjsLexer("while [ ] { }"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected `\\(`'));
    });
    it("should require a parenthesis after test expression", function() {
      let parser = SjsParser(SjsLexer("while (true { }"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected `\\)`'));
    });
    it("should require a curly brace to start body", function() {
      let parser = SjsParser(SjsLexer("while (true) [ ]"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected `{`'));
    });
    it("should require a curly brace to end body", function() {
      let parser = SjsParser(SjsLexer("while (true) { ]"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected DECLARATION or `}`'));
    });
    it("should handle a single statement in body of `while`", function() {
      let parser = SjsParser(SjsLexer("while (true) { 43; }"));
      let loc = { Kind: 'Loc', File: '', Line: 1, Column: 8, Offset: 7 };
      let lit = { Value: true, Text: "true", Loc: loc };
      let test = New_Expression_Literal(New_Literal_Boolean(lit));
      let body = New_Statement_Block(lbrace(), rbrace(),
        [New_Declaration_Statement(New_Statement_Expression(int(43)))]);
      let stmt = New_Statement_While(kw('while'), test, body);
      let unit = strip_locations(singleDefinitionProgram(New_Declaration_Statement(stmt)));
      expect(parse(parser)).to.deep.equal(unit);
    });
  });

  describe("should parse for statements correctly", function() {
    it("should require a parenthesis after `for`", function() {
      let parser = SjsParser(SjsLexer("for [ ] { }"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected `\\(`'));
    });
    it("should require a parenthesis after test expression", function() {
      let parser = SjsParser(SjsLexer("for (var x of a { }"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected `\\)`'));
    });
    it("should require a curly brace to start body", function() {
      let parser = SjsParser(SjsLexer("for (let x of a) [ ]"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected `{`'));
    });
    it("should require a curly brace to end body", function() {
      let parser = SjsParser(SjsLexer("for (const x of a) { ]"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected DECLARATION or `}`'));
    });
    it("should handle a single statement in body of `for`", function() {
      let parser = SjsParser(SjsLexer("for (x of a) { 58; }"));
      let body = New_Statement_Block(lbrace(), rbrace(),
        [New_Declaration_Statement(New_Statement_Expression(int(58)))]);
      let varKw = None('Token');
      let vars = New_List_Identifiers([tok('SYMBOL', 'x')], []);
      let stmt = New_Statement_For(kw('for'), varKw, vars, sym("a"), body, false);
      let unit = strip_locations(singleDefinitionProgram(New_Declaration_Statement(stmt)));
      expect(parse(parser)).to.deep.equal(unit);
    });
  });

  describe("should parse functions correctly", function() {
    it("should require a name after `function`", function() {
      let parser = SjsParser(SjsLexer("function *;"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected SYMBOL'));
    });
    it("should require a parenthesis after function name", function() {
      let parser = SjsParser(SjsLexer("function f { };"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected `\\(`'));
    });
    it("should require opening curly brace", function () {
      let parser = SjsParser(SjsLexer("function f() [ ]"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected `{`'));
    });
    it("should require closing curly brace", function () {
      let parser = SjsParser(SjsLexer("function f() { ]"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected DECLARATION or `}`'));
    });
    it("should parse a function", function () {
      let parser = SjsParser(SjsLexer("function f() { }"));
      let sig = New_FunctionSignature(lparen(), rparen(), New_List_Identifiers([],[]));
      let body = New_Statement_Block(lbrace(), rbrace(), []);
      let decl = New_Declaration_Function("f", sig, body, false, false);
      let unit = singleDefinitionProgram(decl);
      expect(parse(parser)).to.deep.equal(unit);
    });
    it("should handle a function literal", function () {
      let parser = SjsParser(SjsLexer("let f = function () { return 45; };"));
      let sig = New_FunctionSignature(lparen(), rparen(), New_List_Identifiers([],[]));
      let ret = New_Declaration_Statement(New_Statement_Return(kw('return'), Just(int(45))));
      let body = New_Statement_Block(lbrace(), rbrace(), [ret]);
      let expr = New_Expression_Literal(New_Literal_Function(fnToken, symtok(''), sig, body));
      let decl = let_statement('f', expr);
      let unit = singleDefinitionProgram(decl);
      expect(parse(parser)).to.deep.equal(unit);
    });
  });

  it("should parse arrow functions", function() {
    let parser = SjsParser(SjsLexer("let x = () => f(46, 47);"));
    let functor = sym("f");
    let body = New_Expression_Apply(functor, plist([int(46), int(47)]));
    let expr = New_Expression_Literal(New_Literal_ArrowFunctionExpression(arrow(), plist([]), body));
    let decl = let_statement('x', expr);
    let unit = singleDefinitionProgram(decl);
    expect(parse(parser)).to.deep.equal(unit);
  });

  describe("should parse modules correctly", function() {
    it("should require identifier after `module`", function() {
      let parser = SjsParser(SjsLexer("module import;"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected SYMBOL'));
    });

    it("should require semicolon after `module SYMBOL`", function() {
      let parser = SjsParser(SjsLexer("module xyz import"));
      expect(() => Parse(parser).Just).to.throw(SyntaxError, new RegExp('expected .SEMICOLON.'));
    });

    it("should recognize an empty module xyz", function() {
      let parser = SjsParser(SjsLexer("module xyz;"));
      let name = strip_locations(Just(New_ModuleName(tok('module', 'module'), tok('SYMBOL', 'xyz'))));
      expect(parse(parser)).to.deep.equal(New_Unit(name, [], [], ''));
    });

    it("should build an AST for a module", function () {
      let parser = SjsParser(SjsLexer("module testModule; function douglas() { return 42; }"));
      let ast = parse(parser);
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
      "Module": {
        "Kind": "Token",
        "Type": "module",
        "Text": "module"
      },
      "Name": {
        "Kind": "Token",
        "Type": "SYMBOL",
        "Text": "testModule"
      }
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
        "DelimiterLeft": {
          "Kind": "Token",
          "Type": "LPAREN",
          "Text": "("
        },
        "DelimiterRight": {
          "Kind": "Token",
          "Type": "RPAREN",
          "Text": ")"
        },
        "FormalParameters": {
          "Kind": "List",
          "Tag": "Identifiers",
          "Identifiers": [],
          "Commas": []
        }
      },
      "Body": {
        "Kind": "Statement",
        "Tag": "Block",
        "Opener": {
          "Kind": "Token",
          "Type": "LBRACE",
          "Text": "{"
        },
        "Closer": {
          "Kind": "Token",
          "Type": "RBRACE",
          "Text": "}"
        },
        "Statements": [
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
      "Exported": false,
      "IsAsync": false
    }
  ],
  "ExpectedOutput": ""
}`;
      expect(json).to.equal(expectedAST);
    });
  });

  describe("should parse all source files without syntax error", function() {
    let files = [
      'cmd/prism.mjs',
      'cmd/run-tests.mjs',
      'src/emit-js.mjs',
      'src/sjs-lexer.mjs',
      'src/sjs-parser.mjs',
      'test/sjs-lexer-spec.mjs',
      'test/sjs-parser-spec.mjs',
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
          let parser = SjsParser(SjsLexer(file_content));
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
  /////        let parser = SjsParser(SjsLexer(file_content));
  /////        Parse(parser);
  /////      });

    }
  });

});
