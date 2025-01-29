type Image = {
  file: string
  platform: string
  version: Version
}

export function buildDockerPluginCommands(
  repo: string,
  buildDir: string,
  imageDir: string,
  files: string[],
  _isLatest: boolean
): string[] {
  const commands: string[] = []
  const images = new Map<string, Image[]>()

  for (const file of files) {
    const imageMeta = parseImageMeta(file)
    if (!imageMeta) {
      continue
    }
    const { image, version, platform } = imageMeta

    const platforms = images.get(image) || []
    platforms.push({
      file,
      platform,
      version
    })

    images.set(`${image}`, platforms)
  }

  for (const image of images.keys()) {
    const platforms = images.get(image) || []
    let version: Version = {
      major: 0,
      minor: 0,
      patch: 0,
      toString: () => '0.0.0'
    }

    for (const p of platforms) {
      const { file, platform, version: v } = p
      if (version.toString() === '0.0.0') {
        version = v
      }
      const shortPlatform = platform.split('/')[1]
      commands.push(`rm -rf "${buildDir}/rootfs" || true`)
      commands.push(`mkdir -p "${buildDir}/rootfs"`)
      commands.push(`tar -x -C "${buildDir}/rootfs" -f "${imageDir}/${file}"`)
      commands.push(
        `docker plugin create ${repo}/${image}:${version.toString()}-${shortPlatform} "${buildDir}"`
      )
      commands.push(
        `docker plugin push "${repo}/${image}:${version.toString()}-${shortPlatform}"`
      )
    }
  }

  return commands
}

export function buildCommands(
  repo: string,
  imageDir: string,
  files: string[],
  isLatest: boolean
): string[] {
  const commands: string[] = [`cd ${imageDir}`]
  const images = new Map<string, Image[]>()

  for (const file of files) {
    const imageMeta = parseImageMeta(file)
    if (!imageMeta) {
      continue
    }
    const { image, version, platform } = imageMeta

    const platforms = images.get(image) || []
    platforms.push({
      file,
      platform,
      version
    })

    images.set(`${image}`, platforms)
  }

  for (const image of images.keys()) {
    const platforms = images.get(image) || []
    const manifests = []
    let version: Version = {
      major: 0,
      minor: 0,
      patch: 0,
      toString: () => '0.0.0'
    }
    for (const p of platforms) {
      const { file, platform, version: v } = p
      if (version.toString() === '0.0.0') {
        version = v
      }
      const shortPlatform = platform.split('/')[1]
      commands.push(`docker load -i ${imageDir}/${file}`)
      manifests.push(`${repo}/${image}:${version.toString()}-${shortPlatform}`)
      // Add latest tag for each platform if this is the latest version
      if (isLatest) {
        commands.push(
          `docker tag ${repo}/${image}:${version.toString()}-${shortPlatform} ${repo}/${image}:latest-${shortPlatform}`,
          `docker push ${repo}/${image}:latest-${shortPlatform}`,
          // Add major version tag (e.g., 2-amd64)
          `docker tag ${repo}/${image}:${version.toString()}-${shortPlatform} ${repo}/${image}:${version.major}-${shortPlatform}`,
          `docker push ${repo}/${image}:${version.major}-${shortPlatform}`,
          // Add major.minor version tag (e.g., 2.9-amd64)
          `docker tag ${repo}/${image}:${version.toString()}-${shortPlatform} ${repo}/${image}:${version.major}.${version.minor}-${shortPlatform}`,
          `docker push ${repo}/${image}:${version.major}.${version.minor}-${shortPlatform}`
        )
      }
    }

    commands.push(
      `docker push -a ${repo}/${image}`,
      `docker manifest create ${repo}/${image}:${version.toString()} ${manifests.join(' ')}`,
      `docker manifest push ${repo}/${image}:${version.toString()}`
    )

    // Create and push latest manifest if this is the latest version
    if (isLatest) {
      const latestManifests = manifests.map(m =>
        m.replace(`:${version.toString()}-`, ':latest-')
      )
      const majorManifests = manifests.map(m =>
        m.replace(`:${version.toString()}-`, `:${version.major}-`)
      )
      const majorMinorManifests = manifests.map(m =>
        m.replace(
          `:${version.toString()}-`,
          `:${version.major}.${version.minor}-`
        )
      )
      commands.push(
        `docker manifest create ${repo}/${image}:latest ${latestManifests.join(' ')}`,
        `docker manifest push ${repo}/${image}:latest`,
        `docker manifest create ${repo}/${image}:${version.major} ${majorManifests.join(' ')}`,
        `docker manifest push ${repo}/${image}:${version.major}`,
        `docker manifest create ${repo}/${image}:${version.major}.${version.minor} ${majorMinorManifests.join(' ')}`,
        `docker manifest push ${repo}/${image}:${version.major}.${version.minor}`
      )
    }
  }

  return commands
}

type Version = {
  major: number
  minor: number
  patch: number
  preRelease?: string
  toString: () => string
}

const imagePattern =
  /^(?<image>[^0-9]*)-(?<major>0|[1-9]\d*)\.(?<minor>0|[1-9]\d*)\.(?<patch>0|[1-9]\d*)(\.(?<preRelease>[a-zA-Z0-9.]*))?-(?<platform>.*).tar$/
export function parseImageMeta(file: string): {
  image: string
  version: Version
  platform: string
} | null {
  const match = file?.match(imagePattern)

  if (match && match.groups) {
    const { image, major, minor, preRelease, patch, platform } = match.groups
    return {
      image,
      version: parseVersion(major, minor, patch, preRelease),
      platform: platform.replace('-', '/')
    }
  }

  return null
}

function parseVersion(
  maj: string,
  min: string,
  pat: string,
  preRelease?: string
): Version {
  const major = parseInt(maj)
  const minor = parseInt(min)
  const patch = parseInt(pat)

  return {
    major,
    minor,
    patch,
    toString: () => {
      if (preRelease) {
        return `${major}.${minor}.${patch}.${preRelease}`
      }

      return `${major}.${minor}.${patch}`
    }
  }
}
