import { createGitHubInstance, findMergedReleasePullRequests } from './github'
import { Version } from 'release-please/build/src/version'

import { PullRequest } from 'release-please/build/src/pull-request'
import { PullRequestTitle } from 'release-please/build/src/util/pull-request-title'

import { error, info, warning } from '@actions/core'

export async function shouldRelease(
  baseBranch: string
): Promise<ReleaseMeta | undefined> {
  const gh = await createGitHubInstance(baseBranch)
  const mergedReleasePRs = await findMergedReleasePullRequests(baseBranch, gh)

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
    info(`release: ${release}`)

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
    warning(
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
  if (!mergedPullRequest.sha) {
    error('Pull request should have been merged')
    return
  }

  return {
    name: `v${version.toString()}`,
    sha: mergedPullRequest.sha
  }
}
