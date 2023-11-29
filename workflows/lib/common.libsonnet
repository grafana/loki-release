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
  },

  fetchLokiRepo:
    $.step.new('pull loki code', 'actions/checkout@v3')
    + $.step.with({
      repository: 'grafana/loki',
      ref: 'prepare-release-please',
    }),
  fetchReleaseRepo:
    $.step.new('pull release code', 'actions/checkout@v3')
    + $.step.with({
      repository: 'grafana/loki-release',
    }),
  setupGo: $.step.new('setup go', 'actions/setup-go@v4')
           + $.step.with({
             'go-version-file': 'go.mod',
           }),

  setupNode: $.step.new('setup node', 'actions/setup-node@v4')
             + $.step.with({
               'node-version': 16,
             }),

  makeTarget: function(target) 'make BUILD_IN_CONTAINER=false %s' % target,
}
