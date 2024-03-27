import { readFileSync } from 'fs'
const release = JSON.parse(readFileSync('./release.json', 'utf8'))

const version = release[0]?.title?.version

if (!version) {
  process.exit(1)
}

const versionParts = [version.major, version.minor, version.patch]

const baseVersion = versionParts.join('.')

if (version.preRelease && version.preRelease !== '') {
  console.log(`${baseVersion}-${version.preRelease}`)
} else {
  console.log(baseVersion)
}
