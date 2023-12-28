import { Version } from 'release-please/build/src/version'
import { BranchName } from 'release-please/build/src/util/branch-name'

export function releaseBranchName(version: Version): BranchName {
  return new DefaultBranchName(
    `${RELEASE_PLEASE}--branches--release-${version.toString()}`
  )
}

const RELEASE_PLEASE = 'release-please'
const DEFAULT_PATTERN = `^${RELEASE_PLEASE}--branches--(?<branch>.+)$`
class DefaultBranchName extends BranchName {
  static matches(branchName: string): boolean {
    return !!branchName.match(DEFAULT_PATTERN)
  }
  constructor(branchName: string) {
    super(branchName)
    const match = branchName.match(DEFAULT_PATTERN)
    if (match?.groups) {
      this.targetBranch = match.groups['branch']
    }
  }
  toString(): string {
    return `${RELEASE_PLEASE}--branches--${this.targetBranch}`
  }
}
