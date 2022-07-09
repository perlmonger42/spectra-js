export class Parser {

  constructor(lexer) {
    this.lexer  = lexer;
    this.#advance();
  }

  // advance() sets current_token and curr to the next input token.
  // Throws an exception on attempts to advance past end-of-input.
  #advance() {
    if (this.curr === 'EOF') {
      throw "cannot advance past end-of-input";
    }
    this.current_token = this.lexer.next_item(false);
    this.curr = this.current_token[0];
  }

  // match(TYPE) returns curr == TYPE. Does not advance input.
  #match(type) {
    return this.curr === type;
  }

  // skip(TYPE) advances the input and returns true iff curr === TYPE;
  // otherwise, it returns false.
  #skip(type) {
    if (this.#match(type)) {
      this.#advance();
      return true;
    }
    return false;
  }

  // expect(TYPE) advances the input iff the curr === TYPE;
  // otherwise, it throws an exception.
  #expect(type) {
    if (!this.#skip(type)) {
      throw `expected ${type} but found ${this.curr}`;
    }
  }

  // Return value is an AST; see "./syntax-tree-format.md" for details.
  parse() {
    if (this.#match('EOF')) {
      return null;
    }
    return { type: 'ExpressionStatement', expression: this.expr() };
  }

  expr() {
    var value = null;
    if (this.#match('EOF')) {
      throw "unexpected end-of-input";
    } else if (this.#skip('RPAREN')) {
      throw "unexpected close parenthesis";
    } else if (this.#skip('LPAREN')) {
      value = this.expr();
      this.expect('RPAREN');
    } else if (this.#match('FIXNUM')) {
      let text = this.current_token[1];
      value = { type: 'Literal', kind: 'FIXNUM', value: parseInt(text), text: text };
    } else if (this.#match('FLONUM')) {
      let text = this.current_token[1];
      value = { type: 'Literal', kind: 'FLONUM', value: parseFloat(text), text: text };
    } else if (this.#match('STRING')) {
      let text = this.current_token[1];
      value = { type: 'Literal', kind: 'STRING', value: this.parseString(text), text: text };
    } else {
      throw `unexpected input: ${this.curr} ${this.current_token[1]}`;
    }
    return value;
  }

}
