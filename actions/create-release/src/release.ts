import { createGitHubInstance, createGitHubReleaser } from './github'
import { Version } from 'release-please/build/src/version'

import { PullRequest } from 'release-please/build/src/pull-request'
import { GitHubActionsLogger, logger } from './util'
import {
  DEFAULT_LABELS,
  DEFAULT_RELEASE_LABELS,
  RELEASE_CONFIG_PATH
} from './constants'
import { Logger } from 'release-please/build/src/util/logger'
import { CandidateRelease } from 'release-please/build/src/manifest'
import { buildStrategy } from 'release-please/build/src/factory'
import { GitHub, GitHubRelease } from 'release-please/build/src/github'
import { DuplicateReleaseError } from 'release-please/build/src/errors'

type ReleaseVersion = string
type ReleaseSha = string

export interface BranchReleaseConfig {
  strategy: string
  currentVersion: string
  releases: Record<ReleaseVersion, ReleaseSha>
}

export type ReleaseConfig = Record<string, BranchReleaseConfig>

async function getBranchReleaseConfig(
  gh: GitHub,
  baseBranch: string,
  releaseBranch: string
): Promise<BranchReleaseConfig> {
  const releaseConfig = await gh.getFileJson<ReleaseConfig>(
    RELEASE_CONFIG_PATH,
    baseBranch
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
  const gitHubReleaser = createGitHubReleaser(gh, log)

  log.info(
    `preparing release pr for sha ${shaToRelease} from ${releaseBranch} into ${baseBranch}`
  )
  const releaseCfg = await getBranchReleaseConfig(gh, baseBranch, releaseBranch)
  const currentVersion = Version.parse(releaseCfg.currentVersion)

  log.debug(`building candidate PR`)
  const pr = await gitHubReleaser.buildCandidatePR(
    baseBranch,
    releaseBranch,
    currentVersion,
    releaseCfg.strategy,
    shaToRelease
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

export async function createReleases(
  baseBranch: string,
  log: Logger = new GitHubActionsLogger()
): Promise<CreatedRelease[]> {
  const gh = await createGitHubInstance(baseBranch)
  const gitHubReleaser = createGitHubReleaser(gh, log)
  const mergedReleasePRs =
    await gitHubReleaser.findMergedReleasePullRequests(baseBranch)

  const candidateReleases: CandidateRelease[] = []
  for (const pullRequest of mergedReleasePRs) {
    const releaseConfig = await getBranchReleaseConfig(
      gh,
      pullRequest.baseBranchName,
      pullRequest.headBranchName
    )

    const strategy = await buildStrategy({
      github: gh,
      targetBranch: pullRequest.baseBranchName,
      releaseType: 'simple',
      versioning: releaseConfig.strategy
    })

    const releases = await strategy.buildReleases(pullRequest, {
      groupPullRequestTitlePattern: 'chore: release ${branch}'
    })

    for (const release of releases) {
      candidateReleases.push({
        ...release,
        path: '.',
        pullRequest,
        draft: false,
        prerelease: false
      })
    }
  }

  const pullRequestsByNumber: Record<number, PullRequest> = {}
  const releasesByPullRequest: Record<number, CandidateRelease[]> = {}
  for (const release of candidateReleases) {
    pullRequestsByNumber[release.pullRequest.number] = release.pullRequest
    if (releasesByPullRequest[release.pullRequest.number]) {
      releasesByPullRequest[release.pullRequest.number].push(release)
    } else {
      releasesByPullRequest[release.pullRequest.number] = [release]
    }
  }

  const promises: Promise<CreatedRelease[]>[] = []
  for (const pullNumber in releasesByPullRequest) {
    promises.push(
      createReleasesForPullRequest(
        gh,
        releasesByPullRequest[pullNumber],
        pullRequestsByNumber[pullNumber]
      )
    )
  }
  const releases = await Promise.all(promises)
  return releases.reduce((collection, r) => collection.concat(r), [])
}

async function createReleasesForPullRequest(
  gh: GitHub,
  releases: CandidateRelease[],
  pullRequest: PullRequest
): Promise<CreatedRelease[]> {
  const log = logger()
  log.info(
    `Creating ${releases.length} releases for pull #${pullRequest.number}`
  )
  const duplicateReleases: DuplicateReleaseError[] = []
  const githubReleases: CreatedRelease[] = []
  for (const release of releases) {
    try {
      githubReleases.push(await createRelease(gh, release))
    } catch (err) {
      if (err instanceof DuplicateReleaseError) {
        log.warn(`Duplicate release tag: ${release.tag.toString()}`)
        duplicateReleases.push(err)
      } else {
        throw err
      }
    }
  }

  if (duplicateReleases.length > 0) {
    if (duplicateReleases.length + githubReleases.length === releases.length) {
      // we've either tagged all releases or they were duplicates:
      // adjust tags on pullRequest
      await gh.removeIssueLabels(DEFAULT_LABELS, pullRequest.number)
      await gh.addIssueLabels(DEFAULT_RELEASE_LABELS, pullRequest.number)
    }
    if (githubReleases.length === 0) {
      // If all releases were duplicate, throw a duplicate error
      throw duplicateReleases[0]
    }
  } else {
    // adjust tags on pullRequest
    await gh.removeIssueLabels(DEFAULT_LABELS, pullRequest.number)
    await gh.addIssueLabels(DEFAULT_RELEASE_LABELS, pullRequest.number)
  }

  return githubReleases
}

async function createRelease(
  gh: GitHub,
  release: CandidateRelease
): Promise<CreatedRelease> {
  const githubRelease = await gh.createRelease(release, {
    draft: release.draft,
    prerelease: release.prerelease
  })

  // comment on pull request
  const comment = `:robot: Release is at ${githubRelease.url} :sunflower:`
  await gh.commentOnIssue(comment, release.pullRequest.number)

  return {
    ...githubRelease,
    path: release.path,
    version: release.tag.version.toString(),
    major: release.tag.version.major,
    minor: release.tag.version.minor,
    patch: release.tag.version.patch
  }
}

interface CreatedRelease extends GitHubRelease {
  id: number
  path: string
  version: string
  major: number
  minor: number
  patch: number
}
