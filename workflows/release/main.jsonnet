local common = import '../lib/common.libsonnet';
local job = common.job;
local step = common.step;
local alwaysGreen = common.alwaysGreen;

local release = import '../lib/release.libsonnet';

std.manifestYamlDoc({
  name: 'create release',
  on: {
    workflow_call: {
      inputs: {
        release_repo: {
          description: 'repo to make release in',
          default: 'grafana/loki',
          required: false,
          type: 'string',
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
    group: 'create-release-${{ github.sha }}',
  },
  jobs: {
    release: job.new() + release.release,
  },
}, false, false)
