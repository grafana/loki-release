local common = import 'common.libsonnet';
local job = common.job;
local step = common.step;

{
  release:
    job.new()
    + job.withSteps([
      common.fetchLokiRepo {
        with+: {
          path: 'loki',
        },
      },
      common.fetchReleaseRepo {
        with+: {
          path: 'release',
        },
      },
      common.setupGo,
      common.setupNode,

      step.new('extract branch name')
      + step.withId('extract_branch')
      + step.withWorkingDirectory('loki')
      + step.withRun(|||
        echo "branch=${GITHUB_HEAD_REF:-${GITHUB_REF#refs/heads/}}" >> $GITHUB_OUTPUT
      |||),

      step.new('release please')
      + step.withId('release')
      + step.withWorkingDirectory('release')
      + step.withRun(|||
        npm install
        npm exec -- release-please release-pr --token="${{ secrets.GITHUB_TOKEN }}" --repo-url="grafana/loki-release" --label "backport ${{ steps.extract_branch.outputs.branch}}" --manifest-file release/release-please-config.json
      |||),

      step.new('download dist', 'actions/download-artifact@v3')
      + step.withIf('${{ steps.release.outputs.release_created }}')
      + step.with({
        name: 'dist',
        path: 'release/dist/',
      }),
      //TODO: download images

      step.new('upload release artifacts')
      + step.withIf('${{ steps.release.outputs.release_created }}')
      + step.withEnv({
        GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}',
      })
      + step.withWorkingDirectory('release')
      + step.withRun(|||
        gh release upload ${{ steps.release.outputs.tag_name }} ./dist/build.txt
      |||),

      step.new('create release branch from k release')
      + step.withIf("${{ startsWith(steps.extract_branch.outputs.branch, 'k') && steps.release.outputs.release_created }}")
      + step.withId('update_release_config')
      + step.withWorkingDirectory('release')
      + step.withRun(|||
        branch=release-${{ steps.release.outputs.major }}.${{ steps.release.outputs.minor }}.x
        git checkout -b $branch
        mv release-please-config.json tmp.json
        jq '.versioning = "always-bump-patch"' tmp.json > release-please-config.json
        rm tmp.json
      |||),

      step.new('commit changes to release branch', 'stefanzweifel/git-auto-commit-action@v5')
      + step.withIf("${{ steps.update_release_config.outcome == 'success' }}")
      + step.withId('create_release_branch')
      + step.with({
        commit_message: 'chore: release branch bumps patch on release',
        branch: 'release-${{ steps.release.outputs.major }}.${{ steps.release.outputs.minor }}.x',
        file_pattern: 'release/release-please-config.json',
        create_branch: true,
      }),

      step.new('comment on PR with release branch')
      + step.withIf("${{ steps.create_release_branch.outcome == 'success' }}")
      + step.withId('created_branch_message')
      + step.withEnv({
        BRANCH: 'release-${{ steps.release.outputs.major }}.${{ steps.release.outputs.minor }}.x',
      })
      + step.withWorkingDirectory('release')
      + step.withRun(|||
        prNumber=$(echo ${{ steps.release.outputs.pr }} | jq -r .number)
        gh pr comment $prNumber --body "created release branch [$BRANCH](https://github.com/grafana/loki-release/tree/$BRANCH)"
      |||),
    ]),
}
