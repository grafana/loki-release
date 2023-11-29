local common = import 'common.libsonnet';
local job = common.job;
local step = common.step;

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
      common.setupGo
      {
        name: 'Set up QEMU',
        uses: 'docker/setup-qemu-action@v3',
      },
      {
        name: 'set up docker buildx',
        uses: 'docker/setup-buildx-action@v3',
      },
      {
        name: 'parse image metadata',
        id: 'parse-metadata',
        shell: 'bash',
        run: |||
          mkdir -p dist

          platform="$(echo "${{ matrix.platform}}" |  sed  "s/\(.*\)\/\(.*\)/\1-\2/")"
          echo "platform=${platform}" >> $GITHUB_OUTPUT

          version=$(jq -r '."%s"' .release-please-manifest.json)
          echo "version=${version}" >> $GITHUB_OUTPUT
        ||| % path,
      },
      {
        name: 'Build and export',
        uses: 'docker/build-push-action@v5',
        with: {
          context: '.',
          file: '%s/Dockerfile' % path,
          platforms: '${{ matrix.platform }}',
          tags: 'grafana/%s:${{ steps.parse-metadata.outputs.version }}' % name,
          outputs: 'type=docker,dest=dist/%s-${{ steps.parse-metadata.outputs.version}}-${{ steps.parse-metadata.outputs.platform }}.tar' % name,
        },
      },
      {
        name: 'upload artifacts',
        uses: 'actions/upload-artifact@v3',
        with: {
          name: '%s-image-${{ steps.parse-metadata.outputs.version}}-${{ steps.parse-metadata.outputs.platform }}' % name,
          path: 'dist/%s-${{ steps.parse-metadata.outputs.version}}-${{ steps.parse-metadata.outputs.platform }}.tar' % name,
        },
      },
    ]),

  dist: job.new()
        + job.withSteps([
          common.fetchLokiRepo,
          common.setupGo,
          step.new('build artifacts')
          + step.withRun(common.makeTarget('dist')),
          step.new('upload artifacts', 'actions/upload-artifact@v3')
          + step.with({
            name: 'dist',
            path: 'dist/',
          }),
        ]),
}
