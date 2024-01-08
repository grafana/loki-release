import { getInput, setFailed, setOutput } from '@actions/core'
import { createReleasePR, prepareRelease } from './release'
import { logger } from './util'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const baseBranch = getInput('baseBranch')
    const command = getInput('command')

    const log = logger()
    log.info(`mainBranch:            ${baseBranch}`)
    log.info(`command:               ${command}`)

    //TODO:
    // * check for merged PRs that need releases created
    // * expose ability the specify command, either PR or release, as we only want to create releases on commits to main
    if (command === 'pr') {
      const releaseBranch = getInput('releaseBranch')
      const shaToRelease = getInput('shaToRelease')
      log.info(`releaseBranch:         ${releaseBranch}`)
      log.info(`shaToRelease:          ${shaToRelease}`)

      const pr = createReleasePR(baseBranch, releaseBranch, shaToRelease)

      if (pr === undefined) {
        log.info('PR is undefined, no PR created')
      }

      log.info('PR created or updated')
      setOutput('pr', JSON.stringify(pr))
    } else if (command === 'prepare-release') {
      const release = await prepareRelease(baseBranch)

      if (release === undefined) {
        log.info('nothing to release')
        return
      }

      setOutput('sha', JSON.stringify(release.sha))
      setOutput('name', JSON.stringify(release.name))
      setOutput('notes', JSON.stringify(release.notes))
    } else {
      throw new Error(`invalid command: ${command}`)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) setFailed(error.message)
  }
}
