#!/usr/bin/env zsh
# usage:
#   make-prism OUTPUT-PRISM-FILENAME INPUT-MJS-FILE...

OUTPUT=./prism
INPUTS=()
while [ "$#" -gt 0 ]; do
  case $1 in
    -o|--output)
      if [ "$#" -lt 2 ]; then
        echo 1>&2 "$1 must be followed by an argument"
        exit 1
      fi
      shift; OUTPUT="$1";;
    -*) echo 1>&2 "unrecognized option: $1"; exit 1;;
    *) INPUTS+=($1);;
  esac
  shift
done

if [ "$#INPUTS" -lt 1 ]; then
  INPUTS=(src/*.mjs cmd/prism.mjs)
  #echo 1>&2 "there must be at least one input *.mjs file"
  #echo 1>&2 "usage: make-prism OUTPUT-PRISM-FILENAME INPUT-MJS-FILE..."
  #exit 1
fi

 echo "OUTPUT='$OUTPUT'"
 for x in $INPUTS[@]; do
     echo "package='$x'"
 done

echo "#!/usr/bin/env node" > $OUTPUT
for INPUT in $INPUTS[@]; do
  cmd/remove-ems.zsh < $INPUT >> $OUTPUT
done
chmod u+x $OUTPUT

###### PREVIOUS IMPLEMENTATION
### # cat <(echo "#!/usr/bin/env node")      \
### #     src/sjs-lexer.mjs                  \
### #     src/sjs-parser.mjs                 \
### #     src/emit-js.mjs                    \
### #     cmd/prism.mjs                      \
### # | perl -p -e 's/^import \s*[{].*//;'                                          \
### #           -e 's/^export\s+//;'                                                \
### #           -e 's/^import . as fs from (.fs.)/const fs = require($1)/'          \
### # > ./prism.mjs
### # chmod u+x ./prism.mjs
