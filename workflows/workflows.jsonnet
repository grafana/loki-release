local lokiRelease = import 'main.jsonnet';
local build = lokiRelease.build;

// Custom function to generate proper YAML without quotes and maintain field order
local generateYaml(doc) = std.strReplace(std.strReplace(std.strReplace(|||
  name: %(name)s
  on:%(on)s%(permissions)s%(concurrency)s%(env)s
  jobs:%(jobs)s
||| % {
  name: std.manifestJson(doc.name),
  on: '\n  ' + std.strReplace(std.manifestYamlDoc(doc.on, quote_keys=false, indent_array_in_object=true), '\n', '\n  '),
  permissions: if std.objectHas(doc, 'permissions') then '\npermissions:\n  ' + std.strReplace(std.manifestYamlDoc(doc.permissions, quote_keys=false, indent_array_in_object=true), '\n', '\n  ') else '',
  concurrency: if std.objectHas(doc, 'concurrency') then '\nconcurrency:\n  ' + std.strReplace(std.manifestYamlDoc(doc.concurrency, quote_keys=false, indent_array_in_object=true), '\n', '\n  ') else '',
  env: if std.objectHas(doc, 'env') then '\nenv:\n  ' + std.strReplace(std.manifestYamlDoc(doc.env, quote_keys=false, indent_array_in_object=true), '\n', '\n  ') else '',
  jobs: '\n  ' + std.strReplace(std.manifestYamlDoc(doc.jobs, quote_keys=false, indent_array_in_object=true), '\n', '\n  '),
}, '\n\n', '\n'), '  \n', '\n'), ': \n', ':\n');

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
    lokiRelease.check
  ),
  '.github/workflows/gel-check.yml': std.manifestYamlDoc(
    lokiRelease.checkGel
  ),
  '.github/workflows/close-old-releases.yml': generateYaml(
    lokiRelease.closeOldReleases
  ),
}
