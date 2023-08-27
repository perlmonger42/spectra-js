#!/usr/bin/env bash
# See: `/Users/thom/Google-Drive/src/Go/spectra/04\ -\ go-tdop/go-tdop/watch.sh`

#SRC=test/resources/test-01.sjs
#SRC=test/sjs-parser-spec.mjs
#SRC=src/sjs-to-js.mjs
#SRC=src/sjs-lexer.mjs
#SRC=test/sjs-lexer-spec.mjs
#SRC=src/emit-js.mjs
SRC=test/sjs-parser-spec.mjs
SRC=src/sjs-parser.mjs
export WATCH_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo "Watching $WATCH_PATH"
LATEST=$WATCH_PATH/.watch-timestamp
while true; do
  sleep .25
  #echo === Scanning... ===
  if [[  ( ! -f $LATEST ) || -n "$(find src test -name '*.*js' -newer $LATEST -print | head -n 1)" ]]; then
    clear
    npm test && node cmd/run-tests.mjs && node cmd/sjs-to-js.mjs --verbose src/*.mjs cmd/*.mjs
    touch $LATEST
  fi
done

