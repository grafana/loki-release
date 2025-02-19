#!/bin/sh
set -e

# This script is used to install the dependencies for the workflows.
# It is intended to be run in a containerized environment, specifically in a
# "golang" container.
# It houses all of the dependencies for the workflows, as well as the dependencies
# needed for the make release-workflows target.

# Set default source directory if not provided
SRC_DIR=${SRC_DIR:-/src/enterprise-logs}

# Update package lists
apt-get update -qq

# Install tar and xz-utils
apt-get install -qy tar xz-utils

# Install docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce-cli docker-buildx-plugin

# Install jsonnet
apt-get install -qq -y jsonnet

# Install jsonnet-bundler
go install github.com/jsonnet-bundler/jsonnet-bundler/cmd/jb@latest

# Update jsonnet bundles
cd ${SRC_DIR}/.github && jb update -q
