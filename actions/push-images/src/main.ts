import { getInput, info, setFailed, isDebug, debug } from '@actions/core'
import { buildCommands, buildDockerPluginCommands } from './docker'
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
    const buildDir = getInput('buildDir')

    const isPlugin = getInput('isPlugin').toLowerCase() === 'true'
    const isLatest = getInput('isLatest').toLowerCase() === 'true'

    info(`imageDir:            ${imageDir}`)
    info(`imagePrefix:         ${imagePrefix}`)
    info(`isPlugin:           ${isPlugin}`)
    info(`buildDir:           ${buildDir}`)
    info(`isLatest:           ${isLatest}`)
    if (isDebug()) {
      debug('listing files in image directory')
      const lsCommand = execSync('ls', { cwd: imageDir })
      debug(lsCommand.toString())
    }

    const tarFiles = (await readdir(imageDir)).filter(f => f.endsWith('.tar'))
    const commands = isPlugin
      ? buildDockerPluginCommands(
          imagePrefix,
          buildDir,
          imageDir,
          tarFiles,
          isLatest
        )
      : buildCommands(imagePrefix, imageDir, tarFiles, isLatest)

    if (commands.length === 0) {
      throw new Error('failed to push any images')
    }

    for (const command of commands) {
      info(command)
      const stdout = execSync(command)
      info(stdout.toString())
    }

    if (isDebug()) {
      debug('running docker images ls to see imported images')
      const stdout = execSync('docker images ls', { cwd: imageDir })
      debug(stdout.toString())
    }
  } catch (err) {
    // Fail the workflow run if an error occurs
    if (err instanceof Error) setFailed(err.message)
  }
}
