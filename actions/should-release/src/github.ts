import { GitHub, GitHubTag, OctokitAPIs } from 'release-please/build/src/github'

import { getInput, info, debug } from '@actions/core'
import { PullRequest } from 'release-please/build/src/pull-request'
import {
  DEFAULT_PENDING_LABELS,
  DEFAULT_TAGGED_LABELS,
  GITHUB_API_URL,
  GITHUB_GRAPHQL_URL
} from './constants'
import { Logger } from 'release-please'

export interface ProxyOption {
  host: string
  port: number
}

export interface GitHubCreateOptions {
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

export async function findMergedReleasePullRequests(
  baseBranch: string,
  github: GitHub
): Promise<PullRequest[]> {
  // Find merged release pull requests
  const mergedPullRequests: PullRequest[] = []
  const pullRequestGenerator = github.pullRequestIterator(
    baseBranch,
    'MERGED',
    200,
    true
  )
  for await (const pullRequest of pullRequestGenerator) {
    if (hasAllLabels(DEFAULT_TAGGED_LABELS, pullRequest.labels)) {
      continue
    }

    if (!hasAllLabels(DEFAULT_PENDING_LABELS, pullRequest.labels)) {
      continue
    }

    debug(
      `Found pending merged pull request #${pullRequest.number}: '${pullRequest.title}' with labels ${pullRequest.labels}`
    )

    mergedPullRequests.push({
      ...pullRequest
    })
  }

  info(`found ${mergedPullRequests.length} merged release pull requests.`)
  return mergedPullRequests
}

export async function getAllTags(
  github: GitHub,
  versionPattern = /^v\d+\.\d+\.\d+$/
): Promise<Record<string, GitHubTag>> {
  const tags: Record<string, GitHubTag> = {}
  for await (const tag of github.tagIterator()) {
    if (versionPattern.test(tag.name)) {
      tags[tag.name] = tag
    }
  }
  return tags
}

/**
 * Helper to compare if a list of labels fully contains another list of labels
 * @param {string[]} expected List of labels expected to be contained
 * @param {string[]} existing List of existing labels to consider
 */
function hasAllLabels(expected: string[], existing: string[]): boolean {
  const existingSet = new Set(existing)
  for (const label of expected) {
    if (!existingSet.has(label)) {
      return false
    }
  }
  return true
}

export async function createGitHubInstance(
  mainBranch: string
): Promise<GitHub> {
  const options = getGitHubOptions(mainBranch)
  return GitHub.create(options)
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
