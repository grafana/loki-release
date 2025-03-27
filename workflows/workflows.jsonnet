local lokiRelease = import 'main.jsonnet';
local build = lokiRelease.build;


local buildImage = 'golang:1.24';
local dockerPluginDir = 'clients/cmd/docker-driver';

{
  '.github/workflows/release-pr.yml': std.manifestYamlDoc(
    lokiRelease.releasePRWorkflow(
      imageJobs={
        loki: build.image('fake-loki', 'cmd/loki'),
        'loki-docker-driver': build.dockerPlugin('loki-docker-driver', dockerPluginDir, buildImage=buildImage),
      },
      buildImage=buildImage,
      buildArtifactsBucket='loki-build-artifacts',
      branches=['release-[0-9]+.[0-9]+.x'],
      imagePrefix='trevorwhitney075',
      releaseLibRef='main',
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
        'loki-docker-driver': build.dockerPlugin('loki-docker-driver', dockerPluginDir, buildImage=buildImage),
      },
      buildImage=buildImage,
      buildArtifactsBucket='loki-build-artifacts',
      branches=['release-[0-9]+.[0-9]+.x'],
      dryRun=true,
      imagePrefix='trevorwhitney075',
      releaseLibRef='main',
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
      dockerUsername='trevorwhitney075',
      getDockerCredsFromVault=false,
      imagePrefix='trevorwhitney075',
      pluginBuildDir=dockerPluginDir,
      releaseLibRef='main',
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
    lokiRelease.check + { // TODO: Remove this once we have a stable release lib ref
      env: {
        RELEASE_LIB_REF: '06b9b6e59164a74204243a7754cfdb7706ed0a46',
      },
    }
  ),
  '.github/workflows/gel-check.yml': std.manifestYamlDoc(
    lokiRelease.checkGel
  ),
}
