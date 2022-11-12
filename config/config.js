const Config = {
    cookie: process.env.COOKIE,
    salt: process.env.SALT,
    secret: process.env.SECRET,
    env: process.env.NODE_ENV,
    logLevel: process.env.LOG_LEVEL,

    // DB
    dbConnectionString: process.env.DB_CONN.replace("postgresultql", "postgres"),

    // APPRUVE
    approve: {
        url: process.env.APPRUVE_URL,
        demoToken: process.env.DEMO_APPRUVE_TOKEN,
        token: process.env.APPRUVE_TOKEN,
    },

    // AWS
    aws: {
        accessKey: process.env.AWS_S3_ACCESSKEY,
        s3SecretKey: process.env.AWS_S3_SECRETKEY,
        s3Bucket: process.env.AWS_S3_BUCKET,
        s3Region: process.env.AWS_S3_REGION,
    },

    // SMTP
    smtp: {
        username: process.env.SMTP_USERNAME,
        password: process.env.SMTP_PASSWORD,
    },

    // SMILE IDENTITY
    smileIdentity: {
        partnerID: process.env.SMILE_PARTNER_ID,
        url: process.env.SMILE_URL,
        apiKey: process.env.SMILE_API_KEY,
        demoApiKey: process.env.DEMO_SMILE_API_KEY,
    },

    // FLUTTER
    flutter: {
        baseApiUrl: process.env.FLUTTERWAVE_BASE_API_URL,
        secretKey: process.env.FLUTTERWAVE_SECRET_KEY,
    },

    // OPSCMS
    opscms: {
        snsRegion: process.env.OPS_CMS_SNS_REGION,
        topicArn: process.env.OPS_CMS_TOPIC_ARN,
        xApiKey: process.env.OPS_CMS_X_API_KEY,
        apiUrl: process.env.CMS_API,
        dbConnectionString: process.env.DB_CONN_OPSCMS,
    },
    // FEATURE
    feature: {
        auditReqRes: process.env.FEATURE_AUDIT_REQ_RES,
        mockSmileIdentity: process.env.FEATURE_MOCK_SMILE_IDENTITY,
    },
    // WALLET
    wallet: {
        coreApiUrl: process.env.WALLET_API_URL,
        cron: process.env.WALLET_CRON,
        auth: {
            keycloakUrl: process.env.WALLET_AUTH_KEYCLOAK_URL,
            clientID: process.env.WALLET_AUTH_CLIENT_ID,
            clientSecret: process.env.WALLET_AUTH_CLIENT_SECRET,
            username: process.env.WALLET_AUTH_USERNAME,
            password: process.env.WALLET_AUTH_PASSWORD,
            grantType: process.env.WALLET_AUTH_GRANT_TYPE,
        }
    },
}

export default Config
