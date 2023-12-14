import { GitHub, GitHubTag } from 'release-please/build/src/github'
import { TagName } from 'release-please/build/src/util/tag-name'

import {
  parseConventionalCommits,
  Commit,
  ConventionalCommit
} from 'release-please/build/src/commit'

export const GITHUB_API_URL = 'https://api.github.com'
export const GITHUB_GRAPHQL_URL = 'https://api.github.com'

export async function findCommitsSinceLastRelease(
  github: GitHub,
  releaseBranch: string,
  lastRelease: TagName,
  commitSearchDepth = 500
): Promise<ConventionalCommit[]> {
  const commitGenerator = github.mergeCommitIterator(releaseBranch, {
    maxResults: commitSearchDepth,
    backfillFiles: true
  })

  const allTags = await getAllTags(github)

  const foundTag = allTags[lastRelease.toString()]
  if (!foundTag) {
    return []
  }

  const commits: Commit[] = []
  await (async function () {
    for await (const commit of commitGenerator) {
      commits.push(commit)
    }
  })()

  const commitsSinceLastRelease = commitsAfterSha(commits, foundTag.sha)

  return parseConventionalCommits(commitsSinceLastRelease)
}

async function getAllTags(github: GitHub): Promise<Record<string, GitHubTag>> {
  const allTags: Record<string, GitHubTag> = {}
  for await (const tag of github.tagIterator()) {
    allTags[tag.name] = tag
  }
  return allTags
}

function commitsAfterSha(commits: Commit[], lastReleaseSha: string) {
  if (!commits) {
    return []
  }
  const index = commits.findIndex(commit => commit.sha === lastReleaseSha)
  if (index === -1) {
    return commits
  }
  return commits.slice(0, index)
}
