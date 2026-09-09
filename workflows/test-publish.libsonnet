local common = import 'common.libsonnet';
local job = common.job;
local step = common.step;

// These jobs smoke test the publish path on pull requests. They build their own
// throwaway fixtures instead of consuming the artifacts produced by the image
// build jobs, so they carry no `needs` and run alongside the rest of the
// workflow rather than at the end of it.
local fixtureVersion = '0.0.1';

{
  publishTestImage:
    job.new()
    + job.withPermissions({
      'id-token': 'write',
    })
    + job.withSteps([
      common.fetchReleaseLib,
      step.new('set up docker buildx', 'docker/setup-buildx-action@b5ca514318bd6ebac0fb2aedd5d36ec1b5c232a2'),  //v3
      step.new('Login to GAR', 'grafana/shared-workflows/actions/login-to-gar@12c87e5aa323694c820c1ff3d8e47e8237e05136')  // v1.0.2
      + step.with({ registry: 'us-docker.pkg.dev' }),
      step.new('build test image')
      + step.withRun(|||
        set -euo pipefail
        mkdir -p test-images
        echo "loki-release publish smoke test" >testfile
        printf 'FROM scratch\nCOPY testfile /testfile\n' >Dockerfile.test
        docker buildx build \
          --platform linux/amd64 \
          --file Dockerfile.test \
          --tag "${IMAGE_PREFIX}/test-image:%(version)s-amd64" \
          --output "type=docker,dest=test-images/test-image-%(version)s-linux-amd64.tar" \
          .
      ||| % { version: fixtureVersion }),
      step.new('publish test image', './lib/actions/push-images')
      + step.with({
        imageDir: 'test-images',
        imagePrefix: '${{ env.IMAGE_PREFIX }}',
        isLatest: 'false',
      }),
    ]),

  publishTestDockerPlugin: function(path)
    job.new()
    + job.withPermissions({
      'id-token': 'write',
    })
    + job.withSteps([
      common.fetchReleaseLib,
      common.fetchReleaseRepo,
      step.new('set up docker buildx', 'docker/setup-buildx-action@b5ca514318bd6ebac0fb2aedd5d36ec1b5c232a2'),  //v3
      step.new('Login to GAR', 'grafana/shared-workflows/actions/login-to-gar@12c87e5aa323694c820c1ff3d8e47e8237e05136')  // v1.0.2
      + step.with({ registry: 'us-docker.pkg.dev' }),
      step.new('build test plugin rootfs')
      + step.withRun(|||
        set -euo pipefail
        mkdir -p test-plugins
        echo "loki-release publish smoke test" >testfile
        printf 'FROM scratch\nCOPY testfile /testfile\n' >Dockerfile.test
        docker buildx build \
          --platform linux/amd64 \
          --file Dockerfile.test \
          --output "type=local,dest=test-plugin-rootfs" \
          .
        tar -cf "test-plugins/test-plugin-%(version)s-linux-amd64.tar" -C test-plugin-rootfs .
      ||| % { version: fixtureVersion }),
      common.startLocalPluginRegistry,
      step.new('publish test plugin', './lib/actions/push-images')
      + step.with({
        imageDir: 'test-plugins',
        imagePrefix: 'localhost:5000',
        isPlugin: true,
        buildDir: 'release/%s' % path,
        isLatest: 'false',
      }),
      common.mirrorPluginsToGar,
    ]),
}
