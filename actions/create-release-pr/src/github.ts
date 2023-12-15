import { GitHub, GitHubTag, OctokitAPIs } from 'release-please/build/src/github'
import { TagName } from 'release-please/build/src/util/tag-name'

import {
  parseConventionalCommits,
  Commit,
  ConventionalCommit
} from 'release-please/build/src/commit'
import { getInput } from '@actions/core'
import { Logger } from 'release-please/build/src/util/logger'
import { Version } from 'release-please/build/src/version'

export const GITHUB_API_URL = 'https://api.github.com'
export const GITHUB_GRAPHQL_URL = 'https://api.github.com'

export async function createGitHubInstance(
  mainBranch: string
): Promise<GitHub> {
  const options = getGitHubOptions(mainBranch)
  return GitHub.create(options)
}

interface ProxyOption {
  host: string
  port: number
}

interface GitHubCreateOptions {
  owner: string
  repo: string
  defaultBranch?: string
  apiUrl?: string
  graphqlUrl?: string
  octokitAPIs?: OctokitAPIs
  token?: string
  logger?: Logger
  proxy?: ProxyOption
}

function getGitHubOptions(mainBranch: string): GitHubCreateOptions {
  const { token, apiUrl, graphqlUrl, repoUrl } = getGitHubInput()
  const [owner, repo] = repoUrl.split('/')

  return {
    apiUrl,
    defaultBranch: mainBranch,
    graphqlUrl,
    owner,
    repo,
    token
  }
}

function getGitHubInput(): {
  repoUrl: string
  apiUrl: string
  graphqlUrl: string
  token: string
} {
  return {
    repoUrl: getInput('repoUrl') || (process.env.GITHUB_REPOSITORY as string),
    apiUrl: GITHUB_API_URL,
    graphqlUrl: GITHUB_GRAPHQL_URL,
    token: getInput('token', { required: true })
  }
}

export async function findCommitsSinceLastRelease(
  github: GitHub,
  releaseBranch: string,
  currentRelease: Version,
  commitSearchDepth = 500
): Promise<ConventionalCommit[]> {
  const commitGenerator = github.mergeCommitIterator(releaseBranch, {
    maxResults: commitSearchDepth,
    backfillFiles: true
  })

  const allTags = await getAllTags(github)

  const currentVersionTag = new TagName(currentRelease)
  const foundTag = allTags[currentVersionTag.toString()]
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

function commitsAfterSha(commits: Commit[], lastReleaseSha: string): Commit[] {
  if (!commits) {
    return []
  }
  const index = commits.findIndex(commit => commit.sha === lastReleaseSha)
  if (index === -1) {
    return commits
  }
  return commits.slice(0, index)
}
