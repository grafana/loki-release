#Legacy Workflow

This doc contains diagrams illustrating the old workflow the Loki team followed to release new versions.

---
```mermaid
graph TD;
    A([Decide to release]) --> B([Create release branch from weekly branch]);
    B --> C([Make changes to release branch]);
    C --> D([Tag release]);
    D --> |Push tag| E[/Trigger Drone Pipeline/];
```

Drone pipeline:
```mermaid
graph TD;
    E[/Trigger Drone Pipeline/] --> F[/build loki build image/];
    E --> G[/build helm test image/];

    E --> H[/check drone drift/];
    H --> I[/check generated files/];
    I --> J[/run tests/];
    J --> K[/run linters/];
    K --> L[/check gomod/];
    L --> M[/run shellcheck/];
    M --> N[/build loki binary/];
    N --> O[/check doc drift/];
    O --> P[/validate example configs/];
    P --> Q[/check example config docs/];
    Q --> R[/build docs website/];

    E --> S[/lint mixin jsonnet/];

    E --> T[/check helm values doc/];

    E --> U[/publish loki amd64 image to dockerhub/];
    U --> V[/publish loki-canary amd64 image to dockerhub/];
    V --> W[/publish logcli amd64 image to dockerhub/];

    E --> X[/publish loki arm64 image to dockerhub/];
    X --> Y[/publish loki-canary arm64 image to dockerhub/];
    Y --> Z[/publish logcli arm64 image to dockerhub/];

    E --> a[/publish loki arm image to dockerhub/];
    a --> b[/publish loki-canary arm image to dockerhub/];
    b --> c[/publish logcli arm image to dockerhub/];

    E --> d[/publish promtail amd64 image to dockerhub/];
    E --> f[/publish promtail arm64 image to dockerhub/];
    E --> g[/publish promtail arm image to dockerhub/];

    E --> h[/publish lokioperator amd64 image to dockerhub/];
    E --> i[/publish lokioperator arm64 image to dockerhub/];
    E --> j[/publish lokioperator arm image to dockerhub/];

    E --> k[/publish fluent-bit amd64 image to dockerhub/];

    E --> l[/publish fluentd amd64 image to dockerhub/];

    E --> m[/publish logstash amd64 image to dockerhub/];

    E --> n[/publish querytee amd64 image to dockerhub/];

    E --> o[/publish multi-arch promtail image to dockerhub/];
    o --> p[/publish multi-arch loki image to dockerhub/];
    p --> q[/publish multi-arch loki-canary image to dockerhub/];
    q --> r[/publish multi-arch loki-operator image to dockerhub/];

    E --> s[/prepare updater config/];
    E --> t[/trigger updater/];

    E --> u[/check if helm chart needs update/];
    u --> v[/prepre helm chart update/];
    v --> w[/trigger helm chart update/];

    E --> x[/test promtail-windows/];

    E --> y[/publish logql analyzer image to dockerhub/];

    E --> z[/setup linux packaging/];
    z --> aa[/test linux packaging/];
    aa --> ab[/test debian packaging/];
    ab --> ac[/test rpm packaging/];
    ac --> ad[/create github draft release/];

    E --> ae[/build and publish docker driver to dockerhub/];

    E --> af[/build and publish lambda-promtail amd64 image to dockerhub/];

    E --> ag[/build and publish lambda-promtail arm64 image to dockerhub/];







```
