#!/usr/bin/env zsh

TMPDIR=$(mktemp -d /tmp/prism.XXXXXX)
#trap 'rm -rf $TMPDIR' EXIT

rm -f ./**/*.compiled.*
tree --gitignore .


### use original transpiler to transpile original sjs => spectra => sjs

# compile all original sjs source code into in tmp/1_sp/**/*.sp1
echo "===== Use original transpiler to transpile original/**/*.mjs into tmp/1_sp/**/*.sp1 ====="
for SUBDIR in 'cmd' 'src' 'test' 'test/resources'; do
  mkdir -p $TMPDIR/1_sp/$SUBDIR
  node cmd/prism.mjs --verbose --output-language=sp1 --out-dir=$TMPDIR/1_sp/$SUBDIR ./$SUBDIR/*.[ms]js
done
tree --gitignore $TMPDIR/1_sp

# compile all spectra source code in tmp/1_sp into js code in tmp/2_js
echo "===== Use original transpiler to transpile tmp/1_sp/**/*.sp1 into tmp/2_js/**/*.mjs ====="
for SUBDIR in 'cmd' 'src' 'test' 'test/resources'; do
  mkdir -p $TMPDIR/2_js/$SUBDIR
  node cmd/prism.mjs --verbose --output-language=js --out-dir=$TMPDIR/2_js/$SUBDIR $TMPDIR/1_sp/$SUBDIR/*.sp1
done
# copy additional resources into $TMPDIR/2_js
cp package.json .gitignore $TMPDIR/2_js
tree --gitignore $TMPDIR/2_js


### test transpiled transpiler
cd $TMPDIR/2_js
npm install
echo "===== Testing transpiled transpiler in tmp/2_js ====="
npm test && node cmd/run-tests.mjs && node cmd/prism.mjs --verbose src/*.mjs cmd/*.mjs


### use tmp/2_js transpiler to transpile tmp/2_js sjs => spectra => sjs

# compile all tmp/2_js source code into tmp/3_sp/**/*.sp1
echo "===== Use tmp/2_js transpiler to transpile tmp/2_js/**/*.mjs into tmp/3_sp/**/*.sp1 ====="
for SUBDIR in 'cmd' 'src' 'test' 'test/resources'; do
  mkdir -p $TMPDIR/3_sp/$SUBDIR
  node cmd/prism.mjs --verbose --output-language=sp1 --out-dir=$TMPDIR/3_sp/$SUBDIR ./$SUBDIR/*.[ms]js
done
tree --gitignore $TMPDIR/3_sp

# compile all spectra source code in tmp/3_sp into js code in tmp/4_js
echo "===== Use tmp/2_js transpiler to transpile /tmp/3_js/**/*.sp1 into tmp/4_js/**/*.mjs ====="
for SUBDIR in 'cmd' 'src' 'test' 'test/resources'; do
  mkdir -p $TMPDIR/4_js/$SUBDIR
  node cmd/prism.mjs --verbose --output-language=js --out-dir=$TMPDIR/4_js/$SUBDIR $TMPDIR/3_sp/$SUBDIR/*.sp1
done
# copy additional resources into $TMPDIR/4_js
cp package.json .gitignore $TMPDIR/4_js
tree --gitignore $TMPDIR/4_js


# test the doubly-transpiled version of the transpiler
echo "===== Testing transpiled transpiler ====="
cd $TMPDIR/4_js
npm install
npm test && node cmd/run-tests.mjs && node cmd/prism.mjs --verbose src/*.mjs cmd/*.mjs

tree --gitignore $TMPDIR
