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
        release_pr_workflow: {
          description: 'workflow file that created the release pr',
          default: 'release-pr.yml',
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
    group: 'create-release-${{ github.sha }}',
  },
  jobs: {
    release: release.release,
  },
}, false, false)
