import { NewLexer  } from "../src/sjs-lexer.mjs";
import { NewParser, Parse } from "../src/sjs-parser.mjs";
import { Generate  } from "../src/emit-js.mjs";
import * as fs from 'fs';

let Verbose = false;

function transpile_from_string(input_filename, input_text, writer) {
  let parser = NewParser(NewLexer(input_text));
//console.log("Parsing...");
  let unit = Parse(NewParser(NewLexer(input_text)));
  if (unit.Tag == 'Just') { //console.log("Generating...");
    Generate(input_filename, unit.Just, writer);
  } else {
    console.error("Failed");
  }
}

function generate_output_filename(input_filename, output_dirname) {
  if (output_dirname === '') {
    // output name is input name with '.compiled.mjs' extension
    let extension = new RegExp('[.][^.]*$|$');
    return input_filename.replace(extension, '.compiled.mjs');
  }

  let leafname = input_filename.match(/(?<=[/]|^)(?<leaf>[^/]*)$/).groups.leaf;
  return `${output_dirname}/${leafname}`;
}

function transpile_filename(input_filename, output_dirname) {
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

// When run as
//     node cmd/sjs-to-js.mjs INPUT.mjs
// we get
//     argv[0] == 'node'
//     argv[1] == 'cmd/sjs-to-js.mjs'
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
    } else if (/^(-v|--verbose)$/.test(arg)) {
      Verbose = true;
    } else {
      file_count++;
      transpile_filename(arg, output_dirname);
    }
  }
  if (file_count == 0) {
    console.error(`usage: node sjs-to-js [--out-dir=...] filename...`);
  }
}

main();
