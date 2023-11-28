local common = import 'common.libsonnet';
local job = common.job;
local step = common.step;

{
  test: job.new() + job.withSteps([
    common.fetchLokiRepo,
    common.setupGo,
    step.new('test') +
    step.withRun(common.makeTarget('test')),
  ]),

  lint: job.new() + job.withSteps([
    common.fetchLokiRepo,
    common.setupGo,
    step.new('install golangci-lint', 'giantswarm/install-binary-action@v1') +
    step.with({
      binary: 'golangci-lint',
      version: '1.55.1',
      download_url: 'https://github.com/golangci/golangci-lint/releases/download/v1.55.1/golangci-lint-1.55.1-linux-amd64.tar.gz',
      tarball_binary_path: '*/${binary}',
      smoke_test: '${binary} version',
    }),
    step.new('lint') +
    step.withRun(common.makeTarget('lint')),
    step.new('lint jsonnet') +
    step.withRun(common.makeTarget('lint-jsonnet')),
  ]),

  check: job.new() + job.withSteps([
    common.fetchLokiRepo,
    common.setupGo,
    step.new('install buf') +
    step.withRun('go install github.com/bufbuild/buf/cmd/buf@v1.4.0'),
    step.new('check generated files') +
    step.withRun(common.makeTarget('check-generated-files')),
    step.new('check mod') +
    step.withRun(common.makeTarget('check-mod')),
    step.new('shellcheck') +
    step.withRun(common.makeTarget('lint-scripts')),
    step.new('check docs') +
    step.withRun(common.makeTarget('check-doc')),
    step.new('validate example configs') +
    step.withRun(common.makeTarget('check-example-config-doc')),
    step.new('check helm reference doc') +
    step.withRun(common.makeTarget('documentation-helm-reference-check')),
  ]),
}
