import { getInput, info, setFailed, setOutput } from '@actions/core'
import { createReleasePR } from './release'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const baseBranch = getInput('baseBranch')
    const releaseBranch = getInput('releaseBranch')
    const shaToRelease = getInput('shaToRelease')

    info(`mainBranch:            ${baseBranch}`)
    info(`releaseBranch:         ${releaseBranch}`)
    info(`shaToRelease:          ${shaToRelease}`)

    //TODO:
    // * check for merged PRs that need releases created
    // * expose ability the specify command, either PR or release, as we only want to create releases on commits to main

    const pr = createReleasePR(baseBranch, releaseBranch, shaToRelease)

    if (pr === undefined) {
      info('No PR created')
    }

    setOutput('pr', JSON.stringify(pr))
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) setFailed(error.message)
  }
}
