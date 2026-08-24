#!/bin/sh
set -e
awk '
  /^FROM[ \t]+/ && !found { image = $2; found = 1 }
  END {
    if (!found) {
      print "print-image.sh: no FROM line found in .github/build-image/Dockerfile" > "/dev/stderr"
      exit 1
    }
    print image
  }
' .github/build-image/Dockerfile
