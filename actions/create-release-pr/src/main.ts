import { getInput, info, setFailed } from '@actions/core'
import { VersioningStrategy, createReleasePR } from './release'
import { exec } from '@actions/exec'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const mainBranch = getInput('mainBranch')
    const releaseBranch = getInput('releaseBranch')
    const _versioningStrategy = getInput(
      'versioningStrategy'
    ) as keyof typeof VersioningStrategy
    const versioningStrategy = VersioningStrategy[_versioningStrategy]

    info(`mainBranch:         ${mainBranch}`)
    info(`releaseBranch:         ${releaseBranch}`)
    info(`versioningStrategy:  ${versioningStrategy}`)

    createReleasePR(mainBranch, releaseBranch, versioningStrategy)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) setFailed(error.message)
  }
}
