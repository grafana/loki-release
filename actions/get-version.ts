import { readFileSync } from 'fs'

let data: string
try {
  data = readFileSync('./release.json', 'utf8')
} catch (err: any) {
  console.error(`Failed to read file: ${err.message}`)
  process.exit(1)
}

let release: any
try {
  release = JSON.parse(data)
} catch (err: any) {
  console.error(`Failed to parse JSON: ${err.message}`)
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
