import { GitHub, GitHubTag, OctokitAPIs } from 'release-please/build/src/github'
import { TagName } from 'release-please/build/src/util/tag-name'

import {
  parseConventionalCommits,
  Commit,
  ConventionalCommit
} from 'release-please/build/src/commit'
import { getInput } from '@actions/core'
import { Logger } from 'release-please/build/src/util/logger'
import { Version, VersionsMap } from 'release-please/build/src/version'
import {
  FilePullRequestOverflowHandler,
  PullRequestOverflowHandler
} from 'release-please/build/src/util/pull-request-overflow-handler'
import { PullRequest } from 'release-please/build/src/pull-request'
import {
  DEFAULT_CHANGELOG_PATH,
  DEFAULT_LABELS,
  DEFAULT_RELEASE_LABELS,
  RELEASE_CONFIG_PATH
} from './constants'
import { GitHubActionsLogger } from './util'
import { ReleasePullRequest } from 'release-please/build/src/release-pull-request'
import { VersionUpdater, nextVersion } from './version'
import { PullRequestTitle } from 'release-please/build/src/util/pull-request-title'
import { releaseBranchName } from './pull-request'
import { DefaultChangelogNotes } from 'release-please/build/src/changelog-notes/default'
import { PullRequestBody } from 'release-please/build/src/util/pull-request-body'
import { BuildUpdatesOptions } from 'release-please/build/src/strategies/base'
import { Update } from 'release-please/build/src/update'
import { Changelog } from 'release-please/build/src/updaters/changelog'

export const GITHUB_API_URL = 'https://api.github.com'
export const GITHUB_GRAPHQL_URL = 'https://api.github.com'

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

export class GitHubReleaser {
  private github: GitHub
  private logger: Logger

  private _pullRequestOverflowHandler: PullRequestOverflowHandler
  get pullRequestOverflowHandler(): PullRequestOverflowHandler {
    return this._pullRequestOverflowHandler
  }

  constructor(
    github: GitHub,
    logger: Logger = new GitHubActionsLogger(),
    pullRequestOverflowHandler?: PullRequestOverflowHandler
  ) {
    this.github = github
    this.logger = logger

    if (pullRequestOverflowHandler) {
      this._pullRequestOverflowHandler = pullRequestOverflowHandler
    } else {
      this._pullRequestOverflowHandler = new FilePullRequestOverflowHandler(
        github,
        logger
      )
    }
  }

  findCommitsSinceLastRelease = async (
    releaseBranch: string,
    currentRelease: Version,
    commitSearchDepth = 500
  ): Promise<ConventionalCommit[]> => {
    const commitGenerator = this.github.mergeCommitIterator(releaseBranch, {
      maxResults: commitSearchDepth,
      backfillFiles: true
    })

    const allTags = await this.getAllTags()

    const currentVersionTag = new TagName(currentRelease)
    this.logger.debug(
      `looking for tag ${currentVersionTag.toString()} in ${
        Object.keys(allTags).length
      } tags: ${Object.keys(allTags).join(', ')}`
    )
    const foundTag = allTags[currentVersionTag.toString()]
    if (!foundTag) {
      throw new Error(
        `failed to find current release tag ${currentVersionTag.toString()}`
      )
    }

    const commits: Commit[] = []
    await (async function () {
      for await (const commit of commitGenerator) {
        commits.push(commit)
      }
    })()

    this.logger.info(
      `looking for commits since last release ${foundTag.name}(${foundTag.sha})`
    )
    const commitsSinceLastRelease = this.commitsAfterSha(commits, foundTag.sha)
    this.logger.info(
      `found ${commitsSinceLastRelease.length} commits since last release`
    )

    return parseConventionalCommits(commitsSinceLastRelease)
  }

  private getAllTags = async (): Promise<Record<string, GitHubTag>> => {
    const allTags: Record<string, GitHubTag> = {}
    for await (const tag of this.github.tagIterator()) {
      allTags[tag.name] = tag
    }
    return allTags
  }

  private commitsAfterSha = (
    commits: Commit[],
    lastReleaseSha: string
  ): Commit[] => {
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
  findOpenReleasePullRequests = async (
    targetBranch: string
  ): Promise<PullRequest[]> => {
    this.logger.info('Looking for open release pull requests')
    const openPullRequests: PullRequest[] = []
    const generator = this.github.pullRequestIterator(
      targetBranch,
      'OPEN',
      Number.MAX_SAFE_INTEGER,
      false
    )

    for await (const openPullRequest of generator) {
      if (this.hasAllLabels(DEFAULT_LABELS, openPullRequest.labels)) {
        const body =
          await this.pullRequestOverflowHandler.parseOverflow(openPullRequest)
        if (body) {
          // maybe replace with overflow body
          openPullRequests.push({
            ...openPullRequest,
            body: body.toString()
          })
        }
      }
    }

    this.logger.info(
      `found ${openPullRequests.length} open release pull requests.`
    )
    return openPullRequests
  }

  //TODO: copied from release-please, needs tests
  findMergedReleasePullRequests = async (
    targetBranch: string
  ): Promise<PullRequest[]> => {
    // Find merged release pull requests
    const mergedPullRequests: PullRequest[] = []
    const pullRequestGenerator = this.github.pullRequestIterator(
      targetBranch,
      'MERGED',
      200,
      false
    )
    for await (const pullRequest of pullRequestGenerator) {
      if (!this.hasAllLabels(DEFAULT_RELEASE_LABELS, pullRequest.labels)) {
        continue
      }
      this.logger.debug(
        `Found pull request #${pullRequest.number}: '${pullRequest.title}'`
      )
      // if the pull request body overflows, handle it
      const pullRequestBody =
        await this.pullRequestOverflowHandler.parseOverflow(pullRequest)
      if (!pullRequestBody) {
        this.logger.debug('could not parse pull request body as a release PR')
        continue
      }
      // replace with the complete fetched body
      mergedPullRequests.push({
        ...pullRequest,
        body: pullRequestBody.toString()
      })
    }

    this.logger.info(
      `found ${mergedPullRequests.length} merged release pull requests.`
    )
    return mergedPullRequests
  }

  /**
   * buildReleasePR builds the metadata for a release PR from the releaseBranch into the baseBranch, for the next version based
   * on the current version and versioning strategy.
   * @param {string} baseBranch The branch to merge the release PR into
   * @param {string} releaseBranch The branch to create the release PR from
   * @param {Version} current The latest released version for this branch
   * @param {string} versioningStrategy The versioning strategy for this release branch
   * @returns {Promise<ReleasePullRequest | undefined>} Resolves to a PullRequestRequest when there are commit to build a release from, otherwise undefined
   */
  buildCandidatePR = async (
    baseBranch: string,
    releaseBranch: string,
    current: Version,
    versioningStrategy: string,
    shaToRelease: string
  ): Promise<ReleasePullRequest | undefined> => {
    const commits = await this.findCommitsSinceLastRelease(
      releaseBranch,
      current
    )

    if (!commits || commits.length === 0) {
      this.logger.info('found no commits to release')
      return undefined
    }

    const next = nextVersion(current, versioningStrategy, commits, this.github)
    this.logger.info(
      `building candidate PR for next version: ${next.toString()}`
    )

    const pullRequestTitle = PullRequestTitle.ofVersion(next)
    const branchName = releaseBranchName(next)
    const changelogNotes = new DefaultChangelogNotes()

    const { owner, repo } = this.github.repository

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

    this.logger.debug('building updates')
    const updates = await this.buildUpdates(releaseBranch, shaToRelease, {
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

  //TODO: copied from release-please, needs tests
  private buildUpdates = async (
    releaseBranch: string,
    shaToRelease: string,
    options: BuildUpdatesOptions
  ): Promise<Update[]> => {
    const updates: Update[] = []
    const version = options.newVersion

    updates.push({
      path: this.addPath(DEFAULT_CHANGELOG_PATH),
      createIfMissing: true,
      updater: new Changelog({
        version,
        changelogEntry: options.changelogEntry
      })
    })

    updates.push({
      path: this.addPath(RELEASE_CONFIG_PATH),
      createIfMissing: false,
      updater: new VersionUpdater(releaseBranch, shaToRelease, {
        version
      })
    })

    return updates
  }

  //TODO: copied from release-please, needs tests?
  private addPath = (file: string): string => {
    file = file.replace(/^\/+/, '')

    // Ensure the file path does not escape the workspace
    if (/((^|\/)\.{1,2}|^~|^\/*)+\//.test(file)) {
      throw new Error(`illegal pathing characters in path: ${file}`)
    }
    // Strip any trailing slashes and return
    return file.replace(/\/+$/, '')
  }

  createOrUpdatePullRequest = async (
    pullRequest: ReleasePullRequest,
    openPullRequests: PullRequest[],
    targetBranch: string
  ): Promise<PullRequest | undefined> => {
    // look for existing, open pull request
    const existing = openPullRequests.find(
      openPullRequest =>
        openPullRequest.headBranchName === pullRequest.headRefName
    )
    if (existing) {
      return await this.maybeUpdateExistingPullRequest(
        existing,
        pullRequest,
        targetBranch
      )
    }

    const body =
      await this.pullRequestOverflowHandler.handleOverflow(pullRequest)

    //TODO: will we need to signoff commit messages?
    const message = pullRequest.title.toString()

    const newPullRequest = await this.github.createPullRequest(
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
  private maybeUpdateExistingPullRequest = async (
    existing: PullRequest,
    pullRequest: ReleasePullRequest,
    targetBranch: string
  ): Promise<PullRequest | undefined> => {
    const { owner, repo } = this.github.repository
    // If unchanged, no need to push updates
    if (existing.body === pullRequest.body.toString()) {
      this.logger.info(
        `PR https://github.com/${owner}/${repo}/pull/${existing.number} remained the same`
      )
      return undefined
    }
    const updatedPullRequest = await this.github.updatePullRequest(
      existing.number,
      pullRequest,
      targetBranch,
      {
        fork: false,
        pullRequestOverflowHandler: this.pullRequestOverflowHandler
      }
    )
    return updatedPullRequest
  }

  /**
   * Helper to compare if a list of labels fully contains another list of labels
   * @param {string[]} expected List of labels expected to be contained
   * @param {string[]} existing List of existing labels to consider
   */
  private hasAllLabels = (expected: string[], existing: string[]): boolean => {
    const existingSet = new Set(existing)
    for (const label of expected) {
      if (!existingSet.has(label)) {
        return false
      }
    }
    return true
  }
}

export function createGitHubReleaser(
  github: GitHub,
  logger: Logger = new GitHubActionsLogger()
): GitHubReleaser {
  return new GitHubReleaser(github, logger)
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
