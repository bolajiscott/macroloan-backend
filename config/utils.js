import dotenv from 'dotenv';
import mime from 'mime-types';
import jwt from 'jsonwebtoken';

// import nodemailer from 'nodemailer';

dotenv.config();

const key = 'udaisxefkpedjynzhtbocbqrmcavfwgl'.split('').map(function (c) {
    return c.charCodeAt(0);
})

const nonce = 'yieuxbqdkeposdnzjfacthb'.split('').map(function (c) {
    return c.charCodeAt(0);
})


export const checkJWTCookie = function (req, res, next) {
    let jwtCookie = req.cookies[process.env.COOKIE]; // check if client sent cookie
    if (jwtCookie === null || jwtCookie === undefined || jwtCookie === "") {
        jwtCookie = jwtGenerate({})
    } 
    let jwtAccessToken = {userId:0}
    try {
        jwtAccessToken = jwtVerify(jwtCookie)
        req.operator = jwtAccessToken
    } catch(error) {
        console.log("verification issue")
        console.log(error)
    }

    delete jwtAccessToken.iat
    delete jwtAccessToken.exp
    jwtCookie = jwtGenerate(jwtAccessToken)
    res.cookie(process.env.COOKIE, jwtCookie, {
        maxAge: 60 * 60 * 1000,
        // maxAge: 60 * 60 * 1000,
        httpOnly: true
    });
    

    switch(true){
        case req.url.includes('/public'):
            next()
            break;

        case req.url.includes('/driverapp/'):
             // eslint-disable-next-line no-case-declarations
             let jsonResp = {
                 "timestamp": new Date().toISOString(),
                 "status": 401,
                 "error": "Invalid Token",
                 "path": req.originalUrl,
                 "debug_error": "Authentication token is invalid or expired"
             }

            //1 Get the jwttoken from the headers
            if (!req.headers.authorization) {
                jsonResp.error = "No Token provided";
                jsonResp.debug_error = "Authorization header is required";
                return res.status(jsonResp.status).json(jsonResp)
            }

            // eslint-disable-next-line no-case-declarations
            let accessToken = req.headers.authorization.split(' ')[1];
            jwtVerify(accessToken)

            jwtAccessToken = jwtVerify(accessToken)

            if (jwtAccessToken.userId == 0) {
                res.status(400).json({
                    Type: "error",
                    Message: "You have no permission to access this route",
                    Body: {
                        Redirect: "signin"
                    }
                });

            } else {
                next()
            }
            
            break;

        default:
            switch (req.url) {
                 case "/api/auth/signin":
                 case "/api/auth/forgot":
                //  case "/api/auth/selfonboarding/signin/":
                //  case "/api/drivers/getprofiles/lambda":
                //  case "/api/elearning/elearningsessions/authenticate":
                //  case "/api/setups/cbtsessions/authenticate":
                     next(); // <-- important!
                     break;

                 default:
                     if (jwtAccessToken.userId == 0) {
                         jwtCookie = jwtGenerate({})
                         res.cookie(process.env.COOKIE, jwtCookie, {
                             maxAge: 60 * 60 * 1000,
                             httpOnly: true
                         });

                         if (req.url.startsWith("/api/")) {
                             res.status(400).json({
                                 Type: "error",
                                 Message: "You have no permission to access this route",
                                 Body: {
                                     Redirect: "signin"
                                 }
                             });
                         } else {
                             next();
                         }
                     } else {
                         next(); // <-- important!
                     }
                     break;
             }
            break;
    } 
}



export const isSuperUser = (role) => { 
    let isTrueOrFalse = false;
    isTrueOrFalse = (role == 'agency-manager') ? true : isTrueOrFalse
    isTrueOrFalse = (role == 'onboarding-manager') ? true : isTrueOrFalse
    isTrueOrFalse = (role == 'channel-manager') ? true : isTrueOrFalse
    isTrueOrFalse = (role == 'country-manager') ? true : isTrueOrFalse
    isTrueOrFalse = (role == 'superadmin') ? true : isTrueOrFalse

    return isTrueOrFalse
}

export const SALT = process.env.SALT
const SECRET = process.env.SECRET
// export const SALT = "$2a$10$6Gdha/.eJzJQI4gE01Pgvu"
// const SECRET = "e/lNPr2RuOFRhoCfo8F9CBV3BzkJjKYu"

if (!SALT || SALT === "") {
    console.log("SALT environment variables not set")
    process.exit(0)
}

if (!SECRET || SECRET === "") {
    console.log("SECRET environment variables not set")
    process.exit(0)
}

export const jwtGenerate = (jwtPayload) => {
    if (jwtPayload === undefined || jwtPayload === null ||
        jwtPayload.userId == undefined || jwtPayload.userId == null ||
        jwtPayload.userId == 0) {
        jwtPayload = {
            userId: 0,
            role: "",
            username: "",
            profileId: 0,
            countryId: 0
        };
    }

    return jwt.sign(jwtPayload, SECRET, {
        expiresIn: '1d',
    });
};


export const jwtGenerateLong = (jwtPayload) => {
    if (jwtPayload === undefined || jwtPayload === null || 
        jwtPayload.userId == undefined || jwtPayload.userId == null || 
        jwtPayload.userId == 0) {
        jwtPayload = {
            userId: 0,
            role: "",
            username: "",
            profileId: 0,
            countryId: 0
        };
    }
    
	return jwt.sign(jwtPayload, SECRET, {});
};



export const jwtVerify = (jwtCookie) => {
    try {
        return jwt.verify(jwtCookie, SECRET);
    } catch (error) {
        return {
            userId: 0,
            role: "",
            username: "",
            profileId: 0,
            countryId: 0
        }
    }
}

export function getRandomString(length) {
    var randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var result = '';
    for ( var i = 0; i < length; i++ ) {
        result += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }
    return result;
}

// export const transporter = nodemailer.createTransport({
//     host: "smtp.sendgrid.net",
//     port: 465,
//     secure: true,
//     auth: {
//         user: process.env.SMTP_USERNAME,
//         pass: process.env.SMTP_PASSWORD,
//     },
//     tls: {
//     // do not fail on invalid certs
//         rejectUnauthorized: false,
//     },
// });


// export const hashPassword = async (password) => {
//     const hashedPassword = await new Promise((resolve, reject) => {
//         bcrypt.hash(password, SALT, function(err, hash) {
//         if (err) reject(err)
//         resolve(hash)
//         });
//     })
//     return hashedPassword
// }
  

// export const bcryptPassword = async (password) => {
    // Create Password
    // bcrypt.genSalt(10, (err, salt) => {
    //     bcrypt.hash(password, salt, (err, hash) => {
    //         if (err) console.log (err)
    //         return hash;
    //     });
    // });
    // Create Password
// }