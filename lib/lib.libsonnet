{
  image: (import 'image.libsonnet'),
  validate: (import 'validate.libsonnet'),

  local common = (import 'common.libsonnet'),
  job: common.job,
  step: common.step,
}
