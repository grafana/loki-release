import {
  createGitHubInstance,
  findMergedReleasePullRequests
} from '../src/github'
import { GitHub } from 'release-please/build/src/github'
import * as sinon from 'sinon'
import * as core from '@actions/core'
import { PullRequest } from 'release-please/build/src/pull-request'
import { DEFAULT_PENDING_LABELS, DEFAULT_TAGGED_LABELS } from '../src/constants'

const sandbox = sinon.createSandbox()

const mockGitHub = (pullRequests: PullRequest[]): GitHub => {
  return {
    async *pullRequestIterator(
      _baseBranch: string,
      _state: string,
      _maxLength: number,
      _ascending: boolean
    ): AsyncGenerator<PullRequest, void, void> {
      for (const pr of pullRequests) {
        yield pr
      }
    }
  } as unknown as GitHub
}

describe('github', () => {
  describe('createGitHubInstance', () => {
    it('gets config from the action inputs', async () => {
      const getInputMock = sandbox.stub(core, 'getInput')
      getInputMock.withArgs('repoUrl').returns('test-owner/test-repo')
      getInputMock.withArgs('token').returns('super-secret-token')

      const gh = await createGitHubInstance('main')

      expect(gh).toBeDefined()
      expect(gh.repository).toEqual({
        owner: 'test-owner',
        repo: 'test-repo',
        defaultBranch: 'main'
      })
    })
  })

  describe('findMergedReleasePullRequests', () => {
    it('should return only pending, and not tagged, merged pull requests', async () => {
      const mockPullRequests = [
        { number: 1, title: 'PR 1', labels: DEFAULT_TAGGED_LABELS },
        { number: 2, title: 'PR 2', labels: DEFAULT_PENDING_LABELS },
        {
          number: 3,
          title: 'PR 3',
          labels: DEFAULT_PENDING_LABELS.concat('foo')
        },
        { number: 4, title: 'PR 4', labels: ['foo'] }
      ] as unknown as PullRequest[]
      const gh = mockGitHub(mockPullRequests)

      const result = await findMergedReleasePullRequests('main', gh)

      expect(result).toHaveLength(2)
      expect(result.map(r => r.number).sort((a, b) => (a < b ? a : b))).toEqual(
        [2, 3]
      )
    })

    it('should return an empty array if all merged pull requests have been tagged', async () => {
      const mockPullRequests = [
        { number: 1, title: 'PR 1', labels: DEFAULT_TAGGED_LABELS },
        {
          number: 2,
          title: 'PR 2',
          labels: DEFAULT_TAGGED_LABELS.concat('foo')
        }
      ] as unknown as PullRequest[]
      const gh = mockGitHub(mockPullRequests)

      const result = await findMergedReleasePullRequests('main', gh)

      expect(result).toHaveLength(0)
    })
  })
})
