import * as util from '../src/util'
import sinon from 'sinon'
import { Version } from 'release-please/build/src/version'
import { nextVersion, VersionUpdater } from '../src/version'
import { ReleaseConfig } from '../src/release'
import { GitHub } from 'release-please/build/src/github'
import { NoOpLogger } from './helpers'

const sandbox = sinon.createSandbox()

const fakeGithub = {
  repository: {
    owner: 'fake-owner',
    repo: 'fake-repo'
  }
} as GitHub

describe('version', () => {
  beforeEach(() => {
    sandbox.stub(util, 'logger').returns(new NoOpLogger())
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('next version', () => {
    it('returns the next version for a major bump', () => {
      const current = new Version(1, 2, 3)
      const next = nextVersion(current, 'always-bump-major', [], fakeGithub)
      expect(next).toEqual(new Version(2, 0, 0))
    })
    it('returns the next version for a minor bump', () => {
      const current = new Version(1, 2, 3)
      const next = nextVersion(current, 'always-bump-minor', [], fakeGithub)
      expect(next).toEqual(new Version(1, 3, 0))
    })
    it('returns the next version for a patch bump', () => {
      const current = new Version(1, 2, 3)
      const next = nextVersion(current, 'always-bump-patch', [], fakeGithub)
      expect(next).toEqual(new Version(1, 2, 4))
    })
  })

  describe('VersionUpdater', () => {
    const releaseConfig: ReleaseConfig = {
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
    }
    describe('updateContent', () => {
      it('does not change the content if branch config does not exist', () => {
        const updater = new VersionUpdater('release-2.1.x', 'shaToRelease', {
          version: new Version(1, 3, 2)
        })

        const newContent = updater.updateContent(
          JSON.stringify(releaseConfig, null, 2)
        )

        const updatedConfig: ReleaseConfig = JSON.parse(newContent)
        expect(updatedConfig['release-1.3.x'].currentVersion).toEqual('1.3.1')
      })

      it('should update the release file with the new version, and the sha of the version to release', () => {
        const updater = new VersionUpdater('release-1.3.x', 'shaToRelease', {
          version: new Version(1, 3, 2)
        })

        const newContent = updater.updateContent(
          JSON.stringify(releaseConfig, null, 2)
        )

        const updatedConfig: ReleaseConfig = JSON.parse(newContent)
        expect(updatedConfig['release-1.3.x'].currentVersion).toEqual('1.3.2')
        expect(updatedConfig['release-1.3.x'].releases['1.3.2']).toEqual(
          'shaToRelease'
        )
      })
    })
  })
})
