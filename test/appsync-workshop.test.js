const { expect, matchTemplate, MatchStyle } = require('@aws-cdk/assert');
const cdk = require('@aws-cdk/core');
const AppsyncWorkshop = require('../lib/appsync-workshop-stack');

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new AppsyncWorkshop.AppsyncWorkshopStack(app, 'MyTestStack');
    // THEN
    expect(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
