import { Commit } from 'release-please/build/src/commit'
import { GitHub, GitHubTag } from 'release-please/build/src/github'
import { Logger } from 'release-please/build/src/util/logger'
import { LogFn } from '../src/util'
import { SinonSandbox, SinonStub } from 'sinon'

export async function mockGitHub(): Promise<GitHub> {
  return GitHub.create({
    owner: 'fake-owner',
    repo: 'fake-repo',
    defaultBranch: 'main',
    token: 'fake-token',
    logger: new NoOpLogger()
  })
}

export function mockCommits(
  sandbox: SinonSandbox,
  github: GitHub,
  commits: Commit[]
): SinonStub {
  async function* fakeGenerator() {
    for (const commit of commits) {
      yield commit
    }
  }

  return sandbox.stub(github, 'mergeCommitIterator').returns(fakeGenerator())
}

export function mockTags(
  sandbox: SinonSandbox,
  github: GitHub,
  tags: GitHubTag[]
): SinonStub {
  async function* fakeGenerator() {
    for (const tag of tags) {
      yield tag
    }
  }
  return sandbox.stub(github, 'tagIterator').returns(fakeGenerator())
}

export class NoOpLogger implements Logger {
  error: LogFn = (..._: any[]) => {}
  warn: LogFn = (..._: any[]) => {}
  info: LogFn = (..._: any[]) => {}
  debug: LogFn = (..._: any[]) => {}
  trace: LogFn = (..._: any[]) => {}
}
