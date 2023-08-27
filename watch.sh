#!/usr/bin/env bash
# See: `/Users/thom/Google-Drive/src/Go/spectra/04\ -\ go-tdop/go-tdop/watch.sh`

export WATCH_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo "Watching $WATCH_PATH/**/*.mjs"
LATEST=$WATCH_PATH/.watch-timestamp
while true; do
  sleep .25
  #echo === Scanning... ===
  if [[  ( ! -f $LATEST ) || -n "$(find . -name '*.mjs' -newer $LATEST -print | head -n 1)" ]]; then
    clear
    npm test
    touch $LATEST
  fi
done

