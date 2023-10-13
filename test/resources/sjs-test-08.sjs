module test08;
let LanguageVersion = '0.0.1';  // SimpleJS

// test if, else if

// fill array with a[i] = f(i)
function test_if(a) {
  if (a < 10) {
    console.log(`${a} < 10`);
  } else {
    console.log(`10 <= ${a}`);
  }
}

function test_elsif(a, b) {
  if (a < b) {
    console.log(`${a} < ${b}`);
  } else if (a === b) {
    console.log(`${a} === ${b}`);
  } else if (a > b) {
    console.log(`${a} > ${b}`);
  } else {
    console.log(`${a} ? ${b}`);
  }
}

function main() {
  test_if(7);
  test_if(18);
  test_elsif(1, 2);
  test_elsif(3, 3);
  test_elsif(5, 4);
  test_elsif(6, 7/0);
  test_elsif(Math.sqrt(-1), 8);
}

main();
// OUTPUT:
// 7 < 10
// 10 <= 18
// 1 < 2
// 3 === 3
// 5 > 4
// 6 < Infinity
// NaN ? 8
