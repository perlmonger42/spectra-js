import { describe, isJust, isNone, InternalError
       , is_kind, is_kind_tag
       } from '../src/sjs-parser.mjs';

let emitter; // { writer, current_indent, indent_stack, current_line, current_column }
let lang; // { fn, do,end }

function to_s(value) {
  return describe(value, 2000);
}

function indent(extra_indent) {
  emitter.indent_stack.push(emitter.current_indent);
  emitter.current_indent += extra_indent;
}

function undent() {
  emitter.current_indent = emitter.indent_stack.pop();
}

function emit(text) {
  // process.stdout.write(text);  // for echoing to stdout as it's generated
  emitter.writer(text);

  let i = 0;
  while (i < text.length) {
    if (text[i] === '\n') {
      emitter.current_line++;
      emitter.current_column = 1;
    } else {
      emitter.current_column++;
    }
    i++;
  }

  //var image = 'emitting: ';
  //for (let i = 1; i < emitter.current_column; i++) image += '.';
  //image += text;
  //image = image.replace(/\n/g, '\nemitting: ');
  //if (image[image.length-1] != '\n') image += '\n';
  //console.log(image);
  // console.log(`line: ${emitter.current_line}, column: ${emitter.current_column}`);
}

function nl_no_indent() {
  emitter.writer('\n');
  emitter.current_line++;
  emitter.current_column = 1;
}

function nl_and_indent() {
  emit('\n' + emitter.current_indent);
}

function nl_emit(text) {
  emit('\n' + emitter.current_indent + text);
}

function maybe_nl_emit(should_newline, text) {
  if (should_newline) {
    nl_emit(text);
  } else {
    emit(text);
  }
}

function is_sp_keyword(text) {
  return /^(as|async|await|const|do|else|elsif|end|export|if|fn|for|from|import|let|module|new|of|return|then|throw|typeof|var|while)$/.test(text);
}

function is_js_keyword(text) {
  return /^(as|async|await|const|else|export|if|for|from|import|let|module|new|of|return|then|throw|typeof|var|while)$/.test(text);
}

export function Generate(output_language, input_file_name, unit, writer) {
  emitter = { output_language
            , writer, current_indent: '', indent_stack: [ ]
            , current_line: 1, current_column: 1
            };
  lang = {
    func: output_language === 'js' ? 'function' : 'fn',
    begin_block: output_language === 'js' ? '{' : 'do',
    end_block: output_language === 'js' ? '}' : 'end',
    emit_if_stmt: output_language === 'js' ? js_emit_statement_if : sp1_emit_statement_if,
    test_lpar: output_language === 'js' ? '(' : '',
    test_rpar: output_language === 'js' ? ')' : '',
    is_keyword: output_language === 'js' ? is_js_keyword : is_sp_keyword,
  };
  emit_unit(unit);
}

function die(message) {
  throw new InternalError(message);
}

function nyi(message) {
  die(`Not yet implemented: ${message}`);
}

function emit_unit(unit) {
  // unit is               { Kind: 'Unit', Tag: 'Unit', ModuleComments, Module, ImportList, DeclarationList, ExpectedOutput };
  // ModuleComments is     { Kind: 'Declaration', Tag: 'Comments', Comments: [token...] }
  // Module is             Maybe(ModuleName)
  // ModuleName is         { Kind: 'ModuleName', Tag: 'ModuleName', Module: token, Name: token }
  // ImportList is         [ Import... ]
  // DeclarationList is    [ Declaration... ]

  emit_declaration_comments(unit.ModuleComments);

  let name = isJust(unit.Module) ? unit.Module.Just.Name : 'main';
  emit(`// module ${name};`);

  for (let item of unit.ImportList) {
    nl_and_indent();
    emit_import(item);
  }
  nl_and_indent();

  for (let decl of unit.DeclarationList) {
    nl_no_indent();
    nl_and_indent();
    emit_declaration(decl);
  }
  emit('\n');
  emit(unit.ExpectedOutput);
}

function emit_import(item) {
  // item       is  { Kind: 'Import', Tag: 'Import', Import, Lbrace, Rbrace, From, ModulePath, ImportList}
  //            or  { Kind: 'Import', Tag: 'As', Import, Star, As, From, Name, ModulePath }
  // Import     is  Token
  // Star       is  Token
  // As         is  Token
  // From       is  Token
  // Name       is  Token/SYMBOL
  // ModulePath is  Token/STRING
  // ImportList is  { Kind: 'List', Tag: 'Identifiers', Identifiers: [token...], Commas: [token...] }
  if (item.Tag === 'Import') {
    let start_line = emitter.current_line;
    emit(`import { `);
    indent ('       ');
    let comma = '';
    let newlines = false;
    let names = item.ImportList.Identifiers.map((tok) => tok.Text);
    for (let name of names) {
      let out = comma + name;
      comma = ", ";

      let too_long = (emitter.current_column + out.length) > 72;
      maybe_nl_emit(too_long, out);
      newlines = newlines || too_long;
    }
    maybe_nl_emit(newlines,  `} from ${item.ModulePath.Text};`);
    undent();
  } else if (item.Tag === 'As') {
    emit(`import * as ${item.Name.Text} from ${item.ModulePath.Text};`);
  }
}

function emit_declaration(decl) {
  // decl is            Declaration
  // Declaration has    { Kind: 'Declaration', Tag: 'Comments', Comments: [token...] }
  //              or    { Kind: 'Declaration', Tag: 'Function', Name, Signature, Body, Exported, IsAsync }
  //              or    { Kind: 'Declaration', Tag: 'Variable', Keyword, Variable, Initializer, Exported };
  //              or    { Kind: 'Declaration', Tag: 'Variables', Keyword, Variables, Initializer, Exported };
  //              or    { Kind: 'Declaration', Tag: 'Statement', Statement };
  if (decl.Tag === 'Comments') {
    emit_declaration_comments(decl);
  } else if (decl.Tag === 'Function') {
    emit_declaration_function(decl);
  } else if (decl.Tag === 'Variable') {
    emit_declaration_variable(decl);
  } else if (decl.Tag === 'Variables') {
    emit_declaration_variables(decl);
  } else if (decl.Tag === 'Statement') {
    emit_statement(decl.Statement);
  } else {
    die(`unknown Declaration.Tag: ${decl.Tag} in ${describe(decl, 2000)}`);
  }
}

function emit_declaration_comments(decl) {
  // decl is { Tag: 'Comments', Comments: [token...] }
  for (var c of decl.Comments) {
    emit(c.Text);
    if (c.Type === 'EOL_COMMENT') {
      nl_and_indent();
    }
  }
}

function emit_declaration_function(decl) {
  // decl is { Tag: 'Function'
  //         , Name: string
  //         , Signature: FunctionSignature
  //         , Body: Statement/List
  //         , Exported: boolean
  //         , IsAsync: boolean
  //         }
  // FunctionSignature is { Kind: 'FunctionSignature', DelimiterLeft, DelimiterRight, FormalParameters };
  // FormalParameters is  { Kind: 'List', Tag: 'Identifiers', Identifiers: [token...], Commas: [token...] }
  emit(decl.Exported ? 'export ' : '');
  emit(decl.IsAsync ? 'async ' : '');
  emit(lang.func + ' ');
  emit(decl.Name);
  emit_list_of_names('(', decl.Signature.FormalParameters, ') ');
  emit_statement_block(decl.Body);
}

function emit_declaration_variable(decl) {
  // decl is           { Tag: 'Variable', Keyword: Token, Variable, Initializer, Exported }
  emit(`${decl.Exported ? 'export ' : ''}${decl.Keyword.Text} ${decl.Variable}`);
  if (isJust(decl.Initializer)) {
    emit(' = ');
    emit_expression(decl.Initializer.Just);
  }
  emit(';');
}

function emit_declaration_variables(decl) {
  // decl        is   { Tag: 'Variables', Keyword: Token, Variables, Initializer, Exported };
  // Keyword     is   'var', 'let', or 'const'
  // Variables   is   { Kind: 'List', Tag: 'Identifiers', Identifiers: [token...], Commas: [token...] }
  // Initializer is   Expression
  // Exported    is   boolean
  emit(`${decl.Exported ? 'export ' : ''}${decl.Keyword.Text} `);
  emit_list_of_names('[', decl.Variables, ']');
  emit(' = ');
  emit_expression(decl.Initializer);
  emit(';');
}

function emit_statement(stmt) {
  // stmt is { Kind: 'Statement', Tag: 'If', If, Then, End, Test, Body, Else };
  //      or { Kind: 'Statement', Tag: 'While', While, Test, Body };
  //      or { Kind: 'Statement', Tag: 'For', For: Token, VarKeyword, Vars, Collection, Body, VarsBracketed };
  //      or { Kind: 'Statement', Tag: 'Throw', Throw: Token, Expression };
  //      or { Kind: 'Statement', Tag: 'Return', Return: Token, Expression };
  //      or { Kind: 'Statement', Tag: 'Expression', Expression };
  //      or { Kind: 'Statement', Tag: 'List', Statements };
  //      or { Kind: 'Statement', Tag: 'Block', Statements, Opener: Token, Closer: Token };
  if (stmt.Tag === 'If') {
    lang.emit_if_stmt(stmt);
  } else if (stmt.Tag === 'While') {
    emit_statement_while(stmt);
  } else if (stmt.Tag === 'For') {
    emit_statement_for(stmt);
  } else if (stmt.Tag === 'Throw') {
    emit_statement_throw(stmt);
  } else if (stmt.Tag === 'Return') {
    emit_statement_return(stmt);
  } else if (stmt.Tag === 'Expression') {
    emit_statement_expression(stmt);
  } else if (stmt.Tag === 'List' || stmt.Tag === 'Block') {
    emit_statement_block(stmt);
  } else {
    nyi(`emit_statement of ${stmt.Kind}/${stmt.Tag}`);
  }
}

function emit_statement_block(body) {
  // body is { Kind: 'Statement', Tag: 'List', Statements: [Declaration...] }
  // or      { Kind: 'Statement', Tag: 'List', Statements: [Declaration...], Opener: Token, Closer: Token }
  emit(lang.begin_block);
  emit_statement_list(body.Statements);
  nl_emit(lang.end_block);
}

function emit_statement_list(stmt_list) {
  indent('  ');
  for (let decl of stmt_list) {
    nl_and_indent();
    emit_declaration(decl);
  }
  undent();
}

function js_emit_statement_if(stmt) {
  // stmt is { Kind: 'Statement', Tag: 'If', If, Then, End, Test: Expression, Body, Else: Maybe(Statement) };
  // If   is a Token
  // Then is a Just(Token) if Spectra, None(Token) if SJS
  // End  is a Just(Token) if Spectra, None(Token) if SJS
  // Body is { Kind: 'Statement', Tag: 'List', Statements }
  //      or { Kind: 'Statement', Tag: 'Block', Statements, Opener, Closer }
  // Else is { Kind: 'Statement', Tab: 'List', Statements }
  //      or { Kind: 'Statement', Tag: 'Block', Statements, Opener, Closer }
  //      or { Kind: 'Statement', Tag: 'If', Test: Expression, Body, Else: Maybe(Statement) }
  emit('if (');
  emit_expression(stmt.Test);
  emit(') ');
  emit_statement_block(stmt.Body);
  if (isJust(stmt.Else)) {
    emit(" else ");
    emit_statement(stmt.Else.Just);
  }
}

function sp1_emit_statement_if(stmt) {
  emit('if ');
  emit_expression(stmt.Test);
  emit(' then');
  emit_statement_list(stmt.Body.Statements);
  stmt = stmt.Else;
  while (isJust(stmt)) {
    stmt = stmt.Just;
    if (stmt.Kind === 'Statement' && stmt.Tag === 'If') {
      nl_emit('elsif ');
      emit_expression(stmt.Test);
      emit(' then');
      emit_statement_list(stmt.Body.Statements);
      stmt = stmt.Else;
    } else if (stmt.Kind === 'Statement' && (stmt.Tag === 'List' || 'Block')) {
      nl_emit('else');
      emit_statement_list(stmt.Statements);
      nl_emit('end');
      return;
    }
  }
  nl_emit('end');
}

function emit_statement_while(stmt) {
  // stmt is { Kind: 'Statement', Tag: 'While', While: Token, Test, Body };
  emit(`while ${lang.test_lpar}`);
  emit_expression(stmt.Test);
  emit(`${lang.test_rpar} `);
  emit_statement_block(stmt.Body);
}

function emit_statement_for(stmt) {
  // stmt       is { Kind: 'Statement', Tag: 'For', For, VarKeyword, Vars, Collection, Body, VarsBracketed };
  // For        is Token
  // VarKeyword is Maybe(Token); if isJust(VarKeyword), VarKeyword.Text is one of {'var', 'let', 'const'}
  // Vars       is { Kind: 'List', Tag: 'Identifiers', Identifiers: [token...], Commas: [token...] }
  // Collection is Expression
  // Body       is Statement/List
  emit(`for ${lang.test_lpar}`);
  if (isJust(stmt.VarKeyword)) {
    emit(stmt.VarKeyword.Just.Text + ' ');
  }
  let [l, r] = stmt.VarsBracketed ? ['[', ']'] : ['', ''];
  emit_list_of_names(l, stmt.Vars, r);
  emit(' of ');
  emit_expression(stmt.Collection);
  emit(`${lang.test_rpar} `);
  emit_statement_block(stmt.Body);
}

function emit_statement_throw(stmt) {
  // stmt      is { Kind: 'Statement', Tag: 'Throw', Throw: Token, Expression };
  // Exception is Expression
  emit('throw ');
  emit_expression(stmt.Expression);
  emit(';');
}

function emit_statement_return(stmt) {
  // stmt is { Kind: 'Statement', Tag: 'Return', Return: Token, Expression: Maybe(Expression) };
  emit('return');
  if (isJust(stmt.Expression)) {
    emit(' ');
    emit_expression(stmt.Expression.Just);
  }
  emit(';');
}

function emit_statement_expression(stmt) {
  emit_expression(stmt.Expression);
  emit(';');
}

function emit_expression(expr) {
  // expr is            { Kind: 'Expression', Tag: 'Symbol', Name };
  //      or            { Kind: 'Expression', Tag: 'Literal', Literal };
  //      or            { Kind: 'Expression', Tag: 'Grouping', Expr };
  //      or            { Kind: 'Expression', Tag: 'Unary', Prefix: true, Operator, Operand };
  //      or            { Kind: 'Expression', Tag: 'Unary', Prefix: false, Operator, Operand };
  //      or            { Kind: 'Expression', Tag: 'Binary', Operator, Left, Right };
  //      or            { Kind: 'Expression', Tag: 'PostCircumfix', Left, Right, DelimiterLeft, DelimiterRight };
  //      or            { Kind: 'Expression', Tag: 'Ternary', Left, OperatorLeft, Middle, OperatorRight, Right };
  //      or            { Kind: 'Expression', Tag: 'New', FunctorName, Arguments: Expression_List };
  //      or            { Kind: 'Expression', Tag: 'Pair', Key, Value };
  //      or            { Kind: 'Expression', Tag: 'Object', DelimiterLeft, DelimiterRight, Pairs };
  //      or            { Kind: 'Expression', Tag: 'List', Expressions };
  //      or            { Kind: 'Expression', Tag: 'Array', Expressions };
  if (expr.Tag === 'Symbol') {
    emit(expr.Name);
  } else if (expr.Tag === 'Literal') {
    emit_expression_literal(expr.Literal);
  } else if (expr.Tag === 'Grouping') {
    emit_expression(expr.Expr);
  } else if (expr.Tag === 'Unary') {
    emit_expression_unary(expr);
  } else if (expr.Tag === 'Binary') {
    emit_expression_binary(expr);
  } else if (expr.Tag === 'PostCircumfix') {
    emit_expression_postcircumfix(expr);
  } else if (expr.Tag === 'Ternary') {
    emit_expression_ternary(expr);
  } else if (expr.Tag === 'Object') {
    emit_expression_object(expr);
  } else if (expr.Tag === 'List') {
    emit_list_of_expressions('(', expr.Expressions, ')');
  } else if (expr.Tag === 'Array') {
    emit_expression_array(expr);
  } else {
    throw new InternalError(`not yet implemented: emit_expression of ${expr.Kind}/${expr.Tag}`);
  }
}

function emit_expression_literal(literal) {
  // literal is { Kind: 'Literal', Tag: 'Boolean', Value, Text };
  //         or { Kind: 'Literal', Tag: 'Fixnum', Value, Text };
  //         or { Kind: 'Literal', Tag: 'Flonum', Value, Text };
  //         or { Kind: 'Literal', Tag: 'String', Value, Text };
  //         or { Kind: 'Literal', Tag: 'Regexp', Value, Text };
  //         or { Kind: 'Literal', Tag: 'Function', Name, Signature, Body };
  //         or { Kind: 'Literal', Tag: 'ArrowFunctionExpression', Arrow: Token, Formals, Expr };
  //         or { Kind: 'Literal', Tag: 'ArrowFunctionBlock', Arrow: Token, Formals, Block };
  // Formals is { Kind: 'Expression', Tag: 'List', Expressions: [Expression...] }
  // Expr    is Expression
  // Block   is Statement/List
  let tag = literal.Tag;
  if (tag === 'Regexp') {
    emit(literal.Text);
  } else
  if (tag === 'Boolean' || tag === 'Fixnum' || tag === 'Flonum' || tag === 'String' || tag === 'Regexp') {
    emit(literal.Text);
  } else if (tag === 'Function') {
    emit_literal_function(literal);
  } else if (tag == 'ArrowFunctionExpression') {
    emit_expression_list('(', literal.Formals, ')');
    emit(' => ');
    emit_expression(literal.Expr);
  } else if (tag === 'ArrowFunctionBlock') {
    emit_expression_list('(', literal.Formals, ')');
    emit(' => ');
    emit_statement_block(literal.Block);
  } else {
    nyi(`Expression/Literal with tag="${tag}"`);
  }
}

function emit_expression_parenthesized(expr, useParentheses) {
  emit(useParentheses ? '(' : '');
  emit_expression(expr);
  emit(useParentheses ? ')' : '');
}

function emit_expression_unary(expr) {
  // expr is { Kind: 'Expression', Tag: 'Unary', Prefix: true, Operator: string, Operand: Expression };
  let prec = precedence(expr);
  let op = expr.Operator.Text;
  if (expr.Prefix) {
    emit(op);
    if (op === 'typeof' || op === 'await' || op === 'new') {
      emit(' ');
    }
  }
  emit_expression_parenthesized(expr.Operand, precedence(expr.Operand) < prec);
  if (!expr.Prefix) {
    emit(op);
  }
}

function emit_expression_binary(expr) {
  // expr is { Kind: 'Expression', Tag: 'Binary', Operator: string, Left: Expression, Right: Expression };
  let op = expr.Operator.Text;
  if (op === 'new') {
    emit('new ');
    emit_expression(expr.Left);
    emit_expression(expr.Right);
    return;
  } else if (op === '[') {
    emit_expression_parenthesized(expr.Left, precedence(expr.Left) < precedence(expr));
    emit_list_of_expressions('[', [expr.Right], ']');
    return;
  }

  let prec = precedence(expr);
  emit_expression_parenthesized(expr.Left, precedence(expr.Left) < prec);
  if (prec >= 17) {
    emit(op);
  } else {
    emit(` ${op} `);
  }
  emit_expression_parenthesized(expr.Right, precedence(expr.Right) < prec);
}

function emit_expression_postcircumfix(expr) {
  // expr is { Kind: 'Expression', Tag: 'PostCircumfix', DelimiterLeft: Token, DelimiterRight: Token,
  //                                                     Left: Expression, Right: Expression };
  let op1 = expr.DelimiterLeft.Text;
  let op2 = expr.DelimiterRight.Text;
  if (op1 === '[') { // 'Index', i.e., array subscript
    emit_expression_parenthesized(expr.Left, precedence(expr.Left) < precedence(expr));
    emit_list_of_expressions(op1, [expr.Right], op2);
  } else if (op1 === '(') { // 'Apply', i.e. function application
    emit_expression_parenthesized(expr.Left, precedence(expr.Left) < precedence(expr));
    emit_expression_list('(', expr.Right, ')');
  }
}

function emit_expression_ternary(expr) {
  // expr is { Kind: 'Expression', Tag: 'Ternary', Left, OperatorLeft: Token, Middle, OperatorRight: Token, Right };
  let prec = precedence(expr);
  emit_expression_parenthesized(expr.Left, precedence(expr.Left) <= prec);
  emit(' ? ');
  emit_expression_parenthesized(expr.Middle, precedence(expr.Middle) < prec);
  emit(' : ');
  emit_expression_parenthesized(expr.Right, precedence(expr.Right) < prec);
}

function emit_expression_object(expr) {
  // expr  is { Kind: 'Expression', Tag: 'Object', DelimiterLeft: Token, DelimiterRight: Token, Pairs };
  // Pairs is [Pair...]
  if (expr.Pairs.length === 0) {
    emit('{  }');
  } else if (expr.Pairs.length === 1) {
    emit('{ ');
    emit_pair(expr.Pairs[0]);
    emit(' }');
  } else {
    indent('  ');
    let comma = '{';
    for (let p of expr.Pairs) {
      emit(comma);
      nl_emit('');
      emit_pair(p);
      comma = ',';
    }
    undent();
    nl_emit('}');
  }
}

function emit_expression_array(expr) {
  // expr is  { Kind: 'Expression', Tag: 'Array', Expressions };
  // Expressions is { Kind: 'Expression', Tag: 'List', Expressions: [Expression...] }
  let exprs = expr.Expressions.Expressions;
  if (exprs.length === 0) {
    emit('[ ]');
  } else if (exprs.length === 1) {
    emit('[ ');
    emit_expression(exprs[0]);
    emit(' ]');
  } else {
    indent('  ');
    let comma = '[';
    for (let p of exprs) {
      emit(comma);
      nl_emit('');
      emit_expression(p);
      comma = ',';
    }
    undent();
    nl_emit(']');
  }
}

function emit_key(expr) {
  if (expr.Tag === 'Symbol' && lang.is_keyword(expr.Name)) {
    emit(`'${expr.Name}'`);
  } else {
    emit_expression(expr);
  }
}

function emit_pair(pair) {
  // pair is { Kind: 'Expression', Tag: 'Pair', Operator: Token(":"), Key, Value: Expression };
  // key  is { Kind: 'Expression', Tag: 'Symbol', Name }
  //      or { Kind: 'Expression', Tag: 'Literal', Literal: Literal/String }
  // Literal/String is { Kind: 'Literal', Tag:  'String', Value: string, Text: string };
  emit_key(pair.Key);
  if (isJust(pair.Value)) {
    emit(': ');
    emit_expression(pair.Value.Just);
  }
}

function emit_expression_list(prefix, expression_list, postfix) {
  emit_list_of_expressions(prefix, expression_list.Expressions, postfix);
}

function emit_list_of_expressions(prefix, exprs, postfix) {
  emit(prefix);
  let comma = '';
  for (let x of exprs) {
    emit(comma);
    emit_expression(x);
    comma = ', ';
  }
  emit(postfix);
}

function emit_list_of_names(prefix, list_identifiers, postfix) {
  // list_identifiers is { Kind: 'List', Tag: 'Identifiers', Identifiers: [token...], Commas: [token...] }
  emit(prefix);
  let comma = '';
  for (let x of list_identifiers.Identifiers) {
    emit(comma);
    emit(x.Text);
    comma = ', ';
  }
  emit(postfix);
}


function emit_literal_function(func) {
  // func              is { Kind: 'Literal', Tag: 'Function', Fn: Token, Name: string, Signature, Body };
  // Signature         is FunctionSignature
  // Body              is Statement/List
  // FunctionSignature is { Kind: 'FunctionSignature', Tag: 'FunctionSignature', DelimiterLeft, DelimiterRight,
  //                        FormalParameters };
  // FormalParameters is  { Kind: 'List', Tag: 'Identifiers', Identifiers: [token...], Commas: [token...] }
  emit(lang.func + ' ');
  if (func.Name.Text !== '') {
    emit(func.Name.Text);
  }
  emit_list_of_names('(', func.Signature.FormalParameters, ')');
  emit_statement_block(func.Body);
}

function precedence(expr) {
  // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_precedence
//console.log(`calculating precedence of ${describe(expr)}`);
  if (expr.Tag === 'Grouping') {
    return precedence(expr.Expr);
  } else if (expr.Tag === 'Unary') {
    let op = expr.Operator.Text;
    if (expr.Prefix) {
      if (op === '-' || op === '+' || op === '!' ||  op === '++' || op === '--'
                     || op === 'typeof' || op === 'await' || op === 'new') {
        return 14;
      }
    } else if (op === '--' || op === '++') {
      return 15;
    } else if (op === 'new') {
      return 16;
    }
  } else if (expr.Tag === 'Binary') {
    let op = expr.Operator.Text;
    if (op === ',') {
      return 1;
    } else if (op === '=' || op === '+=' || op === '-=' || op === '*=' || op === '/=' ) {
      return 2;
    } else if (op === '||') {
      return 3;
    } else if (op === '&&') {
      return 4;
    } else if (op === '==' || op === '==='
           || op === '!=' || op === '!==') {
      return 8;
    } else if (op === '<' || op === '>' || op === '<='
           || op === '>=' || op === 'in') {
      return 9;
    } else if (op === '-' || op === '+') {
      return 11;
    } else if (op === '*' || op === '/' || op === '%') {
      return 12;
    } else if (op === '**') {
      return 13;
    } else if (op === '.' || op === 'new') {
      return 17;
    }
  } else if (expr.Tag === 'PostCircumfix') {
    let op = expr.DelimiterLeft.Text;
    if (op === '[' || op === '(') {
      return 17;
    }
  } else if (expr.Tag === 'Ternary') {
    return 2;
  } else if (expr.Tag === 'Symbol' || expr.Tag === 'Literal' || expr.Tag === 'Grouping') {
    return 18;
  } else if (expr.Tag === 'Object' || expr.Tag === 'Array') {
    return 18;
  } else if (expr.Tag === 'Pair') {
    return 2;  // this is really the comma operator inside object constructors
  } else if (expr.Tag === 'New') {
    return 17;
  }
  throw new InternalError(`not yet implemented: precedence of ${to_s(expr)}`);
}
