import { Version } from 'release-please/build/src/version'
import { nextVersion } from '../src/version'
import { GitHub } from 'release-please/build/src/github'

const fakeGithub = {
  repository: {
    owner: 'fake-owner',
    repo: 'fake-repo'
  }
} as GitHub

describe('version', () => {
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
})
