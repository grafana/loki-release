import { GitHub, GitHubTag, OctokitAPIs } from 'release-please/build/src/github'
import { PullRequest } from 'release-please/build/src/pull-request'

import { info, warning, debug, getInput, getBooleanInput } from '@actions/core'

import { TagName } from 'release-please/build/src/util/tag-name'
import { ConventionalCommit } from 'release-please/build/src/commit'
import { PullRequestTitle } from 'release-please/build/src/util/pull-request-title'
import { Version } from 'release-please/build/src/version'
import { BranchName } from 'release-please/build/src/util/branch-name'
import { DefaultChangelogNotes } from 'release-please/build/src/changelog-notes/default'
import { Logger } from 'release-please/build/src/util/logger'
import { PullRequestBody } from 'release-please/build/src/util/pull-request-body'
import { ReleasePullRequest } from 'release-please/build/src/release-pull-request'

export enum VersioningStrategy {
  BumpMajor = 'bump-major',
  BumpMinor = 'bump-minor',
  BumpPatch = 'bump-patch'
}

export async function createReleasePR(
  mainBranch: string,
  releaseBranch: string,
  versioningStrategy: VersioningStrategy
): Promise<PullRequest | undefined> {
  return undefined
}

function getOptionalBooleanInput(name: string): boolean | undefined {
  if (getInput(name) === '') {
    return undefined
  }
  return getBooleanInput(name)
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

//function getGitHubInput() {
//  return {
//    fork: getOptionalBooleanInput('fork'),
//    repoUrl: getInput('repo-url') || (process.env.GITHUB_REPOSITORY as string),
//    apiUrl: getInput('github-api-url') || GITHUB_API_URL,
//    graphqlUrl:
//      (getInput('github-graphql-url') || '').replace(/\/graphql$/, '') ||
//      GITHUB_GRAPHQL_URL,
//    token: getInput('token', { required: true }),
//    proxyServer: getInput('proxy-server') || undefined
//  }
//}

//function getGitHubOptions(mainBranch: string): GitHubCreateOptions {
//  const { token, apiUrl, graphqlUrl, repoUrl, proxyServer } = getGitHubInput()
//  const [owner, repo] = repoUrl.split('/')

//  let proxy
//  if (proxyServer) {
//    const [host, port] = proxyServer.split(':')
//    proxy = { host, port: parseInt(port) }
//  }
//  return {
//    apiUrl,
//    defaultBranch: mainBranch,
//    graphqlUrl,
//    owner,
//    proxy,
//    repo,
//    token
//  }
//}

//async function getGitHubInstance(options: GitHubCreateOptions) {
//  return GitHub.create(options)
//}

//async function buildPullRequests(
//  mainBranch: string
//): Promise<ReleasePullRequest | undefined> {
//  //TODO: make configurable?
//  const maxReleaseDepth = 400
//  const commitSearchDepth = 500

//  //TODO: this is our first test
//  const newVersion = Version.parse('1.2.3')

//  const githubOptions = getGitHubOptions(mainBranch)
//  const github = await getGitHubInstance(githubOptions)

//  for await (const release of github.releaseIterator({
//    maxResults: maxReleaseDepth
//  })) {
//    const tagName = TagName.parse(release.tagName)
//    if (!tagName) {
//      warning(`Unable to parse release name: ${release.name}`)
//      continue
//    }

//    //TODO: test this
//    if (newVersion.toString() === tagName.version.toString()) {
//      warning(`A release already exists for this version`)
//      return undefined
//    }
//  }

//  // iterate through commits and collect commits until we have
//  // seen all release commits
//  info('Collecting commits since all latest releases')
//  const commits: ConventionalCommit[] = []
//  debug(`commit search depth: ${commitSearchDepth}`)

//  //TODO: I don't know what branch this should run from
//  // for patch release, it's the release branch
//  // for new minors, it's probably also the releese branch because that branch was forked from main?
//  // I guess, what it this looking for?
//  const commitGenerator = github.mergeCommitIterator(mainBranch, {
//    maxResults: commitSearchDepth,
//    backfillFiles: true
//  })

//  info(`Considering: ${commits.length} commits`)
//  if (commits.length === 0) {
//    info(`No commits found since last version`)
//    // TODO: what to actually return here?
//    return undefined
//  }

//  const pullRequestTitle = PullRequestTitle.ofVersion(newVersion)
//  const branchName = BranchName.ofVersion(newVersion)

//  const changelogNotes = new DefaultChangelogNotes()

//  const { owner, repo } = githubOptions

//  const releaseNotesBody = await changelogNotes.buildNotes(commits, {
//    owner,
//    repository: repo,
//    version: newVersion.toString(),
//    // previousTag: latestRelease?.tag?.toString(),
//    previousTag: 'foo',
//    // currentTag: newVersionTag.toString(),
//    currentTag: 'bar',
//    targetBranch: mainBranch,
//    commits
//  })

//  //TODO: what to do if the release notes are empty?
//  // if (this.changelogEmpty(releaseNotesBody)) {
//  //   this.logger.info(
//  //     `No user facing commits found since ${
//  //       latestRelease ? latestRelease.sha : 'beginning of time'
//  //     } - skipping`
//  //   );
//  //   return undefined;
//  // }
//  //
//  // TODO: what are updates and do we need them?
//  // const updates = await this.buildUpdates({
//  //   changelogEntry: releaseNotesBody,
//  //   newVersion,
//  //   versionsMap,
//  //   latestVersion: latestRelease?.tag.version,
//  //   commits: commits,
//  // });
//  // const updatesWithExtras = mergeUpdates(
//  //   updates.concat(...(await this.extraFileUpdates(newVersion, versionsMap)))
//  // );
//  //

//  const pullRequestBody = new PullRequestBody([
//    {
//      version: newVersion,
//      notes: releaseNotesBody
//    }
//  ])

//  return {
//    title: pullRequestTitle,
//    body: pullRequestBody,
//    labels: [],
//    headRefName: branchName.toString(),
//    version: newVersion,
//    draft: false,
//    updates: []
//  }
//}
