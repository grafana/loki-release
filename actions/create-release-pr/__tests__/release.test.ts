import sinon from 'sinon'
import { ReleaseConfig, createReleasePR } from '../src/release'

import * as github from '../src/github'
import * as pullRequest from '../src/pull-request'

import { BranchName } from 'release-please/build/src/util/branch-name'
import { DEFAULT_LABELS } from '../src/constants'
import { GitHub } from 'release-please/build/src/github'
import { PullRequest } from 'release-please/build/src/pull-request'
import { PullRequestBody } from 'release-please/build/src/util/pull-request-body'
import { PullRequestOverflowHandler } from 'release-please/build/src/util/pull-request-overflow-handler'
import { PullRequestTitle } from 'release-please/build/src/util/pull-request-title'
import { ReleasePullRequest } from 'release-please/build/src/release-pull-request'
import { Update } from 'release-please/build/src/update'
import { Version } from 'release-please/build/src/version'

const sandbox = sinon.createSandbox()
let getFileJson: sinon.SinonStub
let createPullRequest: sinon.SinonStub
let updatePullRequest: sinon.SinonStub
let buildCandidatePR: sinon.SinonStub
let findOpenReleasePullRequests: sinon.SinonStub
let findMergedReleasePullRequests: sinon.SinonStub
let getFileJsonSpy: sinon.SinonStub
let buildCandidatePRSpy: sinon.SinonStub
let findOpenReleasePullRequestsSpy: sinon.SinonStub
let findMergedReleasePullRequestsSpy: sinon.SinonStub
let createPullRequestSpy: sinon.SinonStub
let updatePullRequestSpy: sinon.SinonStub

interface CreatePullRequestOptions {
  fork?: boolean
  draft?: boolean
}

const fakeGitHub = {
  repository: {
    owner: 'fake-owner',
    repo: 'fake-repo'
  },
  getFileJson: async (
    _path: string,
    _branch: string
  ): Promise<ReleaseConfig> => {
    return {}
  },
  createPullRequest: async (
    _pullRequest: PullRequest,
    _targetBranch: string,
    _message: string,
    _updates: Update[],
    _options?: CreatePullRequestOptions | undefined
  ) => {
    return {}
  },
  updatePullRequest: async (
    _number: number,
    _releasePullRequest: ReleasePullRequest,
    _targetBranch: string,
    _options?:
      | {
          signoffUser?: string | undefined
          fork?: boolean | undefined
          pullRequestOverflowHandler?: PullRequestOverflowHandler | undefined
        }
      | undefined
  ) => {
    return {}
  }
} as GitHub

const fakePullRequestOverflowHandler = {
  handleOverflow: async (
    _pullRequest: ReleasePullRequest,
    _maxSize?: number
  ) => {
    return _pullRequest.body.toString()
  }
} as PullRequestOverflowHandler

const defaultNextVersion = Version.parse('1.3.2')
const defaultPRBody = new PullRequestBody([
  {
    version: defaultNextVersion,
    notes: 'release notes'
  }
])

const defaultCreatedPR = {
  headBranchName: 'foo',
  baseBranchName: 'main',
  number: 42,
  title: PullRequestTitle.ofVersion(defaultNextVersion).toString(),
  body: defaultPRBody.toString(),
  labels: [],
  files: []
} as PullRequest

describe('release', () => {
  beforeEach(async () => {
    sandbox.stub(github, 'createGitHubInstance').resolves(fakeGitHub)
    sandbox
      .stub(github, 'createPullRequestOverflowHandler')
      .returns(fakePullRequestOverflowHandler)
    findMergedReleasePullRequests = sandbox.stub(
      github,
      'findMergedReleasePullRequests'
    )
    findOpenReleasePullRequests = sandbox.stub(
      github,
      'findOpenReleasePullRequests'
    )

    getFileJson = sandbox.stub(fakeGitHub, 'getFileJson')
    createPullRequest = sandbox.stub(fakeGitHub, 'createPullRequest')
    updatePullRequest = sandbox.stub(fakeGitHub, 'updatePullRequest')

    buildCandidatePR = sandbox.stub(pullRequest, 'buildCandidatePR')

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

    buildCandidatePRSpy = buildCandidatePR.resolves({
      title: PullRequestTitle.ofVersion(defaultNextVersion),
      body: defaultPRBody,
      labels: DEFAULT_LABELS,
      headRefName: pullRequest.releaseBranchName(defaultNextVersion).toString(),
      version: defaultNextVersion,
      draft: false,
      updates: []
    })

    findOpenReleasePullRequestsSpy = findOpenReleasePullRequests.resolves([])

    findMergedReleasePullRequestsSpy = findMergedReleasePullRequests.resolves(
      []
    )

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
      expect(pr).rejects.toThrow(
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
          fakeGitHub,
          'main',
          'release-1.3.x',
          Version.parse('1.3.1'),
          'always-bump-patch',
          'abc123'
        )
      ).toBe(true)
    })

    it('creates a new release PR if there are no open release PRs', async () => {
      await createReleasePR('main', 'release-1.3.x', 'abc123')

      expect(createPullRequestSpy.calledOnce).toBe(true)

      const actual = createPullRequestSpy.getCall(0).args
      expect(actual[0]).toEqual({
        headBranchName: pullRequest
          .releaseBranchName(defaultNextVersion)
          .toString(),
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

    it('updates an existing release PR if one exists', async () => {
      findOpenReleasePullRequests.resolves([
        {
          headBranchName: pullRequest
            .releaseBranchName(defaultNextVersion)
            .toString(),
          baseBranchName: 'main',
          number: 42,
          title: PullRequestTitle.ofVersion(defaultNextVersion).toString(),
          body: 'the existing body needs to be different to trigger an update',
          labels: DEFAULT_LABELS,
          files: []
        }
      ])

      await createReleasePR('main', 'release-1.3.x', 'abc123')

      expect(updatePullRequestSpy.calledOnce).toBe(true)

      const actual = updatePullRequestSpy.getCall(0).args
      expect(actual[0]).toEqual(42)
      expect(actual[1]).toEqual({
        title: PullRequestTitle.ofVersion(defaultNextVersion),
        body: defaultPRBody,
        labels: DEFAULT_LABELS,
        headRefName: pullRequest
          .releaseBranchName(defaultNextVersion)
          .toString(),
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

    it('does not update existing PR if there are no release note changes', async () => {
      findOpenReleasePullRequests.resolves([
        {
          headBranchName: pullRequest
            .releaseBranchName(defaultNextVersion)
            .toString(),
          baseBranchName: 'main',
          number: 42,
          title: PullRequestTitle.ofVersion(defaultNextVersion).toString(),
          body: defaultPRBody.toString(),
          labels: DEFAULT_LABELS,
          files: []
        }
      ])

      await createReleasePR('main', 'release-1.3.x', 'abc123')
      expect(updatePullRequestSpy.calledOnce).toBe(false)
    })
  })
})
