import { createSandbox, SinonStub } from 'sinon'
import { prepareRelease } from '../src/release'

import * as github from '../src/github'

import { GitHub } from 'release-please/build/src/github'
import { PullRequestBody } from 'release-please/build/src/util/pull-request-body'
import { PullRequestTitle } from 'release-please/build/src/util/pull-request-title'
import { Version } from 'release-please/build/src/version'
import { NoOpLogger, mockGitHub } from './helpers'
import { DefaultChangelogNotes } from 'release-please/build/src/changelog-notes/default'
import { parseConventionalCommits } from 'release-please/build/src/commit'

const sandbox = createSandbox()

let findMergedReleasePullRequests: SinonStub
let fakeGitHub: GitHub
let defaultPRNotes: string
let defaultPRBody: PullRequestBody
let defaultPRTitle: string

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

const log = new NoOpLogger()

describe('release', () => {
  beforeEach(async () => {
    fakeGitHub = await mockGitHub()

    sandbox.stub(github, 'createGitHubInstance').resolves(fakeGitHub)

    findMergedReleasePullRequests = sandbox.stub(
      github,
      'findMergedReleasePullRequests'
    )
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
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('prepareRelease', () => {
    it('creates a release for each merged release PR', async () => {
      findMergedReleasePullRequests.resolves([
        {
          headBranchName: `release-please--branches--release-1.3.x`,
          baseBranchName: 'release-1.3.x',
          sha: 'abc123',
          number: 42,
          title: defaultPRTitle,
          body: defaultPRBody.toString(),
          labels: [],
          files: []
        }
      ])

      const release = await prepareRelease('main', log)
      expect(release).toBeDefined()
      expect(release?.name).toEqual('v1.3.2')
    })
  })
})
