import { NextItem } from "./sjs-lexer.mjs";

// Tokens are objects with this format:
//   { Kind: 'Token', Type: string, Text: string, Line: integer, Column: integer, Offset: integer }
// Type is the kind of token, e.g. "SYMBOL" or "PLUS".
// Text is the spelling of the token, e.g. "fred" or "+".
// Line and Column are 1-based, and give the position of the token's first character.
// Offset is 0-based, and gives the same position in bytes relative to the
// beginning of the source code.
//
// Type and Text are identical for keywords (e.g., "if" and "if").  For all
// other kinds of token, they are typically different (e.g., "FIXNUM" and
// "42").

export function NewParser(language, lexer) {
  let is_spectra = language === 'sp1';
  let function_kw = is_spectra ? 'fn' : 'function';
  let parser = {
    is_spectra,
    language,
    lexer,
    current_token: NextItem(lexer, false),

    function_kw,
    initial_expression_tokens: [
      'SYMBOL', 'BOOLEAN', 'FIXNUM', 'STRING', 'REGEXP', 'LPAREN', 'MINUS', 'PLUS', 'NOT',
      'LBRACE', 'LBRACK', 'new', 'typeof', function_kw
    ],

  };
  return parser;
}

// showToken(token) prints the token
function showToken(token) {
  console.log(describe(token));
}

// showCurrentToken() prints the current token
function showCurrentToken(parser) {
  return showToken(parser.current_token);
}

export function InternalError(message) {
    this.name = "InternalError";
    this.message = message || "";
}
InternalError.prototype = Error.prototype;
InternalError.prototype = new Error();

export function describe_type(kind, tag) {
  if (kind === 'string') {
    if (typeof(tag) === 'regex') {
      return `string matching ${tag}`;
    } else if (typeof(tag) === 'string') {
      return `string with value '${value}'`;
    }
    return 'string';
  } else if (kind === 'boolean') {
    if (typeof(tag) === 'boolean') {
      return `boolean with value '${value}'`;
    }
    return 'boolean';
  } else if (kind === 'Array') {
    return 'Array';
  } else if (kind === 'Maybe') {
    return `Maybe(${tag})`;
  } else if (kind === 'Result') {
    return `Result(${tag})`;
  } else if (typeof(tag) === 'string') {
    return `${kind}.${tag}`;
  } else {
    return kind;
  }
}

export function describe_value(value) {
  return describe(value, 70);
}

export function describe(value, maxlen) {
  let type = typeof(value);
  if (value === null) {
    return 'null';
  } else if (type === 'undefined') {
    return truncate('undefined', maxlen);
  } else if (type === 'string') {
    return truncate_and_surround("'", `${value}`, "'", maxlen);
  } else if (type === 'boolean' || type === 'number') {
    return truncate(`${value}`, maxlen);
  } else if (Array.isArray(value)) {
    let [content, comma] = ['', ''];
    for (let v of value) {
      content = `${content}${comma}${describe(v, maxlen-content.length)}`;
      if (content.length > maxlen) {
        break;
      }
      comma = ", ";
    }
    return truncate_and_surround('[', content, ']', maxlen);
  } else if (isNone(value)) {
    return truncate_and_surround('None(', value.Type, ')', maxlen);
  } else if (isJust(value)) {
    return truncate_and_surround('Just(', value.Just, ')', maxlen);
  } else if (isOk(value)) {
    return truncate_and_surround('Ok(', value.Value, ')', maxlen);
  } else if (isErr(value)) {
    return truncate_and_surround('Err(', value.Error, ')', maxlen);
  } else if (type === 'object' && typeof(value.Kind) === 'string') {
    let type = typeof(value.Tag) !== 'string' ?  value.Kind : value.Kind + '.' + value.Tag;
    let [content, comma] = ['', ''];
    for (let [key, val] of Object.entries(value)) {
      if (key === 'Kind' || key === 'Tag' && typeof(val) === 'string') { continue; }
      content = `${content}${comma}${key}: ${describe(val, maxlen - content.length)}`;
      if (content.length > maxlen) {
        break;
      }
      comma = ", ";
    }
    return truncate_and_surround(`${type}(`, content, ')', maxlen);
  } else if (type === 'object') {
    let [content, comma] = ['', ''];
    for (let [key, val] of Object.entries(value)) {
      content = `${content}${comma}${key}: ${describe(val, maxlen - content.length)}`;
      if (content.length > maxlen) {
        break;
      }
      comma = ", ";
    }
    return truncate_and_surround('{', content, '}', maxlen);
  }
  return truncate_and_surround('(', `${typeof value} ${value}`, ')', maxlen);
}

function truncate(value, maxlen) {
  if (value.length > maxlen) {
    return value.substring(0, maxlen-3) + '...';
  }
  return value;
}

function truncate_and_surround(prefix, value, postfix, maxlen) {
  return `${prefix}${truncate(value, maxlen - (prefix.length + postfix.length))}${postfix}`;
}

//// /unction expect_type(value, kind, tag) {
////   let check_tag_value = function() { typeof(tag) === 'undefined' || tag == value; };
////   let ok = true;
////   if (kind === 'boolean') {
////     ok = typeof(value) === 'boolean' && check_tag_value();
////   } else if (kind === 'string') {
////     if (typeof(value) !== 'string'){
////       ok = false;
////     } else if (tag && tag !== value) {
////       ok = false;
////     }
////   } else if (kind === 'Array') {
////     ok = Array.isArray(value);
////   } else if (kind === 'regex') {
////     if (typeof(value) !== 'string') {
////       return Err(`expected string, but got ${typeof value} instead (${vlue})`);
////     } else if (!tag.test(value)) {
////       return Err(`expected string matching ${tag}, but got '${value}' instead)`);
////     }
////     return Ok(true);
////   } else if (typeof(value) !== 'object') {
////     err = "a value that is not an object";
////   } else if (!value.hasOwnProperty('Kind')) {
////     err = "an object with no `Kind` field";
////   } else if (value.Kind !== kind) {
////     err = `an object with \`Kind='${value.Kind}'\``;
////   } else if (tag && !value.hasOwnProperty('Tag')) {
////     err = "an object with no `Tag` field";
////   } else if (tag && value.Tag !== tag) {
////     err = `an object with \`Tag='${value.Tag}'\``;
////   } else {
////     return true;
////   }
////
////   let expected_fields = `Kind: '${kind}'`;
////   if (tag) { expected_fields = `${expected_fields}, Tag: '${tag}'`; }
////   let expected = `${value_name} should be { ${expected_fields}, ... }`;
////   let message = `${expected}, but is ${err}: ${JSON.stringify(value)}`;
////   console.log(`${message}:`, value);
//// }

export function assert_is_boolean(value_name, value) {
  if (typeof(value) !== 'boolean') {
    throw new InternalError(`${value_name} is not a boolean; it is ${describe_value(value)}`);
  }
}

export function assert_is_string(value_name, value) {
  if (typeof(value) !== 'string') {
    throw new InternalError(`${value_name} is not a string; it is ${describe_value(value)}`);
  }
}

export function assert_is_number(value_name, value) {
  if (typeof(value) !== 'number') {
    throw new InternalError(`${value_name} is not a number; it is ${describe_value(value)}`);
  }
}

export function assert_is_string_equal(value_name, value, expected_value) {
   assert_is_string(value_name, value);
   if (value !== expected_value) {
     throw new InternalError(`${value_name} is not '${expected_value}'; it is ${describe_value(value)}`);
  }
}

export function assert_is_string_match(value_name, value, regex) {
   assert_is_string(value_name, value);
   if (!regex.test(value)) {
     throw new InternalError(`${value_name} does not match ${regex}; it is ${describe_value(value)}`);
  }
}

export function assert_is_token(value_name, value, kind_regex) {
  assert_is_kind(value_name, value, 'Token');
  assert_is_string(`${value_name}.Type`, value.type);
  assert_is_string(`${value_name}.Text`, value.Text);
  assert_is_number(`${value_name}.Line`, value.Line);
  assert_is_number(`${value_name}.Column`, value.Column);
  assert_is_number(`${value_name}.Offset`, value.Offset);
  if (!kind_regex.test(value.Type)) {
    throw new InternalError(`${value_name}.Type does not match ${kind_regex}; it is ${describe_value(value.Type)}`);
  }
}

export function assert_is_list(value_name, value) {
  if (!Array.isArray(value)) {
    throw new InternalError(`${value_name} is not a list; it is ${describe_value(value)}`);
  }
}

export function assert_is_list_of(value_name, value, element_type_asserter) {
  assert_is_list(value_name, value);
  let index = -1;
  while (index + 1 < value.length) {
    index++;
    element_type_asserter(`${value_name}[${index}]`, value[index]);
  }
}

export function string_asserter() {
  return function(value_name, value) { assert_is_string(value_name, value); };
}

export function kind_asserter(kind) {
  return function(value_name, value) { assert_is_kind(value_name, value, kind); };
}

export function kind_tag_asserter(kind, tag) {
  return function(value_name, value) { assert_is_kind_tag(value_name, value, kind, tag); };
}

export function kind_tag_checker(kind, tag) {
  return function(value) { return is_kind_tag(value, kind, tag); };
}

export function assert_is_kind(value_name, value, kind) {
  let err;
  if (typeof(value) !== 'object') {
    err = `${value_name} is not a ${kind}, nor even an object; it is ${describe_value(value)}`;
  } else if (!value.hasOwnProperty('Kind')) {
    err = `${value_name} is not a ${kind}, and has no 'Kind' field; it is ${describe_value(value)}`;
  } else if (value.Kind !== kind) {
    err = `${value_name} is not a ${kind}; it is ${describe_value(value)}`;
  } else {
    return;
  }
  throw new InternalError(err);
}

export function is_kind(value, kind) {
  return value !== null && typeof(value) === 'object' && value.hasOwnProperty('Kind') && value.Kind === kind;
}

export function is_kind_tag(value, kind, tag) {
  return is_kind(value, kind) && value.hasOwnProperty('Tag') && value.Tag === tag;
}

export function is_list_of(value, element_type_checker) {
  if (!Array.isArray(value)) {
    return false;
  }
  for (let v of value) {
    if (!element_type_checker(v)) {
      return false;
    }
  }
  return true;
}

export function assert_is_kind_tag(value_name, value, kind, tag) {
  let err;
  assert_is_kind(value_name, value, kind);
  if (!value.hasOwnProperty('Tag')) {
    err = `${value_name} is not ${kind}.${tag} (it has no 'Tag' field); it is ${describe_value(value)}`;
  } else if (value.Tag !== tag) {
    err = `${value_name} is not ${kind}.${tag}; it is ${describe_value(value)}`;
  } else {
    return;
  }
  throw new InternalError(err);
}

function NewSyntaxError(message, token) {
  let name = token.Type === token.Text ? token.Type : `${token.Type} (\`${token.Text}\`)`;
  let line = token.Line;
  let column = token.Column;
  return SyntaxError(`${message}; found ${name} at line ${line} column ${column}`);
}


// An item of type Maybe(T) has either this structure:
//   None = { Kind: 'Maybe'
//          , Tag:  'None'
//          , Type: 'T'
//          }
// or this structure:
//   Just = { Kind: 'Maybe'
//          , Tag:  'Just'
//          , Just: { Kind: 'T', ... }
//          }
export function Just(data) {
  return { Kind: 'Maybe', Tag: 'Just', Just: data };
}
export function None(typename) {
  return { Kind: 'Maybe', Tag: 'None', Type: typename, None: true };
}
export function isNone(value) {
  return is_kind_tag(value, 'Maybe', 'None') &&
         value.hasOwnProperty('Type') && typeof(value.Type) === 'string';
}
export function isJust(value) {
  return is_kind_tag(value, 'Maybe', 'Just') &&
         value.hasOwnProperty('Just');
}
export function assert_is_maybe_kind(value_name, value, kind) {
  assert_is_kind(value_name, value, 'Maybe');
  if (isNone(value)) {
    assert_is_string_equal(`${value_name}.Type`, value.Type, kind);
  } else if (isJust(value)) {
    assert_is_kind(`${value_name}.Just`, value.Just, kind);
  }
}


// An item of type Result(E, V) has either this structur:
//   Ok   = { Kind: 'Result'
//          , Tag:  'Ok'
//          , Value: <value of type V>
//          }
// or this structure:
//   Err  = { Kind: 'Result'
//          , Tag:  'Err'
//          , Error: <value of type E>
//          }
export function Ok(data) {
  return { Kind: 'Result', Tag: 'Ok', Value: data };
}
export function Err(data) {
  return { Kind: 'Result', Tag: 'Err', Error: data };
}
function isOk(value) {
  return is_kind_tag('Result', 'Ok') && value.hasOwnProperty('Value');
}
function isErr(value) {
  return is_kind_tag('Result', 'Err') && value.hasOwnProperty('Error');
}
//export function assert_is_result_type(value_name, value, ok_kind, ok_tag, err_kind, err_tag) {
//  if (isOk(value)) {
//    assert_is_kind_tag(`${value_name}.Value`, value.Value, ok_kind, ok_tag);
//  } else if (isErr(value)) {
//    assert_is_kind_tag(`${value_name}.Error`, value.Error, err_kind, err_tag);
//  } else {
//    assert_is_kind_tag(value_name, value, 'Result', 'Ok|Err');
//  }
//}


// curtok() returns parser.current_token
function curtok(parser) {
  return parser.current_token;
}

// peek() returns the TYPE of the current token, without advancing the input.
function peek(parser) {
  return parser.current_token.Type;
}

// text() returns the TEXT of the current token, without advancing the input.
function text(parser) {
  return parser.current_token.Text;
}

// advance() returns the current token, and makes the next token current.
// Throws an exception on attempts to advance past end-of-input.
function advance(parser) {
  if (peek(parser) === 'EOF') {
    throw new SyntaxError("cannot advance past end-of-input");
  }
  let token = parser.current_token;
  parser.current_token = NextItem(parser.lexer, false);
  return token;
}

// match(TYPE) returns peek() == TYPE. Does not advance input.
function match(parser, type) {
  return peek(parser) === type;
}

// match_any([TYPE1, TYPE2, ...]) returns true if peek() returns any TYPEn.
// Does not advance input.
function match_any(parser, types) {
  let token = peek(parser);
  let index = -1;
  while (index+1 < types.length) {
    index++;
    if (token === types[index]) {
      return true;
    }
  }
  return false;
}

// skip(TYPE) returns the current token and advances the input iff peek === TYPE;
// otherwise, returns null.
function skip(parser, type) {
  if (match(parser, type)) {
    return advance(parser);
  }
  return null;
}

// skip_any([TYPE1, TYPE2, ...]) checks the current token, and if it is any of the TYPEn,
// it returns the current token and advances the input; otherwise, returns null.
function skip_any(parser, types) {
  let token = parser.current_token;
  let index = -1;
  while (index+1 < types.length) {
    index++;
    if (skip(parser, types[index])) {
      return token;
    }
  }
  return false;
}

// expect(TYPE) returns the current token and advances the input iff peek === TYPE;
// otherwise, it throws a SyntaxError exception.
function expect(parser, type, message) {
  if (type === 'EOF' && match(parser, type)) {
    return parser.current_token;
  } else if (match(parser, type)) {
    return advance(parser);
  }

  if (typeof(message) === 'undefined') {
    message = `expected \`${type}\``;
  }
  let token = parser.current_token;
  let found = token.Type === token.Text ? token.Type : `${token.Type} (\`${token.Text}\`)`;
  let line = token.Line;
  let column = token.Column;
  throw new SyntaxError(`${line}:${column}: ${message} but found \`${found}\` at line ${line} column ${column}`);
}

function identifier_list(parser) {
  //console.log(`identifier_list, at ${showCurrentToken(parser)}`);
  let identifier_list = [];

  while (true) {
    let identifier = skip(parser, 'SYMBOL');
    if (!identifier) {
      break;  // throw NewSyntaxError("expected IDENTIFIER", curtok(parser));
    }
    identifier_list.push(identifier.Text);
    if (!skip(parser, 'COMMA')) {
      break;
    }
  }
  //console.log(`identifier_list, at ${showCurrentToken(parser)}`);

  return identifier_list;
}

function optional_identifier_list(parser) {
  //console.log(`optional_identifier_list, at ${showCurrentToken(parser)}`);
  if (match(parser, 'SYMBOL')) {
    let list = identifier_list(parser);
    //console.log(`after identifier_list in optional_identifier_list, at ${showCurrentToken(parser)}`);
    return list;
  }
  //console.log(`after peek(SYMBOL) in optional_identifier_list, at ${showCurrentToken(parser)}`);
  return [ ];
}

export function New_Literal_Boolean(Value, Text) {
  return { Kind: 'Literal', Tag:  'Boolean', Value, Text };
}

export function New_Literal_Fixnum(Value, Text) {
  return { Kind: 'Literal', Tag:  'Fixnum', Value, Text };
}

export function New_Literal_Flonum(Value, Text) {
  return { Kind: 'Literal', Tag:  'Flonum', Value, Text };
}

export function New_Literal_String(Value, Text) {
  return { Kind: 'Literal', Tag:  'String', Value, Text };
}

export function New_Literal_Regexp(Value, Text) {
  return { Kind: 'Literal', Tag:  'Regexp', Value, Text };
}

export function New_Literal_Function(Name, Signature, Body) {
  assert_is_string("New_Literal_Function.Name", Name);
  assert_is_kind("New_Literal_Function.Signature", Signature, 'FunctionSignature');
  assert_is_kind_tag("New_Literal_Function.Body", Body, 'Statement', 'Block');
  return { Kind: 'Literal', Tag: 'Function', Name, Signature, Body };
}

export function New_Literal_ArrowFunctionExpression(Formals, Expr) {
  assert_is_list_of("New_Literal_ArrowFunctionExpression.Formals", Formals, string_asserter());
  assert_is_kind("New_Literal_ArrowFunctionExpression.Expr", Expr, 'Expression');
  return { Kind: 'Literal', Tag: 'ArrowFunctionExpression', Formals, Expr };
}

export function New_Literal_ArrowFunctionBlock(Formals, Block) {
  assert_is_list_of("New_Literal_ArrowFunctionBlock.Formals", Formals, string_asserter());
  assert_is_kind_tag("New_Literal_ArrowFunctionBlock.Block", Block, 'Statement', 'Block');
  return { Kind: 'Literal', Tag: 'ArrowFunctionBlock', Formals, Block };
}

export function New_Expression_Grouping(Expr) {
  assert_is_kind('New_Expression_Grouping.Expr', Expr, 'Expression');
  return { Kind: 'Expression', Tag: 'Grouping', Expr };
}

export function New_Expression_Symbol(Name) {
  assert_is_string('New_Expression_Symbol.Name', Name);
  return { Kind: 'Expression', Tag: 'Symbol', Name };
}

export function New_Expression_Literal(Literal) {
  return { Kind: 'Expression', Tag: 'Literal', Literal };
}

let prefix_unary_ops = new RegExp ('^(new|[-+!]|typeof|await)$');

export function New_Expression_UnaryPrefix(Operator, Operand) {
  assert_is_string_match('New_Expression_UnaryPrefix.Operator', Operator, prefix_unary_ops);
  assert_is_kind('New_Expression_UnaryPrefix.Operand', Operand, 'Expression');
  if (Operator === 'new') {
    assert_is_kind_tag('New_Expression_UnaryPrefix.Operand', Operand, 'Expression', 'Symbol');
  }
  return { Kind: 'Expression', Tag: 'Unary', Prefix: true, Operator, Operand };
}

let postfix_unary_ops = new RegExp('^(--|[+][+])$');

export function New_Expression_UnaryPostfix(Operator, Operand) {
  assert_is_string_match('New_Expression_UnaryPostfix.Operator', Operator, postfix_unary_ops);
  assert_is_kind('New_Expression_UnaryPostfix.Operand', Operand, 'Expression');
  return { Kind: 'Expression', Tag: 'Unary', Prefix: false, Operator, Operand };
}

let binary_ops = new RegExp('^(new|[-+*/%.,]|===?|!==?|[-+*/]?=|[|][|]|[&][&]|<=?|>=?|\\[\\])$');

export function New_Expression_Binary(Operator, Left, Right) {
  assert_is_string_match('New_Expression_Binary.Operator', Operator, binary_ops);
  assert_is_kind('New_Expression_Binary.Left', Left, 'Expression');
  assert_is_kind('New_Expression_Binary.Right', Right, 'Expression');
  if (Operator === 'new') {
    assert_is_kind_tag('New_Expression_binary.Right', Right, 'Expression', 'List');
  }
  return { Kind: 'Expression', Tag: 'Binary', Operator, Left, Right };
}

let ternary_ops = new RegExp('^([?]:)$');

export function New_Expression_Ternary(Operator, Test, Left, Right) {
  assert_is_string_match('New_Expression_Ternary.Operator', Operator, ternary_ops);
  assert_is_kind('New_Expression_Ternary.Test', Test, 'Expression');
  assert_is_kind('New_Expression_Ternary.Left', Left, 'Expression');
  assert_is_kind('New_Expression_Ternary.Right', Right, 'Expression');
  return { Kind: 'Expression', Tag: 'Ternary', Operator, Test, Left, Right };
}

export function New_Expression_Apply(Functor, Arguments) {
  assert_is_kind("New_Expression_Apply.Functor", Functor, 'Expression');
  assert_is_list_of("New_Expression_Apply.Arguments", Arguments, kind_asserter('Expression'));
  return { Kind: 'Expression', Tag: 'Apply', Functor, Arguments };
}

export function parseString(text) {
  // TODO: This needs to convert escape sequence to the values they represent.
  // It should also remove the surrounding "", '', or `` characters.
  return text;
}

function parseRegexp(text) {
  // TODO: Does this need to do anything?
  return text;
}

export function New_Expression_Pair(Key, Value) {
  assert_is_kind('New_Expression_Pair.Key', Key, 'Expression');
  assert_is_maybe_kind('New_Expression_Pair.Value', Value, 'Expression');
  assert_is_string_match('New_Expression_Pair.Key.Tag', Key.Tag, /^(Symbol|Literal)$/);
  return { Kind: 'Expression', Tag: 'Pair', Key, Value };
}

export function New_Expression_Object(Pairs) {
  assert_is_list_of('New_Expression_Object.Pairs', Pairs, kind_tag_asserter('Expression', 'Pair'));
  return { Kind: 'Expression', Tag: 'Object', Pairs };
}

function object_constructor(parser) {
  let kv_pairs = [ ];
  expect(parser, 'LBRACE', 'expected `{`');
  while (!match_any(parser, ['RBRACE', 'EOF'])) {
    let tok = curtok(parser);
    let key;
    if (skip(parser, 'SYMBOL')) {
      key = New_Expression_Symbol(tok.Text);
    } else if (skip(parser, 'STRING')) {
      key = New_Expression_Literal(New_Literal_String(parseString(tok.Text), tok.Text));
    } else {
      expect(parser, 'SYMBOL', 'expected SYMBOL or STRING (as object key)');
    }

    let value = None('Expression');
    if (skip(parser, 'COLON')) {
      value = Just(expr_no_comma(parser));
    }
    kv_pairs.push(New_Expression_Pair(key, value));
    if (!skip(parser, 'COMMA')){
      break;
    }
  }
  expect(parser, 'RBRACE', 'expected `}`');
  return New_Expression_Object(kv_pairs);
}

export function New_Expression_List(Expressions) {
  assert_is_list_of('New_Expression_Array.Expressions', Expressions, kind_asserter('Expression'));
  return { Kind: 'Expression', Tag: 'List', Expressions };
}

export function New_Expression_Array(Expressions) {
  assert_is_list_of('New_Expression_Array.Expressions', Expressions, kind_asserter('Expression'));
  return { Kind: 'Expression', Tag: 'Array', Expressions };
}

function array_constructor(parser) {
  expect(parser, 'LBRACK', 'expected `[`');
  let expressions = expression_list(parser, {});
  // let expressions = [ ];
  // while (!match_any(parser, ['RBRACK', 'EOF'])) {
  //   let expression = expr(parser);
  //   expressions.push(expression);
  //   if (!skip(parser, 'COMMA')){
  //     break;
  //   }
  // }
  expect(parser, 'RBRACK', 'expected `]`');
  return New_Expression_Array(expressions);
}

function function_literal(parser) {
  // function_literal := function_kw SYMBOL? '(' identifier_list? ')' body
  expect(parser, parser.function_kw);
  let name = skip(parser, 'SYMBOL') || { Type: 'SYMBOL', Text: ''};
  let signature = function_signature(parser);
  let body = statement_block(parser, "at start of function body");
  return New_Literal_Function(name.Text, signature, body);
}

function peek_block(parser) {
  return parser.is_spectra ? peek(parser) === 'do' : peek(parser) === 'LBRACE';
}

function arrow_function_literal(parser, formals) {
  // arrow_function_literal := '(' identifiers ')' '=>' expression
  // This is a very small subset of the arrow-function syntax of JavaScript;
  // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions

  let arrow = expect(parser, 'ARROW');

  // The parenthesized identifier list has already been consumed,
  // but it was read as an expression list, so check that it is
  // a list of identifiers.
  formals = formals.map((sym) => {
    if (!is_kind_tag(sym, 'Expression', 'Symbol')) {
      expect(parser, 'UNMATCHABLE', "expected identifier list before '=>'", arrow);
    }
    return sym.Name;
  });

  if (peek_block(parser)) {
    return New_Literal_ArrowFunctionBlock(formals, statement_block(parser));
  } else {
    return New_Literal_ArrowFunctionExpression(formals, expr(parser));
  }
}

function constructor_call(parser) {
  // constructor_call := 'new' SYMBOL '(' argument_list ')'
  expect(parser, 'new');
  let constructorToken = expect(parser, 'SYMBOL');
  let symbol = New_Expression_Symbol(constructorToken.Text);
  if (peek(parser) === 'LPAREN') {
    let args = parenthesized_expression_list(parser, {});
    return New_Expression_Binary('new', symbol, New_Expression_List(args));
  } else {
    return New_Expression_UnaryPrefix('new', symbol);
  }
}

function factor(parser) {
  // factor ::= '(' expr ')' | ('+'|'-') factor | SYMBOL | FIXNUM | FLONUM | STRING | REGEXP | factor arguments
  let value = null;
  let spelling = text(parser);
  if (match(parser, 'EOF')) {
    throw new SyntaxError("unexpected end-of-input");
//  } else if (skip(parser, 'LPAREN')) {
//    if (skip(parser, 'RPAREN')) {
//      value = New_Expression_Literal(arrow_function_literal(parser, []));
//    } else {
//      value = expr(parser);
//      expect(parser, 'RPAREN');
//    }
  } else if (peek(parser) === 'LPAREN') {
    let hasTrailingComma = {};
    let exprs = parenthesized_expression_list(parser, hasTrailingComma);
    if (exprs.length === 0 || peek(parser) === 'ARROW') {
      value = New_Expression_Literal(arrow_function_literal(parser, exprs));
    } else if (exprs.length === 1 && !hasTrailingComma.value) {
      return New_Expression_Grouping(exprs[0]);
    } else {
      value = New_Expression_List(exprs);
    }
  } else if (match(parser, 'PLUS') || match(parser, 'MINUS') || match(parser, 'NOT')) {
    let op = advance(parser);
    let arg = factor(parser);
    value = New_Expression_UnaryPrefix(op.Text, arg);
  } else if (match(parser, 'LBRACE')) {
    value = object_constructor(parser);
  } else if (match(parser, 'LBRACK')) {
    value = array_constructor(parser);
  } else if (match(parser, parser.function_kw)) {
    value = New_Expression_Literal(function_literal(parser));
  } else if (match(parser, 'new')) {
    value = constructor_call(parser);
  } else if (match(parser, 'SYMBOL')) {
    advance(parser);
    value = New_Expression_Symbol(spelling);
  } else if (match(parser, 'BOOLEAN')) {
    advance(parser);
    value = New_Expression_Literal(New_Literal_Boolean(spelling === "true", spelling));
  } else if (match(parser, 'FIXNUM')) {
    advance(parser);
    value = New_Expression_Literal(New_Literal_Fixnum(parseInt(spelling), spelling));
  } else if (match(parser, 'FLONUM')) {
    advance(parser);
    value = New_Expression_Literal(New_Literal_Flonum(parseFloat(spelling), spelling));
  } else if (match(parser, 'STRING')) {
    advance(parser);
    value = New_Expression_Literal(New_Literal_String(parseString(spelling), spelling));
  } else if (match(parser, 'REGEXP')) {
    advance(parser);
    value = New_Expression_Literal(New_Literal_Regexp(parseRegexp(spelling), spelling));
  } else {
    throw NewSyntaxError('EXPRESSION expected', curtok(parser));
  }

  let more = true;
  while (more) {
    if (match(parser, 'LPAREN')) {
      value = New_Expression_Apply(value, parenthesized_expression_list(parser, {}));
    } else if (match(parser, 'DOT')) {
      let op = advance(parser);
      let field = skip(parser, 'throw') || skip(parser, 'from') ||
                  skip(parser, 'fn') || expect(parser, 'SYMBOL', "expected SYMBOL after `.`");
      value = New_Expression_Binary(op.Text, value, New_Expression_Symbol(field.Text));
    } else if (match(parser, 'LBRACK')) {
      let op = advance(parser);
      let index = expr(parser);
      expect(parser, 'RBRACK');
      value = New_Expression_Binary('[]', value, index);
    } else {
      more = false;
    }
  }

  // console.log(`factor returning `); console.log(value);
  return value;
}

function postfix_unary(parser) {
  // postfix_unary ::= factor { ('++'|'--') }
  let arg = factor(parser);
  if (match_any(parser, ['INC', 'DEC'])) {
    let op = advance(parser);
    arg = New_Expression_UnaryPostfix(op.Text, arg);
  }
  return arg;
}

function prefix_unary(parser) {
  // prefix_unary ::= { ('-'|'+'|'!'|'++'|'--'|typeof|await) } postfix_unary
  if (match_any(parser, ['PLUS', 'MINUS', 'NOT', 'INC', 'DEC', 'typeof', 'await'])) {
    let op = advance(parser);
    let arg = prefix_unary(parser);
    return New_Expression_UnaryPrefix(op.Text, arg);
  }
  return postfix_unary(parser);
}

function multiplicative(parser) {
  // multiplicative ::= prefix_unary { ('*'|'/') prefix_unary }
  let left = prefix_unary(parser);
  // console.log(`in multiplicative, lookahead is ${this.current_token}`);
  while (match(parser, 'STAR') || match(parser, 'SLASH')) {
    let op = advance(parser);
    let right = prefix_unary(parser);
    left = New_Expression_Binary(op.Text, left, right);
  }
  // console.log(`multiplicative returning `); console.log(left);
  return left;
}

function additive(parser) {
  // additive ::= multiplicative { ('+'|'-') multiplicative }
  let left = multiplicative(parser);
  // console.log(`in additive, lookahead is ${this.current_token}`);
  while (match(parser, 'PLUS') || match(parser, 'MINUS')) {
    let op = advance(parser);
    let right = multiplicative(parser);
    left = New_Expression_Binary(op.Text, left, right);
  }
  // console.log(`additive returning `); console.log(left);
  return left;
}

function relational(parser) {
  // expr ::= additive { ('<'|'>'|'<='|'>=') additive }
  let left = additive(parser);
  while (match_any(parser, ['LT', 'GT', 'GEQ', 'LEQ'])) {
    let op = advance(parser);
    let right = additive(parser);
    left = New_Expression_Binary(op.Text, left, right);
  }
  return left;
}

function equality(parser) {
  // expr ::= relational { ('==='|'=='|'!=='|'!=') relational }
  let left = relational(parser);
  while (match_any(parser, ['IDENTICAL', 'NOTIDENTICAL', 'EQ', 'NEQ'])) {
    let op = advance(parser);
    let right = relational(parser);
    left = New_Expression_Binary(op.Text, left, right);
  }
  return left;
}

function conjunction(parser) {
  // expr ::= equality [ '&&' equality ] }
  let left = equality(parser);
  while (match(parser, 'AND')) {
    let op = advance(parser);
    let right = equality(parser);
    left = New_Expression_Binary(op.Text, left, right);
  }
  return left;
}

function disjunction(parser) {
  // expr ::= conjunction [ '||' conjunction ] }
  let left = conjunction(parser);
  while (match(parser, 'OR')) {
    let op = advance(parser);
    let right = conjunction(parser);
    left = New_Expression_Binary(op.Text, left, right);
  }
  return left;
}

function assignment(parser) {
  // expr ::= disjunction
  //        | disjunction '=' assignment
  //        | disjunction '?' disjunction : assignment
  let left = disjunction(parser);
  if (match(parser, 'ASSIGN')) {
    let op = advance(parser);
    let right = assignment(parser);
    left = New_Expression_Binary(op.Text, left, right);
  } else if (skip(parser, 'QUESTION')) {
    let ifTrue = disjunction(parser);
    expect(parser, 'COLON', "expected `:` after `expr ? expr`");
    let ifFalse = assignment(parser);
    return New_Expression_Ternary('?:', left, ifTrue, ifFalse);
  }
  return left;
}

function sequence(parser) {
  // sequence ::= assignment { ',' assignment }
  let left = assignment(parser);
  while (match(parser, 'COMMA')) {
    let op = advance(parser);
    let right = assignment(parser);
    left = New_Expression_Binary(op.Text, left, right);
  }
  return left;
}

function expr_no_comma(parser) {
  return assignment(parser);
}

function expr(parser) {
  return sequence(parser);
}

function maybe_expr(parser) {
  if (match_any(parser, parser.initial_expression_tokens)) {
    return Just(expr(parser));
  } else {
  }
    return None('Expression');
}

function expression_list(parser, hasTrailingComma) {
  // expression_list := one_or_more_expressions ','? | /* empty */
  // one_or_more_expressions := expression | one_or_more_expressions ',' expression
  let expressions = [ ];

  while (match_any(parser, parser.initial_expression_tokens)) {
    hasTrailingComma.value = false;
    expressions.push(expr_no_comma(parser));
    if (!skip(parser, 'COMMA')) {
      break;
    }
    hasTrailingComma.value = true;
  }

  return expressions;
}

function parenthesized_expression_list(parser, hasTrailingComma) {
  // parenthesized_expression_list ::= '(' expression_list ')'
  expect(parser, 'LPAREN', "expected `(`");
  let expressions = expression_list(parser, hasTrailingComma);
  expect(parser, 'RPAREN', "expected `)`");
  return expressions;
}

export function New_Statement_If(Test, Body, Else) {
  assert_is_kind("New_Statement_If.Test", Test, 'Expression');
  assert_is_kind_tag("New_Statement_If.Body", Body, 'Statement', 'Block');
  assert_is_maybe_kind("New_Statement_If.Else", Else, 'Statement');
  return { Kind: 'Statement', Tag: 'If', Test, Body, Else };
}

function if_statement_sp1(parser) {
  // The 'if' or 'elsif' has already been skipped.
  if (!match_any(parser, parser.initial_expression_tokens)) {
    expect(parser, 'EXPRESSION', "expected EXPRESSION after `if`");
  }
  let test = expr(parser);
  expect(parser, 'then', 'expected `then` after `if EXPRESSION`');

  let body = [];
  let item;
  while (isJust(item = maybe_declaration(parser))) {
    body.push(item.Just);
  }
  body = New_Statement_Block(body);

  let alternative = maybe_else_statement_sp1(parser);
  return New_Statement_If(test, body, alternative);
}

function maybe_else_statement_sp1(parser) {
  if (skip(parser, 'end')) {
    return None('Statement');
  }
  if (skip(parser, 'elsif')) {
    return Just(if_statement_sp1(parser));
  }
  if (!skip(parser, 'else')) {
    expect(parser, 'elsif|else|end', 'expected `elsif`, `else`, or `end` after `if EXPRESSION then STATEMENT...`)');
  }

  let body = [];
  let item;
  while (isJust(item = maybe_declaration(parser))) {
    body.push(item.Just);
  }
  expect(parser, 'end', 'expected `end` after `else STATEMENT...`');
  return Just(New_Statement_Block(body));
}

function if_statement_sjs(parser) {
  // The 'if' has already been skipped.
  expect(parser, 'LPAREN', "expected `(` after `if`");
  let test = expr(parser);
  expect(parser, 'RPAREN', "expected `)` after `if (EXPRESSION`");
  let body = statement_block(parser, "after `if (EXPRESSION)`");
  let alternative = maybe_else_statement_sjs(parser);
  return New_Statement_If(test, body, alternative);
}

function maybe_else_statement_sjs(parser) {
  if (!skip(parser, 'else')) {
    return None('Statement');
  }
  if (skip(parser, 'if')) {
    return Just(if_statement_sjs(parser));
  }
  return Just(statement_block(parser, "or `if` after `else`"));
}

function if_statement(parser) {
  return parser.is_spectra ? if_statement_sp1(parser) : if_statement_sjs(parser);
}

export function New_Statement_While(Test, Body) {
  assert_is_kind("New_Statement_While.Test", Test, 'Expression');
  assert_is_kind_tag("New_Statement_While.Body", Body, 'Statement', 'Block');
  return { Kind: 'Statement', Tag: 'While', Test, Body };
}

function test_expression(parser, kw, kw_after_test) {
  let test;
  if (parser.is_spectra) {
    if (!match_any(parser, parser.initial_expression_tokens)) {
      expect(parser, 'EXPRESSION', "expected EXPRESSION after \`${kw}\`");
    }
    test = expr(parser);
    if (!match(parser, kw_after_test)) {
      expect(parser, 'UNMATCHABLE', `expected \`${kw_after_test}\` after \`${kw} EXPRESSION\``);
    }
    return test;
  } else {
    expect(parser, 'LPAREN', "expected \`(\` after \`${kw}\`");
    test = expr(parser);
    expect(parser, 'RPAREN', "expected \`)\` after \`${kw} (EXPRESSION\`");
  }
  return test;
}

function while_statement_sp1(parser) {
  // The 'while' has already been skipped.
  if (!match_any(parser, parser.initial_expression_tokens)) {
    expect(parser, 'EXPRESSION', "expected EXPRESSION after `while`");
  }
  let test = expr(parser);
  let body = statement_block(parser, "after `while EXPRESSION`");
  return New_Statement_While(test, body);
}

function while_statement_sjs(parser) {
  // The 'while' has already been skipped.
  expect(parser, 'LPAREN', "expected `(` after `while`");
  let test = expr(parser);
  expect(parser, 'RPAREN', "expected `)` after `while (EXPRESSION`");
  let body = statement_block(parser, "after `while (EXPRESSION)`");
  return New_Statement_While(test, body);
}

function while_statement(parser) {
  return parser.is_spectra ? while_statement_sp1(parser) : while_statement_sjs(parser);
}

export function New_Statement_For(Keyword, Vars, Collection, Body, VarsBracketed) {
  Keyword === null || assert_is_string_match("New_Statement_For.Keyword", Keyword, varLetOrConst);
  assert_is_list_of("New_Statement_For.Vars", Vars, string_asserter());
  assert_is_kind("New_Statement_For.Collection", Collection, 'Expression');
  assert_is_kind("New_Statement_For.Body", Body, 'Statement', 'Block');
  assert_is_boolean("New_Statement_For.VarsBracketed", VarsBracketed);
  return { Kind: 'Statement', Tag: 'For', Keyword, Vars, Collection, Body, VarsBracketed };
}

function for_statement(parser) {
  // The 'for' has already been skipped.
  if (!parser.is_spectra) {
    expect(parser, 'LPAREN', "expected `(` after `for`");
  }
  let kw = skip_any(parser, ['let', 'var', 'const']) || null;
  let lbrack = skip(parser, 'LBRACK');
  let  vars = identifier_list(parser);
  if (lbrack) { expect(parser, 'RBRACK'); }
  expect(parser, 'of');
  let collection = expr(parser);
  if (!parser.is_spectra) {
    expect(parser, 'RPAREN', "expected `)` after `for (...`");
  }
  let body = statement_block(parser, "after `for (...)`");
  return New_Statement_For(kw.Text, vars, collection, body, !!lbrack);
}

export function New_Statement_Throw(Expression) {
  assert_is_kind("New_Statement_Throw.Expression", Expression, 'Expression');
  return { Kind: 'Statement', Tag: 'Throw', Expression };
}

function throw_statement(parser) {
  // The 'throw' has already been skipped.
  let expression = expr(parser);
  expect(parser, 'SEMICOLON');
  return New_Statement_Throw(expression);
}

export function New_Statement_Return(Expression) {
  assert_is_maybe_kind("New_Statement_Return.Expression", Expression, 'Expression');
  return { Kind: 'Statement', Tag: 'Return', Expression };
}

function return_statement(parser) {
  // The 'return' has already been skipped.
  let expression = maybe_expr(parser);
  expect(parser, 'SEMICOLON');
  return New_Statement_Return(expression);
}

export function New_Statement_Expression(Expression) {
  assert_is_kind("New_Statement_Expression.Expression", Expression, 'Expression');
  return { Kind: 'Statement', Tag: 'Expression', Expression };
}

function maybe_statement(parser, exported) {
  let statement;
  //console.log(`maybe_statement, at ${showCurrentToken(parser)}`);
  if (skip(parser, 'if')) {
    statement = if_statement(parser);
  } else if (skip(parser, 'while')) {
    statement = while_statement(parser);
  } else if (skip(parser, 'for')) {
    statement = for_statement(parser);
  } else if (skip(parser, 'throw')) {
    statement = throw_statement(parser);
  } else if (skip(parser, 'return')) {
    statement = return_statement(parser);
  } else if (isJust(statement = maybe_expr(parser))) {
    if (exported) {
      throw NewSyntaxError("expression statements cannot be exported", exported);
    }
    expect(parser, 'SEMICOLON');
    statement = New_Statement_Expression(statement.Just);
  } else {
    return None('Declaration');
    //throw NewSyntaxError("expected STATEMENT", curtok(parser));
  }
  return Just(New_Declaration_Statement(statement));
}

export function New_FunctionSignature(FormalParameters) {
  assert_is_list_of("New_FunctionSignature.FormalParameters", FormalParameters, string_asserter());
  return { Kind: 'FunctionSignature', Tag: 'FunctionSignature', FormalParameters };
}

function function_signature(parser) {
  //console.log(`function_signature, at ${showCurrentToken(parser)}`);
  expect(parser, 'LPAREN', "expected `(` to begin function parameter list");
  //console.log(`after '(' in function_signature, at ${showCurrentToken(parser)}`);
  let identifiers = optional_identifier_list(parser);
  //console.log(`after optional_identifier_list in function_signature, at ${showCurrentToken(parser)}`);
  expect(parser, 'RPAREN', 'expected `,` or `)`');
  //console.log(`after ')' in function_signature, at ${showCurrentToken(parser)}`);
  return New_FunctionSignature(identifiers);
}

export function New_Statement_Block(Declarations) {
  assert_is_list_of("New_Statement_Block.Declarations", Declarations, kind_asserter('Declaration'));
  return { Kind: 'Statement', Tag: 'Block', Declarations };
}

function statement_list(parser) {
  let DeclarationList = [];
  let item;
  while (isJust(item = maybe_declaration(parser))) {
    DeclarationList.push(item.Just);
  }
  return New_Statement_Block(DeclarationList);
}

function statement_block_sp1(parser, extra_expect_message) {
  expect(parser, 'do', `expected \`do\` ${extra_expect_message}`);
  let block = statement_list(parser);
  expect(parser, 'end', "expected DECLARATION or `end`");
  return block;
}

function statement_block_sjs(parser, extra_expect_message) {
  expect(parser, 'LBRACE', `expected \`{\` ${extra_expect_message}`);
  let block = statement_list(parser);
  expect(parser, 'RBRACE', "expected DECLARATION or `}`");
  return block;
}

function statement_block(parser, msg) {
  return parser.is_spectra ? statement_block_sp1(parser, msg) : statement_block_sjs(parser, msg);
}


function function_declaration(parser, exported, is_async) {
  // function_declaration := function_kw SYMBOL '(' optional_identifier_list? ')' body
  expect(parser, parser.function_kw);
  let name = expect(parser, 'SYMBOL', 'expected SYMBOL (to define the function name)');
  //console.log(`after name in function_declaration, at ${showCurrentToken(parser)}`);
  let signature = function_signature(parser);
  //console.log(`after function_signature in function_declaration, at ${showCurrentToken(parser)}`);
  let body = statement_block(parser, "at start of function body");
  return New_Declaration_Function(name.Text, signature, body, !!exported, !!is_async);
}

function variable_declaration(parser, exported) {
  let kw = skip_any(parser, ['let', 'var', 'const']);
  if (!kw) { expect(parser, 'let', "expected `let`, `var`, or `const`"); }

  if (skip(parser, 'LBRACK')) {
    let variables = identifier_list(parser);
    expect(parser, 'RBRACK');
    let assignOp = expect(parser, 'ASSIGN', "expected '=' after 'let [...]'");
    if (assignOp.Text !== '=') {
      throw NewSyntaxError("expected '=' after 'let [...]'", assignOp);
    }
    let rhs = expr(parser);
    expect(parser, 'SEMICOLON');
    return New_Declaration_Variables(kw.Text, variables, rhs, !!exported);
  }

  let lhs = expect(parser, 'SYMBOL');
  let rhs = None('Expression');
  if (text(parser) === '=' && expect(parser, 'ASSIGN', `expected '=' or ';' after '${kw.Text}'`)) {
    rhs = Just(expr(parser));
  }
  expect(parser, 'SEMICOLON');
  return New_Declaration_Variable(kw.Text, lhs.Text, rhs, !!exported);
}

//let assignment_operator = new RegExp('^(=|+=|-=|*=|/=)$');
function is_binary(x, expected_operator) {
  return x !== null && typeof(x) === 'object' &&
         x.Kind === 'Expression' &&
         x.Tag === 'Binary' &&
         x.Operator === expected_operator;
}

export function New_Import_List(ImportList, ModulePath) {
  assert_is_list_of("New_Import_List.ImportList", ImportList, string_asserter());
  assert_is_string("New_Import_List.ModulePath", ModulePath);
  return { Kind: 'Import', Tag: 'Import', ModulePath, ImportList };
}

export function New_Import_As(Name, ModulePath) {
  assert_is_string("New_Import_As.Name", Name);
  assert_is_string("New_Import_As.ModulePath", ModulePath);
  return { Kind: 'Import', Tag: 'As', Name, ModulePath };
}

function maybe_import(parser) {
  //console.log(`maybe_import at ${showCurrentToken(parser)}`);
  if (!skip(parser, 'import')) {
    return None('Import');
  }

  if (skip(parser, 'STAR')) {
    expect(parser, 'as');
    let name = expect(parser, 'SYMBOL');
    expect(parser, 'from');
    let path = expect(parser, 'STRING');
    expect(parser, 'SEMICOLON');
    return Just(New_Import_As(name.Text, path.Text));
  }


  if (!skip(parser, 'LBRACE')) {
      throw NewSyntaxError('expected `{` after `import`', curtok(parser));
  }
  let identifiers = identifier_list(parser);
  if (!skip(parser, 'RBRACE')) {
    throw new SyntaxError('expected `,` or `}`', curtok(parser));
  }

  if (!skip(parser, 'from')) {
    throw new SyntaxError('expected `from`', curtok(parser));
  }

  let module_path = skip(parser, 'STRING');
  if (!module_path) {
    throw new SyntaxError('expected STRING after `from` (representing module path)',
                          curtok(parser));
  }

  expect(parser, 'SEMICOLON');
  return Just(New_Import_List(identifiers, module_path.Text));
}

export function New_Declaration_Function(Name, Signature, Body, Exported, IsAsync) {
  assert_is_string("New_Declaration_Function.Name", Name);
  assert_is_kind("New_Declaration_Function.Signature", Signature, 'FunctionSignature');
  assert_is_kind_tag("New_Declaration_Function.Body", Body, 'Statement', 'Block');
  assert_is_boolean("New_Declaration_Function.Exported", Exported);
  assert_is_boolean("New_Declaration_Function.IsAsync", IsAsync);
  return { Kind: 'Declaration', Tag: 'Function', Name, Signature, Body, Exported, IsAsync };
}


const varLetOrConst = new RegExp('^(var|let|const)$');

export function New_Declaration_Variable(Keyword, Variable, Initializer, Exported) {
  assert_is_string_match('New_Declaration_Variable.Keyword', Keyword, varLetOrConst);
  assert_is_string('New_Declaration_Variable.Variable', Variable);
  assert_is_maybe_kind('New_Declaration_Variable.Initializer', Initializer, 'Expression');
  assert_is_boolean('New_Declaration_Variable.Exported', Exported);
  return { Kind: 'Declaration', Tag: 'Variable', Keyword, Variable, Initializer, Exported };
}

export function New_Declaration_Variables(Keyword, Variables, Initializer, Exported) {
  assert_is_string_match('New_Declaration_Variables.Keyword', Keyword, varLetOrConst);
  assert_is_list_of('New_Declaration_Variables.Variables', Variables, string_asserter());
  assert_is_kind('New_Declaration_Variables.Initializer', Initializer, 'Expression');
  assert_is_boolean('New_Declaration_Variables.Exported', Exported);
  return { Kind: 'Declaration', Tag: 'Variables', Keyword, Variables, Initializer, Exported };
}


export function New_Declaration_Statement(Statement) {
  assert_is_kind('New_Declaration_Statement.Statement', Statement, 'Statement');
  return { Kind: 'Declaration', Tag: 'Statement', Statement };
}

function maybe_declaration(parser) {
  //console.log(`maybe_declaration, at ${showCurrentToken(parser)}`);
  let exported = skip(parser, 'export');
  let is_async = skip(parser, 'async');
  if (!!is_async && peek(parser) !== parser.function_kw) {
    expect(parser, 'UNMATCHABLE', `expected \`${parser.function_kw}\` after \`async\``);
  }
  if (match(parser, 'EOF')) {
    if (exported) {
      throw new SyntaxError(`unexpected end-of-input after 'export'`);
    }
    return None('DECLARATION');
  } else if (match(parser, parser.function_kw)) {
    return Just(function_declaration(parser, exported, is_async));
  } else if (match_any(parser, ['let', 'var', 'const'])) {
    return Just(variable_declaration(parser, exported));
  } else {
    return maybe_statement(parser, exported);
  }
}

export function New_ModuleName(name) {
  assert_is_string("New_ModuleName.name", name);
  if (typeof(name) !== 'string') {
    throw new SyntaxError(
      `internal error: ModuleName name should be a string, got ${name} (type ${typeof(name)})`
    );
  }
  let result = { Kind: 'ModuleName', Tag: 'ModuleName', Name: name };
  //console.log(`ModuleName is ${JSON.stringify(result)}`);
  return result;
}

function maybe_module_name(parser) {
  //console.log(`maybe_module_name, at ${showCurrentToken(parser)}`);
  if (!skip(parser, 'module')) {
    return None('ModuleName');
  }

  //console.log(`after \`module\`, at ${showCurrentToken(parser)}`);
  let module_name = skip(parser, 'SYMBOL');
  //console.log(`module_name is ${showToken(module_name)}`);
  if (module_name === null) {
    throw new SyntaxError('expected SYMBOL after `module`', curtok(parser));
  }
  expect(parser, 'SEMICOLON');
  return Just(New_ModuleName(module_name.Text));
}

export function New_Unit(Module, ImportList, DeclarationList, ExpectedOutput) {
  assert_is_maybe_kind("New_Unit.Module", Module, 'ModuleName');
  assert_is_list_of("New_Unit.ImportList", ImportList, kind_asserter('Import'));
  assert_is_list_of("New_Unit.DeclarationList", DeclarationList, kind_asserter('Declaration'));
  assert_is_string("New_Unit.ExpectedOutput", ExpectedOutput);
  return { Kind: 'Unit', Tag: 'Unit', Module, ImportList, DeclarationList, ExpectedOutput };
}

function unit(parser) {
  //console.log(`unit, at ${showCurrentToken(parser)}`);
  let Module = maybe_module_name(parser);
  //console.log(`after module declaration, at ${showCurrentToken(parser)}`);

  let item;
  let ImportList = [];
  while (isJust(item = maybe_import(parser))) {
    ImportList.push(item.Just);
  }

  let DeclarationList = [];
  while (isJust(item = maybe_declaration(parser))) {
    DeclarationList.push(item.Just);
  }


  let output;
  if (output = skip(parser, 'OUTPUT_COMMENT')) {
    output = output.Text;
  } else {
    output = '';
  }

  expect(parser, 'EOF', "expected DECLARATION or EOF");
  return New_Unit(Module, ImportList, DeclarationList, output);
}

// Return value is an AST; see "./syntax-tree-format.md" for details.
export function Parse(parser) {
  if (match(parser, 'EOF')) {
    return None('Unit');
  }
  let result = Just(unit(parser));
  expect(parser, 'EOF');
  return result;
}
