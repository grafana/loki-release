import { GitHubReleaser, createGitHubInstance } from '../src/github'
import * as sinon from 'sinon'
import * as core from '@actions/core'

import { GitHub } from 'release-please/build/src/github'
import { Version } from 'release-please/build/src/version'
import {
  mockGitHub,
  mockCommits,
  mockTags,
  NoOpLogger,
  mockOctokit
} from './helpers'
import { DEFAULT_LABELS } from '../src/constants'
import { Octokit } from '@octokit/rest'

const sandbox = sinon.createSandbox()
let gh: GitHub
let octokit: Octokit
let gitHubReleaser: GitHubReleaser

const happyPathCommits = [
  // This feature will be release in 1.3.2
  {
    sha: 'xzy123',
    message: 'feat(loki): some cool new feature',
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

  // This is the actual commit that was released as 1.3.1
  {
    sha: 'abc123',
    message: 'bug: a bug fixed in 1.3.1',
    files: []
  },

  // This feature is present in 1.3.1
  {
    sha: 'def123',
    message: 'feat: this was released in 1.3.1',
    files: []
  }
]

describe('gitHubReleaser', () => {
  beforeEach(async () => {
    gh = await mockGitHub()
    octokit = mockOctokit()
    gitHubReleaser = new GitHubReleaser(gh, octokit, new NoOpLogger())
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('findCommitsSinceLastRelease', () => {
    it('returns all commits since the last release', async () => {
      mockCommits(sandbox, gh, happyPathCommits)

      mockTags(sandbox, gh, [
        {
          name: 'v1.3.1',
          sha: 'abc123'
        }
      ])
      const version = new Version(1, 3, 1)
      const commits = await gitHubReleaser.findCommitsSinceLastRelease(
        'release-1.3.x',
        'main',
        version
      )
      expect(commits).toHaveLength(2)
    })

    it('throws an error if no tag for the previous version is found', async () => {
      mockCommits(sandbox, gh, happyPathCommits)

      mockTags(sandbox, gh, [
        {
          name: 'v1.2.1',
          sha: 'abc123'
        },
        {
          name: 'v1.3.2',
          sha: 'abc123'
        }
      ])
      const version = new Version(1, 3, 1)
      const commits = gitHubReleaser.findCommitsSinceLastRelease(
        'release-1.3.x',
        'main',
        version
      )
      await expect(commits).rejects.toThrow()
    })

    it('returns an empty array if the no commits are found since the previous release', async () => {
      const cms = [
        {
          sha: 'abc123',
          message: 'bug: a bug fixed in 1.3.1',
          files: []
        },

        // This feature is present in 1.3.1
        {
          sha: 'def123',
          message: 'feat: this was released in 1.3.1',
          files: []
        }
      ]
      mockCommits(sandbox, gh, cms)

      mockTags(sandbox, gh, [
        {
          name: 'v1.3.1',
          sha: 'abc123'
        }
      ])
      const version = new Version(1, 3, 1)
      const commits = await gitHubReleaser.findCommitsSinceLastRelease(
        'release-1.3.x',
        'main',
        version
      )
      expect(commits).toHaveLength(0)
    })

    it('converts found commits to conventional commits', async () => {
      mockCommits(sandbox, gh, happyPathCommits)

      mockTags(sandbox, gh, [
        {
          name: 'v1.3.1',
          sha: 'abc123'
        }
      ])
      const version = new Version(1, 3, 1)
      const commits = await gitHubReleaser.findCommitsSinceLastRelease(
        'release-1.3.x',
        'main',
        version
      )
      expect(commits).toHaveLength(2)

      const firstCommit = commits[0]
      expect(firstCommit.type).toEqual('feat')
      expect(firstCommit.scope).toEqual('loki')
      expect(firstCommit.breaking).toEqual(false)
    })
  })

  describe('createGitHubInstance', () => {
    it('gets config from the action inputs', async () => {
      const getInputMock = sandbox.stub(core, 'getInput')
      getInputMock.withArgs('repoUrl').returns('test-owner/test-repo')
      getInputMock.withArgs('token').returns('super-secret-token')

      const github = await createGitHubInstance('main')

      expect(github).toBeDefined()
      expect(github.repository).toEqual({
        owner: 'test-owner',
        repo: 'test-repo',
        defaultBranch: 'main'
      })
    })
  })

  describe('buildCandidatePR', () => {
    beforeEach(() => {
      mockTags(sandbox, gh, [
        {
          name: 'v1.3.1',
          sha: 'abc123'
        }
      ])
    })

    it('returns undefined if there are no applicable commits to build a release from', async () => {
      mockCommits(sandbox, gh, [])
      const pr = await gitHubReleaser.buildCandidatePR(
        'main',
        'release-1.3.x',
        new Version(1, 3, 1),
        'always-bump-patch',
        'shaToRelease'
      )
      expect(pr).toBeUndefined()
    })

    it('builds a release pull request', async () => {
      mockCommits(sandbox, gh, happyPathCommits)
      const pr = await gitHubReleaser.buildCandidatePR(
        'main',
        'release-1.3.x',
        new Version(1, 3, 1),
        'always-bump-patch',
        'shaToRelease'
      )

      const today = new Date().toISOString().split('T')[0]

      expect(pr).toBeDefined()
      expect(pr?.title.toString()).toEqual('chore: release 1.3.2')
      expect(pr?.headRefName).toEqual('release-please--branches--release-1.3.2')
      expect(pr?.version).toEqual(new Version(1, 3, 2))
      expect(pr?.draft).toEqual(false)
      expect(pr?.labels).toEqual(DEFAULT_LABELS)
      expect(pr?.body.toString())
        .toEqual(`:robot: I have created a release *beep* *boop*
---


## [1.3.2](https://github.com/fake-owner/fake-repo/compare/v1.3.1...v1.3.2) (${today})


### Features

* **loki:** some cool new feature ([xzy123](https://github.com/fake-owner/fake-repo/commit/xzy123))

---
This PR was generated with [Release Please](https://github.com/googleapis/release-please). See [documentation](https://github.com/googleapis/release-please#release-please).`)
    })
  })
})
