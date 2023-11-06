#!/usr/bin/env zsh
set -e  # exit on any error

TMPDIR=$(mktemp -d /tmp/prism.XXXXXX)
if [ "$1" = --keep ]; then
  shift
  echo "Keeping directory $TMPDIR"
else
  trap 'rm -rf $TMPDIR' EXIT
fi

# compile all {src,test}/*.sp1 source code into $TMPDIR/{src,test}/*.mjs
echo "===== Testing ./prism ====="
echo "Converting Spectra (./{src,test}/*.sp1)"
echo "to JavaScript ($TMPDIR/{src,test})"
for SUBDIR in 'src' 'test'; do
  mkdir -p $TMPDIR/$SUBDIR
  for FILE in $SUBDIR/*.sp1; do
    ./prism --out-dir=$TMPDIR/$SUBDIR $FILE
  done
done

# copy npm setup into $TMPDIR (so `npm test` will work)
cp -R package.json node_modules .gitignore $TMPDIR

# copy all test/resources/* into $TMPDIR/test/resources
mkdir -p $TMPDIR/test/resources
cp test/resources/*.{sjs,sp1} $TMPDIR/test/resources

cd $TMPDIR
echo "===== unit tests of transpiled lexer and parser ====="
#npm install
npm run test-brief  # this tests modules src/sjs-{lexer,parser}.mjs
#echo "===== building transpiled transpiler ====="
#cmd/make-prism.zsh --output ./prism_0 ./src/{sjs-lexer,sjs-parser,emit-js,prism}.mjs
echo "===== integration tests of transpiled transpiler ====="
node src/run-tests.mjs  # this tests program `src/prism.mjs` on test/resources/*

#echo "===== final content of $TMPDIR ====="
#tree --gitignore $TMPDIR
