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
        echo "npm exec -- release-please release-pr --token=\"${{ secrets.GH_TOKEN }}\" --repo-url=\"${{ inputs.release_repo }}\" --label \"backport ${{ steps.extract_branch.outputs.branch}}\""
        npm exec -- release-please release-pr --token="${{ secrets.GH_TOKEN }}" --repo-url="${{ inputs.release_repo }}" --label "backport ${{ steps.extract_branch.outputs.branch }}"
      |||),
    ]),

  //TODO: part of new workflow triggered by an issue comment
  // how does it find merged PRs to release?
  // it looks for Merged PRs with the `autorelease:pending` label
  release: job.new()
           + job.withSteps([
             common.fetchLokiRepo,
             common.fetchReleaseRepo,
             common.setupNode,
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
             releaseStep('download build artifacts')
             + step.withRun(|||
               gsutil cp -r gs://loki-build-artifacts/${{ github.sha }}/dist .
               ls dist
             |||),

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

             releaseStep('create release')
             + step.withRun(|||
               npm install
               npm exec -- release-please github-release \
                --token="${{ secrets.GH_TOKEN }}" \
                --repo-url="${{ inputs.release_repo }}" \
                --target-branch="${{ steps.extract_branch.outputs.branch }}" \
                --dry-run
             |||),

             //TODO: add artifacts to release PR, which we need to get via the event
             // gh release upload ${{ steps.release.outputs.tag_name }} ./dist/build.txt


             // lokiStep('create release branch from k release')
             // + step.withIf("${{ startsWith(steps.extract_branch.outputs.branch, 'k') && steps.release.outputs.release_created }}")
             // + step.withId('update_release_config')
             // + step.withRun(|||
             //   branch=release-${{ steps.release.outputs.major }}.${{ steps.release.outputs.minor }}.x
             //   git checkout -b $branch
             //   mv release-please-config.json tmp.json
             //   jq '.versioning = "always-bump-patch"' tmp.json > release-please-config.json
             //   rm tmp.json
             // |||),

             // step.new('commit changes to release branch', 'stefanzweifel/git-auto-commit-action@v5')
             // + step.withIf("${{ steps.update_release_config.outcome == 'success' }}")
             // + step.withId('create_release_branch')
             // + step.with({
             //   commit_message: 'chore: release branch bumps patch on release',
             //   branch: 'release-${{ steps.release.outputs.major }}.${{ steps.release.outputs.minor }}.x',
             //   file_pattern: 'loki/release-please-config.json',
             //   create_branch: true,
             // }),

             // releaseStep('comment on PR with release branch')
             // + step.withIf("${{ steps.create_release_branch.outcome == 'success' }}")
             // + step.withId('created_branch_message')
             // + step.withEnv({
             //   BRANCH: 'release-${{ steps.release.outputs.major }}.${{ steps.release.outputs.minor }}.x',
             // })
             // + step.withRun(|||
             //   prNumber=$(echo ${{ steps.release.outputs.pr }} | jq -r .number)
             //   gh pr comment $prNumber --body "created release branch [$BRANCH](https://github.com/grafana/loki-release/tree/$BRANCH)"
             // |||),
           ]),
}
