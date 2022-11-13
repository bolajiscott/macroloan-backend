const Config = {
    cookie: process.env.COOKIE,
    salt: process.env.SALT,
    secret: process.env.SECRET,
    env: process.env.NODE_ENV,
    logLevel: process.env.LOG_LEVEL,

    // DB
    dbConnectionString: process.env.DB_CONN.replace("postgresultql", "postgres"),

    
}

export default Config
