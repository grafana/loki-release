import sinon from 'sinon'
import { createReleasePR } from '../src/release'

import * as github from '../src/github'
import { Version } from 'release-please/build/src/version'
import { GitHub } from 'release-please/build/src/github'
import { parseConventionalCommits } from 'release-please/build/src/commit'

const sandbox = sinon.createSandbox()
let findCommitsSinceLastRelease: sinon.SinonStub

describe('release', () => {
  beforeEach(async () => {
    sandbox.stub(github, 'createGitHubInstance').resolves({
      repository: {
        owner: 'fake-owner',
        repo: 'fake-repo'
      }
    } as GitHub)
    findCommitsSinceLastRelease = sandbox.stub(
      github,
      'findCommitsSinceLastRelease'
    )
  })

  afterEach(() => {
    sandbox.restore()
  })
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
    }
  ]

  describe('buildPullRequests', () => {
    it('returns undefined if there are no applicable commits to build a release from', async () => {
      findCommitsSinceLastRelease.resolves([])
      const pr = await createReleasePR(
        'main',
        'release-1.3.x',
        new Version(1, 3, 1),
        'always-bump-patch'
      )
      expect(pr).toBeUndefined()
    })

    it('builds a release pull request', async () => {
      findCommitsSinceLastRelease.resolves(
        parseConventionalCommits(happyPathCommits)
      )
      const pr = await createReleasePR(
        'main',
        'release-1.3.x',
        new Version(1, 3, 1),
        'always-bump-patch'
      )

      expect(pr).toBeDefined()
      expect(pr?.title.toString()).toEqual('chore: release 1.3.2')
      expect(pr?.body.toString())
        .toEqual(`:robot: I have created a release *beep* *boop*
---


## [1.3.2](https://github.com/fake-owner/fake-repo/compare/v1.3.1...v1.3.2) (2023-12-14)


### Features

* **loki:** some cool new feature ([xzy123](https://github.com/fake-owner/fake-repo/commit/xzy123))

---
This PR was generated with [Release Please](https://github.com/googleapis/release-please). See [documentation](https://github.com/googleapis/release-please#release-please).`)
    })
  })
})
