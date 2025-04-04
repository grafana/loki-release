local common = import 'common.libsonnet';
local job = common.job;
local step = common.step;

{
  'close-old-releases': common.job.new('ubuntu-latest')
        + common.job.withSteps([
          common.fetchReleaseRepo,
          common.githubAppToken,
          common.setToken,
          common.step.new('Close old release PRs', 'actions/github-script@v7')
            + common.step.with({
              'github-token': '${{ steps.github_app_token.outputs.token }}',
              script: |||
                const threeWeeksAgo = new Date();
                threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);

                let allPRs = [];
                let page = 1;
                let hasMore = true;

                while (hasMore) {
                    const response = await github.rest.pulls.list({
                        owner: context.repo.owner,
                        repo: context.repo.repo,
                        state: 'open',
                        sort: 'created',
                        direction: 'desc',
                        per_page: 100,
                        page: page
                    });

                    allPRs = allPRs.concat(response.data);
                    hasMore = response.data.length === 100;
                    page++;
                }

                console.log(`Found ${allPRs.length} open PRs`);

                let regexPattern = context.payload.inputs?.pr_title_pattern || process.env.DEFAULT_PR_TITLE_REGEX;
                console.log(`Using regex pattern: ${regexPattern}`);

                let closedPrs = 0;
                for (const pr of allPRs) {
                    if (new Date(pr.created_at) < threeWeeksAgo) { // older than 3 weeks ago
                        if (pr.title.match(new RegExp(regexPattern))) {
                            await github.rest.pulls.update({
                                owner: context.repo.owner,
                                repo: context.repo.repo,
                                pull_number: pr.number,
                                state: 'closed'
                              });
                            console.log(`Closed PR #${pr.number}: ${pr.title}`);
                            closedPrs++;
                        }
                    }
                }
                console.log(`Closed ${closedPrs} old release PRs`);
              |||,
            }),
        ]),
}
