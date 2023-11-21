# loki-release

This repository was built to replace our [existing workflow](./docs/loki-legacy-workflow.md), which was mostly a manual process. This new workflow (diagramed below), runs on a daily cron trigger, whenever a commit to a release branch is made, or at the end of our automated weekly release process.

```mermaid
graph TD;
    cron[/daily cron trigger/] --> startWorkflow[/start GitHub actions release workflow/];
    commit([commit merged to release branch]) --> startWorkflow
    weekly[/weekly roll-out to prod finishes/] --> startWorkflow

    startWorkflow --> validate[/validate code/]
    startWorkflow --> test[/run automated tests/]
    startWorkflow --> lint[/run automated linting/]

    test --> buildBinaries[/build release binaries/]
    lint --> buildBinaries
    validate --> buildBinaries

    test --> buildImages[/build release images/]
    lint --> buildImages
    validate --> buildImages

    buildBinaries --> releasePlease[/create/update release PR with release please/]
    buildImages --> releasePlease

    releasePlease --> mergeReleasePR([merge release PR])
    mergeReleasePR --> createDraftRelease[/draft release is created/]
    mergeReleasePR --> updateMain[/generate PRs to update main/])

    updateMain --> updateChangelog[/update changelog in main to add new version/]
    updateMain --> updateUpgradeGuide[/update upgrade guide in main to add new version/]

    updateMain --> isLatestVersion{does the released version represent the latest release?}

    isLatestVersion --> |yes| updateVersions[/update references to versions on main/]
    updateVersions --> updateBinaryVersions[/update references to the binary versions/]
    updateVersions --> updateImageVersions[/update references to the image versions/]
    updateVersions --> updateHelmVersions[/update image version in helm values/]
    updateVersions --> updateKsonnetVersions[/update image version in ksonnet libs/]

    updateChangelog --> publishRelease[/publish the draft release created by release PR/]
    updateUpgradeGuide --> publishRelease
    updateBinaryVersions --> publishRelease
    updateImageVersions --> publishRelease
    updateHelmVersions --> publishRelease
    updateKsonnetVersions --> publishRelease
```

_TODO_: release PR needs to: - update references to binary versions - update references to image versions - update helm/ksonnet versions - update the upgrade guide if (this is likely going to require the upgrade guide to be made of individual files): - there are config changes - there are metric changes

_TODO_: how to force upgrade guide changes? - maybe fail a release PR if metric or config changes are detected unless it has both: - an upgrade guide for that version - a tag on the PR indicating it's been checked

_TODO_: can the release-please PR be against `main` with the correct backport?

- otherwise, how do we handle updating the docs/releases/changelog in main?

_TODO_: define validate

- check generated files
- check gomod
- check shellcheck
- check doc drift
- validate example configs
- check example config docs
- check helm values doc

- define which images are going to be built

  - loki
    - amd64
    - arm64
    - arm
    - multi-arch
  - loki-canary
    - amd64
    - arm64
    - arm
    - multi-arch
  - logcli
    - amd64
    - arm64
    - arm
    - multi-arch
  - promtail
    - amd64
    - arm64
    - arm
    - multi-arch
  - lokioperator
    - amd64
    - arm64
    - arm
  - fluent-bit
    - amd64
  - fluentd
    - amd64
  - logstash
    - amd64
  - querytee
    - amd64

- there is no longer a need to announce, since we have a long running PR
