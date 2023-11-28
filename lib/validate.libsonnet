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
    step.new('install golangci-lint') +
    step.withRun('curl -sfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s v1.55.1'),
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
