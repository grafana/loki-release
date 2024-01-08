import { Version } from 'release-please/build/src/version'
import { BranchName } from 'release-please/build/src/util/branch-name'

export function releaseBranchNameFromVersion(version: Version): BranchName {
  return new DefaultBranchName(
    `${RELEASE_PLEASE}--branches--release-${version.toString()}`
  )
}

export function releaseBranchVersionFromName(
  branch: string
): Version | undefined {
  const branchName = new DefaultBranchName(branch)

  return branchName.getVersion()
}

export const RELEASE_PLEASE = 'release-please'
const DEFAULT_PATTERN = `^${RELEASE_PLEASE}--branches--release-(?<version>.+)$`
export class DefaultBranchName extends BranchName {
  releaseBranch?: string
  getReleaseBranch(): string | undefined {
    return this.releaseBranch
  }

  static matches(branchName: string): boolean {
    return !!branchName.match(DEFAULT_PATTERN)
  }
  constructor(branchName: string) {
    super(branchName)
    const match = branchName.match(DEFAULT_PATTERN)
    if (match?.groups) {
      const version = Version.parse(match.groups['version'])
      this.version = version
      this.releaseBranch = `release-${version.major}.${version.minor}.x`
    }
  }
  toString(): string {
    return `${RELEASE_PLEASE}--branches--${this.releaseBranch}`
  }
}
