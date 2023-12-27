import sinon from 'sinon'

import * as github from '../src/github'
import { GitHub } from 'release-please/build/src/github'
import { buildCandidatePR } from '../src/pull-request'
import { parseConventionalCommits } from 'release-please/build/src/commit'
import { Version } from 'release-please/build/src/version'
import { DEFAULT_LABELS } from '../src/constants'
import { NoOpLogger } from './helpers'

const sandbox = sinon.createSandbox()
let findCommitsSinceLastRelease: sinon.SinonStub
let getFileJson: sinon.SinonStub

const fakeGitHub = {
  repository: {
    owner: 'fake-owner',
    repo: 'fake-repo'
  },
  getFileJson: async (_path: string, _branch: string) => {
    return {}
  }
} as GitHub

const noopLogger = new NoOpLogger()

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

describe('pull requests', () => {
  beforeEach(async () => {
    findCommitsSinceLastRelease = sandbox.stub(
      github,
      'findCommitsSinceLastRelease'
    )

    getFileJson = sandbox.stub(fakeGitHub, 'getFileJson')
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('buildCandidatePR', () => {
    it('returns undefined if there are no applicable commits to build a release from', async () => {
      findCommitsSinceLastRelease.resolves([])
      const pr = await buildCandidatePR(
        fakeGitHub,
        'main',
        'release-1.3.x',
        new Version(1, 3, 1),
        'always-bump-patch',
        'shaToRelease',
        noopLogger
      )
      expect(pr).toBeUndefined()
    })

    it('builds a release pull request', async () => {
      findCommitsSinceLastRelease.resolves(happyPathCommits)
      const pr = await buildCandidatePR(
        fakeGitHub,
        'main',
        'release-1.3.x',
        new Version(1, 3, 1),
        'always-bump-patch',
        'shaToRelease',
        noopLogger
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
