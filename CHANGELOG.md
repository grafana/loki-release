# Changelog

## [1.4.0](https://github.com/grafana/loki-release/compare/v1.3.1...v1.4.0) (2024-01-17)


### Features

* add artifacts to release ([4fea492](https://github.com/grafana/loki-release/commit/4fea4927fe360ce4031fa0553f6536d8fd980d17))
* add backport action ([4df43c6](https://github.com/grafana/loki-release/commit/4df43c665e46daa36fca0b9be0932b2393ebb5c7))
* add correct updaters to release pull request ([d50db7a](https://github.com/grafana/loki-release/commit/d50db7a6ce579a8b21c0f84b3767eb6f9c24f9dc))
* add create release step ([fe8c2fb](https://github.com/grafana/loki-release/commit/fe8c2fbe3d6bd7617226b6e7e9f5abdd77aec483))
* add install binary action ([947ed95](https://github.com/grafana/loki-release/commit/947ed95bf340634e24bfc316eda4f20d356190de))
* add more functionality from release please ([6c871fc](https://github.com/grafana/loki-release/commit/6c871fc3368e4eece45c7fa807e1831164f4debe))
* add prepare-release step ([83f42ff](https://github.com/grafana/loki-release/commit/83f42ffb6cae6d89c98dc066113e36da83e92449))
* add release steps to jsonnet-build workflow ([55a14d6](https://github.com/grafana/loki-release/commit/55a14d67b6cdbda880abe16ed3cd1db969714b1c))
* add release-1.4.x config ([8ad11b5](https://github.com/grafana/loki-release/commit/8ad11b564ba5271eec54cc98029c7b2f3019978e))
* added github interactions to release plugin ([808c34a](https://github.com/grafana/loki-release/commit/808c34aa4bc81a523683b2b345eccff75e628e2f))
* build images for multiple platforms ([49a846e](https://github.com/grafana/loki-release/commit/49a846e2da75e56cd22fd4bbadb2469919afed2e))
* build pipeline using jsonnet for re-use ([b6cc287](https://github.com/grafana/loki-release/commit/b6cc2876ac3a593ede5644ca2e5a3bbec5572837))
* **ci:** add prepare workflow ([b100d6f](https://github.com/grafana/loki-release/commit/b100d6fe25669928cb023e4b869af0cfe353b7b1))
* **ci:** add release-please action ([b994e1b](https://github.com/grafana/loki-release/commit/b994e1bb5a36e7f6e1f0134a1ea104143d0bce3f))
* **ci:** bump minor for k branches ([44d573d](https://github.com/grafana/loki-release/commit/44d573d107dd71ae26e2884a8d5e75c2e7a6d76f))
* **ci:** fix default-branch ([fe48dc3](https://github.com/grafana/loki-release/commit/fe48dc34c4e9cbfc42d5afff5ad79c0b1daf464a))
* **ci:** try to move versioning into workflow definition ([d66d51a](https://github.com/grafana/loki-release/commit/d66d51a562d6384e2966acd1cbf3755b99ff93a4))
* configure to use new create release pr action ([9f44418](https://github.com/grafana/loki-release/commit/9f4441831a1cf8e5ac12624d49616e3ef2f7ca15))
* correctly handle first version on branch ([499baae](https://github.com/grafana/loki-release/commit/499baae33d277339f30895ae4e51add1743997b9))
* create release branch from k release ([07f2b06](https://github.com/grafana/loki-release/commit/07f2b064a9a0234a0cfe87cf390bb6f055dff967))
* exclude component from tag for better release notes ([9841d98](https://github.com/grafana/loki-release/commit/9841d98bbfefd2a1d972c4bb81f5a4d6bcffc5e7))
* first try at storing build artifacts in GCS ([8801d68](https://github.com/grafana/loki-release/commit/8801d686e7b4084bb8e82f5776c8a7148fa219a5))
* fix typo in versioing-strategy ([5a47a62](https://github.com/grafana/loki-release/commit/5a47a62cdea90bbf21cefd8085eaf8b47650bd51))
* fix versioning strategy ([0008487](https://github.com/grafana/loki-release/commit/0008487cad2fe5e54fdacde3ff0b2724c21db979))
* handle first version of release branch ([88270f1](https://github.com/grafana/loki-release/commit/88270f1a28c3c09c93a2ef33658e4e64f3df45e7))
* make workflow re-usable ([c01b721](https://github.com/grafana/loki-release/commit/c01b7213100dca261ddf9cad255cf4428bebd8a7))
* nest workflows in folder ([2eab631](https://github.com/grafana/loki-release/commit/2eab6317c6381b2827dac7409bfd8dfcaf96f4eb))
* output created/updated PR ([3d76523](https://github.com/grafana/loki-release/commit/3d76523376309db2e95d8f05716aa0c3d1b228e7))
* simply prepareRelease to only prepare as single release ([c125157](https://github.com/grafana/loki-release/commit/c125157a16dda9a7e20a0a4916241c7f948d72fa))
* try a merge to main w/ backport strategy ([cf996f4](https://github.com/grafana/loki-release/commit/cf996f4cb2366df03c668af2b572f845c904e7ac))
* update release.json for a new release branch ([c6949e5](https://github.com/grafana/loki-release/commit/c6949e53d60cc73790bddd20b1be01f8097de7aa))
* use release branch for release config ([7cefd17](https://github.com/grafana/loki-release/commit/7cefd1754778650bb97c4a2af888e0584424736d))
* validate release branch release.json ([15170d9](https://github.com/grafana/loki-release/commit/15170d973960efc5f61cfc7db2ea5a4a6abb48ae))


### Bug Fixes

* bash logic ([9673296](https://github.com/grafana/loki-release/commit/9673296216774f85438d37bb1b23ab775dd7f2d1))
* build create-release-pr as part of package task ([7ea9af3](https://github.com/grafana/loki-release/commit/7ea9af325060156068b3d2a7a4bd3b23907577fd))
* fix step name ([304fd36](https://github.com/grafana/loki-release/commit/304fd36cec61d13d597a3743fa6ecc431f7f91e3))
* jq syntax ([673cfde](https://github.com/grafana/loki-release/commit/673cfde799ebe41441416c0f7f274753fb52beec))
* no tag for first release ([c889af2](https://github.com/grafana/loki-release/commit/c889af2489a8c495a2d9a763ea15868965e56e57))
* pull code ([f430468](https://github.com/grafana/loki-release/commit/f430468914d05e23349966b68152d180e22c7fae))
* remove working-dir from new action config ([dea9305](https://github.com/grafana/loki-release/commit/dea93050011af2ca16dce8778520b0eafd54cedc))
* use variable notation, whoops ([249d764](https://github.com/grafana/loki-release/commit/249d7648a1460dc080e4547bdd20cfcd1c1f785d))
* versioning strategy ([741a702](https://github.com/grafana/loki-release/commit/741a702211a7ec099fc876dfa7ca1be9b991a93d))

## [1.3.2](https://github.com/grafana/loki-release/compare/v1.3.1...v1.3.2) (2023-12-28)


### Features

* add ability to create releases ([ace078a](https://github.com/grafana/loki-release/commit/ace078aa1d5e87ea987dd21e7ee5106903210ba8))
* add artifacts to release ([4fea492](https://github.com/grafana/loki-release/commit/4fea4927fe360ce4031fa0553f6536d8fd980d17))
* add backport action ([4df43c6](https://github.com/grafana/loki-release/commit/4df43c665e46daa36fca0b9be0932b2393ebb5c7))
* add correct updaters to release pull request ([d50db7a](https://github.com/grafana/loki-release/commit/d50db7a6ce579a8b21c0f84b3767eb6f9c24f9dc))
* add create release step ([fe8c2fb](https://github.com/grafana/loki-release/commit/fe8c2fbe3d6bd7617226b6e7e9f5abdd77aec483))
* add install binary action ([947ed95](https://github.com/grafana/loki-release/commit/947ed95bf340634e24bfc316eda4f20d356190de))
* add more functionality from release please ([6c871fc](https://github.com/grafana/loki-release/commit/6c871fc3368e4eece45c7fa807e1831164f4debe))
* add release steps to jsonnet-build workflow ([55a14d6](https://github.com/grafana/loki-release/commit/55a14d67b6cdbda880abe16ed3cd1db969714b1c))
* added github interactions to release plugin ([808c34a](https://github.com/grafana/loki-release/commit/808c34aa4bc81a523683b2b345eccff75e628e2f))
* build images for multiple platforms ([49a846e](https://github.com/grafana/loki-release/commit/49a846e2da75e56cd22fd4bbadb2469919afed2e))
* build pipeline using jsonnet for re-use ([b6cc287](https://github.com/grafana/loki-release/commit/b6cc2876ac3a593ede5644ca2e5a3bbec5572837))
* **ci:** add prepare workflow ([b100d6f](https://github.com/grafana/loki-release/commit/b100d6fe25669928cb023e4b869af0cfe353b7b1))
* **ci:** add release-please action ([b994e1b](https://github.com/grafana/loki-release/commit/b994e1bb5a36e7f6e1f0134a1ea104143d0bce3f))
* **ci:** bump minor for k branches ([44d573d](https://github.com/grafana/loki-release/commit/44d573d107dd71ae26e2884a8d5e75c2e7a6d76f))
* **ci:** fix default-branch ([fe48dc3](https://github.com/grafana/loki-release/commit/fe48dc34c4e9cbfc42d5afff5ad79c0b1daf464a))
* **ci:** try to move versioning into workflow definition ([d66d51a](https://github.com/grafana/loki-release/commit/d66d51a562d6384e2966acd1cbf3755b99ff93a4))
* configure to use new create release pr action ([9f44418](https://github.com/grafana/loki-release/commit/9f4441831a1cf8e5ac12624d49616e3ef2f7ca15))
* create release branch from k release ([07f2b06](https://github.com/grafana/loki-release/commit/07f2b064a9a0234a0cfe87cf390bb6f055dff967))
* early bail sarching commits and catch PR body parse errors ([0a20495](https://github.com/grafana/loki-release/commit/0a20495f50c91d9be9492613efa727e969bb0239))
* exclude component from tag for better release notes ([9841d98](https://github.com/grafana/loki-release/commit/9841d98bbfefd2a1d972c4bb81f5a4d6bcffc5e7))
* first try at storing build artifacts in GCS ([8801d68](https://github.com/grafana/loki-release/commit/8801d686e7b4084bb8e82f5776c8a7148fa219a5))
* fix typo in versioing-strategy ([5a47a62](https://github.com/grafana/loki-release/commit/5a47a62cdea90bbf21cefd8085eaf8b47650bd51))
* fix versioning strategy ([0008487](https://github.com/grafana/loki-release/commit/0008487cad2fe5e54fdacde3ff0b2724c21db979))
* make workflow re-usable ([c01b721](https://github.com/grafana/loki-release/commit/c01b7213100dca261ddf9cad255cf4428bebd8a7))
* nest workflows in folder ([2eab631](https://github.com/grafana/loki-release/commit/2eab6317c6381b2827dac7409bfd8dfcaf96f4eb))
* output created/updated PR ([3d76523](https://github.com/grafana/loki-release/commit/3d76523376309db2e95d8f05716aa0c3d1b228e7))
* refactor to OO code style ([784a7d1](https://github.com/grafana/loki-release/commit/784a7d1732bdabc790fc417dad0672f8e948b22c))
* super awesome feature ([fc0dbee](https://github.com/grafana/loki-release/commit/fc0dbee1f01766e124e76fa9a37364ad1dc151c3))
* try a merge to main w/ backport strategy ([5e42f1f](https://github.com/grafana/loki-release/commit/5e42f1ffe83304891f99f028d250b19fe2ff160a))
* try a merge to main w/ backport strategy ([cf996f4](https://github.com/grafana/loki-release/commit/cf996f4cb2366df03c668af2b572f845c904e7ac))


### Bug Fixes

* 1.3.x current version ([c46aabd](https://github.com/grafana/loki-release/commit/c46aabd584751d3e92f9460de8344b7cf3aba0c4))
* build create-release-pr as part of package task ([7ea9af3](https://github.com/grafana/loki-release/commit/7ea9af325060156068b3d2a7a4bd3b23907577fd))
* create release workflow name ([a51fe5e](https://github.com/grafana/loki-release/commit/a51fe5e1224b83db156814e6ecabbe87237f69c4))
* flip label inclusion logic ([8ec1d3b](https://github.com/grafana/loki-release/commit/8ec1d3bacb5ff3a3f87475f6de2fa7a88ea72779))
* remove working-dir from new action config ([dea9305](https://github.com/grafana/loki-release/commit/dea93050011af2ca16dce8778520b0eafd54cedc))
* use variable notation, whoops ([249d764](https://github.com/grafana/loki-release/commit/249d7648a1460dc080e4547bdd20cfcd1c1f785d))
* versioning strategies ([ad7ebd7](https://github.com/grafana/loki-release/commit/ad7ebd7d26efe446a6cdfa4f9c1aa177cd381519))

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
