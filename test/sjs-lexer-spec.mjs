import { expect } from "chai";
import { NextItem, NewLexer } from "../src/sjs-lexer.mjs";

function match(token, kind, text) {
  expect(token.slice(0,2)).to.have.ordered.members([kind, text]);
}

function SjsLexer(text) {
  return NewLexer('sjs', text);
}

describe("SimpleJS Lexer", function () {

  it("should return EOF immediately on an empty string", function () {
    var lexer = SjsLexer("");
    expect(NextItem(lexer, true)).to.deep.equal(['EOF', '', 1, 1, 0]);
  });

  describe("should scan regular expressions", function () {
    it("simple", function () {
      var lexer = SjsLexer("/blah/");
      expect(NextItem(lexer, true)).to.deep.equal(['REGEXP', '/blah/', 1, 1, 0]);
    });
    it("with flags", function () {
      var lexer = SjsLexer("/x/gi");
      expect(NextItem(lexer, true)).to.deep.equal(['REGEXP', '/x/gi', 1, 1, 0]);
    });
    it("with escaped slash", function () {
      var lexer = SjsLexer("/\\//ms");
      expect(NextItem(lexer, true)).to.deep.equal(['REGEXP', '/\\//ms', 1, 1, 0]);
    });
    it("with class", function () {
      var lexer = SjsLexer("/[a-z/]*/g");
      expect(NextItem(lexer, true)).to.deep.equal(['REGEXP', '/[a-z/]*/g', 1, 1, 0]);
    });
  });

  it("should handle whitespace and newlines properly", function () {
    var lexer = SjsLexer(" \t\v \n \n\r\n   \n");
    expect(NextItem(lexer, true)).to.deep.equal(['WHITESPACE', ' \t\v ', 1, 1, 0]);
    expect(NextItem(lexer, true)).to.deep.equal(['NEWLINE', '\n', 1, 5, 4]);
    expect(NextItem(lexer, true)).to.deep.equal(['WHITESPACE', ' ', 2, 1, 5]);
    expect(NextItem(lexer, true)).to.deep.equal(['NEWLINE', '\n', 2, 2, 6]);
    expect(NextItem(lexer, true)).to.deep.equal(['NEWLINE', '\r\n', 3, 1, 7]);
    expect(NextItem(lexer, true)).to.deep.equal(['WHITESPACE', '   ', 4, 1, 9]);
    expect(NextItem(lexer, true)).to.deep.equal(['NEWLINE', '\n', 4, 4, 12]);
    expect(NextItem(lexer, true)).to.deep.equal(['EOF', '', 5, 1, 13]);
  });

  describe("should compute correct positions with newlines in tokens", function () {
    it("which happens with block comments", function () {
      var lexer = SjsLexer("1 /*\n*/ 2");
      expect(NextItem(lexer, true)).to.deep.equal(['FIXNUM', '1', 1, 1, 0]);
      expect(NextItem(lexer, true)).to.deep.equal(['WHITESPACE', ' ', 1, 2, 1]);
      expect(NextItem(lexer, true)).to.deep.equal(['BLOCK_COMMENT', '/*\n*/', 1, 3, 2]);
      expect(NextItem(lexer, true)).to.deep.equal(['WHITESPACE', ' ', 2, 3, 7]);
      expect(NextItem(lexer, true)).to.deep.equal(['FIXNUM', '2', 2, 4, 8]);
    });
    it("which happens with back-quoted strings", function () {
      var lexer = SjsLexer("3`a\nb\nc`4");
      expect(NextItem(lexer, true)).to.deep.equal(['FIXNUM', '3', 1, 1, 0]);
      expect(NextItem(lexer, true)).to.deep.equal(['STRING', '`a\nb\nc`', 1, 2, 1]);
      expect(NextItem(lexer, true)).to.deep.equal(['FIXNUM', '4', 3, 3, 8]);
    });
  });

  describe("should recognize identifiers", function () {
    var token;
    var lexer = SjsLexer("a bc");
    beforeEach(function () { token = NextItem(lexer, true); });
    it("should be symbol 'a'", function () {
      expect(token).to.deep.equal(['SYMBOL', 'a', 1, 1, 0]);
    });
    it("should be whitespace", function () {
      expect(token).to.deep.equal(['WHITESPACE', ' ', 1, 2, 1]);
    });
    it("should be symbol 'bc'", function () {
      expect(token).to.deep.equal(['SYMBOL', 'bc', 1, 3, 2]);
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
      expect(token).to.deep.equal(['LPAREN', '(', 1, 1, 0]);
    });
    it("should be a close parenthesis", function () {
      expect(token).to.deep.equal(['RPAREN', ')', 1, 2, 1]);
    });
    it("should be a open curly brace", function () {
      expect(token).to.deep.equal(['LBRACE', '{', 1, 3, 2]);
    });
    it("should be a close curly brace", function () {
      expect(token).to.deep.equal(['RBRACE', '}', 1, 4, 3]);
    });
    it("should be a open square bracket", function () {
      expect(token).to.deep.equal(['LBRACK', '[', 1, 5, 4]);
    });
    it("should be a close square bracket", function () {
      expect(token).to.deep.equal(['RBRACK', ']', 1, 6, 5]);
    });
    it("should be a semicolon", function () {
      expect(token).to.deep.equal(['SEMICOLON', ';', 1, 7, 6]);
    });
    it("should be an identical operator", function () {
      expect(token).to.deep.equal(['IDENTICAL', '===', 1, 8, 7]);
    });
    it("should be an equals operator", function () {
      expect(token).to.deep.equal(['EQ', '==', 1, 11, 10]);
    });
    it("should be a not-identical operator", function () {
      expect(token).to.deep.equal(['NOTIDENTICAL', '!==', 1, 13, 12]);
    });
    it("should be a not-equals operator", function () {
      expect(token).to.deep.equal(['NEQ', '!=', 1, 16, 15]);
    });
    it("should be a less-than-or-equals operator", function () {
      expect(token).to.deep.equal(['LEQ', '<=', 1, 19, 18]);
    });
    it("should be a less-than operator", function () {
      expect(token).to.deep.equal(['LT', '<', 1, 22, 21]);
    });
    it("should be a greater-than-or-equals operator", function () {
      expect(token).to.deep.equal(['GEQ', '>=', 1, 24, 23]);
    });
    it("should be a greater-than operator", function () {
      expect(token).to.deep.equal(['GT', '>', 1, 27, 26]);
    });
    it("should be an assignment operator", function () {
      expect(token).to.deep.equal(['ASSIGN', '=', 1, 29, 28]);
    });
  });

  describe("should recognize Spectra keywords", function () {
    var text = "do blah end fn elsif";
    var token;
    var lexer = NewLexer('sp1', text);
    beforeEach(function () { token = NextItem(lexer, false); });
    it("should be `do`", function () {
      expect(token).to.deep.equal(['do', 'do', 1, 1, 0]);
    });
    it("should be `blah`", function () {
      expect(token).to.deep.equal(['SYMBOL', 'blah', 1, 4, 3]);
    });
    it("should be `end`", function () {
      expect(token).to.deep.equal(['end', 'end', 1, 9, 8]);
    });
    it("should be `fn`", function () {
      expect(token).to.deep.equal(['fn', 'fn', 1, 13, 12]);
    });
    it("should be `elsif`", function () {
      expect(token).to.deep.equal(['elsif', 'elsif', 1, 16, 15]);
    });
  });

  describe("should recognize SimpleJavaScript keywords", function () {
    var text = "do else end if function import module then let export fn elsif";
    var token;
    var lexer = SjsLexer(text);
    beforeEach(function () { token = NextItem(lexer, false); });
    it("should be SYMBOL `do`", function () {
      expect(token).to.deep.equal(['SYMBOL', 'do', 1, 1, 0]);
    });
    it("should be `else`", function () {
      expect(token).to.deep.equal(['else', 'else', 1, 4, 3]);
    });
    it("should be SYMBOL `end`", function () {
      expect(token).to.deep.equal(['SYMBOL', 'end', 1, 9, 8]);
    });
    it("should be `if`", function () {
      expect(token).to.deep.equal(['if', 'if', 1, 13, 12]);
    });
    it("should be `function`", function () {
      expect(token).to.deep.equal(['function', 'function', 1, 16, 15]);
    });
    it("should be `import`", function () {
      expect(token).to.deep.equal(['import', 'import', 1, 25, 24]);
    });
    it("should be `module`", function () {
      expect(token).to.deep.equal(['module', 'module', 1, 32, 31]);
    });
    it("should be `then`", function () {
      expect(token).to.deep.equal(['then', 'then', 1, 39, 38]);
    });
    it("should be `let`", function () {
      expect(token).to.deep.equal(['let', 'let', 1, 44, 43]);
    });
    it("should be `export`", function () {
      expect(token).to.deep.equal(['export', 'export', 1, 48, 47]);
    });
    it("should be SYMBOL `fn`", function () {
      expect(token).to.deep.equal(['SYMBOL', 'fn', 1, 55, 54]);
    });
    it("should be SYMBOL `elsif`", function () {
      expect(token).to.deep.equal(['SYMBOL', 'elsif', 1, 58, 57]);
    });
    it("should be EOF", function () {
      expect(token).to.deep.equal(['EOF', '', 1, 63, 62]);
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
