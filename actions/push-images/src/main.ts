import { getInput, info, setFailed } from '@actions/core'
import { buildCommands } from './docker'
import { readdir } from 'fs/promises'
import { execSync } from 'child_process'

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

    const files = await readdir(imageDir)
    const commands = buildCommands(
      imagePrefix,
      files.filter(f => f.endsWith('.tar'))
    )

    for (const command of commands) {
      info(command)
      const stdout = execSync(command, { cwd: imageDir })
      info(stdout.toString())
    }
  } catch (err) {
    // Fail the workflow run if an error occurs
    if (err instanceof Error) setFailed(err.message)
  }
}
