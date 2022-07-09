import { expect } from "chai";
import { Lexer } from "../src/spectra-lexer.mjs";
import { Parser } from "../src/spectra-parser.mjs";

describe("Spectra Parser", function () {

  it("should return nil on an empty string", function () {
    var parser = new Parser(new Lexer(""));
    expect(parser.parse()).to.be.null;
  });

  it("should return ExpressionStatement on '42'", function () {
    var parser = new Parser(new Lexer("42"));
    expect(parser.parse()).to.deep.equal({
      type: 'ExpressionStatement',
      expression: {
        type: 'Literal',
        kind: 'FIXNUM',
        value: 42,
        text: "42",
      }
    });
  });

});

