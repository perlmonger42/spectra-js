#!/usr/bin/env perl

# Remove EMS-style JavaScript code (imports and exports).
# Convert EMS-style import of 'fs' into Vanilla JS `require('fs')`.
while (<>) {
    s/^import \s*[{].*//;  # remove all import statements
    s/^export\s+//;        # remove all `export` modifiers

    # Convert EMS `import * as fs from 'fs';`
    # into JavaScript `const fs = require($1);`.
    s/^import [*] as fs from 'fs'/const fs = require('fs')/;

    print;
}
