{
  build: (import 'build.libsonnet'),
  validate: (import 'validate.libsonnet'),
  release: (import 'release.libsonnet'),

  local common = (import 'common.libsonnet'),
  job: common.job,
  step: common.step,
}
