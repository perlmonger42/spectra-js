#!/usr/bin/env bash

export WATCH_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo "Watching $WATCH_PATH"
LATEST=$WATCH_PATH/.watch-timestamp
trap "rm -f $LATEST" EXIT

RED=$'\033[1;31m'
GREEN=$'\033[1;32m'
RESET=$'\033[0m'
while true; do
  sleep .25
  #echo === Scanning... ===
  if [[  ( ! -f $LATEST ) || -n "$(find src cmd test -name '*.[sm]js' -newer $LATEST -print | head -n 1)" ]]; then
    clear
    cmd/transpile-transpiled-transpiler.zsh && echo "${GREEN}PASSED${RESET}" || echo "${RED}FAILED${RESET}"
    #echo '===== Running unit tests =====' && npm test && \
    #  echo '===== Running test scripts =====' && node cmd/run-tests.mjs && \
    #  echo '===== Compiling {src,cmd}/*.mjs =====' && node cmd/prism.mjs --verbose src/*.mjs cmd/*.mjs

    # we only compiled the sources to make sure they don't generate errors; don't keep the output
    find ./cmd ./src ./test -name '*.compiled.mjs' -delete
    touch $LATEST
    #./cmd/transpile-transpiled-transpiler.zsh
  fi
done

