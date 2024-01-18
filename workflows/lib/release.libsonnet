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
      common.setupNode,

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
        npm install
        npm exec -- release-please release-pr \
          --token="${{ secrets.GH_TOKEN }}" \
          --repo-url="${{ inputs.release_repo }}" \
          --target-branch "${{ steps.extract_branch.outputs.branch }}"
      |||),
    ]),

  release: job.new()
           + job.withSteps([
             common.fetchLokiRepo,
             common.fetchReleaseRepo,
             common.googleAuth,

             step.new('Set up Cloud SDK', 'google-github-actions/setup-gcloud@v1')
             + step.with({
               version: '>= 452.0.0',
             }),

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

             step.new('prepare release', './release/actions/create-release')
             + step.withId('prepare')
             + step.with({
               baseBranch: '${{ steps.extract_branch.outputs.branch }}',
             }),

             // exits with code 1 if the url does not match
             // meaning there are no artifacts for that sha
             // we need to handle this if we're going to run this pipeline on every merge to main
             step.new('download build artifacts')
             + step.withIf('${{ fromJSON(steps.prepare.outputs.createRelease) }}')
             + step.withRun(|||
               gsutil cp -r gs://loki-build-artifacts/${{ steps.prepare.outputs.sha }}/dist .
               ls dist
             |||),

             step.new('setup git user', 'fregante/setup-git-user@v2')
             + step.withIf('${{ fromJSON(steps.prepare.outputs.createRelease) }}'),

             step.new('create tag')
             + step.withIf('${{ fromJSON(steps.prepare.outputs.createRelease) }}')
             + step.withRun(|||
               RELEASE="${{ steps.prepare.outputs.name}}"
               git tag -s $RELEASE -m "tagging release $RELEASE"
               git push origin $RELEASE
             |||),

             step.new('create release', 'softprops/action-gh-release@v1')
             + step.withIf('${{ fromJSON(steps.prepare.outputs.createRelease) }}')
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
