import { globSync } from 'glob';
import { spawn } from 'child_process';
import { describe } from '../src/sjs-parser.mjs';
import * as fs from 'fs';

const TestDirectory = "./test/resources";
const TestFiles = TestDirectory + "/*.{sjs,mjs,js}";
const IgnoreFiles = {
        ignore: {
          ignored: (p) => /\.compiled.mjs$/.test(p.name)
        }
      };

//function read_directory(input_file_name) {
//  fs.readdir(directoryPath, (err, files) => {
//    if (err) {
//      console.error('Error reading directory:', err);
//      return;
//    }
//    console.log('Contents of the directory:');
//    files.forEach(file => {
//      console.log(file);
//    });
//  });
//}

function read_filenames_using_glob() {
  // glob docs: https://www.npmjs.com/package/glob
  //try {
    const files = globSync(TestFiles, IgnoreFiles);
    //console.log('Matching files:');
    //for (let file of files) {
    //  console.log(`${file} (${typeof file})`);
    //};
    return files;
  //} catch (err) {
  //  console.error(`Error reading test filenames:`, err);
  //  throw err;
  //}
}

function slurp(filename) {
  return fs.readFileSync(filename, 'utf8');
}

function run_program(program, argv) {
  const child = spawn(program, argv);

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (data) => {
    //console.log(`stdout|> ${data}`);
    stdout += data;
  });

  child.stderr.on('data', (data) => {
    //console.error(`stderr|> ${data}`);
    stderr += data;
  });

  return new Promise((resolve, reject) => {
    child.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`'${program} ${argv}' failed with exit code ${code}`));
      } else {
        resolve({status: code, stdout, stderr});
      }
    });
  });
}

async function run_test(script_filename) {
  console.log(script_filename);
  let extension = new RegExp('[.][^.]*$|$');
  let output_filename = script_filename.replace(extension, '.compiled.mjs');

  // compile
  let result = await run_program('node', ['cmd/prism.mjs', script_filename]);
  if (result.status !== 0) {
    console.error(`  Failed to compile ${script_filename}`);
    return false;
  }
  //console.log(`Result of compiling ${script_filename}: ${describe(result, 2000)}`);

  // run
  result = await run_program('node', [output_filename]);
  if (result.status !== 0) {
    console.error(`  Failed to run ${output_filename}`);
    return false;
  }
  if (result.stderr !== '') {
    console.error(`  Unexpected text on stdout:\n ${result.stderr.replace(/^/gm, '    ')}`);
    return false;
  }
  //console.log(`Result of running ${output_filename}: ${describe(result, 2000)}`);

  let source = await slurp(script_filename);
  //console.log(`source:\n${source}`);
  let m = source.match(/^\s*\/\/\s*OUTPUT:\s*$.(?<output>.*)/ms);
  if (!m) {
    console.error(`  Could not find \`// OUTPUT: ...\` in ${script_filename}`);
    return false;
  }
  //console.log(`Expected output:\n${m.groups.output}`);

  // Trim leading and trailing whitespace from `expected` (including leading `//`)
  let expected = m.groups.output.replace(/^\s*\/\/\s*|\s+$/gm, '');
  //console.log(`Expected output (cleaned):\n${expected}`);

  // Trim leading and trailing whitespace from `received`
  let received = result.stdout.replace(/^\s+|\s+$/gm, '');

  if (received !== expected) {
    expected = expected.replace(/^/gm, '    ');
    received = received.replace(/^/gm, '    ');
    console.error(`  Test failed.\n  Expected:\n${expected}\n  Received:\n${received}`);
    return false;
  }

  return true;
}

// When run as
//     node THIS_SCRIPT ARG1 ARG2
// we get
//     process.argv[0] == 'node'
//     process.argv[1] == 'THIS_SCRIPT'
//     process.argv[2] == 'ARG1'
//     process.argv[3] == 'ARG2'
async function main() {
  const filenames = read_filenames_using_glob();
  let ok = true;
  filenames.sort();
  for (let filename of filenames) {
    if (!await run_test(filename)) {
      ok = false;
    }
  }
  return ok ? 0 : 1;
}

let status = await main();
process.exit(status);
