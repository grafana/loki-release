local common = import 'common.libsonnet';
local job = common.job;
local step = common.step;

{
  ecrImage: function(name, path, dockerfile='Dockerfile', context='release', platform=[])
    $.image(name, path, dockerfile, context, platform)
    + job.withSteps([
      step.new('Configure AWS credentials')
      + step.uses('aws-actions/configure-aws-credentials@v4')
      + step.with({
        'aws-access-key-id': '${{ secrets.ECR_ACCESS_KEY }}',
        'aws-secret-access-key': '${{ secrets.ECR_SECRET_KEY }}',
        'aws-region': 'us-east-1'
      }),
      step.new('Login to Amazon ECR Public')
      + step.run('aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws/grafana')
    ]),

  weeklyEcrImage: function(name, path, dockerfile='Dockerfile', context='release', platform=[])
    $.weeklyImage(name, path, dockerfile, context, platform)
    + job.withSteps([
      step.new('Configure AWS credentials')
      + step.uses('aws-actions/configure-aws-credentials@v4')
      + step.with({
        'aws-access-key-id': '${{ secrets.ECR_ACCESS_KEY }}',
        'aws-secret-access-key': '${{ secrets.ECR_SECRET_KEY }}',
        'aws-region': 'us-east-1'
      }),
      step.new('Login to Amazon ECR Public')
      + step.run('aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws/grafana')
    ])
}
