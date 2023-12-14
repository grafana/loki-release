import { getInput, info, setFailed } from '@actions/core'
import { createReleasePR } from './release'
import { Version } from 'release-please/build/src/version'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const mainBranch = getInput('mainBranch')
    const releaseBranch = getInput('releaseBranch')

    info(`mainBranch:         ${mainBranch}`)
    info(`releaseBranch:         ${releaseBranch}`)

    //TODO: need to get current version and versioning strategy from release.json
    const currentVersion = new Version(1, 0, 0)
    const versioningStrategy = 'always-bump-patch'
    createReleasePR(
      mainBranch,
      releaseBranch,
      currentVersion,
      versioningStrategy
    )

    //TODO: do something with the created PR
    // the PR will also need to include the actual changed files
    // the function above so far just creates metadata
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) setFailed(error.message)
  }
}
