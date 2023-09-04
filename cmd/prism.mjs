import { NewLexer  } from "../src/sjs-lexer.mjs";
import { NewParser, Parse } from "../src/sjs-parser.mjs";
import { Generate  } from "../src/emit-js.mjs";
import * as fs from 'fs';

let Verbose = false;
let OutputLanguage = 'js';
let InputLanguage = 'sjs';

function transpile_from_string(input_filename, input_text, writer) {
//console.log("Parsing...");
  let unit = Parse(NewParser(InputLanguage, NewLexer(InputLanguage, input_text)));
  if (unit.Tag == 'Just') { //console.log("Generating...");
    Generate(OutputLanguage, input_filename, unit.Just, writer);
  } else {
    console.error("Failed");
  }
}

function generate_output_filename(input_filename, output_dirname) {
  let extensionMatcher = new RegExp('[.][^.]*$|$');
  let outputExtension = OutputLanguage === 'js' ? '.mjs' : '.sp1';

  if (output_dirname === '') {
    // output name is input name with extension changed to `.compiled.{mjs,js}`
    return input_filename.replace(extensionMatcher, `.compiled${outputExtension}`);
  }

  // output name is `${output_dirname}/${input_leafname}` with extension changed to `.{mjs,js}`
  let leafname = input_filename.match(/(?<=[/]|^)(?<leaf>[^/]*)$/).groups.leaf;
  leafname = leafname.replace(extensionMatcher, outputExtension);
  return `${output_dirname}/${leafname}`;
}

function transpile_filename(input_filename, output_dirname) {
  if (/[.][ms]?js$/.test(input_filename)) {
    InputLanguage = 'sjs';
  } else if (/[.]sp1$/.test(input_filename)) {
    InputLanguage = 'sp1';
  } else {
    usage_error(`filename extension unrecognized in '${input_filename}'`);
  }
  if (Verbose) {
    console.log(input_filename);
  }

  let file_content;
//console.log(`Reading ${input_filename}`);
  file_content = fs.readFileSync(input_filename, 'utf8');

  let js = '';
  let writer = (text) => { js += text; };
//console.log(`Transpiling ${input_filename}`);
  transpile_from_string(input_filename, file_content, writer);

  let extension = new RegExp('[.][^.]*$|$');
  let output_filename = generate_output_filename(input_filename, output_dirname);
//console.log(`Writing \`${output_filename}\``);
  fs.writeFileSync(output_filename, js, 'utf8');
}

function usage() {
  console.error(`usage: node prism [--out-dir=...] [--output-language=(js|sp1)] filename...`);
  console.error(`  output filename will be *.mjs or *.sp1, depending on --output-language`);
  console.error(`  if no --out-dir is given, output filename will be *.compiled.{mjs,sp1}`);
}

function usage_error(msg) {
  usage();
  throw new Error(msg);
}

// When run as
//     node cmd/prism.mjs INPUT.mjs
// we get
//     argv[0] == 'node'
//     argv[1] == 'cmd/prism.mjs'
//     argv[2] == 'INPUT.mjs'
function main() {
  let argv = Array.from(process.argv);
  if (argv.length> 0 && /\/node$/.test(argv[0])) {
    argv.shift();  // remove 'node' as program name (treat argv[1] as program name)
  }
  argv.shift(); // skip this script's filename

  let output_dirname = '';
  let file_count = 0;
  for (let arg of argv) {
    let m;
    if (m = arg.match(/^--out-dir=(?<dir>.*)$/)) {
      output_dirname = m.groups.dir;
    } else if (m = arg.match(/^--output-language=(?<lang>.*)$/)) {
      OutputLanguage = m.groups.lang;
      if (OutputLanguage !== 'js' && OutputLanguage !== 'sp1') {
        usage_error(`--output-language: language '${OutputLanguage}' is not supported`);
      }
    } else if (/^(-v|--verbose)$/.test(arg)) {
      Verbose = true;
    } else {
      file_count++;
      transpile_filename(arg, output_dirname);
    }
  }
  if (file_count == 0) {
    usage();
  }
}

main();
