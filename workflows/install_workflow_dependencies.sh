#!/bin/sh
set -e

# Set default source directory if not provided
SRC_DIR=${SRC_DIR:-/src/enterprise-logs}

# Update package lists
apt-get update -qq

# Install jsonnet
apt-get install -qq -y jsonnet

# Install jsonnet-bundler
go install github.com/jsonnet-bundler/jsonnet-bundler/cmd/jb@latest

# Update jsonnet bundles
cd ${SRC_DIR}/.github && jb update -q
