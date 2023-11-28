local lib = import 'lib/lib.libsonnet';
local job = lib.job;
local build = lib.build;
local release = lib.release;

std.manifestYamlDoc({
  name: 'release',
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
    dist: build.dist + job.withNeeds(validationSteps),
    'loki-image': build.image('loki', 'cmd/loki')
                  + job.withNeeds(validationSteps),
    'promtail-image': build.image('promtail', 'clients/cmd/promtail')
                      + job.withNeeds(validationSteps),

    local buildSteps = ['dist', 'loki-image', 'promtail-image'],
    release: release.release + job.withNeeds(buildSteps),
  },
}, false, false)
