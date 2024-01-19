import { createGitHubInstance, findMergedReleasePullRequests } from './github'
import { Version } from 'release-please/build/src/version'

import { PullRequest } from 'release-please/build/src/pull-request'
import { GitHubActionsLogger, logger } from './util'
import { Logger } from 'release-please/build/src/util/logger'
import { PullRequestTitle } from 'release-please/build/src/util/pull-request-title'

export async function prepareRelease(
  baseBranch: string,
  log: Logger = new GitHubActionsLogger()
): Promise<ReleaseMeta | undefined> {
  const gh = await createGitHubInstance(baseBranch)
  const mergedReleasePRs = await findMergedReleasePullRequests(
    baseBranch,
    gh,
    log
  )

  const candidateReleases: ReleaseMeta[] = []
  for (const pullRequest of mergedReleasePRs) {
    if (!pullRequest.sha) {
      //not a PR we can make a release from
      continue
    }

    const prTitle = PullRequestTitle.parse(pullRequest.title)
    const version = prTitle?.getVersion()
    if (version === undefined) {
      continue
    }

    const release = await prepareSingleRelease(pullRequest, version)
    log.info(`release: ${release}`)

    if (release !== undefined) {
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

  return {
    name: `v${version.toString()}`,
    sha: mergedPullRequest.sha
  }
}
