module test04;
let LanguageVersion = '0.0.1';  // SimpleJS

let x = [7 < 8 ? "one" : "two", 7 > 8 ? "ONE" : "TWO" ];
console.log(x);

let y = 8 < 7 ? "three" : 1 < 0 ? "four" : "five";
console.log(y);

let z = 8 < 7 ? "six" : 1 < 2 ? "seven" : "eight";
console.log(z);

let w = (8 < 7 ? 1 < 0 : 0 < 1) ? "nine" : "ten";
console.log(w);

let v = 8 < 7 ? "eleven" : (0 < 1 ? "twelve" : "thirteen");
console.log(v);

// OUTPUT:
// [ 'one', 'TWO' ]
// five
// seven
// nine
// twelve
