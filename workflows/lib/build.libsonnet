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
          step.new('install dependencies') +
          step.withRun(|||
            go install github.com/mitchellh/gox@9f71238
            go install github.com/bufbuild/buf/cmd/buf@v1.4.0
            go install github.com/golang/protobuf/protoc-gen-go@v1.3.1
            go install github.com/gogo/protobuf/protoc-gen-gogoslick@v1.3.0

            sudo apt update
            sudo apt install -qy musl gnupg ragel \
              file zip unzip jq gettext \
              protobuf-compiler libprotobuf-dev \
              libsystemd-dev jq

            sudo dpkg --add-architecture armhf
            sudo dpkg --add-architecture arm64
            sudo apt update
            sudo apt install -y --no-install-recommends \
              pkg-config \
              gcc-aarch64-linux-gnu libc6-dev-arm64-cross libsystemd-dev:arm64 \
              gcc-arm-linux-gnueabihf libc6-dev-armhf-cross libsystemd-dev:armhf
          |||),
          lokiStep('build artifacts')
          + step.withRun(common.makeTarget('dist')),
          step.new('upload artifacts', 'actions/upload-artifact@v3')
          + step.with({
            name: 'dist',
            path: 'lok/dist/',
          }),
        ]),
}