import { GitHub, GitHubTag, OctokitAPIs } from 'release-please/build/src/github'
import { TagName } from 'release-please/build/src/util/tag-name'

import {
  parseConventionalCommits,
  Commit,
  ConventionalCommit
} from 'release-please/build/src/commit'
import { debug, getInput } from '@actions/core'
import { Logger } from 'release-please/build/src/util/logger'
import { Version } from 'release-please/build/src/version'
import {
  FilePullRequestOverflowHandler,
  PullRequestOverflowHandler
} from 'release-please/build/src/util/pull-request-overflow-handler'
import { PullRequest } from 'release-please/build/src/pull-request'
import { DEFAULT_LABELS, DEFAULT_RELEASE_LABELS } from './constants'

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

//TODO: test me
export async function findOpenReleasePullRequests(
  gh: GitHub,
  targetBranch: string,
  pullRequestOverflowHandler: PullRequestOverflowHandler,
  logger: Logger
): Promise<PullRequest[]> {
  logger.info('Looking for open release pull requests')
  const openPullRequests: PullRequest[] = []
  const generator = gh.pullRequestIterator(
    targetBranch,
    'OPEN',
    Number.MAX_SAFE_INTEGER,
    false
  )

  for await (const openPullRequest of generator) {
    if (hasAllLabels(DEFAULT_LABELS, openPullRequest.labels)) {
      const body =
        await pullRequestOverflowHandler.parseOverflow(openPullRequest)
      if (body) {
        // maybe replace with overflow body
        openPullRequests.push({
          ...openPullRequest,
          body: body.toString()
        })
      }
    }
  }

  logger.info(`found ${openPullRequests.length} open release pull requests.`)
  return openPullRequests
}

//TODO: copied from release-please, needs tests
export async function findMergedReleasePullRequests(
  gh: GitHub,
  targetBranch: string,
  pullRequestOverflowHandler: PullRequestOverflowHandler,
  logger: Logger
): Promise<PullRequest[]> {
  // Find merged release pull requests
  const mergedPullRequests: PullRequest[] = []
  const pullRequestGenerator = gh.pullRequestIterator(
    targetBranch,
    'MERGED',
    200,
    false
  )
  for await (const pullRequest of pullRequestGenerator) {
    if (!hasAllLabels(DEFAULT_RELEASE_LABELS, pullRequest.labels)) {
      continue
    }
    debug(`Found pull request #${pullRequest.number}: '${pullRequest.title}'`)
    // if the pull request body overflows, handle it
    const pullRequestBody =
      await pullRequestOverflowHandler.parseOverflow(pullRequest)
    if (!pullRequestBody) {
      logger.debug('could not parse pull request body as a release PR')
      continue
    }
    // replace with the complete fetched body
    mergedPullRequests.push({
      ...pullRequest,
      body: pullRequestBody.toString()
    })
  }

  logger.info(
    `found ${mergedPullRequests.length} merged release pull requests.`
  )
  return mergedPullRequests
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

export function createPullRequestOverflowHandler(
  gh: GitHub,
  logger: Logger
): PullRequestOverflowHandler {
  return new FilePullRequestOverflowHandler(gh, logger)
}
