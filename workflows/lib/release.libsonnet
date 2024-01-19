local common = import 'common.libsonnet';
local job = common.job;
local step = common.step;
local releaseStep = common.releaseStep;
local releaseLibStep = common.releaseLibStep;

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

             step.new('prepare release', './lib/actions/create-release')
             + step.withId('prepare')
             + step.with({
               baseBranch: '${{ steps.extract_branch.outputs.branch }}',
             }),

             // exits with code 1 if the url does not match
             // meaning there are no artifacts for that sha
             // we need to handle this if we're going to run this pipeline on every merge to main
             releaseStep('download build artifacts')
             + step.withIf('${{ fromJSON(steps.prepare.outputs.createRelease) }}')
             + step.withRun(|||
               gsutil cp -r gs://loki-build-artifacts/${{ steps.prepare.outputs.sha }}/dist .
               ls dist
             |||),

             releaseStep('release please')
             + step.withId('release')
             + step.withRun(|||
               npm install
               npm exec -- release-please github-release \
                 --token="${{ secrets.GH_TOKEN }}" \
                 --repo-url="${{ inputs.release_repo }}" \
                 --target-branch "${{ steps.extract_branch.outputs.branch }}"
             |||),

             releaseStep('upload artifacts')
             + step.withId('upload')
             + step.withEnv({
               GH_TOKEN: '${{ secrets.GH_TOKEN }}',
             })
             + step.withRun(|||
               gh release upload ${{ steps.release.outputs.name }} dist/*
             |||),

             // step.new('Import GPG Key', 'crazy-max/ghaction-import-gpg@v6')
             // + step.withIf('${{ fromJSON(steps.prepare.outputs.createRelease) }}')
             // + step.with({
             //   gpg_private_key: '${{ secrets.GPG_PRIVATE_KEY }}',
             //   passphrase: '${{ secrets.GPG_PASSPHRASE }}',
             //   git_user_signingkey: true,
             //   git_commit_gpgsign: true,
             //   git_tag_gpgsign: true,
             //   workdir: 'release',  //TODO: needs to be configurable (we should probably create release and libs directories)
             // }),

             // step.new('create tag')
             // + step.withIf('${{ fromJSON(steps.prepare.outputs.createRelease) }}')
             // + step.withRun(|||
             //   if [[ "${{ inputs.release_repo }}" == "grafana/loki" ]]; then
             //     cd loki
             //   else
             //     cd release
             //   fi

             //   RELEASE="${{ steps.prepare.outputs.name}}"
             //   git tag -s $RELEASE -m "tagging release $RELEASE"
             //   git push origin $RELEASE
             // |||),

             //TODO: do we need to refetch the repo to get the latest tag?

             // step.new('create release', 'softprops/action-gh-release@v1')
             // + step.withIf('${{ fromJSON(steps.prepare.outputs.createRelease) }}')
             // + step.with({
             //   token: '${{ secrets.GH_TOKEN }}',
             //   tag_name: '${{ fromJSON(steps.prepare.outputs.name) }}',
             //   body: '${{ steps.prepare.outputs.notes }}',
             //   // target_commitish: '${{ steps.prepare.outputs.sha }}',
             //   files: 'dist/*',
             //   repository: '${{ inputs.release_repo }}',
             //   fail_on_unmatched_files: true,
             // }),
           ]),
}
