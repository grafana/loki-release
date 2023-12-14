import { Commit } from 'release-please/build/src/commit'
import { GitHub, GitHubTag } from 'release-please/build/src/github'
import { Logger } from 'release-please/build/src/util/logger'

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
  sandbox: sinon.SinonSandbox,
  github: GitHub,
  commits: Commit[]
): sinon.SinonStub {
  async function* fakeGenerator() {
    for (const commit of commits) {
      yield commit
    }
  }

  return sandbox.stub(github, 'mergeCommitIterator').returns(fakeGenerator())
}

export function mockTags(
  sandbox: sinon.SinonSandbox,
  github: GitHub,
  tags: GitHubTag[]
): sinon.SinonStub {
  async function* fakeGenerator() {
    for (const tag of tags) {
      yield tag
    }
  }
  return sandbox.stub(github, 'tagIterator').returns(fakeGenerator())
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface LogFn {
  <T extends object>(obj: T, msg?: string, ...args: any[]): void
  (msg: string, ...args: any[]): void
}

class NoOpLogger implements Logger {
  error: LogFn = (..._: any[]) => {}
  warn: LogFn = (..._: any[]) => {}
  info: LogFn = (..._: any[]) => {}
  debug: LogFn = (..._: any[]) => {}
  trace: LogFn = (..._: any[]) => {}
}
