import { readFileSync } from 'fs'

interface Release {
  title?: {
    version?: {
      major: number
      minor: number
      patch: number
      preRelease?: string
    }
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

let data: string
try {
  data = readFileSync('./release.json', 'utf8')
} catch (err: unknown) {
  console.error(`Failed to read file: ${errMsg(err)}`)
  process.exit(1)
}

let release: Release[]
try {
  release = JSON.parse(data) as Release[]
} catch (err: unknown) {
  console.error(`Failed to parse JSON: ${errMsg(err)}`)
  process.exit(1)
}

const version = release[0]?.title?.version
if (!version) {
  console.error(`release.json does not contain version`)
  process.exit(1)
}

const versionParts = [version.major, version.minor, version.patch]

const baseVersion = versionParts.join('.')

if (version.preRelease && version.preRelease !== '') {
  console.log(`${baseVersion}-${version.preRelease}`)
} else {
  console.log(baseVersion)
}
