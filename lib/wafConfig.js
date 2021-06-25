const cdk = require('@aws-cdk/core')
const waf2 = require('@aws-cdk/aws-wafv2')

class WafConfig extends cdk.Construct {
  constructor(scope, id, { api }) {
    super(scope, id)

    const allowedIPSet = new waf2.CfnIPSet(this, 'MyIP', {
      addresses: ['<YOUR_IP_ADDRESS>/32'], // replace with your public IP address
      ipAddressVersion: 'IPV4',
      scope: 'REGIONAL',
      name: 'MyIPSet-AppSyncWorkshop',
    })

    const acl = new waf2.CfnWebACL(this, `ACL`, {
      defaultAction: { allow: {} },
      scope: 'REGIONAL',
      name: `WorkshopAPI-ACL`,
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        sampledRequestsEnabled: true,
        metricName: 'WorkshopAPI',
      },
      rules: [
        {
          name: 'FloodProtection',
          action: { block: {} },
          priority: 1,
          statement: {
            rateBasedStatement: { aggregateKeyType: 'IP', limit: 1000 },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            sampledRequestsEnabled: true,
            metricName: `WorkshopAPI-FloodProtection`,
          },
        },
        {
          name: 'RestrictAPIKey',
          action: { block: {} },
          priority: 2,
          statement: {
            andStatement: {
              statements: [
                {
                  byteMatchStatement: {
                    fieldToMatch: { singleHeader: { name: 'x-api-key' } },
                    positionalConstraint: 'EXACTLY',
                    searchString: api.apiKey,
                    textTransformations: [{ priority: 1, type: 'LOWERCASE' }],
                  },
                },
                {
                  notStatement: {
                    statement: {
                      ipSetReferenceStatement: { arn: allowedIPSet.attrArn },
                    },
                  },
                },
              ],
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            sampledRequestsEnabled: true,
            metricName: `WorkshopAPI-RestrictAPIKey`,
          },
        },
      ],
    })

    const association = new waf2.CfnWebACLAssociation(this, 'APIAssoc', {
      resourceArn: api.arn,
      webAclArn: acl.attrArn,
    })

    this.acl = acl
    this.association = association
  }
}

module.exports = { WafConfig }
