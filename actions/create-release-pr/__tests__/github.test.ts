import * as github from '../src/github'
import * as sinon from 'sinon'

import { GitHub } from 'release-please/build/src/github'
import { TagName } from 'release-please/build/src/util/tag-name'
import { Version } from 'release-please/build/src/version'
import { mockGitHub, mockCommits, mockTags } from './helpers'

const sandbox = sinon.createSandbox()

let gh: GitHub

describe('github', () => {
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

  beforeEach(async () => {
    gh = await mockGitHub()
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
      const expectedVersion = new Version(1, 3, 1)
      const expectedPreviousVersion = new TagName(expectedVersion)
      const commits = await github.findCommitsSinceLastRelease(
        gh,
        'release-1.3.x',
        expectedPreviousVersion
      )
      expect(commits).toHaveLength(2)
    })

    it('returns an empty array if the no tag for the previous version is found', async () => {
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
      const expectedVersion = new Version(1, 3, 1)
      const expectedPreviousVersion = new TagName(expectedVersion)
      const commits = await github.findCommitsSinceLastRelease(
        gh,
        'release-1.3.x',
        expectedPreviousVersion
      )
      expect(commits).toHaveLength(0)
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
      const expectedVersion = new Version(1, 3, 1)
      const expectedPreviousVersion = new TagName(expectedVersion)
      const commits = await github.findCommitsSinceLastRelease(
        gh,
        'release-1.3.x',
        expectedPreviousVersion
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
      const expectedVersion = new Version(1, 3, 1)
      const expectedPreviousVersion = new TagName(expectedVersion)
      const commits = await github.findCommitsSinceLastRelease(
        gh,
        'release-1.3.x',
        expectedPreviousVersion
      )
      expect(commits).toHaveLength(2)

      const firstCommit = commits[0]
      expect(firstCommit.type).toEqual('feat')
      expect(firstCommit.scope).toEqual('loki')
      expect(firstCommit.breaking).toEqual(false)
    })
  })
})
