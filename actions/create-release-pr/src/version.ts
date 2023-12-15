import { Version } from 'release-please/build/src/version'
import { ConventionalCommit } from 'release-please/build/src/commit'
import { buildVersioningStrategy } from 'release-please/build/src/factories/versioning-strategy-factory'
import { GitHub } from 'release-please/build/src/github'
import { Updater } from 'release-please/build/src/update'
import { UpdateOptions } from 'release-please/build/src/updaters/default'
import { ReleaseConfig } from './release'

export function nextVersion(
  currentVersion: Version,
  type: string,
  commits: ConventionalCommit[],
  github: GitHub
): Version {
  const versioningStrategy = buildVersioningStrategy({
    type,
    github
  })
  return versioningStrategy.bump(currentVersion, commits)
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
