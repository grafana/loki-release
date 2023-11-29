local common = import 'common.libsonnet';
local job = common.job;
local step = common.step;
local lokiStep = common.lokiStep;

{
  image: function(name, path)
    job.new()
    + job.withStrategy({
      'fail-fast': true,
      matrix: {
        platform: [
          'linux/amd64',
          'linux/arm64',
          'linux/arm',
        ],
      },
    })
    + job.withSteps([
      common.fetchLokiRepo,
      common.setupGo,
      step.new('Set up QEMU', 'docker/setup-qemu-action@v3'),
      step.new('set up docker buildx', 'docker/setup-buildx-action@v3'),
      lokiStep('parse image metadata')
      + step.withId('parse-metadata')
      + step.withRun(|||
        mkdir -p dist

        platform="$(echo "${{ matrix.platform}}" |  sed  "s/\(.*\)\/\(.*\)/\1-\2/")"
        echo "platform=${platform}" >> $GITHUB_OUTPUT

        version=$(jq -r '."%s"' .release-please-manifest.json)
        echo "version=${version}" >> $GITHUB_OUTPUT
      ||| % path),
      step.new('Build and export', 'docker/build-push-action@v5')
      + step.with({
        context: 'loki',
        file: 'loki/%s/Dockerfile' % path,
        platforms: '${{ matrix.platform }}',
        tags: 'grafana/%s:${{ steps.parse-metadata.outputs.version }}' % name,
        outputs: 'type=docker,dest=loki/dist/%s-${{ steps.parse-metadata.outputs.version}}-${{ steps.parse-metadata.outputs.platform }}.tar' % name,
      }),
      step.new('upload artifacts', 'actions/upload-artifact@v3')
      + step.with({
        name: '%s-image-${{ steps.parse-metadata.outputs.version}}-${{ steps.parse-metadata.outputs.platform }}' % name,
        path: 'loki/dist/%s-${{ steps.parse-metadata.outputs.version}}-${{ steps.parse-metadata.outputs.platform }}.tar' % name,
      }),
    ]),

  dist: job.new()
        + job.withSteps([
          common.fetchLokiRepo,
          common.setupGo,
          lokiStep('build artifacts')
          + step.withRun(common.makeTarget('dist')),
          step.new('upload artifacts', 'actions/upload-artifact@v3')
          + step.with({
            name: 'dist',
            path: 'lok/dist/',
          }),
        ]),
}
