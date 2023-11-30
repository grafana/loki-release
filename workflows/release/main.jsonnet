local common = import '../lib/common.libsonnet';
local job = common.job;
local step = common.step;
local alwaysGreen = common.alwaysGreen;

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
      },
    },
  },
  permissions: {
    contents: 'write',
    'pull-requests': 'write',
    issues: 'write',
  },
  jobs: {
    release: job.new() + alwaysGreen,
  },
}, false, false)
