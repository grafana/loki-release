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
        image_prefix: {
          description: 'prefix for images',
          default: 'grafana',
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

    //always build this image, as we have fake for it in the release repo
    'loki-image': build.image('loki', 'cmd/loki', condition='true') + job.withNeeds(validationSteps),

    fluentd: build.image('fluentd', 'clients/cmd/fluentd', platform=['linux/amd64']) + job.withNeeds(validationSteps),
    'fluent-bit': build.image('fluent-bit', 'clients/cmd/fluent-bit', platform=['linux/amd64']) + job.withNeeds(validationSteps),
    logstash: build.image('logstash', 'clients/cmd/logstash', platform=['linux/amd64']) + job.withNeeds(validationSteps),
    logcli: build.image('logcli', 'cmd/logcli') + job.withNeeds(validationSteps),
    'loki-canary': build.image('loki-canary', 'cmd/loki-canary') + job.withNeeds(validationSteps),
    'loki-canary-boringcrypto': build.image('loki-canary-boringcrypto', 'cmd/loki-canary-boringcrypto') + job.withNeeds(validationSteps),
    'loki-operator': build.image('loki-operator', 'operator', context='release/operator', platform=['linux/amd64']) + job.withNeeds(validationSteps),
    promtail: build.image('promtail', 'clients/cmd/promtail') + job.withNeeds(validationSteps),
    querytee: build.image('querytee', 'cmd/querytee', platform=['linux/amd64']) + job.withNeeds(validationSteps),

    local buildSteps = [
      'dist',
      'fluentd',
      'fluent-bit',
      'logstash',
      'logcli',
      'loki-canary',
      'loki-canary-boringcrypto',
      'loki-image',
      'loki-operator',
      'promtail',
      'querytee',
    ],
    'create-release-pr': release.createReleasePR + job.withNeeds(buildSteps),
  },
}, false, false)
