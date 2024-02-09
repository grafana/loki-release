local lokiRelease = import '../main.jsonnet';
local build = lokiRelease.build;
{
  'release-pr.yml': std.manifestYamlDoc(
    lokiRelease.releasePRWorkflow(
      imageJobs={
        loki: build.image('fake-loki', 'cmd/loki'),
      },
      releaseRepo='grafana/loki-release',
      skipValidation=false,
      versioningStrategy='always-bump-patch',
      imagePrefix='trevorwhitney075',
      branches=['release-[0-9].[0-9].x'],
    ), false, false
  ),
  'release.yml': std.manifestYamlDoc(
    lokiRelease.releaseWorkflow(
      releaseRepo='grafana/loki-release',
      dockerUsername='trevorwhitney075',
      imagePrefix='trevorwhitney075',
      branches=['release-[0-9].[0-9].x'],
    ), false, false
  ),
}
