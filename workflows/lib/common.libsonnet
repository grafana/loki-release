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
      shell: 'bash',
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
  },
  job: {
    new: function(runsOn='ubuntu-latest') {
      'runs-on': runsOn,
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
  },

  releaseStep: function(name, uses=null) $.step.new(name, uses) +
                                         $.step.withWorkingDirectory('release'),

  releaseLibStep: function(name, uses=null) $.step.new(name, uses) +
                                            $.step.withWorkingDirectory('lib'),

  fetchReleaseRepo:
    $.step.new('pull code to release', 'actions/checkout@v3')
    + $.step.with({
      repository: '${{ inputs.release_repo }}',
      path: 'release',
    }),
  fetchReleaseLib:
    $.step.new('pull release library code', 'actions/checkout@v3')
    + $.step.with({
      repository: 'grafana/loki-release',
      path: 'lib',
    }),
  setupGo: $.step.new('setup go', 'actions/setup-go@v4')
           + $.step.with({
             'go-version-file': 'loki/go.mod',
             'cache-dependency-path': 'loki/go.sum',
           }),

  setupNode: $.step.new('setup node', 'actions/setup-node@v4')
             + $.step.with({
               'node-version': 20,
             }),

  makeTarget: function(target) 'make BUILD_IN_CONTAINER=false %s' % target,

  alwaysGreen: {
    steps: [
      $.step.new('always green')
      + $.step.withRun('echo "always green"'),
    ],
  },

  googleAuth: $.step.new('auth gcs', 'google-github-actions/auth@v2')
              + $.step.withEnv({
                ACTIONS_STEP_DEBUG: 'true',
              })
              + $.step.with({
                credentials_json: '${{ secrets.GCS_SERVICE_ACCOUNT_KEY }}',
              }),
}
