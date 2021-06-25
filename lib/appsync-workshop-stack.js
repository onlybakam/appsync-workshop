// 1. Import dependencies
const cdk = require('@aws-cdk/core')
const appsync = require('@aws-cdk/aws-appsync')
const db = require('@aws-cdk/aws-dynamodb')
const cognito = require('@aws-cdk/aws-cognito')

// 2. Reintroduce: setup a static expiration date for the API KEY
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
const WORKSHOP_DATE = new Date() // date of this workshop
WORKSHOP_DATE.setHours(0)
WORKSHOP_DATE.setMinutes(0)
WORKSHOP_DATE.setSeconds(0)
WORKSHOP_DATE.setMilliseconds(0)
const KEY_EXPIRATION_DATE = new Date(WORKSHOP_DATE.getTime() + SEVEN_DAYS)

class AppsyncWorkshopStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props)

    // 2.a. Configure the User Pool
    const pool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'WorkshopUserPool',
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      standardAttributes: { email: { required: true } },
    })
    // 2.b. Configure the client
    const client = pool.addClient('customer-app-client-web', {
      preventUserExistenceErrors: true,
    })

    // 3. Define your AppSync API
    const api = new appsync.GraphqlApi(this, 'WorkshopAPI', {
      name: 'WorkshopAPI',
      // 3. a. create schema using our schema definition
      schema: appsync.Schema.fromAsset('appsync/schema.graphql'),
      // 3. b. Authorization mode
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: pool,
          },
        },
        // 3. c. Additional Authorization mode
        additionalAuthorizationModes: [
          {
            authorizationType: 'API_KEY',
            apiKeyConfig: {
              name: 'default',
              description: 'default auth mode',
              expires: cdk.Expiration.atDate(KEY_EXPIRATION_DATE),
            },
          },
        ],
      },
    })

    // 4. Define the DynamoDB table with partition key and sort key
    const table = new db.Table(this, 'DataPointTable', {
      partitionKey: { name: 'PK', type: db.AttributeType.STRING },
      sortKey: { name: 'SK', type: db.AttributeType.STRING },
    })

    // 5. Set up table as a Datasource and grant access
    const dataSource = api.addDynamoDbDataSource('dataPointSource', table)

    // 6. Define resolvers
    dataSource.createResolver({
      typeName: 'Mutation',
      fieldName: 'createDataPoint',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        'appsync/resolvers/Mutation.createDataPoint.req.vtl'
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    })

    dataSource.createResolver({
      typeName: 'Query',
      fieldName: 'queryDataPointsByNameAndDateTime',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        'appsync/resolvers/Query.queryDataPointsByNameAndDateTime.req.vtl'
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        'appsync/resolvers/Query.queryDataPointsByNameAndDateTime.res.vtl'
      ),
    })

    dataSource.createResolver({
      typeName: 'Query',
      fieldName: 'listDataPoints',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        'appsync/resolvers/Query.listDataPoints.req.vtl'
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    })

    const none = api.addNoneDataSource('none')
    none.createResolver({
      typeName: 'Subscription',
      fieldName: 'onCreateDataPoint',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
      {
        "version": "2018-05-29",
        "payload": {}
      }`),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        'appsync/resolvers/Subscription.onCreateDataPoint.res.vtl'
      ),
    })

    // 7. Stack Outputs
    new cdk.CfnOutput(this, 'GraphQLAPI_ID', { value: api.apiId })
    new cdk.CfnOutput(this, 'GraphQLAPI_URL', { value: api.graphqlUrl })
    new cdk.CfnOutput(this, 'STACK_REGION', { value: this.region })
    // 7.a. User Pool information
    new cdk.CfnOutput(this, 'USER_POOLS_ID', { value: pool.userPoolId })
    new cdk.CfnOutput(this, 'USER_POOLS_WEB_CLIENT_ID', {
      value: client.userPoolClientId,
    })
  }
}

module.exports = { AppsyncWorkshopStack }