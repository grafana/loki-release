local common = import 'common.libsonnet';
local job = common.job;
local step = common.step;

local installDependencies =
  step.new('install dependencies') +
  step.withRun(|||
    go install github.com/bufbuild/buf/cmd/buf@v1.4.0
    go install github.com/golang/protobuf/protoc-gen-go@v1.3.1
    go install github.com/gogo/protobuf/protoc-gen-gogoslick@v1.3.0
    go install github.com/fatih/faillint@v1.11.0
    go install golang.org/x/tools/cmd/goimports@v0.7.0
    go install github.com/jsonnet-bundler/jsonnet-bundler/cmd/jb@v0.4.0
    go install github.com/monitoring-mixins/mixtool/cmd/mixtool@bca3066
    go install github.com/google/go-jsonnet/cmd/jsonnet@v0.18.0

    sudo apt update
    sudo apt install -qy musl gnupg ragel \
      file zip unzip jq gettext \
      protobuf-compiler libprotobuf-dev \
      libsystemd-dev jq
  |||);

{
  test: job.new() + job.withSteps([
    common.fetchLokiRepo,
    common.setupGo,
    installDependencies,
    step.new('test')
    + step.withRun(common.makeTarget('test')),
  ]),

  lint: job.new() + job.withSteps([
    common.fetchLokiRepo,
    common.setupGo,
    installDependencies,
    step.new('install golangci-lint', 'giantswarm/install-binary-action@v1')
    + step.with({
      binary: 'golangci-lint',
      version: '1.55.1',
      download_url: 'https://github.com/golangci/golangci-lint/releases/download/v1.55.1/golangci-lint-1.55.1-linux-amd64.tar.gz',
      tarball_binary_path: '*/${binary}',
      smoke_test: '${binary} version',
    }),
    step.new('lint')
    + step.withRun(common.makeTarget('lint')),
    step.new('lint jsonnet')
    + step.withRun(common.makeTarget('lint-jsonnet')),
  ]),

  check: job.new() + job.withSteps([
    common.fetchLokiRepo,
    common.setupGo,
    installDependencies,
    step.new('check generated files')
    + step.withRun(common.makeTarget('check-generated-files')),
    step.new('check mod')
    + step.withRun(common.makeTarget('check-mod')),
    step.new('shellcheck')
    + step.withRun(common.makeTarget('lint-scripts')),
    step.new('check docs')
    + step.withRun(common.makeTarget('check-doc')),
    step.new('validate example configs')
    + step.withRun(common.makeTarget('check-example-config-doc')),
    step.new('check helm reference doc')
    + step.withRun(common.makeTarget('documentation-helm-reference-check')),
  ]),
}
