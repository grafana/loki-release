import { getInput, info, setFailed } from '@actions/core'
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

    //TODO: handle PR being undefined
    createReleasePR(baseBranch, releaseBranch, shaToRelease)

    //TODO: do something with the created PR
    // the PR will also need to include the actual changed files
    // the function above so far just creates metadata
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) setFailed(error.message)
  }
}
