import { error, warning, info, debug, isDebug } from '@actions/core'
import { red, yellow, green, gray, dim } from 'chalk'
import {
  cross,
  warning as warnFigure,
  tick,
  pointer,
  pointerSmall
} from 'figures'
import { Logger } from 'release-please/build/src/util/logger'

const errorPrefix = red(cross)
const warnPrefix = yellow(warnFigure)
const infoPrefix = green(tick)
const debugPrefix = gray(pointer)
const tracePrefix = dim.gray(pointerSmall)

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface LogFn {
  <T extends object>(obj: T, msg?: string, ...args: any[]): void
  (msg: string, ...args: any[]): void
}

export class GitHubActionsLogger implements Logger {
  private includeDebug: boolean
  private includeTrace: boolean
  constructor() {
    this.includeDebug = isDebug()
    this.includeTrace = isDebug()
  }
  error: LogFn = (...args: any[]) => {
    error(`${errorPrefix} ${args.join(', ')}`)
  }
  warn: LogFn = (...args: any[]) => {
    warning(`${warnPrefix} ${args.join(', ')}`)
  }
  info: LogFn = (...args: any[]) => {
    info(`${infoPrefix} ${args.join(', ')}`)
  }
  debug: LogFn = (...args: any[]) => {
    if (this.includeDebug) debug(`${debugPrefix} ${args.join(', ')}`)
  }
  trace: LogFn = (...args: any[]) => {
    if (this.includeTrace) debug(`${tracePrefix} ${args.join(', ')}`)
  }
}

export const logger = (() => {
  let log: Logger

  return (): Logger => {
    if (log) {
      return log
    }

    log = new GitHubActionsLogger()
    return log
  }
})()
