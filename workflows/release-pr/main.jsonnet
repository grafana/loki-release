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
        skip_validation: {
          description: 'skip validation steps',
          default: false,
          required: false,
          type: 'boolean',
        },
        versioning_strategy: {
          description: 'release please versioning strategy to use',
          default: 'always-bump-patch',
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
  },
  concurrency: {
    group: 'create-release-pr-${{ github.sha }}',
  },
  jobs: validate {
    local validationSteps = ['test', 'lint', 'check'],
    dist: build.dist + job.withNeeds(validationSteps),
    'loki-image': build.image('loki', 'cmd/loki')
                  + job.withNeeds(validationSteps),
    'promtail-image': build.image('promtail', 'clients/cmd/promtail')
                      + job.withNeeds(validationSteps),

    local buildSteps = ['dist', 'loki-image', 'promtail-image'],
    'create-release-pr': release.createReleasePR + job.withNeeds(buildSteps),
  },
}, false, false)
