import sinon from 'sinon'
import { createReleasePR, buildReleasePR } from '../src/release'

import * as github from '../src/github'

import { Version } from 'release-please/build/src/version'
import { GitHub } from 'release-please/build/src/github'
import { parseConventionalCommits } from 'release-please/build/src/commit'

const sandbox = sinon.createSandbox()
let findCommitsSinceLastRelease: sinon.SinonStub
let getFileJson: sinon.SinonStub

const fakeGitHub = {
  repository: {
    owner: 'fake-owner',
    repo: 'fake-repo'
  },
  getFileJson: async (path: string, branch: string) => {
    return {}
  }
} as GitHub

describe('release', () => {
  beforeEach(async () => {
    sandbox.stub(github, 'createGitHubInstance').resolves(fakeGitHub)
    findCommitsSinceLastRelease = sandbox.stub(
      github,
      'findCommitsSinceLastRelease'
    )
    getFileJson = sandbox.stub(fakeGitHub, 'getFileJson')
  })

  afterEach(() => {
    sandbox.restore()
  })

  const happyPathCommits = parseConventionalCommits([
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
    }
  ])

  describe('createReleasePR', () => {
    it('gets the release config from the base branch, and picks the correct config based on release branch', async () => {
      findCommitsSinceLastRelease.resolves(happyPathCommits)
      const getFileJsonSpy = getFileJson.resolves({
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

      const pr = await createReleasePR('main', 'release-1.3.x')

      expect(getFileJsonSpy.calledOnce).toBe(true)
      getFileJsonSpy.calledWith('release.json', 'main')

      expect(pr).toBeDefined()
      expect(pr?.title.toString()).toEqual('chore: release 1.3.2')
    })


    // TODO: we need a happy path test of the updaters
    // maybe 1 for an already open PR, and 1 for a new PR?
    // this will cover most of the logic copied from release-please
  })

  describe('buildReleasePR', () => {
    it('returns undefined if there are no applicable commits to build a release from', async () => {
      findCommitsSinceLastRelease.resolves([])
      const pr = await buildReleasePR(
        fakeGitHub,
        'main',
        'release-1.3.x',
        new Version(1, 3, 1),
        'always-bump-patch',
        'shaToRelease'
      )
      expect(pr).toBeUndefined()
    })

    it('builds a release pull request', async () => {
      findCommitsSinceLastRelease.resolves(happyPathCommits)
      const pr = await buildReleasePR(
        fakeGitHub,
        'main',
        'release-1.3.x',
        new Version(1, 3, 1),
        'always-bump-patch',
        'shaToRelease'
      )

      const today = new Date().toISOString().split('T')[0]

      expect(pr).toBeDefined()
      expect(pr?.title.toString()).toEqual('chore: release 1.3.2')
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
