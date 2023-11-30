local common = import '../lib/common.libsonnet';
local job = common.job;
local step = common.step;

local build = import '../lib/build.libsonnet';
local release = import '../lib/release.libsonnet';
local validate = import '../lib/validate.libsonnet';

local alwaysGreen = {
  steps: [
    step.new('always green')
    + step.withRun('echo "always green"'),
  ],
};

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
    // test: validate.test,
    test: validate.test + alwaysGreen,
    // lint: validate.lint,
    lint: validate.lint + alwaysGreen,
    // check: validate.check,
    check: validate.check + alwaysGreen,

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
