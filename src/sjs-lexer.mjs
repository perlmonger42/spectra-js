function TokenMatcher(token_type, regex) {
  return { Type: token_type, Regex: new RegExp('^(?:' + regex + ')') };
}

let baseTokenMatchers = [
  TokenMatcher('NEWLINE',       '\\r?\\n'),
  TokenMatcher('WHITESPACE',    '[ \\f\\r\\t\\v]+'),
  TokenMatcher('OUTPUT_COMMENT','// OUTPUT:\s*(?:[\\n]\s*//[^\\n]*)*[\\n]?'),
  TokenMatcher('EOL_COMMENT',   '//.*'),
  TokenMatcher('BLOCK_COMMENT', '/\\*(?:[^*]+|[*]+(?!/))*\\*/'),
  TokenMatcher('REGEXP',        '[/](?=\\S)(?![*])(?:[^\\r\\n\\\\/\\[]|\\\\.|\\[(?:[^\\]\\\\]|\\\\.)*\\])*[/][gmis]*'),
  TokenMatcher('STRING',        '"(?:\\\\[^\\n]|[^\\\\"\\n])*"'),
  TokenMatcher('STRING',        "'(?:\\\\[^\\n]|[^\\\\'\\n])*'"),
  TokenMatcher('STRING',        "`(?:\\\\[\\s\\S]|[^\\\\`])*`"),
  TokenMatcher('BADSTRING',     '"[^\\\n]*'),
  TokenMatcher('BADSTRING',     "'[^\\\n]*"),
  TokenMatcher('BADSTRING',     '`(?:\\\\[^\\n]|[^\\\\`\\n])*'),
  TokenMatcher('LPAREN',        '\\('),
  TokenMatcher('RPAREN',        '\\)'),
  TokenMatcher('LBRACE',        '\\{'),
  TokenMatcher('RBRACE',        '\\}'),
  TokenMatcher('LBRACK',        '\\['),
  TokenMatcher('RBRACK',        '\\]'),
  TokenMatcher('ARROW',         '=>'),
  TokenMatcher('IDENTICAL',     '==='),
  TokenMatcher('NOTIDENTICAL',  '!=='),
  TokenMatcher('EQ',            '=='),
  TokenMatcher('NEQ',           '!='),
  TokenMatcher('LEQ',           '<='),
  TokenMatcher('GEQ',           '>='),
  TokenMatcher('LT',            '<'),
  TokenMatcher('GT',            '>'),
  TokenMatcher('ASSIGN',        '[-+*/]?='),
  TokenMatcher('SEMICOLON',     ';'),
  TokenMatcher('COMMA',         ','),
  TokenMatcher('COLON',         ':'),
  TokenMatcher('DOT',           '[.]'),
  TokenMatcher('OR',            '[|][|]'),
  TokenMatcher('AND',           '[&][&]'),
  TokenMatcher('INC',           '[+][+]'),
  TokenMatcher('DEC',           '--'),
  TokenMatcher('BOOLEAN',       '(?:true|false)\\b'),
  TokenMatcher('KEYWORD',       '(as|async|await|const|else|export|if|for|from|import|let|module|new|of|return|then|throw|typeof|var|while)\\b'),
  TokenMatcher('SYMBOL',        '[_a-zA-Z][_a-zA-Z0-9]*'),
  TokenMatcher('FIXNUM',        '\\d+'),
  TokenMatcher('PLUS',          '[+]'),
  TokenMatcher('MINUS',         '-'),
  TokenMatcher('NOT',           '!'),
  TokenMatcher('STAR',          '[*]'),
  TokenMatcher('SLASH',         '/'),
  TokenMatcher('QUESTION',      '\\?'),
  TokenMatcher('UNKNOWN',       '.'),
];

export function NewLexer(language, text) {
  // ASSERT: language === 'sjs' or language === 'sp1'
  if (typeof(text) !== 'string') {
    throw new TypeError(`Lexer constructor wants string input, but ${typeof(text)} was provided`);
  }
  let lexer = {
    text: text,
    offset: 0,
    line: 1,
    column: 1,
    tokenMatchers: Array.from(baseTokenMatchers),
  };
  if (language === 'sp1') {
    lexer.tokenMatchers.unshift(TokenMatcher('KEYWORD', '(do|end|elsif|fn)\\b'));
  } else if (language === 'sjs') {
    lexer.tokenMatchers.unshift(TokenMatcher('KEYWORD', '(function)\\b'));
  }
  //console.log(`new lexer: ${lexer}`);
  //console.log(`new lexer: ${ShowLexer(lexer)}`);
  return lexer;
}

//function ShowLexer(lexer) {
//  let text = `{text: "${lexer.text}", offset: ${lexer.offset}, line: ${lexer.line}, column: ${lexer.column}}`;
//  console.log(text);
//  return text;
//}


function next_item_including_whitespace_tokens(lexer) {
  //console.log(`next_item_including_whitespace_tokens: ${lexer}`);
  //console.log(`next_item_including_whitespace_tokens: ${ShowLexer(lexer)}`);
  let index = -1;
  while (index + 1 < lexer.tokenMatchers.length) {
    index = index + 1;
    let tokenMatcher = lexer.tokenMatchers[index];
    let match = tokenMatcher.Regex.exec(lexer.text);
    if (match) {
      // capture TYPE, TEXT, LINE, COLUMN, OFFSET
      const [t, s] = [tokenMatcher.Type,  match[0]];
      const [l, c, o] = [lexer.line, lexer.column, lexer.offset];

      // Update lexer state, including position information
      if (t === 'NEWLINE') {
        lexer.line++;
        lexer.column = 1;
      } else if (t === 'BLOCK_COMMENT' || (t === 'STRING' && s[0] === '`')) {
        for (let c of s) {
          if (c === '\n') {
            lexer.line++;
            lexer.column = 1;
          } else {
            lexer.column++;
          }
        }
      } else {
        lexer.column += s.length;
      }
      lexer.offset += s.length;
      lexer.text = lexer.text.substring(s.length);

      // Return the token [TYPE, TEXT, LINE, COLUMN, OFFSET]
      if (t === 'KEYWORD') {
        return { Kind: 'Token', Type: s, Text: s, Line: l, Column: c, Offset: o };
        // return [s, s, l, c, o];
      } else {
        return { Kind: 'Token', Type: t, Text: s, Line: l, Column: c, Offset: o };
        // return [t, s, l, c, o];
      }
    }
  }
  return { Kind: 'Token', Type: 'EOF', Text: ''
         , Line: lexer.line, Column: lexer.column
         , Offset: lexer.offset
         };
  // return ['EOF', '', lexer.line, lexer.column, lexer.offset];
}

/* NextItem(showWhitespace) returns the next matched token
 * as an array `[TYPE, TEXT, LINE, COLUMN, CHARACTER_OFFSET].
 *
 * TYPE and TEXT are Strings (e.g., "SYMBOL" and "xyz").
 * LINE, COLUMN, and CHARACTER_OFFSET are Integers.
 * LINE and COLUMN are 1-based; CHARACTER_OFFSET is 0-based.
 *
 * As an example, the symbol `abc` at the very beginning of a file would
 * yield this token:
 *
 *   [ 'SYMBOL', 'abc', 1, 1, 0 ]
 *
 * Whitespace items are skipped unless `showWhitespace` is truthy.
 * Newlines are NOT skipped, even when `showWhitespace` is falsy.
 *
 * TYPE is one of the `lexer.tokenMatchers[].Type` values (NEWLINE thru UNKNOWN),
 * except in the case of `lexer.tokenMatchers[].Type === 'KEYWORD'`. For keywords,
 * the TYPE is a copy of TEXT. For example, TYPE and TEXT will usually be
 * something like "FIXNUM" and "42". But for keywords, "if" and "if" (e.g.).
 */
export function NextItem(lexer, showWhitespace) {
  //console.log(`NextItem(lexer: ${lexer}, showWhitespace: ${showWhitespace}`);
  //console.log(`NextItem(lexer: ${ShowLexer(lexer)}, showWhitespace: ${showWhitespace}`);
  while (1) {
    let token = next_item_including_whitespace_tokens(lexer);
    let t = token.Type;
    if (showWhitespace || t !== 'WHITESPACE' && t !== 'NEWLINE' && t !== "EOL_COMMENT" && t !== "BLOCK_COMMENT") {
      return token;
    }
  }
}
