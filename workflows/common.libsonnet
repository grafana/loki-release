{
  step: {
    new: function(name, uses=null) {
      name: name,
    } + if uses != null then {
      uses: uses,
    } else {},
    with: function(with) {
      with+: with,
    },
    withRun: function(run) {
      run: run,
    },
    withId: function(id) {
      id: id,
    },
    withWorkingDirectory: function(workingDirectory) {
      'working-directory': workingDirectory,
    },
    withIf: function(_if) {
      'if': _if,
    },
    withEnv: function(env) {
      env: env,
    },
    withSecrets: function(env) {
      secrets: env,
    },
    withTimeoutMinutes: function(timeout) {
      'timeout-minutes': timeout,
    },
    withContinueOnError: function() {
      'continue-on-error': true,
    },
  },
  job: {
    new: function(runsOn='ubuntu-x64') {
      'runs-on': runsOn,
    },
    with: function(with) {
      with+: with,
    },
    withUses: function(uses) {
      uses: uses,
    },
    withSteps: function(steps) {
      steps: steps,
    },
    withStrategy: function(strategy) {
      strategy: strategy,
    },
    withNeeds: function(needs) {
      needs: needs,
    },
    withIf: function(_if) {
      'if': _if,
    },
    withOutputs: function(outputs) {
      outputs: outputs,
    },
    withContainer: function(container) {
      container: container,
    },
    withEnv: function(env) {
      env+: env,
    },
    withSecrets: function(secrets) {
      secrets: secrets,
    },
    withPermissions: function(permissions) {
      permissions+: permissions,
    },
  },

  releaseStep: function(name, uses=null) $.step.new(name, uses) +
                                         $.step.withWorkingDirectory('release'),

  releaseLibStep: function(name, uses=null) $.step.new(name, uses) +
                                            $.step.withWorkingDirectory('lib'),

  checkout:
    $.step.new('checkout', 'actions/checkout@v4')
    + $.step.with({
      'persist-credentials': false,
    }),

  cleanUpBuildCache:
    $.step.new('clean up build tools cache')
    + $.step.withRun('rm -rf /opt/hostedtoolcache'),

  fetchReleaseRepo:
    $.step.new('pull code to release', 'actions/checkout@v4')
    + $.step.with({
      repository: '${{ env.RELEASE_REPO }}',
      path: 'release',
      'persist-credentials': false,
    }),
  fetchReleaseLib:
    $.step.new('pull release library code', 'actions/checkout@v4')
    + $.step.with({
      repository: 'grafana/loki-release',
      path: 'lib',
      ref: '${{ env.RELEASE_LIB_REF }}',
      'persist-credentials': false,
    }),

  startLocalPluginRegistry:
    $.step.new('start local registry for plugins')
    + $.step.withRun(|||
      set -euo pipefail
      crane_version="v0.21.6"
      curl -sSL "https://github.com/google/go-containerregistry/releases/download/${crane_version}/go-containerregistry_Linux_x86_64.tar.gz" \
        | tar -xz crane
      nohup ./crane registry serve --address localhost:5000 >crane-registry.log 2>&1 &
      for _ in $(seq 1 30); do
        curl -sf http://localhost:5000/v2/ >/dev/null && break
        sleep 1
      done
      curl -sf http://localhost:5000/v2/ >/dev/null || { echo "local registry failed to start" >&2; cat crane-registry.log >&2 || true; exit 1; }
    |||),

  mirrorPluginsToGar:
    $.step.new('mirror plugins to GAR with crane')
    + $.step.withRun(|||
      set -euo pipefail
      for repo in $(./crane catalog localhost:5000 --insecure); do
        for tag in $(./crane ls "localhost:5000/${repo}" --insecure); do
          layout="$(mktemp -d)"
          echo "mirroring ${repo}:${tag} to ${PLUGIN_IMAGE_PREFIX}/${repo}:${tag}"
          ./crane pull --insecure --format=oci "localhost:5000/${repo}:${tag}" "${layout}"
          ./crane push "${layout}" "${PLUGIN_IMAGE_PREFIX}/${repo}:${tag}"
        done
      done
    |||),

  setupNode: $.step.new('setup node', 'actions/setup-node@v4')
             + $.step.with({
               'node-version': 24,
               'package-manager-cache': false,
             }),

  // Enable Corepack so the pinned yarn version from package.json's
  // packageManager field is provisioned. Required because the GitHub-hosted
  // runners ship yarn 1.x by default, and `yarn install` / `yarn exec` would
  // otherwise run under yarn 1.x against a yarn 4 lockfile.
  enableCorepack: $.step.new('enable corepack')
                  + $.step.withRun('corepack enable'),

  makeTarget: function(target) 'make %s' % target,

  alwaysGreen: {
    steps: [
      $.step.new('always green')
      + $.step.withRun('echo "always green"'),
    ],
  },

  extractBranchName: $.step.new('extract branch name')
                     + $.step.withId('extract_branch')
                     + $.step.withRun(|||
                       echo "branch=${GITHUB_HEAD_REF:-${GITHUB_REF#refs/heads/}}" >> $GITHUB_OUTPUT
                     |||),

  fixDubiousOwnership: $.step.new('fix git dubious ownership')
                       + $.step.withRun(|||
                         git config --global --add safe.directory "$GITHUB_WORKSPACE"
                       |||),

  githubAppToken: $.step.new('get github app token', 'grafana/shared-workflows/actions/create-github-app-token@580590a644e82e79bb2598bdaba0be245a14dda0')  // create-github-app-token/v0.2.2
                  + $.step.withId('get_github_app_token')
                  + $.step.with({
                    github_app: '${{ env.GITHUB_APP }}',
                  }),

  validationJob: function()
    $.job.new()
    + $.job.withContainer({
      image: '${{ inputs.build_image }}',
    })
    + $.job.withEnv({
      BUILD_IN_CONTAINER: false,
      SKIP_VALIDATION: '${{ inputs.skip_validation }}',
    }),
}
