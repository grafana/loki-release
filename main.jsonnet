local lib = import 'lib/lib.libsonnet';
local job = lib.job;
local image = lib.image;

std.manifestYamlDoc({
  name: 'release (jsonnet version)',
  on: {
    workflow_dispatch: {},
    push: {
      branches: [
        'main',
        'release-[0-9].[0-9].x',
        'k[0-9]*',
      ],
    },
  },
  permissions: {
    contents: 'write',
    'pull-requests': 'write',
    issues: 'write',
  },
  jobs: {
    test: lib.validate.test,
    lint: lib.validate.lint,
    check: lib.validate.check,

    local validationSteps = ['test', 'lint', 'check'],
    'loki-image': image.buildImage('loki', 'cmd/loki') +
                  job.needs(validationSteps),
    'promtail-image': image.buildImage('promtail', 'clients/cmd/promtail') +
                      job.needs(validationSteps),
  },
})
