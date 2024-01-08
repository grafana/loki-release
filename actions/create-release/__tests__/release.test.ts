import { createSandbox, SinonStub } from 'sinon'
import { createReleasePR, prepareRelease } from '../src/release'

import { GitHubReleaser } from '../src/github'
import * as github from '../src/github'
import {
  RELEASE_PLEASE,
  releaseBranchNameFromVersion
} from '../src/pull-request'

import { BranchName } from 'release-please/build/src/util/branch-name'
import { DEFAULT_LABELS, RELEASE_CONFIG_PATH } from '../src/constants'
import { GitHub } from 'release-please/build/src/github'
import { PullRequest } from 'release-please/build/src/pull-request'
import { PullRequestBody } from 'release-please/build/src/util/pull-request-body'
import { PullRequestOverflowHandler } from 'release-please/build/src/util/pull-request-overflow-handler'
import { PullRequestTitle } from 'release-please/build/src/util/pull-request-title'
import { ReleasePullRequest } from 'release-please/build/src/release-pull-request'
import { Version } from 'release-please/build/src/version'
import { NoOpLogger, mockGitHub } from './helpers'
import { Octokit } from '@octokit/rest'
import { Base64 } from 'js-base64'
import { DefaultChangelogNotes } from 'release-please/build/src/changelog-notes/default'
import { parseConventionalCommits } from 'release-please/build/src/commit'

const sandbox = createSandbox()
let getFileJson: SinonStub
let createPullRequest: SinonStub
let updatePullRequest: SinonStub
let buildCandidatePR: SinonStub
let findOpenReleasePullRequests: SinonStub
let findMergedReleasePullRequests: SinonStub
let getFileJsonSpy: SinonStub
let buildCandidatePRSpy: SinonStub
let createPullRequestSpy: SinonStub
let updatePullRequestSpy: SinonStub
let getContent: SinonStub

let fakeGitHub: GitHub
let fakeOctokit: Octokit
let gitHubReleaser: GitHubReleaser

const fakePullRequestOverflowHandler = {
  handleOverflow: async (
    _pullRequest: ReleasePullRequest,
    _maxSize?: number
  ) => {
    return _pullRequest.body.toString()
  }
} as PullRequestOverflowHandler

const defaultNextVersion = Version.parse('1.3.2')

const commits = parseConventionalCommits([
  // This feature will be release in 1.3.2
  {
    sha: 'xzy123',
    message: 'feat(loki): some cool new feature',
    files: []
  },
  // A bug fix in 1.3.2
  {
    sha: 'abc123',
    message: 'fixed: a bug fixed in 1.3.1',
    files: []
  },

  // This commit updates the release notes, and was backported
  // from the release commit that actually tagged abc123 as v1.3.1
  {
    sha: 'abc567',
    message: 'chore: release 1.3.1',
    files: [],
    pullRequest: {
      headBranchName: 'release-please/branches/release-1.3.x',
      baseBranchName: 'release-1.3.x',
      number: 123,
      title: 'chore: release 1.3.1',
      body: '',
      labels: [],
      files: []
    }
  },

  // This commit was release as 1.3.1
  {
    sha: 'def123',
    message: 'feat: this was released in 1.3.1',
    files: []
  }
])

let defaultPRNotes: string
let defaultPRBody: PullRequestBody
let defaultPRTitle: string
let defaultCreatedPR: PullRequest

describe('release', () => {
  beforeEach(async () => {
    fakeGitHub = await mockGitHub()

    gitHubReleaser = new GitHubReleaser(
      fakeGitHub,
      new NoOpLogger(),
      fakePullRequestOverflowHandler
    )

    sandbox.stub(github, 'createGitHubInstance').resolves(fakeGitHub)
    sandbox.stub(github, 'createGitHubReleaser').returns(gitHubReleaser)

    findMergedReleasePullRequests = sandbox.stub(
      gitHubReleaser,
      'findMergedReleasePullRequests'
    )
    findOpenReleasePullRequests = sandbox.stub(
      gitHubReleaser,
      'findOpenReleasePullRequests'
    )

    getFileJson = sandbox.stub(fakeGitHub, 'getFileJson')
    createPullRequest = sandbox.stub(fakeGitHub, 'createPullRequest')
    updatePullRequest = sandbox.stub(fakeGitHub, 'updatePullRequest')

    const fakeRepos = {
      getContent: () => {}
    }
    fakeOctokit = {
      repos: fakeRepos
    } as unknown as Octokit
    sandbox.stub(github, 'createOctokitInstance').returns(fakeOctokit)

    getContent = sandbox.stub(fakeRepos, 'getContent')

    buildCandidatePR = sandbox.stub(gitHubReleaser, 'buildCandidatePR')

    getFileJsonSpy = getFileJson.resolves({
      'release-1.3.x': {
        strategy: 'always-bump-patch',
        currentVersion: '1.3.1',
        releases: {
          '1.3.0': 'abc789',
          '1.3.1': 'def123'
        }
      }
    })

    defaultPRNotes = await new DefaultChangelogNotes().buildNotes(commits, {
      owner: 'fake-owner',
      repository: 'fake-repo',
      targetBranch: 'main',
      version: defaultNextVersion.toString(),
      previousTag: '1.3.1',
      currentTag: '1.3.2',
      commits
    })

    defaultPRBody = new PullRequestBody([
      {
        version: defaultNextVersion,
        notes: defaultPRNotes
      }
    ])

    defaultPRTitle = PullRequestTitle.ofVersion(defaultNextVersion).toString()

    defaultCreatedPR = {
      headBranchName: 'foo',
      baseBranchName: 'main',
      number: 42,
      title: defaultPRTitle,
      body: defaultPRBody.toString(),
      labels: [],
      files: []
    } as PullRequest

    buildCandidatePRSpy = buildCandidatePR.resolves({
      title: PullRequestTitle.ofVersion(defaultNextVersion),
      body: defaultPRBody,
      labels: DEFAULT_LABELS,
      headRefName: releaseBranchNameFromVersion(defaultNextVersion).toString(),
      version: defaultNextVersion,
      draft: false,
      updates: []
    })

    createPullRequestSpy = createPullRequest.resolves(defaultCreatedPR)
    updatePullRequestSpy = updatePullRequest.resolves(defaultCreatedPR)
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('createReleasePR', () => {
    it('thows an error if the release config is missing', async () => {
      getFileJson.resolves({
        foo: {
          strategy: 'always-bump-patch',
          currentVersion: '1.2.2',
          releases: {
            '1.2.0': 'abc123',
            '1.2.1': 'def456',
            '1.2.2': 'ghi789'
          }
        }
      })

      const pr = createReleasePR('main', 'release-1.3.x', 'abc123')
      await expect(pr).rejects.toThrow(
        'release.json does not contain a config for branch release-1.3.x'
      )
    })

    it('returns undefined if unable to build a candidate release PR', async () => {
      buildCandidatePR.resolves(undefined)

      const pr = await createReleasePR('main', 'release-1.3.x', 'abc123')
      expect(pr).toBeUndefined()
    })

    it('returns undefined if there are merged release pull requests that have yet to be released', async () => {
      findMergedReleasePullRequests.resolves([
        {
          headBranchName: BranchName.ofVersion(defaultNextVersion).toString(),
          baseBranchName: 'main',
          number: 42,
          title: PullRequestTitle.ofVersion(defaultNextVersion).toString(),
          body: defaultPRBody.toString(),
          labels: [],
          files: []
        }
      ])

      const pr = await createReleasePR('main', 'release-1.3.x', 'abc123')
      expect(pr).toBeUndefined()
    })

    it('gets the release config from the base branch, and picks the correct config based on release branch', async () => {
      getFileJsonSpy = getFileJson.resolves({
        'release-1.2.x': {
          strategy: 'always-bump-patch',
          currentVersion: '1.2.2',
          releases: {
            '1.2.0': 'abc123',
            '1.2.1': 'def456',
            '1.2.2': 'ghi789'
          }
        },
        'release-1.3.x': {
          strategy: 'always-bump-patch',
          currentVersion: '1.3.1',
          releases: {
            '1.3.0': 'abc789',
            '1.3.1': 'def123'
          }
        }
      })

      buildCandidatePRSpy = buildCandidatePR.resolves(undefined)

      await createReleasePR('main', 'release-1.3.x', 'abc123')

      expect(getFileJsonSpy.calledOnce).toBe(true)
      getFileJsonSpy.calledWith('release.json', 'main')

      expect(buildCandidatePRSpy.calledOnce).toBe(true)
      expect(
        buildCandidatePRSpy.calledWith(
          'main',
          'release-1.3.x',
          Version.parse('1.3.1'),
          'always-bump-patch',
          'abc123'
        )
      ).toBe(true)
    })

    //TODO: most of this logic actually lives in the github releaser now.
    //this should just test that the github releaser is called correctly
    //TODO: the logic of testing the underlying github gets called correctly should
    //be move into the github releaser tests
    it('creates a new release PR if there are no open release PRs', async () => {
      findOpenReleasePullRequests.resolves([])
      findMergedReleasePullRequests.resolves([])

      await createReleasePR('main', 'release-1.3.x', 'abc123')

      expect(createPullRequestSpy.calledOnce).toBe(true)

      const actual = createPullRequestSpy.getCall(0).args
      expect(actual[0]).toEqual({
        headBranchName:
          releaseBranchNameFromVersion(defaultNextVersion).toString(),
        baseBranchName: 'main',
        body: defaultPRBody.toString(),
        title: PullRequestTitle.ofVersion(defaultNextVersion).toString(),
        labels: DEFAULT_LABELS,
        files: [],
        number: -1
      })
      expect(actual[1]).toEqual('main')
      expect(actual[2]).toEqual(
        PullRequestTitle.ofVersion(defaultNextVersion).toString()
      )
      expect(actual[3]).toEqual([])
      expect(actual[4]).toEqual({
        fork: false,
        draft: false
      })
    })

    //TODO: most of this logic actually lives in the github releaser now.
    //TODO: the logic of testing the underlying github gets called correctly should
    //be move into the github releaser tests
    it('updates an existing release PR if one exists', async () => {
      findOpenReleasePullRequests.resolves([
        {
          headBranchName:
            releaseBranchNameFromVersion(defaultNextVersion).toString(),
          baseBranchName: 'main',
          number: 42,
          title: PullRequestTitle.ofVersion(defaultNextVersion).toString(),
          body: 'the existing body needs to be different to trigger an update',
          labels: DEFAULT_LABELS,
          files: []
        }
      ])
      findMergedReleasePullRequests.resolves([])

      await createReleasePR('main', 'release-1.3.x', 'abc123')

      expect(updatePullRequestSpy.calledOnce).toBe(true)

      const actual = updatePullRequestSpy.getCall(0).args
      expect(actual[0]).toEqual(42)
      expect(actual[1]).toEqual({
        title: PullRequestTitle.ofVersion(defaultNextVersion),
        body: defaultPRBody,
        labels: DEFAULT_LABELS,
        headRefName:
          releaseBranchNameFromVersion(defaultNextVersion).toString(),
        version: defaultNextVersion,
        draft: false,
        updates: []
      })
      expect(actual[2]).toEqual('main')
      expect(actual[3]).toEqual({
        fork: false,
        pullRequestOverflowHandler: fakePullRequestOverflowHandler
      })
    })

    //TODO: most of this logic actually lives in the github releaser now.
    it('does not update existing PR if there are no release note changes', async () => {
      findOpenReleasePullRequests.resolves([
        {
          headBranchName:
            releaseBranchNameFromVersion(defaultNextVersion).toString(),
          baseBranchName: 'main',
          number: 42,
          title: PullRequestTitle.ofVersion(defaultNextVersion).toString(),
          body: defaultPRBody.toString(),
          labels: DEFAULT_LABELS,
          files: []
        }
      ])
      findMergedReleasePullRequests.resolves([])

      await createReleasePR('main', 'release-1.3.x', 'abc123')
      expect(updatePullRequestSpy.calledOnce).toBe(false)
    })
  })

  describe('createReleases', () => {
    it('creates a release for each merged release PR', async () => {
      findOpenReleasePullRequests.resolves([])
      findMergedReleasePullRequests.resolves([
        {
          headBranchName: `${RELEASE_PLEASE}--branches--release-1.3.2`,
          baseBranchName: 'main',
          sha: 'abc123',
          number: 42,
          title: defaultPRTitle,
          body: defaultPRBody.toString(),
          labels: [],
          files: [`${RELEASE_CONFIG_PATH}`]
        }
      ])

      getContent.resolves({
        data: {
          type: 'file',
          content: Base64.encode(
            JSON.stringify({
              'release-1.3.x': {
                strategy: 'always-bump-patch',
                currentVersion: '1.3.1',
                releases: {
                  '1.3.2': 'abc123'
                }
              }
            })
          )
        }
      })

      const release = await prepareRelease('main')
      expect(release).toBeDefined()
      expect(release?.name).toEqual('v1.3.2')
      expect(release?.notes).toEqual(defaultPRNotes)
    })
  })
})
