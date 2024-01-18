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

      step.new('extract branch name')
      + step.withId('extract_branch')
      + step.withRun(|||
        if [[ "${{ inputs.release_repo }}" == "grafana/loki" ]]; then
          cd loki
          echo "branch=${GITHUB_HEAD_REF:-${GITHUB_REF#refs/heads/}}" >> $GITHUB_OUTPUT
        else
          cd release
          echo "branch=${GITHUB_HEAD_REF:-${GITHUB_REF#refs/heads/}}" >> $GITHUB_OUTPUT
        fi
      |||),

      step.new('create release pr', 'google-github-actions/release-please-action@v4')
      + step.with({
        'target-branch': '${{ steps.extract_branch.outputs.branch }}',
        'repo-url': '${{ inputs.release_repo }}',
      }),
    ]),

  release: job.new()
           + job.withSteps([
             common.googleAuth,

             step.new('Set up Cloud SDK', 'google-github-actions/setup-gcloud@v1')
             + step.with({
               version: '>= 452.0.0',
             })
             + step.withEnv({
               ACTIONS_STEP_DEBUG: 'true',
             }),

             step.new('create release', 'google-github-actions/release-please-action@v4')
             + step.withId('create_release'),

             step.new('download build artifacts')
             + step.withIf('${{ steps.create_release.outputs.release_created }}')
             + step.withRun(|||
               gsutil cp -r gs://loki-build-artifacts/${{ steps.create_release.outputs.sha }}/dist .
               echo 'root'
               ls
               echo 'dist'
               ls dist
             |||),

             step.new('upload artifacts', 'softprops/action-gh-release@v1')
             + step.withIf('${{ steps.create_release.outputs.release_created }}')
             + step.with({
               target_commitish: '${{ steps.create_release.outputs.sha }}',
               files: 'dist/*',
             }),
           ]),
}
