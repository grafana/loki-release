import { Version } from 'release-please/build/src/version'
import { ConventionalCommit } from 'release-please/build/src/commit'
import { buildVersioningStrategy } from 'release-please/build/src/factories/versioning-strategy-factory'
import { GitHub } from 'release-please/build/src/github'

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
