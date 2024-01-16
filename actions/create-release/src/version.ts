import { Version } from 'release-please/build/src/version'
import { ConventionalCommit } from 'release-please/build/src/commit'
import { buildVersioningStrategy } from 'release-please/build/src/factories/versioning-strategy-factory'
import { GitHub, GitHubTag } from 'release-please/build/src/github'
import { Updater } from 'release-please/build/src/update'
import { UpdateOptions } from 'release-please/build/src/updaters/default'
import { ReleaseConfig } from './release'
import { logger } from './util'

export function nextVersion(
  currentVersion: Version,
  type: string,
  commits: ConventionalCommit[],
  github: GitHub
): Version {
  const log = logger()
  log.info(`building versioning strategy for ${type}`)
  const versioningStrategy = buildVersioningStrategy({
    type,
    github
  })
  return versioningStrategy.bump(currentVersion, commits)
}

export function previousVersion(
  currentVersion: Version,
  tags: Record<string, GitHubTag>
): Version {
  const { major, minor, patch } = currentVersion

  const previousPatch = new Version(major, minor, patch - 1)
  let previousMinor = new Version(major, minor - 1, 0)
  let previousMajor = new Version(major - 1, 0, 0)

  let foundMinor = false
  let foundMajor = false
  for (const tag of Object.keys(tags)) {
    const version = Version.parse(tag)
    if (version.toString() === previousPatch.toString()) {
      return previousPatch
    }

    if (version.minor === minor - 1) {
      foundMinor = true
      if (version.patch > previousMinor.patch) {
        previousMinor = version
      }
    }

    if (version.major === major - 1) {
      foundMajor = true
      if (version.minor > previousMajor.minor) {
        previousMajor = version
      }

      if (
        version.minor === previousMajor.minor &&
        version.patch > previousMajor.patch
      ) {
        previousMajor = version
      }
    }
  }

  if (foundMinor) {
    return previousMinor
  }
  if (foundMajor) {
    return previousMajor
  }
  return currentVersion
}

export class VersionUpdater implements Updater {
  version: Version
  releaseBranch: string
  sha: string
  constructor(releaseBranch: string, sha: string, options: UpdateOptions) {
    this.version = options.version
    this.releaseBranch = releaseBranch
    this.sha = sha
  }

  /**
   * Given initial file contents, return updated contents.
   * @param {string} content The initial content
   * @returns {string} The updated content
   */
  updateContent(content: string): string {
    const config: ReleaseConfig = JSON.parse(content)
    const branchConfig = config[this.releaseBranch]
    if (!branchConfig) {
      return content
    }

    branchConfig.currentVersion = this.version.toString()
    branchConfig.releases[this.version.toString()] = this.sha

    config[this.releaseBranch] = branchConfig

    return JSON.stringify(config, null, 2)
  }
}
