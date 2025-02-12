import * as sinon from 'sinon'
import { createSandbox } from 'sinon'
import { isLatestVersion, shouldRelease } from '../src/release'

import * as github from '../src/github'

import { GitHub, GitHubTag } from 'release-please/build/src/github'
import { PullRequestBody } from 'release-please/build/src/util/pull-request-body'
import { PullRequestTitle } from 'release-please/build/src/util/pull-request-title'
import { Version } from 'release-please/build/src/version'
import { mockGitHub } from './helpers'
import { DefaultChangelogNotes } from 'release-please/build/src/changelog-notes/default'
import { parseConventionalCommits } from 'release-please/build/src/commit'

const sandbox = createSandbox()

let findMergedReleasePullRequests: sinon.SinonStub
let tagIterator: sinon.SinonStub
let fakeGitHub: GitHub
let defaultPRNotes: string
let defaultPRTitle: string

const defaultNextVersion = Version.parse('1.3.2')

const defaultFooter =
  'Merging this PR will release the [artifacts](https://loki-build-artifacts.storage.googleapis.com/def456) of def456'

const prTitlePattern = 'chore${scope}: release${component} ${version}'

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

describe('release', () => {
  beforeEach(async () => {
    fakeGitHub = await mockGitHub()

    sandbox.stub(github, 'createGitHubInstance').resolves(fakeGitHub)

    findMergedReleasePullRequests = sandbox.stub(
      github,
      'findMergedReleasePullRequests'
    )
    tagIterator = sandbox.stub(github, 'getAllTags')
    defaultPRNotes = await new DefaultChangelogNotes().buildNotes(commits, {
      owner: 'fake-owner',
      repository: 'fake-repo',
      targetBranch: 'main',
      version: defaultNextVersion.toString(),
      previousTag: '1.3.1',
      currentTag: '1.3.2',
      commits
    })

    defaultPRTitle = PullRequestTitle.ofVersion(defaultNextVersion).toString()
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('shouldRelease', () => {
    const setup = (
      footer = defaultFooter,
      tags = {
        'v1.3.1': {
          name: 'v1.3.1',
          sha: 'abs123'
        } as GitHubTag
      }
    ): void => {
      findMergedReleasePullRequests.resolves([
        {
          headBranchName: `release-please--branches--release-1.3.x`,
          baseBranchName: 'release-1.3.x',
          sha: 'abc123',
          number: 42,
          title: defaultPRTitle,
          body: new PullRequestBody(
            [
              {
                version: defaultNextVersion,
                notes: defaultPRNotes
              }
            ],
            {
              footer
            }
          ).toString(),
          labels: [],
          files: []
        }
      ])

      tagIterator.resolves(tags)
    }

    it('creates a release for each merged release PR', async () => {
      setup()

      const release = await shouldRelease('main', prTitlePattern)
      expect(release).toBeDefined()
      expect(release?.name).toEqual('v1.3.2')
    })

    it('parses the sha to release from the pull request footer', async () => {
      setup()

      const release = await shouldRelease('main', prTitlePattern)
      expect(release).toBeDefined()
      expect(release?.sha).toEqual('def456')
    })

    it('returns undefined if it cannot parse a sha from the footer', async () => {
      setup('not a valid footer')

      const release = await shouldRelease('main', prTitlePattern)
      expect(release).not.toBeDefined()
    })

    it('determines if the release is the latest version', async () => {
      const tags = {
        'v1.3.1': {
          name: 'v1.3.1',
          sha: 'abs123'
        } as GitHubTag
      }
      setup(defaultFooter, tags)

      const release = await shouldRelease('main', prTitlePattern)
      expect(release?.isLatest).toEqual(true)
    })

    it('determines if the release is not the latest version', async () => {
      const tags = {
        'v1.3.1': {
          name: 'v1.3.1',
          sha: 'abs123'
        } as GitHubTag,
        'v1.4.1': {
          name: 'v1.4.1',
          sha: 'def456'
        } as GitHubTag
      }
      setup(defaultFooter, tags)

      const release = await shouldRelease('main', prTitlePattern)
      expect(release?.isLatest).toEqual(false)
    })
  })

  describe('isLatestVersion', () => {
    const createTags = (versions: string[]): Record<string, GitHubTag> => {
      const tags: Record<string, GitHubTag> = {}
      for (const v of versions) {
        tags[v] = {
          name: v,
          sha: `sha-${v}`
        }
      }
      return tags
    }

    const defaultTags = {
      'v1.3.1': {
        name: 'v1.3.1',
        sha: 'abc123'
      },
      'v1.3.2': {
        name: 'v1.3.2',
        sha: 'def456'
      }
    }

    it('returns true if the version is the latest', () => {
      let ver = Version.parse('1.3.3')
      expect(isLatestVersion(ver, defaultTags)).toBe(true)

      ver = Version.parse('1.4.0')
      expect(isLatestVersion(ver, defaultTags)).toBe(true)

      ver = Version.parse('2.0.0')
      expect(isLatestVersion(ver, defaultTags)).toBe(true)
    })

    it('returns false if the version is not the latest', () => {
      let ver = Version.parse('1.2.9')
      expect(isLatestVersion(ver, defaultTags)).toBe(false)

      ver = Version.parse('1.3.2')
      expect(isLatestVersion(ver, defaultTags)).toBe(true)

      ver = Version.parse('1.2.0')
      expect(isLatestVersion(ver, defaultTags)).toBe(false)

      ver = Version.parse('0.2.0')
      expect(isLatestVersion(ver, defaultTags)).toBe(false)
    })

    it('handles equal versions correctly', () => {
      const tagsWithEqual = {
        'v3.3.3': {
          name: 'v3.3.3',
          sha: 'abc123'
        },
        'v1.3.2': {
          name: 'v1.3.2',
          sha: 'def456'
        }
      }

      // This should be false because 3.3.3 exists
      let ver = Version.parse('3.3.2')
      expect(isLatestVersion(ver, tagsWithEqual)).toBe(false)

      // This should be true because it's equal to the highest version
      ver = Version.parse('3.3.3')
      expect(isLatestVersion(ver, tagsWithEqual)).toBe(true)

      // This should be true because it's higher than any existing version
      ver = Version.parse('3.3.4')
      expect(isLatestVersion(ver, tagsWithEqual)).toBe(true)
    })

    it('handles mixed version formats', () => {
      const mixedTags = createTags([
        'v3.4.0',
        'helm-loki-6.26.0',
        'v3.3.0',
        'helm-loki-6.25.0',
        'v3.5.0',
        'helm-loki-6.27.0'
      ])

      // Test semantic versions
      expect(isLatestVersion(Version.parse('3.4.0'), mixedTags)).toBeFalsy()
      expect(isLatestVersion(Version.parse('3.5.0'), mixedTags)).toBeTruthy()
      expect(isLatestVersion(Version.parse('3.3.0'), mixedTags)).toBeFalsy()

      // Version that doesn't match pattern should be ignored
      expect(isLatestVersion(Version.parse('6.25.0'), mixedTags)).toBeTruthy()
      expect(isLatestVersion(Version.parse('6.27.0'), mixedTags)).toBeTruthy()
    })
  })
})
