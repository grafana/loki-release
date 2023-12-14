import { findCommitsSinceLastRelease, createGitHubInstance } from './github'
import { Version } from 'release-please/build/src/version'
import { TagName } from 'release-please/build/src/util/tag-name'
import { PullRequestTitle } from 'release-please/build/src/util/pull-request-title'
import { BranchName } from 'release-please/build/src/util/branch-name'
import { DefaultChangelogNotes } from 'release-please/build/src/changelog-notes/default'
import { PullRequestBody } from 'release-please/build/src/util/pull-request-body'
import { ReleasePullRequest } from 'release-please/build/src/release-pull-request'
import { nextVersion } from './version'

// TODO: this just returns metadata about a PR
// it doesn't actually create/change any files yet
export async function createReleasePR(
  mainBranch: string,
  releaseBranch: string,
  current: Version,
  versioningStrategy: string
): Promise<ReleasePullRequest | undefined> {
  const gh = await createGitHubInstance(mainBranch)

  const commits = await findCommitsSinceLastRelease(gh, releaseBranch, current)

  if (!commits || commits.length === 0) {
    return undefined
  }

  const next = nextVersion(current, versioningStrategy, commits, gh)

  const pullRequestTitle = PullRequestTitle.ofVersion(next)
  const branchName = BranchName.ofVersion(next)

  const changelogNotes = new DefaultChangelogNotes()

  const { owner, repo } = gh.repository

  const currentVersionTag = new TagName(current)
  const nextVersionTag = new TagName(next)
  const releaseNotesBody = await changelogNotes.buildNotes(commits, {
    owner,
    repository: repo,
    version: next.toString(),
    previousTag: currentVersionTag.toString(),
    currentTag: nextVersionTag.toString(),
    targetBranch: mainBranch,
    commits
  })

  const pullRequestBody = new PullRequestBody([
    {
      version: next,
      notes: releaseNotesBody
    }
  ])

  return {
    title: pullRequestTitle,
    body: pullRequestBody,
    labels: [],
    headRefName: branchName.toString(),
    version: next,
    draft: false,
    updates: []
  }
}
