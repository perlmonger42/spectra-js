import { expect } from "chai";
import { NextItem, NewLexer } from "../src/sjs-lexer.mjs";

function match(token, kind, text) {
  expect({Type: token.Type, Text: token.Text}).to.deep.equal({Type: kind, Text: text});
}

function SjsLexer(text) {
  return NewLexer('', 'sjs', text);
}

function Sp1Lexer(text) {
  return NewLexer('', 'sp1', text);
}

function tok(t) {
  let loc = { Kind: 'Loc', File: '', Line: t[2], Column: t[3], Offset: t[4] };
  return { Kind: 'Token', Type: t[0], Text: t[1], Loc: loc };
}

function next(lexer) {
  return NextItem(lexer, true, true);
}

describe("SimpleJS Lexer", function () {

  it("should return EOF immediately on an empty string", function () {
    var lexer = SjsLexer("");
    expect(NextItem(lexer, true)).to.deep.equal(tok(['EOF', '', 1, 1, 0]));
  });

  describe("should scan regular expressions", function () {
    it("simple", function () {
      var lexer = SjsLexer("/blah/");
      expect(NextItem(lexer, true)).to.deep.equal(tok(['REGEXP', '/blah/', 1, 1, 0]));
    });
    it("with flags", function () {
      var lexer = SjsLexer("/x/gi");
      expect(NextItem(lexer, true)).to.deep.equal(tok(['REGEXP', '/x/gi', 1, 1, 0]));
    });
    it("with escaped slash", function () {
      var lexer = SjsLexer("/\\//ms");
      expect(NextItem(lexer, true)).to.deep.equal(tok(['REGEXP', '/\\//ms', 1, 1, 0]));
    });
    it("with class", function () {
      var lexer = SjsLexer("/[a-z/]*/g");
      expect(NextItem(lexer, true)).to.deep.equal(tok(['REGEXP', '/[a-z/]*/g', 1, 1, 0]));
    });
  });

  it("should handle whitespace and newlines properly", function () {
    var lexer = SjsLexer(" \t\v \n \n\r\n   \n");
    expect(next(lexer)).to.deep.equal(tok(['WHITESPACE', ' \t\v ', 1, 1, 0]));
    expect(next(lexer)).to.deep.equal(tok(['NEWLINE', '\n', 1, 5, 4]));
    expect(next(lexer)).to.deep.equal(tok(['WHITESPACE', ' ', 2, 1, 5]));
    expect(next(lexer)).to.deep.equal(tok(['NEWLINE', '\n', 2, 2, 6]));
    expect(next(lexer)).to.deep.equal(tok(['NEWLINE', '\r\n', 3, 1, 7]));
    expect(next(lexer)).to.deep.equal(tok(['WHITESPACE', '   ', 4, 1, 9]));
    expect(next(lexer)).to.deep.equal(tok(['NEWLINE', '\n', 4, 4, 12]));
    expect(next(lexer)).to.deep.equal(tok(['EOF', '', 5, 1, 13]));
  });

  describe("should compute correct positions with newlines in tokens", function () {
    it("which happens with block comments", function () {
      var lexer = SjsLexer("1 /*\n*/ 2");
      expect(next(lexer)).to.deep.equal(tok(['FIXNUM', '1', 1, 1, 0]));
      expect(next(lexer)).to.deep.equal(tok(['WHITESPACE', ' ', 1, 2, 1]));
      expect(next(lexer)).to.deep.equal(tok(['BLOCK_COMMENT', '/*\n*/', 1, 3, 2]));
      expect(next(lexer)).to.deep.equal(tok(['WHITESPACE', ' ', 2, 3, 7]));
      expect(next(lexer)).to.deep.equal(tok(['FIXNUM', '2', 2, 4, 8]));
    });
    it("which happens with back-quoted strings", function () {
      var lexer = SjsLexer("3`a\nb\nc`4");
      expect(NextItem(lexer, true)).to.deep.equal(tok(['FIXNUM', '3', 1, 1, 0]));
      expect(NextItem(lexer, true)).to.deep.equal(tok(['STRING', '`a\nb\nc`', 1, 2, 1]));
      expect(NextItem(lexer, true)).to.deep.equal(tok(['FIXNUM', '4', 3, 3, 8]));
    });
  });

  describe("should recognize identifiers", function () {
    var token;
    var lexer = SjsLexer("a bc");
    beforeEach(function () { token = NextItem(lexer, true); });
    it("should be symbol 'a'", function () {
      expect(token).to.deep.equal(tok(['SYMBOL', 'a', 1, 1, 0]));
    });
    it("should be whitespace", function () {
      expect(token).to.deep.equal(tok(['WHITESPACE', ' ', 1, 2, 1]));
    });
    it("should be symbol 'bc'", function () {
      expect(token).to.deep.equal(tok(['SYMBOL', 'bc', 1, 3, 2]));
    });
  });

  describe("should recognize skip-whitespace parameter", function () {
    var token;
    var lexer = SjsLexer("a bc");
    beforeEach(function () { token = NextItem(lexer, false); });
    it("should be symbol 'a'", function () {
      match(token, 'SYMBOL', 'a');
    });
    it("should be symbol 'bc'", function () {
      match(token, 'SYMBOL', 'bc');
    });
  });

  describe("should recognize punctuation", function () {
    var token;
    var lexer = SjsLexer("(){}[];=====!==!= <= < >= > =");
    beforeEach(function () { token = NextItem(lexer, false); });
    it("should be a open parenthesis", function () {
      expect(token).to.deep.equal(tok(['LPAREN', '(', 1, 1, 0]));
    });
    it("should be a close parenthesis", function () {
      expect(token).to.deep.equal(tok(['RPAREN', ')', 1, 2, 1]));
    });
    it("should be a open curly brace", function () {
      expect(token).to.deep.equal(tok(['LBRACE', '{', 1, 3, 2]));
    });
    it("should be a close curly brace", function () {
      expect(token).to.deep.equal(tok(['RBRACE', '}', 1, 4, 3]));
    });
    it("should be a open square bracket", function () {
      expect(token).to.deep.equal(tok(['LBRACK', '[', 1, 5, 4]));
    });
    it("should be a close square bracket", function () {
      expect(token).to.deep.equal(tok(['RBRACK', ']', 1, 6, 5]));
    });
    it("should be a semicolon", function () {
      expect(token).to.deep.equal(tok(['SEMICOLON', ';', 1, 7, 6]));
    });
    it("should be an identical operator", function () {
      expect(token).to.deep.equal(tok(['IDENTICAL', '===', 1, 8, 7]));
    });
    it("should be an equals operator", function () {
      expect(token).to.deep.equal(tok(['EQ', '==', 1, 11, 10]));
    });
    it("should be a not-identical operator", function () {
      expect(token).to.deep.equal(tok(['NOTIDENTICAL', '!==', 1, 13, 12]));
    });
    it("should be a not-equals operator", function () {
      expect(token).to.deep.equal(tok(['NEQ', '!=', 1, 16, 15]));
    });
    it("should be a less-than-or-equals operator", function () {
      expect(token).to.deep.equal(tok(['LEQ', '<=', 1, 19, 18]));
    });
    it("should be a less-than operator", function () {
      expect(token).to.deep.equal(tok(['LT', '<', 1, 22, 21]));
    });
    it("should be a greater-than-or-equals operator", function () {
      expect(token).to.deep.equal(tok(['GEQ', '>=', 1, 24, 23]));
    });
    it("should be a greater-than operator", function () {
      expect(token).to.deep.equal(tok(['GT', '>', 1, 27, 26]));
    });
    it("should be an assignment operator", function () {
      expect(token).to.deep.equal(tok(['ASSIGN', '=', 1, 29, 28]));
    });
  });

  describe("should recognize Spectra keywords", function () {
    var text = "do blah end fn elsif";
    var token;
    var lexer = Sp1Lexer(text);
    beforeEach(function () { token = NextItem(lexer, false); });
    it("should be `do`", function () {
      expect(token).to.deep.equal(tok(['do', 'do', 1, 1, 0]));
    });
    it("should be `blah`", function () {
      expect(token).to.deep.equal(tok(['SYMBOL', 'blah', 1, 4, 3]));
    });
    it("should be `end`", function () {
      expect(token).to.deep.equal(tok(['end', 'end', 1, 9, 8]));
    });
    it("should be `fn`", function () {
      expect(token).to.deep.equal(tok(['fn', 'fn', 1, 13, 12]));
    });
    it("should be `elsif`", function () {
      expect(token).to.deep.equal(tok(['elsif', 'elsif', 1, 16, 15]));
    });
  });

  describe("should recognize SimpleJavaScript keywords", function () {
    var text = "do else end if function import module then let export fn elsif";
    var token;
    var lexer = SjsLexer(text);
    beforeEach(function () { token = NextItem(lexer, false); });
    it("should be SYMBOL `do`", function () {
      expect(token).to.deep.equal(tok(['SYMBOL', 'do', 1, 1, 0]));
    });
    it("should be `else`", function () {
      expect(token).to.deep.equal(tok(['else', 'else', 1, 4, 3]));
    });
    it("should be SYMBOL `end`", function () {
      expect(token).to.deep.equal(tok(['SYMBOL', 'end', 1, 9, 8]));
    });
    it("should be `if`", function () {
      expect(token).to.deep.equal(tok(['if', 'if', 1, 13, 12]));
    });
    it("should be `function`", function () {
      expect(token).to.deep.equal(tok(['function', 'function', 1, 16, 15]));
    });
    it("should be `import`", function () {
      expect(token).to.deep.equal(tok(['import', 'import', 1, 25, 24]));
    });
    it("should be `module`", function () {
      expect(token).to.deep.equal(tok(['module', 'module', 1, 32, 31]));
    });
    it("should be `then`", function () {
      expect(token).to.deep.equal(tok(['then', 'then', 1, 39, 38]));
    });
    it("should be `let`", function () {
      expect(token).to.deep.equal(tok(['let', 'let', 1, 44, 43]));
    });
    it("should be `export`", function () {
      expect(token).to.deep.equal(tok(['export', 'export', 1, 48, 47]));
    });
    it("should be SYMBOL `fn`", function () {
      expect(token).to.deep.equal(tok(['SYMBOL', 'fn', 1, 55, 54]));
    });
    it("should be SYMBOL `elsif`", function () {
      expect(token).to.deep.equal(tok(['SYMBOL', 'elsif', 1, 58, 57]));
    });
    it("should be EOF", function () {
      expect(token).to.deep.equal(tok(['EOF', '', 1, 63, 62]));
    });
  });

  describe('token variety in: \'(a!) "hello, world""unfinished\\nline"\'', function () {
    var token;
    var lexer = SjsLexer('(a!) "hello, world""unfinished\nline"');
    beforeEach(function () { token = NextItem(lexer, true); });
    it("next is open parenthesis", function () {
      match(token, 'LPAREN', '(');
    });
    it("next is symbol 'a'", function () {
      match(token, 'SYMBOL', 'a');
    });
    it("next is unknown ('!')", function () {
      match(token, 'NOT', '!');
    });
    it("next is close parenthesis", function () {
      match(token, 'RPAREN', ')');
    });
    it("next is whitespace", function () {
      match(token, 'WHITESPACE', ' ');
    });
    it('next is "" string', function () {
      match(token, 'STRING', '"hello, world"');
    });
    it('next is bad string', function () {
      match(token, 'BADSTRING', '"unfinished');
    });
    it('next is newline', function () {
      match(token, 'NEWLINE', '\n');
    });
    it("next is symbol 'line'", function () {
      match(token, 'SYMBOL', 'line');
    });
    it('next is bad string', function () {
      match(token, 'BADSTRING', '"');
    });
    it('nothing left', function () {
      match(token, 'EOF', '');
    });
  });

  describe('newline in strings', function () {
    it("double-quoted strings should not span lines", function () {
      let lexer = SjsLexer('"stuff\nand\nnonsense"');
      let token = NextItem(lexer, true);
      match(token, 'BADSTRING', '"stuff');
    });
    it("single-quoted strings should not span lines", function () {
      let lexer = SjsLexer("'stuff\nand\nnonsense'");
      let token = NextItem(lexer, true);
      match(token, 'BADSTRING', "'stuff");
    });
    it("back-quoted strings may span lines", function () {
      let lexer = SjsLexer('`stuff\nand\nnonsense`');
      let token = NextItem(lexer, true);
      match(token, 'STRING', '`stuff\nand\nnonsense`');
    });
  });

  describe('strings should be terminated', function () {
    it("double-quoted strings should end with double-quote", function () {
      let lexer = SjsLexer('"stuff');
      let token = NextItem(lexer, true);
      match(token, 'BADSTRING', '"stuff');
    });
    it("single-quoted strings should end with single-quote", function () {
      let lexer = SjsLexer("'stuff");
      let token = NextItem(lexer, true);
      match(token, 'BADSTRING', "'stuff");
    });
    it("back-quoted strings should end with back-quote", function () {
      let lexer = SjsLexer('`stuff\nand\nnonsense');
      let token = NextItem(lexer, true);
      match(token, 'BADSTRING', '`stuff');
    });
  });
});
