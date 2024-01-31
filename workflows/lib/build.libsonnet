local common = import 'common.libsonnet';
local job = common.job;
local step = common.step;
local releaseStep = common.releaseStep;

{
  image: function(
    name,
    path,
    context='release',
    condition="${{ inputs.release_repo == 'grafana/loki' }}",
    platform=[
      'linux/amd64',
      'linux/arm64',
      'linux/arm',
    ]
        )
    job.new()
    + job.withStrategy({
      'fail-fast': true,
      matrix: {
        platform: platform,
      },
    })
    + job.withSteps([
      common.fetchReleaseRepo,
      common.setupGo,
      common.googleAuth,

      step.new('Set up QEMU', 'docker/setup-qemu-action@v3'),
      step.new('set up docker buildx', 'docker/setup-buildx-action@v3'),
      releaseStep('parse image metadata')
      + step.withId('parse-metadata')
      + step.withRun(|||
        mkdir -p images

        platform="$(echo "${{ matrix.platform}}" |  sed  "s/\(.*\)\/\(.*\)/\1-\2/")"
        echo "platform=${platform}" >> $GITHUB_OUTPUT

        version=$(jq -r '."."' .release-please-manifest.json)
        echo "version=${version}" >> $GITHUB_OUTPUT
      ||| % path),
      step.new('Build and export', 'docker/build-push-action@v5')
      + step.withIf(condition)
      + step.with({
        context: context,
        file: 'release/%s/Dockerfile' % path,
        platforms: '${{ matrix.platform }}',
        tags: '${{ inputs.image_prefix }}/%s:${{ steps.parse-metadata.outputs.version }}' % [name],
        outputs: 'type=docker,dest=release/images/%s-${{ steps.parse-metadata.outputs.version}}-${{ steps.parse-metadata.outputs.platform }}.tar' % name,
      }),
      step.new('upload artifacts', 'google-github-actions/upload-cloud-storage@v2')
      + step.withIf(condition)
      + step.with({
        path: 'release/images/%s-${{ steps.parse-metadata.outputs.version}}-${{ steps.parse-metadata.outputs.platform }}.tar' % name,
        destination: 'loki-build-artifacts/${{ github.sha }}/images',  //TODO: make bucket configurable
        process_gcloudignore: false,
      }),
    ]),

  dist: job.new()
        + job.withSteps([
          common.fetchReleaseRepo,
          common.setupGo,
          common.googleAuth,

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
          |||),

          releaseStep('build artifacts')
          + step.withRun('make BUILD_IN_CONTAINER=false SKIP_ARM=true dist'),

          step.new('upload build artifacts', 'google-github-actions/upload-cloud-storage@v2')
          + step.with({
            path: 'release/dist',
            destination: 'loki-build-artifacts/${{ github.sha }}',  //TODO: make bucket configurable
            process_gcloudignore: false,
          }),
        ]),
}
