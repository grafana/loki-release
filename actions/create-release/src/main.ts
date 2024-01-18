import { getInput, setFailed, setOutput } from '@actions/core'
import { prepareRelease } from './release'
import { logger } from './util'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const baseBranch = getInput('baseBranch')

    const log = logger()
    log.info(`baseBranch:            ${baseBranch}`)

    const release = await prepareRelease(baseBranch)

    if (release === undefined) {
      log.info('nothing to release')
      setOutput('createRelease', false)
      return
    }

    setOutput('createRelease', true)
    setOutput('sha', JSON.stringify(release.sha))
    setOutput('name', JSON.stringify(release.name))
    setOutput('notes', JSON.stringify(release.notes))
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) setFailed(error.message)
  }
}
