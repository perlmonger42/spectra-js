import { describe, isJust, isNone, InternalError
       , is_kind, is_kind_tag
       } from '../src/sjs-parser.mjs';

let emitter; // { writer, current_indent, indent_stack, current_line, current_column }

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

export function Generate(input_file_name, unit, writer) {
  emitter = { writer, current_indent: '', indent_stack: [ ]
            , current_line: 1, current_column: 1
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
  // unit is               { Kind: 'Unit', Tag: 'Unit', Module, ImportList, DeclarationList };
  // Module is             Maybe(ModuleName)
  // ModuleName is         { Kind: 'ModuleName', Tag: 'ModuleName', Name: string }
  // ImportList is         [ Import... ]
  // DeclarationList is    [ Declaration... ]

  let name = isJust(unit.Module) ? unit.Module.Just.Name : 'main';
  emit(`// module ${name};`);

  for (let item of unit.ImportList) {
    emit_import(item);
  }
  for (let decl of unit.DeclarationList) {
    emit_declaration(decl);
  }
  emit('\n');
}

function emit_import(item) {
  // item is           Import
  // Import is         { Kind: 'Import', Tag: 'Import', ModulePath: string, ImportList: [string] }
  //               or  { Kind: 'Import', Tag: 'As', Name, ModulePath: string }
  // ModulePath is     string
  // ImportList is     [ string... ]
  if (item.Tag === 'Import') {
    let start_line = emitter.current_line;
    nl_emit(`import { `);
    indent ('       ');
    let comma = '';
    let newlines = false;
    for (let name of item.ImportList) {
      let out = comma + name;
      comma = ", ";

      let too_long = (emitter.current_column + out.length) > 72;
      maybe_nl_emit(too_long, out);
      newlines = newlines || too_long;
    }
    maybe_nl_emit(newlines,  `} from ${item.ModulePath};`);
    undent();
  } else if (item.Tag === 'As') {
    nl_emit(`import * as ${item.Name} from ${item.ModulePath};`);
  }
}

function emit_declaration(decl) {
  // decl is            Declaration
  // Declaration has    { Tag: 'Function', Name, Signature, Body, Exported, IsAsync }
  //              or    { Tag: 'Variable', Keyword, Variable, Initializer, Exported };
  //              or    { Tag: 'Variables', Keyword, Variables, Initializer, Exported };
  //              or    { Tag: 'Statement', Statement };
  if (decl.Tag === 'Function') {
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

function emit_declaration_function(decl) {
  // decl is { Tag: 'Function'
  //         , Name: string
  //         , Signature: FunctionSignature
  //         , Body: Statement/Block
  //         , Exported: boolean
  //         , IsAsync: boolean
  //         }
  // FunctionSignature is { Kind: 'FunctionSignature', FormalParameters: [string...] };
  nl_emit('');
  nl_emit(decl.Exported ? 'export ' : '');
  emit(decl.IsAsync ? 'async ' : '');
  emit('function ');
  emit(decl.Name);
  emit_list_of_names('(', decl.Signature.FormalParameters, ') ');
  emit_statement_block(decl.Body);
}

function emit_declaration_variable(decl) {
  // decl is           { Tag: 'Variable', Keyword, Variable, Initializer, Exported }
  nl_emit(`${decl.Exported ? 'export ' : ''}${decl.Keyword} ${decl.Variable}`);
  if (isJust(decl.Initializer)) {
    emit(' = ');
    emit_expression(decl.Initializer.Just);
  }
  emit(';');
}

function emit_declaration_variables(decl) {
  // decl        is   { Tag: 'Variables', Keyword: string, Variables, Initializer, Exported };
  // Keyword     is   'var', 'let', or 'const'
  // Variables   is   [string...]
  // Initializer is   Expression
  // Exported    is   boolean
  nl_emit(`${decl.Exported ? 'export ' : ''}${decl.Keyword} `);
  emit_list_of_names('[', decl.Variables, ']');
  emit(' = ');
  emit_expression(decl.Initializer);
  emit(';');
}

function emit_statement(stmt) {
  // stmt is { Kind: 'Statement', Tag: 'If', Test, Body, Else };
  //      or { Kind: 'Statement', Tag: 'While', Test, Body };
  //      or { Kind: 'Statement', Tag: 'For', Keyword, Vars, Collection, Body, VarsBracketed };
  //      or { Kind: 'Statement', Tag: 'Throw', Expression };
  //      or { Kind: 'Statement', Tag: 'Return', Expression };
  //      or { Kind: 'Statement', Tag: 'Expression', Expression };
  //      or { Kind: 'Statement', Tag: 'Block', Declarations };
  if (stmt.Tag === 'If') {
    emit_statement_if(stmt);
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
  } else if (stmt.Tag === 'Block') {
    emit_statement_block(stmt);
  } else {
    nyi(`emit_statement of ${stmt.Kind}/${stmt.Tag}`);
  }
}

function emit_statement_if(stmt) {
  // stmt is { Kind: 'Statement', Tag: 'If', Test: Expression, Body: Statement/Block, Else: Maybe(Statement) };
  nl_emit('if (');
  emit_expression(stmt.Test);
  emit(') ');
  emit_statement_block(stmt.Body);
  if (isJust(stmt.Else)) {
    emit(" else ");
    emit_statement(stmt.Else.Just);
  }
}

function emit_statement_while(stmt) {
  // stmt is { Kind: 'Statement', Tag: 'While', Test, Body };
  nl_emit('while (');
  emit_expression(stmt.Test);
  emit(') ');
  emit_statement_block(stmt.Body);
}

function emit_statement_for(stmt) {
  // stmt       is { Kind: 'Statement', Tag: 'For', Keyword: string, Vars, Collection, Body, VarsBracketed };
  // Keyword    is null or 'var' or 'let' or 'const'
  // Vars       is [string...]
  // Collection is Expression
  // Body       is Statement/Block
  nl_emit('for (');
  if (stmt.Keyword !== null) {
    emit(stmt.Keyword + ' ');
  }
  let [l, r] = stmt.VarsBracketed ? ['[', ']'] : ['', ''];
  emit_list_of_names(l, stmt.Vars, r);
  emit(' of ');
  emit_expression(stmt.Collection);
  emit(') ');
  emit_statement_block(stmt.Body);
}

function emit_statement_throw(stmt) {
  // stmt      is { Kind: 'Statement', Tag: 'Throw', Expression };
  // Exception is Expression
  nl_emit('throw ');
  emit_expression(stmt.Expression);
  emit(';');
}

function emit_statement_return(stmt) {
  // stmt is { Kind: 'Statement', Tag: 'Return', Expression: Maybe(Expression) };
  nl_emit('return');
  if (isJust(stmt.Expression)) {
    emit(' ');
    emit_expression(stmt.Expression.Just);
  }
  emit(';');
}

function emit_statement_block(body) {
  // body is { Kind: 'Statement', Tag: 'Block', Declarations: [Declaration...] }
  emit('{');
  indent('  ');
  for (let decl of body.Declarations) {
    emit_declaration(decl);
  }
  undent();
  nl_emit('}');
}

function emit_statement_expression(stmt) {
  nl_emit('');
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
  //      or            { Kind: 'Expression', Tag: 'Ternary', Operator, Test, Left, Right };
  //      or            { Kind: 'Expression', Tag: 'Apply', Functor, Arguments: [Expression...] };
  //      or            { Kind: 'Expression', Tag: 'New', FunctorName, Arguments };
  //      or            { Kind: 'Expression', Tag: 'Pair', Key, Value };
  //      or            { Kind: 'Expression', Tag: 'Object', Pairs };
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
  } else if (expr.Tag === 'Ternary') {
    emit_expression_ternary(expr);
  } else if (expr.Tag === 'Apply') {
    emit_expression(expr.Functor);
    emit_list_of_expressions('(', expr.Arguments, ')');
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
  //         or { Kind: 'Literal', Tag: 'ArrowFunctionExpression', Formals, Expr };
  //         or { Kind: 'Literal', Tag: 'ArrowFunctionBlock', Formals, Block };
  // Formals is [string...]
  // Expr    is Expression
  // Block   is Statement/Block
  let tag = literal.Tag;
  if (tag === 'Regexp') {
    emit(literal.Text);
  } else
  if (tag === 'Boolean' || tag === 'Fixnum' || tag === 'Flonum' || tag === 'String' || tag === 'Regexp') {
    emit(literal.Text);
  } else if (tag === 'Function') {
    emit_literal_function(literal);
  } else if (tag == 'ArrowFunctionExpression') {
    emit_list_of_names('(', literal.Formals, ')');
    emit(' => ');
    emit_expression(literal.Expr);
  } else if (tag === 'ArrowFunctionBlock') {
    emit_list_of_names('(', literal.Formals, ')');
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
  if (expr.Prefix) {
    emit(expr.Operator);
    if (expr.Operator === 'typeof' || expr.Operator === 'await') {
      emit(' ');
    }
  }
  emit_expression_parenthesized(expr.Operand, precedence(expr.Operand) < prec);
  if (!expr.Prefix) {
    emit(expr.Operator);
  }
}

function emit_expression_binary(expr) {
  // expr is { Kind: 'Expression', Tag: 'Binary', Operator: string, Left: Expression, Right: Expression };
  if (expr.Operator === 'new') {
    emit('new ');
    emit_expression(expr.Left);
    emit_expression(expr.Right);
    return;
  } else if (expr.Operator === '[]') {
    emit_expression_parenthesized(expr.Left, precedence(expr.Left) < precedence(expr));
    emit_list_of_expressions('[', [expr.Right], ']');
    return;
  }

  let prec = precedence(expr);
  emit_expression_parenthesized(expr.Left, precedence(expr.Left) < prec);
  if (prec >= 17) {
    emit(expr.Operator);
  } else {
    emit(` ${expr.Operator} `);
  }
  emit_expression_parenthesized(expr.Right, precedence(expr.Right) < prec);
}

function emit_expression_ternary(expr) {
  // expr is            { Kind: 'Expression', Tag: 'Ternary', Operator, Test, Left, Right };
  let prec = precedence(expr);
  emit_expression_parenthesized(expr.Test, precedence(expr.Test) <= prec);
  emit(' ? ');
  emit_expression_parenthesized(expr.Left, precedence(expr.Left) < prec);
  emit(' : ');
  emit_expression_parenthesized(expr.Right, precedence(expr.Right) < prec);
}

function emit_expression_object(expr) {
  // expr  is { Kind: 'Expression', Tag: 'Object', Pairs };
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
  // Expressions is [Expression...]
  let exprs = expr.Expressions;
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

function emit_pair(pair) {
  // pair is { Kind: 'Expression', Tag: 'Pair', Key, Value: Expression };
  // key  is { Kind: 'Expression', Tag: 'Symbol', Name }
  //      or { Kind: 'Expression', Tag: 'Literal', Literal: Literal/String }
  // Literal/String is { Kind: 'Literal', Tag:  'String', Value: string, Text: string };
  emit_expression(pair.Key);
  if (isJust(pair.Value)) {
    emit(': ');
    emit_expression(pair.Value.Just);
  }
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

function emit_list_of_names(prefix, names, postfix) {
  emit(prefix);
  let comma = '';
  for (let x of names) {
    emit(comma);
    emit(x);
    comma = ', ';
  }
  emit(postfix);
}


function emit_literal_function(fn) {
  // fn                is { Kind: 'Literal', Tag: 'Function', Name: string, Signature, Body };
  // Signature         is FunctionSignature
  // Body              is Statement/Block
  // FunctionSignature is { Kind: 'FunctionSignature', Tag: 'FunctionSignature', FormalParameters };
  // FormalParameters  is [string...]
  emit('function ');
  if (fn.Name !== '') {
    emit(fn.Name);
  }
  emit_list_of_names('(', fn.Signature.FormalParameters, ')');
  emit_statement_block(fn.Body);
}

function precedence(expr) {
  // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_precedence
//console.log(`calculating precedence of ${describe(expr)}`);
  if (expr.Tag === 'Grouping') {
    return precedence(expr.Expr);
  } else if (expr.Tag === 'Unary') {
    if (expr.Prefix) {
      if (expr.Operator === '-' || expr.Operator === '+' || expr.Operator === '!'
      ||  expr.Operator === '++' || expr.Operator === '--'
      || expr.Operator === 'typeof' || expr.Operator === 'await') {
      return 14;
      }
    } else if (expr.Operator === '--' || expr.Operator === '++') {
      return 15;
    } else if (expr.Operator === 'new') {
      return 16;
    }
  } else if (expr.Tag === 'Binary') {
    if (expr.Operator === ',') {
      return 1;
    } else if (expr.Operator === '=' || expr.Operator === '+=' || expr.Operator === '-='
     || expr.Operator === '*=' || expr.Operator === '/=' ) {
      return 2;
    } else if (expr.Operator === '||') {
      return 3;
    } else if (expr.Operator === '&&') {
      return 4;
    } else if (expr.Operator === '==' || expr.Operator === '==='
           || expr.Operator === '!=' || expr.Operator === '!==') {
      return 8;
    } else if (expr.Operator === '<' || expr.Operator === '>' || expr.Operator === '<='
           || expr.Operator === '>=' || expr.Operator === 'in') {
      return 9;
    } else if (expr.Operator === '-' || expr.Operator === '+') {
      return 11;
    } else if (expr.Operator === '*' || expr.Operator === '/' || expr.Operator === '%') {
      return 12;
    } else if (expr.Operator === '**') {
      return 13;
    } else if (expr.Operator === '.' || expr.Operator === '[]' || expr.Operator === 'new') {
      return 17;
    }
  } else if (expr.Tag === 'Ternary') {
    return 2;
  } else if (expr.Tag === 'Symbol' || expr.Tag === 'Literal' || expr.Tag === 'Grouping') {
    return 18;
  } else if (expr.Tag === 'Object' || expr.Tag === 'Array' /*|| expr.Tag === 'List'*/) {
    return 18;
  } else if (expr.Tag === 'Pair') {
    return 2;  // this is really the comma operator inside object constructors
  } else if (expr.Tag === 'New' || expr.Tag === 'Apply') {
    return 17;
  }
  throw new InternalError(`not yet implemented: precedence of ${to_s(expr)}`);
}
