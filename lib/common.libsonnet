{
  fetchLokiRepo: {
    name: 'pull loki code',
    uses: 'actions/checkout@v3',
    with: {
      repository: 'grafana/loki',
      ref: 'prepare-release-please',
    },
  },
  setupGo: {
    uses: 'actions/setup-go@v4',
    with: {
      'go-version-file': 'go.mod',
    },
  },
}

