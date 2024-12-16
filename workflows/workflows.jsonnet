local lokiRelease = import 'main.jsonnet';
local build = lokiRelease.build;


local buildImage = 'grafana/loki-build-image:0.34.3';

{
  '.github/workflows/release-pr.yml': std.manifestYamlDoc(
    lokiRelease.releasePRWorkflow(
      imageJobs={
        loki: build.image('fake-loki', 'cmd/loki'),
        'loki-docker-driver': build.dockerPlugin('loki-docker-driver', 'clients/cmd/docker-driver', buildImage=buildImage, platform=['linux/amd64', 'linux/arm64']),
      },
      buildImage=buildImage,
      buildArtifactsBucket='loki-build-artifacts',
      branches=['release-[0-9]+.[0-9]+.x'],
      imagePrefix='trevorwhitney075',
      releaseLibRef='release-1.14.x',
      releaseRepo='grafana/loki-release',
      skipValidation=false,
      versioningStrategy='always-bump-patch',
    ) + {
      name: 'Create Release PR',
    }, false, false
  ),
  '.github/workflows/test-release-pr.yml': std.manifestYamlDoc(
    lokiRelease.releasePRWorkflow(
      imageJobs={
        loki: build.image('fake-loki', 'cmd/loki'),
        'loki-docker-driver': build.dockerPlugin('loki-docker-driver', 'clients/cmd/docker-driver', buildImage=buildImage, platform=['linux/amd64', 'linux/arm64']),
      },
      buildImage=buildImage,
      buildArtifactsBucket='loki-build-artifacts',
      branches=['release-[0-9]+.[0-9]+.x'],
      dryRun=true,
      imagePrefix='trevorwhitney075',
      releaseLibRef='release-1.14.x',
      releaseRepo='grafana/loki-release',
      skipValidation=false,
      versioningStrategy='always-bump-patch',
    ) + {
      name: 'Test Create Release PR Action',
      on+: {
        pull_request: {},
      },
    }, false, false
  ),
  '.github/workflows/release.yml': std.manifestYamlDoc(
    lokiRelease.releaseWorkflow(
      branches=['release-[0-9]+.[0-9]+.x'],
      buildArtifactsBucket='loki-build-artifacts',
      getDockerCredsFromVault=true,
      imagePrefix='trevorwhitney075',
      releaseLibRef='release-1.14.x',
      releaseRepo='grafana/loki-release',
      useGitHubAppToken=true,
    ) + {
      name: 'Create Release',
      on+: {
        pull_request: {},
      },
    }, false, false
  ),
  '.github/workflows/check.yml': std.manifestYamlDoc(
    lokiRelease.check
  ),
  '.github/workflows/gel-check.yml': std.manifestYamlDoc(
    lokiRelease.checkGel
  ),
}
