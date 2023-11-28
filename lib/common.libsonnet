{
  step: {
    new: function(name, uses=null) {
      name: name,
    } + if uses != null then {
      uses: uses,
    } else {},
    with: function(with) {
      with: with,
    },
    withRun: function(run) {
      shell: 'bash',
      run: run,
    },
  },
  job: {
    new: function(runsOn='ubuntu-latest') {
      runsOn: runsOn,
    },
    withSteps: function(steps) {
      steps: steps,
    },
    needs: function(needs) {
      needs: needs,
    },
  },

  fetchLokiRepo:
    $.step.new('pull loki code', 'actions/checkout@v3') +
    $.step.with({
      repository: 'grafana/loki',
      ref: 'prepare-release-please',
    }),
  setupGo: $.step.new('setup go', 'actions/setup-go@v4') + $.step.with({
    'go-version-file': 'go.mod',
  }),

  makeTarget: function(target) 'make BUILD_IN_CONTAINER=false %s' % target,
}

