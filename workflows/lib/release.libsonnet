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
      common.extractBranchName,

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

  release:
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
      releaseStep('download build artifacts')
      + step.withRun(|||
        gsutil cp gs://loki-build-artifacts/${{ steps.prepare.outputs.sha }}/dist.tar.gz .
        tar -xzf dist.tar.gz dist
      |||),
      step.new('create release', 'softprops/action-gh-release@v1')
      + step.with({
        name: '${{ steps.prepare.outputs.name }}',
        tag_name: '${{ steps.prepare.outputs.name }}',
        body: '${{ steps.prepare.outputs.notes }}',
        target_commitish: '${{ steps.prepare.outputs.sha }}',
        files: 'dist/*',
        fail_on_unmatched_files: true,
      }),
    ]),
}
