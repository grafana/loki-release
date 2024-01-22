local common = import 'common.libsonnet';
local job = common.job;
local step = common.step;
local releaseStep = common.releaseStep;
local releaseLibStep = common.releaseLibStep;

// DO NOT MODIFY THIS FOOTER TEMPLATE
// This template is matched by the should-release action to detect the correct
// sha to release and pull aritfacts from. If you need to change this, make sure
// to change it in both places.
//TODO: make bucket configurable
local pullRequestFooter = 'Merging this PR will release the [artifacts](https://console.cloud.google.com/storage/browser/loki-build-artifacts/${SHA}) of ${SHA}';

{
  createReleasePR:
    job.new()
    + job.withSteps([
      common.fetchReleaseRepo,
      common.fetchReleaseLib,
      common.setupNode,

      releaseStep('extract branch name')
      + step.withId('extract_branch')
      + step.withRun(|||
        echo "branch=${GITHUB_HEAD_REF:-${GITHUB_REF#refs/heads/}}" >> $GITHUB_OUTPUT
      |||),

      releaseLibStep('release please')
      + step.withId('release')
      + step.withEnv({
        SHA: '${{ github.sha }}',
      })
      //TODO make bucket configurable
      + step.withRun(|||
        npm install
        npm exec -- release-please release-pr \
          --pull-request-footer "%s" \
          --release-type simple \
          --repo-url="${{ inputs.release_repo }}" \
          --target-branch "${{ steps.extract_branch.outputs.branch }}" \
          --token="${{ secrets.GH_TOKEN }}"
      ||| % pullRequestFooter),
    ]),

  release: job.new()
           + job.withSteps([
             common.fetchReleaseRepo,
             common.fetchReleaseLib,
             common.setupNode,
             common.googleAuth,

             step.new('Set up Cloud SDK', 'google-github-actions/setup-gcloud@v1')
             + step.with({
               version: '>= 452.0.0',
             }),

             releaseStep('extract branch name')
             + step.withId('extract_branch')
             + step.withRun(|||
               echo "branch=${GITHUB_HEAD_REF:-${GITHUB_REF#refs/heads/}}" >> $GITHUB_OUTPUT
             |||),

             step.new('should a release be created?', './lib/actions/should-release')
             + step.withId('should_release')
             + step.with({
               baseBranch: '${{ steps.extract_branch.outputs.branch }}',
             }),

             // exits with code 1 if the url does not match
             // meaning there are no artifacts for that sha
             // we need to handle this if we're going to run this pipeline on every merge to main
             releaseStep('download build artifacts')
             + step.withIf('${{ fromJSON(steps.should_release.outputs.shouldRelease) }}')
             + step.withRun(|||
               gsutil cp -r gs://loki-build-artifacts/${{ steps.should_release.outputs.sha }}/dist .
               ls dist
             |||),

             releaseStep('release please')
             + step.withIf('${{ fromJSON(steps.should_release.outputs.shouldRelease) }}')
             + step.withId('release')
             + step.withRun(|||
               npm install
               npm exec -- release-please github-release \
                 --draft \
                 --release-type simple \
                 --repo-url="${{ inputs.release_repo }}" \
                 --target-branch "${{ steps.extract_branch.outputs.branch }}" \
                 --token="${{ secrets.GH_TOKEN }}"
             |||),

             releaseStep('upload artifacts')
             + step.withIf('${{ fromJSON(steps.should_release.outputs.shouldRelease) }}')
             + step.withId('upload')
             + step.withEnv({
               GH_TOKEN: '${{ secrets.GH_TOKEN }}',
             })
             + step.withRun(|||
               gh release upload ${{ steps.should_release.outputs.name }} dist/*
               gh release edit ${{ steps.should_release.outputs.name }} --draft=false
             |||),
           ]),
}
