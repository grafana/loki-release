import {
  createGitHubInstance,
  createGitHubReleaser,
  createOctokitInstance
} from './github'
import { Version } from 'release-please/build/src/version'

import { PullRequest } from 'release-please/build/src/pull-request'
import { GitHubActionsLogger, logger, suppressErrors } from './util'
import { RELEASE_CONFIG_PATH } from './constants'
import { Logger } from 'release-please/build/src/util/logger'
import { Base64 } from 'js-base64'
import { DefaultBranchName } from './pull-request'
import { PullRequestBody } from 'release-please/build/src/util/pull-request-body'
import { GitHub } from 'release-please/build/src/github'

type ReleaseVersion = string
type ReleaseSha = string

export interface BranchReleaseConfig {
  strategy: string
  initialVersion: string
  currentVersion: string
  releases: Record<ReleaseVersion, ReleaseSha>
}

export type ReleaseConfig = Record<string, BranchReleaseConfig>

async function getBranchReleaseConfig(
  gh: GitHub,
  releaseBranch: string
): Promise<BranchReleaseConfig> {
  const releaseConfig = await gh.getFileJson<ReleaseConfig>(
    RELEASE_CONFIG_PATH,
    releaseBranch
  )

  const branchConfig = releaseConfig[releaseBranch]
  if (!branchConfig) {
    throw new Error(
      `release.json does not contain a config for branch ${releaseBranch}`
    )
  }
  return branchConfig
}

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
  log: Logger = new GitHubActionsLogger()
): Promise<PullRequest | undefined> {
  const gh = await createGitHubInstance(baseBranch)
  const octokit = createOctokitInstance(baseBranch)
  const gitHubReleaser = createGitHubReleaser(gh, octokit, log)

  log.info(
    `preparing release pr for sha ${shaToRelease} from ${releaseBranch} into ${baseBranch}`
  )
  const releaseCfg = await getBranchReleaseConfig(gh, releaseBranch)

  const currentVersion =
    releaseCfg.currentVersion != null
      ? Version.parse(releaseCfg.currentVersion)
      : Version.parse(releaseCfg.initialVersion)

  log.debug(`building candidate PR`)
  const pr = await gitHubReleaser.buildCandidatePR(
    baseBranch,
    releaseBranch,
    currentVersion,
    releaseCfg.strategy,
    shaToRelease,
    releaseCfg.currentVersion !== null // don't bump the version if on the initial version
  )

  if (pr === undefined) {
    log.debug('unable to build candidate PR, exiting early')
    return pr
  }

  log.debug(`build candidate PR: ${JSON.stringify(pr)}`)

  // If there are merged pull requests that have yet to be released, then don't create any new PRs
  log.debug(`checking for merged release PRs`)
  const mergedPullRequests =
    await gitHubReleaser.findMergedReleasePullRequests(baseBranch)

  if (mergedPullRequests.length > 0) {
    log.warn('There are untagged, merged release PRs outstanding - aborting')
    for (const mergedPR of mergedPullRequests) {
      log.debug(
        `found untagged, merged release PR [${mergedPR.number}] ${mergedPR.title}`
      )
    }
    return undefined
  }

  // collect open release pull requests
  log.debug(`checking for open release PRs`)
  const openPullRequests =
    await gitHubReleaser.findOpenReleasePullRequests(baseBranch)

  const resultPullRequest = await gitHubReleaser.createOrUpdatePullRequest(
    pr,
    openPullRequests,
    baseBranch
  )

  return resultPullRequest
}

export async function prepareRelease(
  baseBranch: string,
  log: Logger = new GitHubActionsLogger()
): Promise<ReleaseMeta | undefined> {
  const gh = await createGitHubInstance(baseBranch)
  const octokit = createOctokitInstance(baseBranch)
  const gitHubReleaser = createGitHubReleaser(gh, octokit, log)
  const mergedReleasePRs =
    await gitHubReleaser.findMergedReleasePullRequests(baseBranch)

  const candidateReleases: ReleaseMeta[] = []
  for (const pullRequest of mergedReleasePRs) {
    //TODO: should be able to get sha to release from pullRequest.sha
    if (!pullRequest.files.includes(RELEASE_CONFIG_PATH) || !pullRequest.sha) {
      //not a PR we can make a release from
      continue
    }

    const { owner, repo } = gh.repository
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: RELEASE_CONFIG_PATH,
      ref: pullRequest.sha
    })

    if (Array.isArray(data) || data?.type !== 'file') {
      continue
    }

    const releaseConfig = JSON.parse(
      Base64.decode(data.content)
    ) as ReleaseConfig
    log.info(`releaseConfig: ${releaseConfig}`)

    const branchName = new DefaultBranchName(pullRequest.headBranchName)
    const version = branchName.getVersion()
    if (version === undefined) {
      continue
    }

    const releaseBranch = branchName.getReleaseBranch()
    if (releaseBranch === undefined) {
      continue
    }

    const branchConfig = releaseConfig[releaseBranch]
    const shaToRelease = branchConfig.releases[version.toString()]

    const release = await prepareSingleRelease(pullRequest, version)
    log.info(`release: ${release}`)

    if (release !== undefined) {
      release.sha = shaToRelease

      candidateReleases.push({
        ...release
      })
    }
  }

  if (candidateReleases.length === 0) {
    return undefined
  }

  if (candidateReleases.length > 1) {
    log.warn(
      'More than one release candidate found, only releasing the first one. Rerun job to release the next.'
    )
  }

  return candidateReleases[0]
}

type ReleaseMeta = {
  name: string
  notes: string
  sha?: string | undefined
}

async function prepareSingleRelease(
  mergedPullRequest: PullRequest,
  version: Version
): Promise<ReleaseMeta | undefined> {
  const log = logger()
  if (!mergedPullRequest.sha) {
    log.error('Pull request should have been merged')
    return
  }

  const pullRequestBody = PullRequestBody.parse(
    mergedPullRequest.body,
    suppressErrors(log)
  )
  if (!pullRequestBody) {
    log.error('Could not parse pull request body as a release PR')
    return
  }

  const releaseData = pullRequestBody.releaseData[0]

  const notes = releaseData?.notes
  if (notes === undefined) {
    log.warn('Failed to find release notes')
  }

  return {
    name: `v${version.toString()}`,
    notes: notes || ''
  }
}
