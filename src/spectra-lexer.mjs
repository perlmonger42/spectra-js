function token(kind, regex) {
  return { kind: kind, regex: new RegExp('^' + regex) };
}

export class Lexer {

  constructor(text) {
    this.text  = text;
  }


  static tokenMatchers = [
    token('WHITESPACE',        '\\s+'),
    token('STRING',            '"(?:\\\\[^\\n]|[^\\\\"\\n])*"'),
    token('BADSTRING',         '"[^\\\n]*'),
    token('LPAREN',            '\\('),
    token('RPAREN',            '\\)'),
    token('BOOLEAN',           '(?:true|false)\\b'),
    token('SYMBOL',            '[_a-zA-Z][_a-zA-Z0-9]*'),
    token('FIXNUM',            '\\d+'),
    token('UNKNOWN',           '.'),
  ];

  next_item_including_whitespace() {
    for (var i=0; i < Lexer.tokenMatchers.length; ++i) {
      var tokenMatcher = Lexer.tokenMatchers[i];
      var match = tokenMatcher.regex.exec(this.text);
      if (match) {
        this.text = this.text.substring(match[0].length);
        return [tokenMatcher.kind, match[0]];
      }
    }
    return ['EOF'];
  };

  next_item(yieldWhitespace) {
    /* Call next_item with a truthy value if you want it to return
     * whitespace tokens rather than skipping over them. */
    while (1) {
      var token = this.next_item_including_whitespace();
      if (yieldWhitespace || token[0] !== 'WHITESPACE') {
        return token;
      }
    }
  }
}
