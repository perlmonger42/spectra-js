#!/usr/bin/env zsh

TMPDIR=$(mktemp -d /tmp/prism.XXXXXX)
trap 'rm -rf $TMPDIR' EXIT

# compile all source code into $TMPDIR
echo "===== Transpiling to tmp directory ====="
for SUBDIR in cmd src 'test'; do
  mkdir -p $TMPDIR/$SUBDIR
  node cmd/prism.mjs --verbose --out-dir=$TMPDIR/$SUBDIR $SUBDIR/*.[ms]js
done

# copy additional resources into $TMPDIR
mkdir -p $TMPDIR/test/resources
cp test/resources/*.sjs $TMPDIR/test/resources
cp package.json .gitignore $TMPDIR
cd $TMPDIR
npm install

# test the transpiled version of the transpiler
echo "===== Testing transpiled transpiler ====="
npm test && node cmd/run-tests.mjs && node cmd/prism.mjs --verbose src/*.mjs cmd/*.mjs

tree --gitignore $TMPDIR
