import { NewLexer  } from "../src/sjs-lexer.mjs";
import { NewParser, Parse } from "../src/sjs-parser.mjs";
import { Generate  } from "../src/emit-js.mjs";
import * as fs from 'fs';

function transpile_from_string(input_file_name, input_text, writer) {
  let parser = NewParser(NewLexer(input_text));
//console.log("Parsing...");
  let unit = Parse(NewParser(NewLexer(input_text)));
  if (unit.Tag == 'Just') { //console.log("Generating...");
    Generate(input_file_name, unit.Just, writer);
  } else {
    console.error("Failed");
  }
}

function transpile_from_filename(input_file_name) {
  let file_content;
//console.log(`Reading ${input_file_name}`);
  file_content = fs.readFileSync(input_file_name, 'utf8');

  let js = '';
  let writer = (text) => { js += text; };
//console.log(`Transpiling ${input_file_name}`);
  transpile_from_string(input_file_name, file_content, writer);

  let extension = new RegExp('[.][^.]*$|$');
  let output_file_name = input_file_name.replace(extension, '.compiled.mjs');
//console.log(`Writing \`${output_file_name}\``);
  fs.writeFileSync(output_file_name, js, 'utf8');
}

// When run as
//     node src/sjs-to-js.mjs INPUT.mjs
// we get
//     argv[0] == 'node'
//     argv[1] == 'src/sjs-to-js.mjs'
//     argv[2] == 'INPUT.mjs'
function main() {
  // console.log(`args: ${process.argv.length}`);
  // let i = 0;
  // for (var arg of process.argv) {
  //   console.log(`argv[${i}] = '${arg}'`);
  //   i++;
  // }
  if (process.argv.length != 3) {
    console.error(`usage: node sjs-to-js filename.sjs`);
  } else {
    //try {
      transpile_from_filename(process.argv[2]);
    //} catch (error) {
    //  console.error(`Error transpiling ${process.argv[2]}`);
    //  throw error;
    //}
  }
}

main();
