# Changelog

## [1.5.1](https://github.com/grafana/loki-release/compare/v1.5.0...v1.5.1) (2024-01-18)


### Features

* create release first ([07cd4b3](https://github.com/grafana/loki-release/commit/07cd4b3087aa1e20f61912616a1437bddc82f4ba))
* release from release branch ([98f71c5](https://github.com/grafana/loki-release/commit/98f71c53a5290825e604fc20633bf5592cd95e89))
* return to using native release-pleae action ([2bbbfd4](https://github.com/grafana/loki-release/commit/2bbbfd4b49ca44cfc9fa0c2e655ec77184f25862))
* use correct target branch in release ([d72b0f7](https://github.com/grafana/loki-release/commit/d72b0f72b0144fcb234ae9bea8d678dc7e34b732))


### Bug Fixes

* pull both repos for release action ([043dd18](https://github.com/grafana/loki-release/commit/043dd18feefb8d9f611843343e16b179aa0d01d5))

## [1.5.0](https://github.com/grafana/loki-release/compare/v1.5.0...v1.5.0) (2024-01-18)


### Features

* add artifacts to release ([4fea492](https://github.com/grafana/loki-release/commit/4fea4927fe360ce4031fa0553f6536d8fd980d17))
* add backport action ([4df43c6](https://github.com/grafana/loki-release/commit/4df43c665e46daa36fca0b9be0932b2393ebb5c7))
* add correct updaters to release pull request ([d50db7a](https://github.com/grafana/loki-release/commit/d50db7a6ce579a8b21c0f84b3767eb6f9c24f9dc))
* add create release step ([fe8c2fb](https://github.com/grafana/loki-release/commit/fe8c2fbe3d6bd7617226b6e7e9f5abdd77aec483))
* add install binary action ([947ed95](https://github.com/grafana/loki-release/commit/947ed95bf340634e24bfc316eda4f20d356190de))
* add more functionality from release please ([6c871fc](https://github.com/grafana/loki-release/commit/6c871fc3368e4eece45c7fa807e1831164f4debe))
* add release please manifest back ([23b8935](https://github.com/grafana/loki-release/commit/23b8935189892e86516a930f4aa36611ea0258d3))
* add release steps to jsonnet-build workflow ([55a14d6](https://github.com/grafana/loki-release/commit/55a14d67b6cdbda880abe16ed3cd1db969714b1c))
* added github interactions to release plugin ([808c34a](https://github.com/grafana/loki-release/commit/808c34aa4bc81a523683b2b345eccff75e628e2f))
* always bump patch ([1893c6f](https://github.com/grafana/loki-release/commit/1893c6f4ec255720fe57dafd451caac497dc0200))
* build images for multiple platforms ([49a846e](https://github.com/grafana/loki-release/commit/49a846e2da75e56cd22fd4bbadb2469919afed2e))
* build pipeline using jsonnet for re-use ([b6cc287](https://github.com/grafana/loki-release/commit/b6cc2876ac3a593ede5644ca2e5a3bbec5572837))
* **ci:** add release-please action ([b994e1b](https://github.com/grafana/loki-release/commit/b994e1bb5a36e7f6e1f0134a1ea104143d0bce3f))
* **ci:** bump minor for k branches ([44d573d](https://github.com/grafana/loki-release/commit/44d573d107dd71ae26e2884a8d5e75c2e7a6d76f))
* **ci:** fix default-branch ([fe48dc3](https://github.com/grafana/loki-release/commit/fe48dc34c4e9cbfc42d5afff5ad79c0b1daf464a))
* **ci:** try to move versioning into workflow definition ([d66d51a](https://github.com/grafana/loki-release/commit/d66d51a562d6384e2966acd1cbf3755b99ff93a4))
* create release branch from k release ([07f2b06](https://github.com/grafana/loki-release/commit/07f2b064a9a0234a0cfe87cf390bb6f055dff967))
* exclude component from tag for better release notes ([9841d98](https://github.com/grafana/loki-release/commit/9841d98bbfefd2a1d972c4bb81f5a4d6bcffc5e7))
* first try at storing build artifacts in GCS ([8801d68](https://github.com/grafana/loki-release/commit/8801d686e7b4084bb8e82f5776c8a7148fa219a5))
* fix typo in versioing-strategy ([5a47a62](https://github.com/grafana/loki-release/commit/5a47a62cdea90bbf21cefd8085eaf8b47650bd51))
* fix versioning strategy ([0008487](https://github.com/grafana/loki-release/commit/0008487cad2fe5e54fdacde3ff0b2724c21db979))
* make workflow re-usable ([c01b721](https://github.com/grafana/loki-release/commit/c01b7213100dca261ddf9cad255cf4428bebd8a7))
* nest workflows in folder ([2eab631](https://github.com/grafana/loki-release/commit/2eab6317c6381b2827dac7409bfd8dfcaf96f4eb))
* output created/updated PR ([3d76523](https://github.com/grafana/loki-release/commit/3d76523376309db2e95d8f05716aa0c3d1b228e7))
* try a merge to main w/ backport strategy ([cf996f4](https://github.com/grafana/loki-release/commit/cf996f4cb2366df03c668af2b572f845c904e7ac))
* try releasing into stable release branch ([d882d58](https://github.com/grafana/loki-release/commit/d882d585c6967a5fe698db3490c189b738edcbf6))


### Bug Fixes

* copy changelog step ([1eb022f](https://github.com/grafana/loki-release/commit/1eb022fabfadf2d3bfc359d4af2d58ffb5f91a19))
* label arg ([24d3e8b](https://github.com/grafana/loki-release/commit/24d3e8bb382f929ff2327950d76c5a6d70a54556))


### Miscellaneous Chores

* release 1.5.0 ([abf1705](https://github.com/grafana/loki-release/commit/abf1705c254dc65b984763e01f8f9a47eaad34aa))

## [1.2.0](https://github.com/grafana/loki-release/compare/v1.1.3...v1.2.0) (2023-12-01)


### Features

* add backport action ([4df43c6](https://github.com/grafana/loki-release/commit/4df43c665e46daa36fca0b9be0932b2393ebb5c7))
* add install binary action ([947ed95](https://github.com/grafana/loki-release/commit/947ed95bf340634e24bfc316eda4f20d356190de))
* add release steps to jsonnet-build workflow ([55a14d6](https://github.com/grafana/loki-release/commit/55a14d67b6cdbda880abe16ed3cd1db969714b1c))
* build images for multiple platforms ([49a846e](https://github.com/grafana/loki-release/commit/49a846e2da75e56cd22fd4bbadb2469919afed2e))
* build pipeline using jsonnet for re-use ([b6cc287](https://github.com/grafana/loki-release/commit/b6cc2876ac3a593ede5644ca2e5a3bbec5572837))
* **ci:** bump minor for k branches ([44d573d](https://github.com/grafana/loki-release/commit/44d573d107dd71ae26e2884a8d5e75c2e7a6d76f))
* **ci:** try to move versioning into workflow definition ([d66d51a](https://github.com/grafana/loki-release/commit/d66d51a562d6384e2966acd1cbf3755b99ff93a4))
* create release branch from k release ([07f2b06](https://github.com/grafana/loki-release/commit/07f2b064a9a0234a0cfe87cf390bb6f055dff967))
* exclude component from tag for better release notes ([9841d98](https://github.com/grafana/loki-release/commit/9841d98bbfefd2a1d972c4bb81f5a4d6bcffc5e7))
* make workflow re-usable ([c01b721](https://github.com/grafana/loki-release/commit/c01b7213100dca261ddf9cad255cf4428bebd8a7))
* nest workflows in folder ([2eab631](https://github.com/grafana/loki-release/commit/2eab6317c6381b2827dac7409bfd8dfcaf96f4eb))
* try a merge to main w/ backport strategy ([cf996f4](https://github.com/grafana/loki-release/commit/cf996f4cb2366df03c668af2b572f845c904e7ac))

## [1.1.3](https://github.com/grafana/loki-release/compare/v1.1.2...v1.1.3) (2023-11-22)


### Features

* add artifacts to release ([4fea492](https://github.com/grafana/loki-release/commit/4fea4927fe360ce4031fa0553f6536d8fd980d17))
* **ci:** add release-please action ([b994e1b](https://github.com/grafana/loki-release/commit/b994e1bb5a36e7f6e1f0134a1ea104143d0bce3f))
* **ci:** fix default-branch ([fe48dc3](https://github.com/grafana/loki-release/commit/fe48dc34c4e9cbfc42d5afff5ad79c0b1daf464a))
* fix typo in versioing-strategy ([5a47a62](https://github.com/grafana/loki-release/commit/5a47a62cdea90bbf21cefd8085eaf8b47650bd51))
* fix versioning strategy ([0008487](https://github.com/grafana/loki-release/commit/0008487cad2fe5e54fdacde3ff0b2724c21db979))

## [1.1.2](https://github.com/grafana/loki-release/compare/v1.1.1...v1.1.2) (2023-11-22)


### Features

* add artifacts to release ([4fea492](https://github.com/grafana/loki-release/commit/4fea4927fe360ce4031fa0553f6536d8fd980d17))
* **ci:** add release-please action ([b994e1b](https://github.com/grafana/loki-release/commit/b994e1bb5a36e7f6e1f0134a1ea104143d0bce3f))
* **ci:** fix default-branch ([fe48dc3](https://github.com/grafana/loki-release/commit/fe48dc34c4e9cbfc42d5afff5ad79c0b1daf464a))
* fix typo in versioing-strategy ([5a47a62](https://github.com/grafana/loki-release/commit/5a47a62cdea90bbf21cefd8085eaf8b47650bd51))
* fix versioning strategy ([0008487](https://github.com/grafana/loki-release/commit/0008487cad2fe5e54fdacde3ff0b2724c21db979))

## [1.1.1](https://github.com/grafana/loki-release/compare/v1.1.0...v1.1.1) (2023-11-22)


### Features

* add artifacts to release ([4fea492](https://github.com/grafana/loki-release/commit/4fea4927fe360ce4031fa0553f6536d8fd980d17))
* **ci:** add release-please action ([b994e1b](https://github.com/grafana/loki-release/commit/b994e1bb5a36e7f6e1f0134a1ea104143d0bce3f))
* **ci:** fix default-branch ([fe48dc3](https://github.com/grafana/loki-release/commit/fe48dc34c4e9cbfc42d5afff5ad79c0b1daf464a))
* fix typo in versioing-strategy ([5a47a62](https://github.com/grafana/loki-release/commit/5a47a62cdea90bbf21cefd8085eaf8b47650bd51))
* fix versioning strategy ([0008487](https://github.com/grafana/loki-release/commit/0008487cad2fe5e54fdacde3ff0b2724c21db979))
