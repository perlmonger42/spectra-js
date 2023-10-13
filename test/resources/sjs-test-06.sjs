module test04;
let LanguageVersion = '0.0.1';  // SimpleJS

// test functions, compound assignment, `while`, and `for x of collection`

// compute the nth Fibonacci number
function fibonacci(n) {
  let [a, b] = [0, 1];
  while (n > 0) {
    [a, b] = [b, a + b];
    n--;
  }
  return a;
}

function main() {
  // gather the first 12 Fibonacci numbers
  let fib = [];
  let i = 0;
  while (i < 12) {
    fib.push(fibonacci(i));
    i++;
  }

  // print the Fibonacci numbers we gathered
  for (let f of fib) {
    console.log(f);
  }
}

main();
// OUTPUT:
// 0
// 1
// 1
// 2
// 3
// 5
// 8
// 13
// 21
// 34
// 55
// 89
