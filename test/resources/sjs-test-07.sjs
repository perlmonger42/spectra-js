module test07;
let LanguageVersion = '0.0.1';  // SimpleJS

// test lambdas and array indexing

// fill array with a[i] = f(i)
function fill_array(a, f) {
  let n = 0;
  while (n < a.length) {
    a[n] = f(n);
    n++;
  }
  return a;
}

function main() {
  // gather the first 8 squares
  let a = fill_array(new Array(8), (i) => i*i);
  let i = 0;
  while (i < 8) {
    console.log(a[i]);
    i++;
  }
  console.log(new Array);
}

main();
// OUTPUT:
// 0
// 1
// 4
// 9
// 16
// 25
// 36
// 49
// []
