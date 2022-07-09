import { expect } from "chai";
import { Lexer } from "../src/spectra-lexer.mjs";

describe("Spectra Lexer", function () {

  it("should return EOF immediately on an empty string", function () {
    var lexer = new Lexer("");
    expect(lexer.next_item()).to.deep.equal(['EOF']);
  });

  describe("should recognize identifiers", function () {
    var token, lexer = new Lexer("a bc");
    beforeEach(function () { token = lexer.next_item(true); });
    it("should be symbol 'a'", function () {
      expect(token).to.deep.equal(['SYMBOL', 'a']);
    });
    it("should be whitespace", function () {
      expect(token).to.deep.equal(['WHITESPACE', ' ']);
    });
    it("should be symbol 'bc'", function () {
      expect(token).to.deep.equal(['SYMBOL', 'bc']);
    });
  });

  describe("should recognize skip-whitespace parameter", function () {
    var token, lexer = new Lexer("a bc");
    beforeEach(function () { token = lexer.next_item(false); });
    it("should be symbol 'a'", function () {
      expect(token).to.deep.equal(['SYMBOL', 'a']);
    });
    it("should be symbol 'bc'", function () {
      expect(token).to.deep.equal(['SYMBOL', 'bc']);
    });
  });

  describe('token variety in: \'(a!) "hello, world""unfinished\\nline"\'', function () {
    var token, lexer = new Lexer('(a!) "hello, world""unfinished\nline"');
    beforeEach(function () { token = lexer.next_item(true); });
    it("next is open parenthesis", function () {
      expect(token).to.deep.equal(['LPAREN', '(']);
    });
    it("next is symbol 'a'", function () {
      expect(token).to.deep.equal(['SYMBOL', 'a']);
    });
    it("next is unknown ('!')", function () {
      expect(token).to.deep.equal(['UNKNOWN', '!']);
    });
    it("next is close parenthesis", function () {
      expect(token).to.deep.equal(['RPAREN', ')']);
    });
    it("next is whitespace", function () {
      expect(token).to.deep.equal(['WHITESPACE', ' ']);
    });
    it('next is "" string', function () {
      expect(token).to.deep.equal(['STRING', '"hello, world"']);
    });
    it('next is bad string', function () {
      expect(token).to.deep.equal(['BADSTRING', '"unfinished']);
    });
    it("next is whitespace", function () {
      expect(token).to.deep.equal(['WHITESPACE', '\n']);
    });
    it("next is symbol 'line'", function () {
      expect(token).to.deep.equal(['SYMBOL', 'line']);
    });
    it('next is bad string', function () {
      expect(token).to.deep.equal(['BADSTRING', '"']);
    });
    it('nothing left', function () {
      expect(token).to.deep.equal(['EOF']);
    });
  });


});

