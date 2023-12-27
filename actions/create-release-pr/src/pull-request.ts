import { GitHub } from 'release-please/build/src/github'
import { ReleasePullRequest } from 'release-please/build/src/release-pull-request'
import { Version, VersionsMap } from 'release-please/build/src/version'
import { findCommitsSinceLastRelease } from './github'
import { VersionUpdater, nextVersion } from './version'
import { PullRequestTitle } from 'release-please/build/src/util/pull-request-title'
import { BranchName } from 'release-please/build/src/util/branch-name'
import { DefaultChangelogNotes } from 'release-please/build/src/changelog-notes/default'
import { TagName } from 'release-please/build/src/util/tag-name'
import { PullRequestBody } from 'release-please/build/src/util/pull-request-body'
import { BuildUpdatesOptions } from 'release-please/build/src/strategies/base'
import { Update } from 'release-please/build/src/update'
import { Changelog } from 'release-please/build/src/updaters/changelog'
import {
  DEFAULT_CHANGELOG_PATH,
  DEFAULT_LABELS,
  RELEASE_CONFIG_PATH
} from './constants'
import { Logger } from 'release-please/build/src/util/logger'

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
export async function buildCandidatePR(
  gh: GitHub,
  baseBranch: string,
  releaseBranch: string,
  current: Version,
  versioningStrategy: string,
  shaToRelease: string,
  logger: Logger
): Promise<ReleasePullRequest | undefined> {
  const commits = await findCommitsSinceLastRelease(gh, releaseBranch, current)

  if (!commits || commits.length === 0) {
    logger.debug('found no commits to release')
    return undefined
  }

  const next = nextVersion(current, versioningStrategy, commits, gh)
  logger.debug(`building candidate PR for next version: ${next.toString()}`)

  const pullRequestTitle = PullRequestTitle.ofVersion(next)
  const branchName = releaseBranchName(next)
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

  logger.debug('building updates')
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
    labels: DEFAULT_LABELS,
    headRefName: branchName.toString(),
    version: next,
    draft: false,
    updates
  }
}

export function releaseBranchName(version: Version): BranchName {
  return new DefaultBranchName(
    `${RELEASE_PLEASE}--branches--release-${version.toString()}`
  )
}

const RELEASE_PLEASE = 'release-please'
const DEFAULT_PATTERN = `^${RELEASE_PLEASE}--branches--(?<branch>.+)$`
class DefaultBranchName extends BranchName {
  static matches(branchName: string): boolean {
    return !!branchName.match(DEFAULT_PATTERN)
  }
  constructor(branchName: string) {
    super(branchName)
    const match = branchName.match(DEFAULT_PATTERN)
    if (match?.groups) {
      this.targetBranch = match.groups['branch']
    }
  }
  toString(): string {
    return `${RELEASE_PLEASE}--branches--${this.targetBranch}`
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
  file = file.replace(/^\/+/, '')

  // Ensure the file path does not escape the workspace
  if (/((^|\/)\.{1,2}|^~|^\/*)+\//.test(file)) {
    throw new Error(`illegal pathing characters in path: ${file}`)
  }
  // Strip any trailing slashes and return
  return file.replace(/\/+$/, '')
}
