local lib = import 'lib/lib.libsonnet';

std.manifestYamlDoc({
  name: 'release (jsonnet version)',
  on: {
    workflow_dispatch: {},
    push: {
      branches: [
        'main',
        'release-[0-9].[0-9].x',
        'k[0-9]*',
      ],
    },
  },
  jobs: {
    'loki-image': lib.image.buildImage("loki", "cmd/loki"),
    'promtail-image': lib.image.buildImage("promtail", "cmd/promtail"),
  },
})
