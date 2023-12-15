import { findCommitsSinceLastRelease, createGitHubInstance } from './github'
import { Version, VersionsMap } from 'release-please/build/src/version'
import { TagName } from 'release-please/build/src/util/tag-name'
import { PullRequestTitle } from 'release-please/build/src/util/pull-request-title'
import { BranchName } from 'release-please/build/src/util/branch-name'
import { DefaultChangelogNotes } from 'release-please/build/src/changelog-notes/default'
import { PullRequestBody } from 'release-please/build/src/util/pull-request-body'
import { ReleasePullRequest } from 'release-please/build/src/release-pull-request'
import { Changelog } from 'release-please/build/src/updaters/changelog'
import { VersionUpdater, nextVersion } from './version'
import { GitHub } from 'release-please/build/src/github'

import { info, warning, debug } from '@actions/core'
import { PullRequest } from 'release-please/build/src/pull-request'
import { GitHubActionsLogger } from './util'
import {
  FilePullRequestOverflowHandler,
  PullRequestOverflowHandler
} from 'release-please/build/src/util/pull-request-overflow-handler'
import { Logger } from 'release-please/build/src/util/logger'
import { BuildUpdatesOptions } from 'release-please/build/src/strategies/base'
import { Update } from 'release-please/build/src/update'

export const DEFAULT_LABELS = ['autorelease: pending']
export const DEFAULT_RELEASE_LABELS = ['autorelease: tagged']
export const DEFAULT_CHANGELOG_PATH = 'CHANGELOG.md'
export const ROOT_PROJECT_PATH = '.'
export const RELEASE_CONFIG_PATH = 'release.json'

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

  const pullRequestOverflowHandler = new FilePullRequestOverflowHandler(
    gh,
    logger
  )

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

  const currentVersion = Version.parse(branchConfig.currentVersion)

  const pr = await buildReleasePR(
    gh,
    baseBranch,
    releaseBranch,
    currentVersion,
    branchConfig.strategy,
    shaToRelease
  )

  if (pr === undefined) {
    return pr
  }

  // If there are merged pull requests that have yet to be released, then don't create any new PRs
  const mergedPullRequestsGenerator = findMergedReleasePullRequests(
    gh,
    baseBranch,
    pullRequestOverflowHandler,
    logger
  )

  for await (const _ of mergedPullRequestsGenerator) {
    warning('There are untagged, merged release PRs outstanding - aborting')
    return undefined
  }

  // collect open and snoozed release pull requests
  const openPullRequests = await findOpenReleasePullRequests(
    gh,
    baseBranch,
    pullRequestOverflowHandler,
    logger
  )

  const resultPullRequest = await createOrUpdatePullRequest(
    gh,
    pr,
    openPullRequests,
    baseBranch,
    pullRequestOverflowHandler
  )

  return resultPullRequest
}

//TODO: copied from release-please, needs tests
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

  //TODO: test this logic
  const newPullRequest = await gh.createPullRequest(
    {
      headBranchName: pullRequest.headRefName,
      baseBranchName: targetBranch,
      number: -1,
      title: pullRequest.title.toString(),
      body,
      labels: pullRequest.labels,
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

//TODO: copied from release-please, needs tests
/// only update an existing pull request if it has release note changes
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

//TODO: copied from release-please, needs tests
async function* findMergedReleasePullRequests(
  gh: GitHub,
  targetBranch: string,
  pullRequestOverflowHandler: PullRequestOverflowHandler,
  logger: Logger
): AsyncGenerator<PullRequest, void, unknown> {
  // Find merged release pull requests
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
    yield {
      ...pullRequest,
      body: pullRequestBody.toString()
    }
  }
}

//TODO: copied from release-please, needs tests
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

//TODO: copied from release-please, needs tests
async function findOpenReleasePullRequests(
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
/**
 * buildReleasePR builds the metadata for a release PR from the releaseBranch into the baseBranch, for the next version based
 * on the current version and versioning strategy.
 * @param {GitHub} gh The GitHub instance to use
 * @param {string} baseBranch The branch to merge the release PR into
 * @param {string} releaseBranch The branch to create the release PR from
 * @param {Version} current The latest released version for this branch
 * @param {string} versioningStrategy The versioning strategy for this release branch
 * @returns {Promise<ReleasePullRequest | undefined>} Resolves to a PullRequestRequest when there are commit to build a release from, otherwise undefined
 */
export async function buildReleasePR(
  gh: GitHub,
  baseBranch: string,
  releaseBranch: string,
  current: Version,
  versioningStrategy: string,
  shaToRelease: string
): Promise<ReleasePullRequest | undefined> {
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
    targetBranch: baseBranch,
    commits
  })

  const pullRequestBody = new PullRequestBody([
    {
      version: next,
      notes: releaseNotesBody
    }
  ])

  const updates = await buildUpdates(releaseBranch, shaToRelease, {
    changelogEntry: releaseNotesBody,
    newVersion: next,
    versionsMap: {} as VersionsMap,
    latestVersion: current,
    commits
  })

  return {
    title: pullRequestTitle,
    body: pullRequestBody,
    labels: [],
    headRefName: branchName.toString(),
    version: next,
    draft: false,
    updates
  }
}

//TODO: copied from release-please, needs tests
async function buildUpdates(
  releaseBranch: string,
  shaToRelease: string,
  options: BuildUpdatesOptions
): Promise<Update[]> {
  const updates: Update[] = []
  const version = options.newVersion

  updates.push({
    path: addPath(DEFAULT_CHANGELOG_PATH),
    createIfMissing: true,
    updater: new Changelog({
      version,
      changelogEntry: options.changelogEntry
    })
  })

  updates.push({
    path: addPath(RELEASE_CONFIG_PATH),
    createIfMissing: false,
    updater: new VersionUpdater(releaseBranch, shaToRelease, {
      version
    })
  })

  return updates
}

//TODO: copied from release-please, needs tests?
function addPath(file: string): string {
  // There is no strategy path to join, the strategy is at the root, or the
  // file is at the root (denoted by a leading slash or tilde)
  if (file.startsWith('/')) {
    file = file.replace(/^\/+/, '')
  }
  // Otherwise, the file is relative to the strategy path
  else {
    file = `${ROOT_PROJECT_PATH.replace(/\/+$/, '')}/${file}`
  }
  // Ensure the file path does not escape the workspace
  if (/((^|\/)\.{1,2}|^~|^\/*)+\//.test(file)) {
    throw new Error(`illegal pathing characters in path: ${file}`)
  }
  // Strip any trailing slashes and return
  return file.replace(/\/+$/, '')
}
