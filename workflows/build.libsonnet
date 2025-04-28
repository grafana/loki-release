local common = import 'common.libsonnet',
      job = common.job,
      step = common.step,
      releaseStep = common.releaseStep,
      releaseLibStep = common.releaseLibStep;
local runner = import 'runner.libsonnet',
      r = runner.withDefaultMapping();

{
  image: function(
    name,
    path,
    dockerfile='Dockerfile',
    context='release',
    platform=[
      r.forPlatform('linux/amd64'),
      r.forPlatform('linux/arm64'),
      r.forPlatform('linux/arm'),
    ]
        )
    job.new('${{ matrix.runs_on }}')
    + job.withStrategy({
      'fail-fast': true,
      matrix: {
        include: platform,
      },
    })
    + job.withSteps([
      common.fetchReleaseLib,
      common.fetchReleaseRepo,
      common.setupNode,
      common.googleAuth,

      step.new('Set up Docker buildx', 'docker/setup-buildx-action@b5ca514318bd6ebac0fb2aedd5d36ec1b5c232a2'), // v3

      releaseStep('Parse image platform')
      + step.withId('platform')
      + step.withEnv({
          GITHUB_OUTPUT_FH: '${{ GITHUB_OUTPUT }}',
          MATRIX_ARCH: '${{ matrix.arch }}'
      })
      + step.withRun(|||
        mkdir -p images

        platform="$(echo "${{ matrix.arch }}" | sed "s/\(.*\)\/\(.*\)/\1-\2/")"
        echo "platform=${platform}" >> $GITHUB_OUTPUT_FH
        echo "platform_short=$(echo $MATRIX_ARCH | cut -d / -f 2)" >> $GITHUB_OUTPUT_FH
      |||),

      step.new('Build and export', 'docker/build-push-action@14487ce63c7a62a4a324b0bfb37086795e31c6c1') // v6
      + step.withTimeoutMinutes('${{ fromJSON(env.BUILD_TIMEOUT) }}')
      + step.withEnv({
        IMAGE_TAG: '${{ needs.version.outputs.version }}',
        OUTPUTS_PR_CREATED: '${{ needs.version.outputs.pr_created }}',
        OUTPUTS_VERSION: '${{ needs.version.outputs.version }}',
        OUTPUTS_PLATFORM: '${{ steps.platform.outputs.platform }}',
        OUTPUTS_PLATFORM_SHORT: '${{ steps.platform.outputs.platform_short }}',
        MATRIX_ARCH: '${{ matrix.arch }}'
      })
      + step.withIf('${{ fromJSON(env.OUTPUTS_PR_CREATED) }}')
      + step.with({
        context: context,
        file: 'release/%s/%s' % [path, dockerfile],
        platforms: '$MATRIX_ARCH',
        tags: '${{ env.IMAGE_PREFIX }}/%s:${OUTPUTS_VERSION}-${OUTPUTS_PLATFORM_SHORT}' % [name],
        outputs: 'type=docker,dest=release/images/%s-${OUTPUTS_VERSION}-${OUTPUTS_PLATFORM}.tar' % name,
        'build-args': 'IMAGE_TAG=$OUTPUTS_VERSION',
      }),
      step.new('Upload artifacts', 'google-github-actions/upload-cloud-storage@386ab77f37fdf51c0e38b3d229fad286861cc0d0') // v2
      + step.withEnv({
            SHA: '${{ github.sha }}',
            OUTPUTS_VERSION: '${{ needs.version.outputs.pr_created }}',
            OUTPUTS_PLATFORM: '${{ steps.platform.outputs.platform }}',
      })
      + step.withIf('${{ fromJSON(env.OUTPUTS_VERSION) }}')
      + step.with({
        path: 'release/images/%s-${OUTPUTS_VERSION}-${OUTPUTS_PLATFORM}.tar' % name,
        destination: '${{ env.BUILD_ARTIFACTS_BUCKET }}/${SHA}/images',  //TODO: make bucket configurable
        process_gcloudignore: false,
      }),
    ]),


  weeklyImage: function(
    name,
    path,
    dockerfile='Dockerfile',
    context='release',
    platform=[
      r.forPlatform('linux/amd64'),
      r.forPlatform('linux/arm64'),
      r.forPlatform('linux/arm'),
    ]
              )
    job.new('${{ matrix.runs_on }}')
    + job.withStrategy({
      'fail-fast': true,
      matrix: {
        include: platform,
      },
    })
    + job.withEnv({
        IMAGE_NAME: '${{ steps.weekly-version.outputs.image_name }}',
        IMAGE_TAG: '${{ steps.weekly-version.outputs.image_version }}',
        IMAGE_NAME_AMD64: '${{ steps.digest.outputs.digest_linux_amd64 }}',
        IMAGE_NAME_ARM64: '${{ steps.digest.outputs.digest_linux_arm64 }}',
        IMAGE_NAME_ARM: '${{ steps.digest.outputs.digest_linux_arm }}',
    })
    + job.withOutputs({
      image_name: '$IMAGE_NAME',
      image_tag: '$IMAGE_TAG',
      image_digest_linux_amd64: '$IMAGE_NAME_AMD64',
      image_digest_linux_arm64: '$IMAGE_NAME_ARM64',
      image_digest_linux_arm: '$IMAGE_NAME_ARM',
    })
    + job.withSteps([
      common.fetchReleaseLib,
      common.fetchReleaseRepo,
      common.setupNode,

      step.new('Set up Docker buildx', 'docker/setup-buildx-action@b5ca514318bd6ebac0fb2aedd5d36ec1b5c232a2'), // v3
      step.new('Login to DockerHub (from Vault)', 'grafana/shared-workflows/actions/dockerhub-login@main'),

      releaseStep('Get weekly version')
      + step.withId('weekly-version')
      + step.withEnv({
        GITHUB_OUTPUT_FH: '${{ GITHUB_OUTPUT }}'
      })
      + step.withRun(|||
        version=$(./tools/image-tag)
        echo "image_version=$version" >> $GITHUB_OUTPUT_FH
        echo "image_name=${{ env.IMAGE_PREFIX }}/%(name)s" >> $GITHUB_OUTPUT_FH
        echo "image_full_name=${{ env.IMAGE_PREFIX }}/%(name)s:$version" >> $GITHUB_OUTPUT_FH
      ||| % { name: name }),

      releaseStep('Parse image platform')
      + step.withId('platform')
      + step.withEnv({
        GITHUB_OUTPUT_FH: '${{ GITHUB_OUTPUT }}',
        MATRIX_ARCH: '${{ matrix.arch }}'
      })
      + step.withRun(|||
        platform="$(echo "$MATRIX_ARCH" | sed "s/\(.*\)\/\(.*\)/\1-\2/")"
        echo "platform=${platform}" >> $GITHUB_OUTPUT_FH
        echo "platform_short=$(echo $MATRIX_ARCH | cut -d / -f 2)" >> $GITHUB_OUTPUT_FH
      |||),

      step.new('Build and push', 'docker/build-push-action@14487ce63c7a62a4a324b0bfb37086795e31c6c1') // v6
      + step.withId('build-push')
      + step.withEnv({
        MATRIX_ARCH: '${{ matrix.arch }}',
        IMAGE_NAME: '${{ steps.weekly-version.outputs.image_name }}',
        IMAGE_TAG: '${{ steps.weekly-version.outputs.image_version }}',
      })
      + step.withTimeoutMinutes('${{ fromJSON(env.BUILD_TIMEOUT) }}')
      + step.with({
        context: context,
        file: '%s/%s/%s' % [context, path, dockerfile],
        platforms: '$MATRIX_ARCH',
        provenance: true,
        outputs: 'push-by-digest=true,type=image,name=${IMAGE_NAME},push=true',
        tags: '$IMAGE_NAME',
        'build-args': |||
          IMAGE_TAG=${IMAGE_TAG}
          GO_VERSION=${{ env.GO_VERSION }}
        |||,
      }),

      releaseStep('Process image digest')
      + step.withId('digest')
      + step.withEnv({
        GITHUB_OUTPUT_FH: '${{ GITHUB_OUTPUT }}',
        OUTPUTS_DIGEST: '${{ steps.build-push.outputs.digest }}',
        MATRIX_ARCH: '${{ matrix.arch }}',
      })
      + step.withRun(|||
        arch=$(echo $MATRIX_ARCH | tr "/" "_")
        echo "digest_$arch=$OUTPUTS_DIGEST" >> $GITHUB_OUTPUT_FH
      |||),
    ]),

  dockerPlugin: function(
    name,
    path,
    buildImage,
    dockerfile='Dockerfile',
    context='release',
    platform=[
      r.forPlatform('linux/amd64'),
      r.forPlatform('linux/arm64'),
    ]
               )
    job.new('${{ matrix.runs_on }}')
    + job.withStrategy({
      'fail-fast': true,
      matrix: {
        include: platform,
      },
    })
    + job.withSteps([
      common.fetchReleaseLib,
      common.fetchReleaseRepo,
      common.setupNode,
      common.googleAuth,

      step.new('Set up QEMU', 'docker/setup-qemu-action@29109295f81e9208d7d86ff1c6c12d2833863392'), // v3
      step.new('set up docker buildx', 'docker/setup-buildx-action@b5ca514318bd6ebac0fb2aedd5d36ec1b5c232a2'), //v3

      releaseStep('parse image platform')
      + step.withId('platform')
      + step.withEnv({
        GITHUB_OUTPUT_FH: '${{ GITHUB_OUTPUT }}',
        MATRIX_ARCH: '${{ matrix.arch }}',
      })
      + step.withRun(|||
        mkdir -p images
        mkdir -p plugins

        platform="$(echo "$MATRIX_ARCH" |  sed  "s/\(.*\)\/\(.*\)/\1-\2/")"
        echo "platform=${platform}" >> $GITHUB_OUTPUT_FH
        echo "platform_short=$(echo $MATRIX_ARCH | cut -d / -f 2)" >> $GITHUB_OUTPUT_FH
        if [[ "${platform}" == "linux/arm64" ]]; then
          echo "plugin_arch=-arm64" >> $GITHUB_OUTPUT_FH
        else
          echo "plugin_arch=" >> $GITHUB_OUTPUT_FH
        fi
      |||),

      step.new('Build and export', 'docker/build-push-action@14487ce63c7a62a4a324b0bfb37086795e31c6c1') // v6
      + step.withTimeoutMinutes('${{ fromJSON(env.BUILD_TIMEOUT) }}')
      + step.withEnv({
        OUTPUTS_PR_CREATED: '${{ needs.version.outputs.pr_created }}',
        OUTPUTS_VERSION: '${{ needs.version.outputs.version }}',
        OUTPUTS_PLATFORM: '${{ steps.platform.outputs.platform }}',
        OUTPUTS_PLATFORM_SHORT: '${{ steps.platform.outputs.platform_short }}',
        MATRIX_ARCH: "${{ matrix.arch }}",
      })
      + step.withIf('${{ fromJSON(env.OUTPUTS_PR_CREATED) }}')
      + step.with({
        context: context,
        file: 'release/%s/%s' % [path, dockerfile],
        platforms: '$MATRIX_ARCH',
        push: false,
        tags: '${{ env.IMAGE_PREFIX }}/%s:${OUTPUTS_VERSION}-${OUTPUTS_PLATFORM_SHORT}' % [name],
        outputs: 'type=local,dest=release/plugins/%s-${OUTPUTS_VERSION}-${OUTPUTS_PLATFORM}' % name,
        'build-args': |||
          %s
        ||| % std.rstripChars(std.lines([
          'IMAGE_TAG=${OUTPUTS_VERSION}',
          'GOARCH=${OUTPUTS_PLATFORM_SHORT}',
          ('BUILD_IMAGE=%s' % buildImage),
        ]), '\n'),
      }),

      step.new('compress rootfs')
      + step.withEnv({
        OUTPUTS_VERSION: '${{ needs.version.outputs.version }}',
        OUTPUTS_PLATFORM: '${{ steps.platform.outputs.platform }}',
        OUTPUTS_PR_CREATED: '${{ needs.version.outputs.pr_created }}',
      })
      + step.withIf('${{ fromJSON(env.OUTPUTS_PR_CREATED) }}')
      + step.withRun(|||
        tar -cf release/plugins/%s-${OUTPUTS_VERSION}-${OUTPUTS_PLATFORM}.tar \
        -C release/plugins/%s-${OUTPUTS_VERSION}-${OUTPUTS_PLATFORM} \
        .
      ||| % [name, name]),

      step.new('upload artifacts', 'google-github-actions/upload-cloud-storage@386ab77f37fdf51c0e38b3d229fad286861cc0d0') // v2
      + step.withEnv({
        OUTPUTS_VERSION: '${{ needs.version.outputs.version }}',
        OUTPUTS_PLATFORM: '${{ steps.platform.outputs.platform }}',
        OUTPUTS_PR_CREATED: '${{ needs.version.outputs.pr_created }}',
        SHA: '${{ github.sha }}',
      })
      + step.withIf('${{ fromJSON(env.OUTPUTS_PR_CREATED) }}')
      + step.with({
        path: 'release/plugins/%s-${OUTPUTS_VERSION}-${OUTPUTS_PLATFORM}.tar' % name,
        destination: '${{ env.BUILD_ARTIFACTS_BUCKET }}/${SHA}/plugins',
        process_gcloudignore: false,
      }),
    ]),

  version:
    job.new()
    + job.withSteps([
      common.fetchReleaseLib,
      common.fetchReleaseRepo,
      common.setupNode,
      common.extractBranchName,
      common.githubAppToken,
      common.setToken,
      releaseLibStep('get release version')
      + step.withId('version')
      + step.withEnv({
        GITHUB_OUTPUT_FH: '${{ GITHUB_OUTPUT }}',
        OUTPUTS_BRANCH: '${{ steps.extract_branch.outputs.branch }}',
        OUTPUTS_TOKEN: '${{ steps.github_app_token.outputs.token }}',
        OUTPUTS_VERSION: '${{ steps.version.outputs.version }}',
        OUTPUTS_PR_CREATED: '${{ steps.version.outputs.pr_created }}',
      })
      + step.withRun(|||
        npm install

        if [[ -z "${{ env.RELEASE_AS }}" ]]; then
          npm exec -- release-please release-pr \
            --consider-all-branches \
            --dry-run \
            --dry-run-output release.json \
            --group-pull-request-title-pattern "chore\${scope}: release\${component} \${version}" \
            --manifest-file .release-please-manifest.json \
            --pull-request-title-pattern "chore\${scope}: release\${component} \${version}" \
            --release-type simple \
            --repo-url "${{ env.RELEASE_REPO }}" \
            --separate-pull-requests false \
            --target-branch "$OUTPUTS_BRANCH" \
            --token "$OUTPUTS_TOKEN" \
            --versioning-strategy "${{ env.VERSIONING_STRATEGY }}"
        else
          npm exec -- release-please release-pr \
            --consider-all-branches \
            --dry-run \
            --dry-run-output release.json \
            --group-pull-request-title-pattern "chore\${scope}: release\${component} \${version}" \
            --manifest-file .release-please-manifest.json \
            --pull-request-title-pattern "chore\${scope}: release\${component} \${version}" \
            --release-type simple \
            --repo-url "${{ env.RELEASE_REPO }}" \
            --separate-pull-requests false \
            --target-branch "$OUTPUTS_BRANCH" \
            --token "$OUTPUTS_TOKEN" \
            --release-as "${{ env.RELEASE_AS }}"
        fi

        cat release.json

        if [[ `jq length release.json` -gt 1 ]]; then 
          echo 'release-please would create more than 1 PR, so cannot determine correct version'
          echo "pr_created=false" >> $GITHUB_OUTPUT_FH
          exit 1
        fi

        if [[ `jq length release.json` -eq 0 ]]; then 
          echo "pr_created=false" >> $GITHUB_OUTPUT_FH
        else
          version="$(npm run --silent get-version)"
          echo "Parsed version: ${version}"
          echo "version=${version}" >> $GITHUB_OUTPUT_FH
          echo "pr_created=true" >> $GITHUB_OUTPUT_FH
        fi
      |||),
    ])
    + job.withOutputs({
      version: '$OUTPUTS_VERSION',
      pr_created: '$OUTPUTS_PR_CREATED',
    }),

  dist: function(buildImage, skipArm=true, useGCR=false, makeTargets=['dist', 'packages'])
    job.new()
    + job.withSteps([
      common.cleanUpBuildCache,
      common.fetchReleaseRepo,
      common.googleAuth,
      common.setupGoogleCloudSdk,

      step.new('get nfpm signing keys', 'grafana/shared-workflows/actions/get-vault-secrets@9a3fe87979ecafb15dba1fec25d1fff7ce6435f2')
      + step.withId('get-secrets')
      + step.with({
        common_secrets: |||
          NFPM_SIGNING_KEY=packages-gpg:private-key
          NFPM_PASSPHRASE=packages-gpg:passphrase
        |||,
      }),

      releaseStep('build artifacts')
      + step.withEnv({
        BUILD_IN_CONTAINER: false,
        DRONE_TAG: '${{ needs.version.outputs.version }}',
        IMAGE_TAG: '${{ needs.version.outputs.version }}',
        NFPM_SIGNING_KEY_FILE: 'nfpm-private-key.key',
        SKIP_ARM: skipArm,
        OUTPUTS_PR_CREATED: '${{ needs.version.outputs.pr_created }}',
      })
      + step.withIf('${{ fromJSON(env.OUTPUTS_PR_CREATED) }}')
      //TODO: the workdir here is loki specific
      + step.withRun(
        (
          if useGCR then |||
            gcloud auth configure-docker
          ||| else ''
        ) +
        |||
          cat <<EOF | docker run \
            --interactive \
            --env BUILD_IN_CONTAINER \
            --env DRONE_TAG \
            --env IMAGE_TAG \
            --env NFPM_PASSPHRASE \
            --env NFPM_SIGNING_KEY \
            --env NFPM_SIGNING_KEY_FILE \
            --env SKIP_ARM \
            --volume .:/src/loki \
            --workdir /src/loki \
            --entrypoint /bin/sh "%s"
            git config --global --add safe.directory /src/loki
            echo "${NFPM_SIGNING_KEY}" > $NFPM_SIGNING_KEY_FILE
            if echo "%s" | grep -q "golang"; then
              /src/loki/.github/vendor/github.com/grafana/loki-release/workflows/install_workflow_dependencies.sh dist
            fi
            make %s
          EOF
        ||| % [buildImage, buildImage, std.join(' ', makeTargets)]
      ),

      step.new('upload artifacts', 'google-github-actions/upload-cloud-storage@386ab77f37fdf51c0e38b3d229fad286861cc0d0') // v2
      + step.withEnv({
        OUTPUTS_PR_CREATED: '${{ needs.version.outputs.pr_created }}',
        OUTPUTS_VERSION: '${{ needs.version.outputs.version }}',
        SHA: '${{ github.sha }}',
      })
      + step.withIf('${{ fromJSON(env.OUTPUTS_PR_CREATED) }}')
      + step.with({
        path: 'release/dist',
        destination: '${{ env.BUILD_ARTIFACTS_BUCKET }}/${SHA}',  //TODO: make bucket configurable
        process_gcloudignore: false,
      }),
    ])
    + job.withOutputs({
      version: '$OUTPUTS_VERSION',
    }),
}
