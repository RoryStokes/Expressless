var Request = require('./request')
var Response = require('./response')

const payload = {
    "resource": "/{proxy+}",
    "path": "/hello/world",
    "httpMethod": "POST",
    "headers": {
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate",
        "cache-control": "no-cache",
        "CloudFront-Forwarded-Proto": "https",
        "CloudFront-Is-Desktop-Viewer": "true",
        "CloudFront-Is-Mobile-Viewer": "false",
        "CloudFront-Is-SmartTV-Viewer": "false",
        "CloudFront-Is-Tablet-Viewer": "false",
        "CloudFront-Viewer-Country": "US",
        "Content-Type": "application/json",
        "headerName": "headerValue",
        "Host": "gy415nuibc.execute-api.us-east-1.amazonaws.com",
        "Postman-Token": "9f583ef0-ed83-4a38-aef3-eb9ce3f7a57f",
        "User-Agent": "PostmanRuntime/2.4.5",
        "Via": "1.1 d98420743a69852491bbdea73f7680bd.cloudfront.net (CloudFront)",
        "X-Amz-Cf-Id": "pn-PWIJc6thYnZm5P0NMgOUglL1DYtl0gdeJky8tqsg8iS_sgsKD1A==",
        "X-Forwarded-For": "54.240.196.186, 54.182.214.83",
        "X-Forwarded-Port": "443",
        "X-Forwarded-Proto": "https"
    },
    "queryStringParameters": {
        "name": "me"
    },
    "pathParameters": {
        "proxy": "hello/world"
    },
    "stageVariables": {
        "stageVariableName": "stageVariableValue"
    },
    "requestContext": {
        "accountId": "12345678912",
        "resourceId": "roq9wj",
        "stage": "testStage",
        "requestId": "deef4878-7910-11e6-8f14-25afc3e9ae33",
        "identity": {
            "cognitoIdentityPoolId": null,
            "accountId": null,
            "cognitoIdentityId": null,
            "caller": null,
            "apiKey": null,
            "sourceIp": "192.168.196.186",
            "cognitoAuthenticationType": null,
            "cognitoAuthenticationProvider": null,
            "userArn": null,
            "userAgent": "PostmanRuntime/2.4.5",
            "user": null
        },
        "resourcePath": "/{proxy+}",
        "httpMethod": "POST",
        "apiId": "gy415nuibc"
    },
    "body": "{\r\n\t\"a\": 1\r\n}",
    "isBase64Encoded": false
}

class Expressless {
    constructor(...middleware) {
        this.middleware = middleware || [];

        this.handler = (event, context, callback) => {
            const handleResult = callback;
            const res = new Response()
            const req = new Request(event, res)

            this.runMiddleware(this.middleware, req, res)
            res.awaitBody.then(handleResult)
        }
    }

    runMiddleware(middleware, req, res) {
        let next
        if (middleware.length > 1) {
            next = () => this.runMiddleware(middleware.slice(1), req, res)
        }
        middleware[0](req, res, next);
    }

    withMiddleware(...middleware) {
        this.middleware = [...this.middleware, ...middleware];
        return this;
    }
}

const mid = (req, res, next) => {
    res.write('Hello ')
    res.setHeader('test', 'hello')
    next();
}

const hello = (req, res) => {
    res.append('good', 'true')
    res.append('test', 'world')
    res.send('World!')
}

const handler = new Expressless(mid).withMiddleware(hello).handler;
const result = handler(payload, {}, console.log.bind(console));