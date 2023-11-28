local common = import 'common.libsonnet';
local job = common.job;
local container = job.container;
local step = common.step;

{
  test: job.new() + job.withSteps([
    common.fetchLokiRepo,
    common.setupGo,
    step.new('test') +
    step.withRun(common.makeTarget('test')),
  ]) + job.withContainer(
    container.new('grafana/loki-build-image') +
    container.withVolumes([
      container.volume.new('.', '/src/loki'),
    ])
  ),

  lint: job.new() + job.withSteps([
    common.fetchLokiRepo,
    common.setupGo,
    step.new('lint') +
    step.withRun(common.makeTarget('lint')),
    step.new('lint jsonnet') +
    step.withRun(common.makeTarget('lint-jsonnet')),
  ]) + job.withContainer(
    container.new('grafana/loki-build-image') +
    container.withVolumes([
      container.volume.new('.', '/src/loki'),
    ])
  ),

  check: job.new() + job.withSteps([
    common.fetchLokiRepo,
    common.setupGo,
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
  ]) + job.withContainer(
    container.new('grafana/loki-build-image') +
    container.withVolumes([
      container.volume.new('.', '/src/loki'),
    ])
  ),
}
