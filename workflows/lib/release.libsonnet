local common = import 'common.libsonnet';
local job = common.job;
local step = common.step;
local lokiStep = common.lokiStep;
local releaseStep = common.releaseStep;

{
  createReleasePR:
    job.new()
    + job.withSteps([
      common.fetchLokiRepo,
      common.fetchReleaseRepo,
      // common.setupGo,
      // common.setupNode,

      //TODO: needs to be configurabe at workflow level
      step.new('extract branch name')
      + step.withId('extract_branch')
      + step.withRun(|||
        if [[ "${{ inputs.release_repo }}" == "grafana/loki" ]]; then
          cd loki
        else
          cd release
        fi

        echo "branch=${GITHUB_HEAD_REF:-${GITHUB_REF#refs/heads/}}" >> $GITHUB_OUTPUT
      |||),

      step.new('create release PR', './release/actions/create-release')
      + step.withId('release-pr')
      + step.with({
        command: 'pr',
        baseBranch: 'main',
        releaseBranch: '${{ steps.extract_branch.outputs.branch }}',
      })
      + step.withEnv({
        ACTIONS_STEP_DEBUG: 'true',
      }),
    ]),

  prepareReleases:
    job.new()
    + job.withSteps([
      common.fetchLokiRepo,
      common.fetchReleaseRepo,
      common.googleAuth,

      step.new('Set up Cloud SDK', 'google-github-actions/setup-gcloud@v1')
      + step.with({
        version: '>= 452.0.0',
      })
      + step.withEnv({
        ACTIONS_STEP_DEBUG: 'true',
      }),

      step.new('prepare release', './release/actions/create-release')
      + step.withId('prepare')
      + step.with({
        command: 'prepare-release',
        baseBranch: 'main',
      })
      + step.withEnv({
        ACTIONS_STEP_DEBUG: 'true',
      }),
    ])
    + job.withOutputs({
      releases: '${{steps.prepare.outputs.releases}}',
    }),

  release:
    job.new()
    + job.withNeeds(['prepareReleases'])
    + job.withStrategy({
      'fail-fast': true,
      matrix: {
        release: '${{fromJson(needs.prepareReleases.outputs.releases)}}',
      },
    })
    + job.withSteps([
      releaseStep('download build artifacts')
      + step.withRun(|||
        mkdir -p dist/${{ matrix.release.sha }}}
        gsutil cp gs://loki-build-artifacts/${{ matrix.release.sha }}/dist.tar.gz .
        tar -xzf dist.tar.gz dist/${{ matrix.release.sha }}
      |||),

      step.new('create release', 'softprops/action-gh-release@v1')
      + step.with({
        name: '${{ matrix.release.name }}',
        tag_name: '${{ matrix.release.name }}',
        body: '${{ matrix.release.notes }}',
        target_commitish: '${{ matrix.release.sha }}',
        files: 'dist/${{ matrix.release.sha }}/*',
      }),
    ]),
}
