local common = import 'common.libsonnet';

{
  buildImage: function(name, path) {
    'runs-on': 'ubuntu-latest',
    strategy: {
      'fail-fast': true,
      matrix: {
        platform: [
          'linux/amd64',
          'linux/arm64',
          'linux/arm',
        ],
      },
    },
    steps: [
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
          name: '%s-image-${{ matrix.platform }}' % name,
          path: 'dist/%s-${{ steps.parse-metadata.outputs.version}}-${{ steps.parse-metadata.outputs.platform }}.tar' % name,
        },
      },
    ],
  },
}
