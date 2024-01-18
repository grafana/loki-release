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
      common.setupGo,
      common.setupNode,

      //TODO: needs to be configurabe at workflow level
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

      releaseStep('release please')
      + step.withId('release')
      + step.withRun(|||
        echo "manifest file: ${manifest_file}"
        echo "current dir: $(pwd)"

        npm install
        npm exec -- release-please release-pr --token="${{ secrets.GH_TOKEN }}" --repo-url="${{ inputs.release_repo }}" --target-branch "${{ steps.extract_branch.outputs.branch }}"
      |||),
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

             // exits with code 1 if the url does not match
             // meaning there are no artifacts for that sha
             // we need to handle this if we're going to run this pipeline on every merge to main
             step.new('download build artifacts')
             + step.withRun(|||
               gsutil cp -r gs://loki-build-artifacts/${{ github.sha }}/dist .
               ls dist
             |||),

             step.new('create release', 'google-github-actions/release-please-action@v4')
             + step.withId('create_release'),

             step.new('upload artifacts', 'softprops/action-gh-release@v1')
             + step.withIf('${{ steps.create_release.outputs.release_created }}')
             + step.with({
               target_commitish: '${{ fromJson(steps.create_release.outputs.pr).sha }}',
               files: 'dist/*',
             }),
           ]),
}
