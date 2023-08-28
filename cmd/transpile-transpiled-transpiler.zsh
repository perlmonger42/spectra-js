#!/usr/bin/env zsh

TMPDIR=$(mktemp -d /tmp/prism.XXXXXX)
#trap 'rm -rf $TMPDIR' EXIT

rm -f ./**/*.compiled.*
tree --gitignore .

# compile all sjs source code into sp1 code in $TMPDIR/sp1
echo "===== Transpiling sjs to tmp/sp1 ====="
for SUBDIR in cmd src 'test' 'test/resources'; do
  mkdir -p $TMPDIR/sp1/$SUBDIR
  node cmd/prism.mjs --verbose --target-language=sp1 --out-dir=$TMPDIR/sp1/$SUBDIR ./$SUBDIR/*.[ms]js
done
tree --gitignore $TMPDIR/sp1


# compile most sp1 source code (but not test/resources) into js code in $TMPDIR/js
echo "===== Transpiling sp1 to tmp/js directory ====="
for SUBDIR in cmd src 'test'; do
  mkdir -p $TMPDIR/js/$SUBDIR
  node cmd/prism.mjs --verbose --target-language=sp1 --out-dir=$TMPDIR/js/$SUBDIR $TMPDIR/sp1/$SUBDIR/*.sp1
done
mkdir -p $TMPDIR/js/test/resources
cp "$TMPDIR/sp1/test/resources/*.sp1" "$TMPDIR/js/test/resources"
tree --gitignore $TMPDIR/js

# copy additional resources into $TMPDIR/js
cp package.json .gitignore $TMPDIR/js

# test the transpiled version of the transpiler
cd $TMPDIR/js
npm install
echo "===== Testing transpiled transpiler ====="
npm test && node cmd/run-tests.mjs && node cmd/prism.mjs --verbose src/*.mjs cmd/*.mjs

tree --gitignore $TMPDIR
