import { createGitHubInstance, createGitHubReleaser } from './github'
import { Version } from 'release-please/build/src/version'

import { PullRequest } from 'release-please/build/src/pull-request'
import { GitHubActionsLogger } from './util'
import { RELEASE_CONFIG_PATH } from './constants'
import { Logger } from 'release-please/build/src/util/logger'

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
  shaToRelease: string,
  logger: Logger = new GitHubActionsLogger()
): Promise<PullRequest | undefined> {
  const gh = await createGitHubInstance(baseBranch)
  const gitHubReleaser = createGitHubReleaser(gh, logger)

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
  const pr = await gitHubReleaser.buildCandidatePR(
    baseBranch,
    releaseBranch,
    currentVersion,
    branchConfig.strategy,
    shaToRelease
  )

  if (pr === undefined) {
    logger.debug('unable to build candidate PR, exiting early')
    return pr
  }

  logger.debug(`build candidate PR: ${JSON.stringify(pr)}`)

  // If there are merged pull requests that have yet to be released, then don't create any new PRs
  logger.debug(`checking for merged release PRs`)
  const mergedPullRequests =
    await gitHubReleaser.findMergedReleasePullRequests(baseBranch)

  if (mergedPullRequests.length > 0) {
    logger.warn('There are untagged, merged release PRs outstanding - aborting')
    return undefined
  }

  // collect open release pull requests
  logger.debug(`checking for open release PRs`)
  const openPullRequests =
    await gitHubReleaser.findOpenReleasePullRequests(baseBranch)

  const resultPullRequest = await gitHubReleaser.createOrUpdatePullRequest(
    pr,
    openPullRequests,
    baseBranch
  )

  return resultPullRequest
}
