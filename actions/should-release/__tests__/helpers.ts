/* eslint-disable @typescript-eslint/no-explicit-any */
import { GitHub } from 'release-please/build/src/github'
import { Logger } from 'release-please/build/src/util/logger'
import { LogFn } from '../src/util'

export async function mockGitHub(): Promise<GitHub> {
  return GitHub.create({
    owner: 'fake-owner',
    repo: 'fake-repo',
    defaultBranch: 'main',
    token: 'fake-token',
    logger: new NoOpLogger()
  })
}

export class NoOpLogger implements Logger {
  error: LogFn = (..._: any[]) => {}
  warn: LogFn = (..._: any[]) => {}
  info: LogFn = (..._: any[]) => {}
  debug: LogFn = (..._: any[]) => {}
  trace: LogFn = (..._: any[]) => {}
}
