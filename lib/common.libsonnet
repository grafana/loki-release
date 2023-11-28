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
      run: run,
    },
  },
  job: {
    new: function(runsOn='ubuntu-latest') {
      'runs-on': runsOn,
    },
    withSteps: function(steps) {
      steps: steps,
    },
    needs: function(needs) {
      needs: needs,
    },
    withContainer: function(container) {
      container: container,
    },
    container: {
      new: function(image) {
        image: image,
      },
      withVolumes: function(volumes) {
        volumes: volumes,
      },
      volume: {
        new: function(path, mountPath) '%s:%s' % [path, mountPath],
      },
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
