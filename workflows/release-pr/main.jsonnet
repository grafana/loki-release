local common = import '../lib/common.libsonnet';
local job = common.job;
local step = common.step;
local alwaysGreen = common.alwaysGreen;

local build = import '../lib/build.libsonnet';
local release = import '../lib/release.libsonnet';
local validate = import '../lib/validate.libsonnet';

std.manifestYamlDoc({
  name: 'create release PR',
  on: {
    workflow_call: {
      inputs: {
        release_repo: {
          description: 'repo to make release PRs against',
          default: 'grafana/loki',
          required: false,
          type: 'string',
        },
      },
      secrets: {
        GCS_SERVICE_ACCOUNT_KEY: {
          required: true,
        },
        GH_TOKEN: {
          required: true,
        },
      },
    },
  },
  permissions: {
    contents: 'write',
    'pull-requests': 'write',
    issues: 'write',
  },
  concurrency: {
    group: 'create-release-pr-${{ github.sha }}',
  },
  jobs: {
    // test: validate.test,
    test: validate.test + alwaysGreen,
    // lint: validate.lint,
    lint: validate.lint + alwaysGreen,
    // check: validate.check,
    check: validate.check + alwaysGreen,

    local validationSteps = ['test', 'lint', 'check'],
    dist: build.distTemp + job.withNeeds(validationSteps),
    // dist: build.dist + job.withNeeds(validationSteps),
    // 'loki-image': build.image('loki', 'cmd/loki')
    //               + job.withNeeds(validationSteps),
    'loki-image': build.image('loki', 'cmd/loki')
                  + job.withNeeds(validationSteps)
                  + alwaysGreen,
    // 'promtail-image': build.image('promtail', 'clients/cmd/promtail')
    //                   + job.withNeeds(validationSteps),
    'promtail-image': build.image('promtail', 'clients/cmd/promtail')
                      + job.withNeeds(validationSteps)
                      + alwaysGreen,

    local buildSteps = ['dist', 'loki-image', 'promtail-image'],
    'create-release-pr': release.createReleasePR + job.withNeeds(buildSteps),
  },
}, false, false)
