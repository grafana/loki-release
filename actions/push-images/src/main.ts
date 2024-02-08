import { getInput, info, debug, setFailed } from '@actions/core'
import { buildCommands } from './docker'
import { readdir } from 'fs/promises'
import { exec } from 'child_process'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const imageDir = getInput('imageDir')
    const imagePrefix = getInput('imagePrefix')

    info(`imageDir:            ${imageDir}`)
    info(`imagePrefix:         ${imagePrefix}`)
    const files = await readdir(`${imageDir}/*.tar`)

    const commands = buildCommands(imagePrefix, files)

    for (const command of commands) {
      debug(`executing: ${command}`)
      exec(command)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) setFailed(error.message)
  }
}
