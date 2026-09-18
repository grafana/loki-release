#!/bin/sh
set -eu

curl -fsSL -o /tmp/go-jsonnet.tar.gz \
  https://github.com/google/go-jsonnet/releases/download/v0.22.0/go-jsonnet_0.22.0_linux_amd64.tar.gz
echo "e87a93ea44e34da92c15636205c7f2240bf3ac92d00ccb855dbb4e7e03ea6941  /tmp/go-jsonnet.tar.gz" | sha256sum --check
tar xzf /tmp/go-jsonnet.tar.gz -C /usr/local/bin jsonnet jsonnetfmt
rm /tmp/go-jsonnet.tar.gz
