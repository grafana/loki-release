import {
  createGitHubInstance,
  createPullRequestOverflowHandler,
  findMergedReleasePullRequests,
  findOpenReleasePullRequests
} from './github'
import { Version } from 'release-please/build/src/version'
import { ReleasePullRequest } from 'release-please/build/src/release-pull-request'
import { GitHub } from 'release-please/build/src/github'

import { PullRequest } from 'release-please/build/src/pull-request'
import { GitHubActionsLogger } from './util'
import { PullRequestOverflowHandler } from 'release-please/build/src/util/pull-request-overflow-handler'
import { RELEASE_CONFIG_PATH } from './constants'
import { buildCandidatePR } from './pull-request'
import { info } from '@actions/core'

type ReleaseVersion = string
type ReleaseSha = string

export interface BranchReleaseConfig {
  strategy: string
  currentVersion: string
  releases: Record<ReleaseVersion, ReleaseSha>
}

export type ReleaseConfig = Record<string, BranchReleaseConfig>

/**
 * createReleasePR creates a release PR from the releaseBranch into the baseBranch
 * @param {string} baseBranch The branch to merge the release PR into
 * @param {string} releaseBranch The branch to create the release PR from
 * @returns {Promise<ReleasePullRequest | undefined>} Resolves to a PullRequestRequest when there are commit to build a release from, otherwise undefined
 */
export async function createReleasePR(
  baseBranch: string,
  releaseBranch: string,
  shaToRelease: string
): Promise<PullRequest | undefined> {
  const logger = new GitHubActionsLogger()
  const gh = await createGitHubInstance(baseBranch)
  const prOverflowHandler = createPullRequestOverflowHandler(gh, logger)

  const releaseConfig = await gh.getFileJson<ReleaseConfig>(
    RELEASE_CONFIG_PATH,
    baseBranch
  )

  logger.info(
    `preparing release pr for sha ${shaToRelease} from ${releaseBranch} into ${baseBranch}`
  )
  const branchConfig = releaseConfig[releaseBranch]
  if (!branchConfig) {
    throw new Error(
      `release.json does not contain a config for branch ${releaseBranch}`
    )
  }

  const currentVersion = Version.parse(branchConfig.currentVersion)

  logger.debug(`building candidate PR`)
  const pr = await buildCandidatePR(
    gh,
    baseBranch,
    releaseBranch,
    currentVersion,
    branchConfig.strategy,
    shaToRelease,
    logger
  )

  if (pr === undefined) {
    return pr
  }

  logger.debug(`build candidate PR: ${JSON.stringify(pr)}`)

  // If there are merged pull requests that have yet to be released, then don't create any new PRs
  logger.debug(`checking for merged release PRs`)
  const mergedPullRequests = await findMergedReleasePullRequests(
    gh,
    baseBranch,
    prOverflowHandler,
    logger
  )

  if (mergedPullRequests.length > 0) {
    logger.warn('There are untagged, merged release PRs outstanding - aborting')
    return undefined
  }

  // collect open release pull requests
  logger.debug(`checking for open release PRs`)
  const openPullRequests = await findOpenReleasePullRequests(
    gh,
    baseBranch,
    prOverflowHandler,
    logger
  )

  const resultPullRequest = await createOrUpdatePullRequest(
    gh,
    pr,
    openPullRequests,
    baseBranch,
    prOverflowHandler
  )

  return resultPullRequest
}

async function createOrUpdatePullRequest(
  gh: GitHub,
  pullRequest: ReleasePullRequest,
  openPullRequests: PullRequest[],
  targetBranch: string,
  pullRequestOverflowHandler: PullRequestOverflowHandler
): Promise<PullRequest | undefined> {
  // look for existing, open pull request
  const existing = openPullRequests.find(
    openPullRequest =>
      openPullRequest.headBranchName === pullRequest.headRefName
  )
  if (existing) {
    return await maybeUpdateExistingPullRequest(
      gh,
      existing,
      pullRequest,
      targetBranch,
      pullRequestOverflowHandler
    )
  }

  const body = await pullRequestOverflowHandler.handleOverflow(pullRequest)

  //TODO: will we need to signoff commit messages?
  const message = pullRequest.title.toString()

  const newPullRequest = await gh.createPullRequest(
    {
      body,
      title: pullRequest.title.toString(),
      headBranchName: pullRequest.headRefName,
      baseBranchName: targetBranch,
      labels: pullRequest.labels,
      number: -1,
      files: []
    },
    targetBranch,
    message,
    pullRequest.updates,
    {
      fork: false,
      draft: false
    }
  )

  return newPullRequest
}

// only update an existing pull request if it has release note changes
async function maybeUpdateExistingPullRequest(
  gh: GitHub,
  existing: PullRequest,
  pullRequest: ReleasePullRequest,
  targetBranch: string,
  pullRequestOverflowHandler: PullRequestOverflowHandler
): Promise<PullRequest | undefined> {
  const { owner, repo } = gh.repository
  // If unchanged, no need to push updates
  if (existing.body === pullRequest.body.toString()) {
    info(
      `PR https://github.com/${owner}/${repo}/pull/${existing.number} remained the same`
    )
    return undefined
  }
  const updatedPullRequest = await gh.updatePullRequest(
    existing.number,
    pullRequest,
    targetBranch,
    {
      fork: false,
      pullRequestOverflowHandler
    }
  )
  return updatedPullRequest
}
