import bcrypt from 'bcryptjs';
import express from 'express';
import { users } from '../../dbtables/base.js';
import { jwtVerify } from '../../config/utils.js'
import {pgsql, sqlTableInsert, sqlTableUpdate} from '../../dbtables/pgsql.js';
import {jwtGenerate, jwtGenerateLong } from '../../config/utils.js'


const router = express.Router();

router.post('/signin', async (req, res) => {
    
    let resMsg = {Type: "error", Message: "Sign-in failed!", Body: {} } 

    if (req.body.username == null || req.body.username == undefined || req.body.username == "") {
        resMsg.Message = "Username is missing!"
        return res.status(400).json(resMsg);
    }

    if (req.body.password == null || req.body.password == undefined || req.body.password == "") {
        resMsg.Message = "Pasword is missing!"
        return res.status(400).json(resMsg);
    }

    const sqlQuery = "select u.*, COALESCE(c.name,'') as country from users as u left join countries as c on c.id = u.countryid where u.username = $1  limit 1";
    pgsql.query(sqlQuery, [req.body.username]).then((result) => {
        if (result.rowCount == 1) {
            let user = result.rows[0];

            if (user.id == 0) {
                resMsg.Message = "You are not registered"
                return res.status(400).json(resMsg);
            }

            if (user.status !== "active") {
                resMsg.Message = "Username is " + user.status
                return res.status(400).json(resMsg);
            }

            // Check Password
            bcrypt.compare(req.body.password, user.password).then((isMatch) => {
                if (isMatch) {
                    // User Matched
                    
                    // Create JWT
                    let jwtPayload = { 
                        userId: user.id, 
                        role: user.role, 
                        firstname: user.firstname, 
                        surname: user.surname, 
                        username: user.username, 
                        profileId: user.profileid, 
                        countryId: user.countryid,
                        country: user.country,
                    }; 

                    if (countryId > 0 && country !== "") {
                        jwtPayload.country = country
                        jwtPayload.countryId = countryId
                    }


                    if (req.body.username == "selfonboard") {
                        const sqlQueryInvite = "select id, status from invites where mobile = $1 and countryid = $2"
                        pgsql.query(sqlQueryInvite, [req.body.mobilenumber, jwtPayload.countryId]).then((resultInvite) => {

                            // if (resultInvite.rowCount == 0) {
                            //     resMsg.Message = "User not invited"
                            //     return res.status(400).json(resMsg);
                            // }
                            // console.log(resultInvite.rows);
                            jwtPayload.inviteId = resultInvite.rows[0].id
                            jwtPayload.mobilenumber = req.body.mobilenumber
                            if (resultInvite.rowCount != 0) {
                                if (resultInvite.rows[0].status !== "invited" && resultInvite.rows[0].status !== "active") {
                                    resMsg.Message = "You are not allowed to login"
                                    return res.status(400).json(resMsg);
                                }                                
                            }
                            const sqlQueryDRN = "select p.code as drivercode, countryid  from profiles as p where p.mobile = $1 and p.role = 'driver' limit 1";
                            pgsql.query(sqlQueryDRN, [req.body.mobilenumber]).then((resultDRN) => {
                                jwtPayload.drivercode = "";
                                if (resultDRN.rowCount > 0) {
                                    jwtPayload.drivercode = resultDRN.rows[0].drivercode;
                                    jwtPayload.countryId = resultDRN.rows[0].countryid
                                }
                                
                                const jwtAccessToken = jwtGenerate(jwtPayload);
                                res.clearCookie(process.env.COOKIE)
                                res.cookie(process.env.COOKIE, jwtAccessToken, {
                                    maxAge: 60 * 60 * 1000,
                                    httpOnly: true
                                });
                                
                                resMsg.Body = {Redirect:"performance", Token: jwtAccessToken}
                                if (jwtPayload.drivercode=="") {
                                    resMsg.Message = "Continue as a new user"
                                    // console.log(resultInvite.rows[0], jwtPayload);
                                } else {
                                    resMsg.Message = "Continue as a registered user"
                                }
                                resMsg.Type = "success"
                                return res.status(200).json(resMsg);    

                            }).catch((err)=>{
                                console.log(err)
                                return res.status(400).json(resMsg);
                            })
                        }).catch((err)=>{
                            console.log(err)
                            return res.status(400).json(resMsg);
                        })
                    } else {  
                        
                        let tokenMaxAge = 60 * 60 * 1000;

                        let jwtAccessToken = jwtGenerate(jwtPayload);
                        if (req.body.tokenMaxAge) {
                            jwtAccessToken = jwtGenerateLong(jwtPayload)
                        }

                        res.clearCookie(process.env.COOKIE)
                        res.cookie(process.env.COOKIE, jwtAccessToken, {
                            maxAge: tokenMaxAge,
                            httpOnly: true
                        });

                        resMsg.Body = {Redirect:"dashboard", Token: jwtAccessToken}

                        if (user.role == "superadmin") {
                            resMsg.Body.Redirect = "users"
                        }
    
                        resMsg.Message = "User Verified!"
                        resMsg.Type = "success"
                        return res.json(resMsg);
                    }
                    
                } else {
                    resMsg.Message = "Incorrect Password!"
                    return res.status(400).json(resMsg);
                }
            });
            // Check Password

            // Create Password
            // bcrypt.genSalt(10, (err, salt) => {
            //     bcrypt.hash(newUser.password, salt, (err, hash) => {
            //         if (err) throw err;
            //         newUser.password = hash;
            //         newUser
            //             .save()
            //             .then((user) => res.json(user))
            //             .catch((err) => console.log(err));
            //     });
            // });
            // Create Password
            

        } else {
            return res.status(400).json(resMsg); 
        }
    }).catch((err) => {
        console.log(err)
        return res.status(400).json(resMsg);
    })
});

router.post('/signin', async (req, res) => {
    
    let resMsg = {Type: "error", Message: "Sign-in failed!", Body: {} } 

    if (req.body.username == null || req.body.username == undefined || req.body.username == "") {
        resMsg.Message = "Username is missing!"
        return res.status(400).json(resMsg);
    }

    if (req.body.password == null || req.body.password == undefined || req.body.password == "") {
        resMsg.Message = "Pasword is missing!"
        return res.status(400).json(resMsg);
    }

    let country = ""
    let countryId = 0
    if (req.body.countryId && req.body.username == "selfonboard") { 

        if (req.body.mobilenumber == null || req.body.mobilenumber == undefined || req.body.mobilenumber == "") {
            resMsg.Message = "Mobile number is missing!"
            return res.status(400).json(resMsg);
        }


        const sqlCountry = "select name from countries where id = $1";
        try {
            pgsql.query(sqlCountry, [req.body.countryId]).then((result) => {
                if (result.rowCount > 0) {
                    country = result.rows[0].name
                    countryId = req.body.countryId
                }
            })
        } catch (error) {
            resMsg.Message = "You are not registered"
            return res.status(400).json(resMsg);
        }
    }

    const sqlQuery = "select u.*, COALESCE(c.name,'') as country from users as u left join countries as c on c.id = u.countryid where u.username = $1  limit 1";
    pgsql.query(sqlQuery, [req.body.username]).then((result) => {
        if (result.rowCount == 1) {
            let user = result.rows[0];

            if (user.id == 0) {
                resMsg.Message = "You are not registered"
                return res.status(400).json(resMsg);
            }

            if (user.status !== "active") {
                resMsg.Message = "Username is " + user.status
                return res.status(400).json(resMsg);
            }

            // Check Password
            bcrypt.compare(req.body.password, user.password).then((isMatch) => {
                if (isMatch) {
                    // User Matched
                    
                    // Create JWT
                    let jwtPayload = { 
                        userId: user.id, 
                        role: user.role, 
                        firstname: user.firstname, 
                        surname: user.surname, 
                        username: user.username, 
                        profileId: user.profileid, 
                        countryId: user.countryid,
                        country: user.country,
                    }; 

                    if (countryId > 0 && country !== "") {
                        jwtPayload.country = country
                        jwtPayload.countryId = countryId
                    }


                    if (req.body.username == "selfonboard") {
                        const sqlQueryInvite = "select id, status from invites where mobile = $1 and countryid = $2"
                        pgsql.query(sqlQueryInvite, [req.body.mobilenumber, jwtPayload.countryId]).then((resultInvite) => {

                            // if (resultInvite.rowCount == 0) {
                            //     resMsg.Message = "User not invited"
                            //     return res.status(400).json(resMsg);
                            // }
                            // console.log(resultInvite.rows);
                            jwtPayload.inviteId = resultInvite.rows[0].id
                            jwtPayload.mobilenumber = req.body.mobilenumber
                            if (resultInvite.rowCount != 0) {
                                if (resultInvite.rows[0].status !== "invited" && resultInvite.rows[0].status !== "active") {
                                    resMsg.Message = "You are not allowed to login"
                                    return res.status(400).json(resMsg);
                                }                                
                            }
                            const sqlQueryDRN = "select p.code as drivercode, countryid  from profiles as p where p.mobile = $1 and p.role = 'driver' limit 1";
                            pgsql.query(sqlQueryDRN, [req.body.mobilenumber]).then((resultDRN) => {
                                jwtPayload.drivercode = "";
                                if (resultDRN.rowCount > 0) {
                                    jwtPayload.drivercode = resultDRN.rows[0].drivercode;
                                    jwtPayload.countryId = resultDRN.rows[0].countryid
                                }
                                
                                const jwtAccessToken = jwtGenerate(jwtPayload);
                                res.clearCookie(process.env.COOKIE)
                                res.cookie(process.env.COOKIE, jwtAccessToken, {
                                    maxAge: 60 * 60 * 1000,
                                    httpOnly: true
                                });
                                
                                resMsg.Body = {Redirect:"performance", Token: jwtAccessToken}
                                if (jwtPayload.drivercode=="") {
                                    resMsg.Message = "Continue as a new user"
                                    // console.log(resultInvite.rows[0], jwtPayload);
                                } else {
                                    resMsg.Message = "Continue as a registered user"
                                }
                                resMsg.Type = "success"
                                return res.status(200).json(resMsg);    

                            }).catch((err)=>{
                                console.log(err)
                                return res.status(400).json(resMsg);
                            })
                        }).catch((err)=>{
                            console.log(err)
                            return res.status(400).json(resMsg);
                        })
                    } else {  
                        
                        let tokenMaxAge = 60 * 60 * 1000;

                        let jwtAccessToken = jwtGenerate(jwtPayload);
                        if (req.body.tokenMaxAge) {
                            jwtAccessToken = jwtGenerateLong(jwtPayload)
                        }

                        res.clearCookie(process.env.COOKIE)
                        res.cookie(process.env.COOKIE, jwtAccessToken, {
                            maxAge: tokenMaxAge,
                            httpOnly: true
                        });

                        resMsg.Body = {Redirect:"drivers", Token: jwtAccessToken}

                        if (user.role == "superadmin") {
                            resMsg.Body.Redirect = "users"
                        }
    
                        resMsg.Message = "User Verified!"
                        resMsg.Type = "success"
                        return res.json(resMsg);
                    }
                    
                } else {
                    resMsg.Message = "Incorrect Password!"
                    return res.status(400).json(resMsg);
                }
            });
            // Check Password

            // Create Password
            // bcrypt.genSalt(10, (err, salt) => {
            //     bcrypt.hash(newUser.password, salt, (err, hash) => {
            //         if (err) throw err;
            //         newUser.password = hash;
            //         newUser
            //             .save()
            //             .then((user) => res.json(user))
            //             .catch((err) => console.log(err));
            //     });
            // });
            // Create Password
            

        } else {
            return res.status(400).json(resMsg); 
        }
    }).catch((err) => {
        console.log(err)
        return res.status(400).json(resMsg);
    })
});

router.get('/logout', (req, res) => {
    const jwtAccessToken = jwtGenerate(null);
    res.cookie(process.env.COOKIE, jwtAccessToken, {
        maxAge: 60 * 60 * 1000,
        httpOnly: true
    });
    res.status(400).json({
        Type: "success",
        Message: "You have been logged out",
        Body: {Redirect:"signin"}
    });
});


// @desc    Login Admin
// @route   POST /api/auth/forgot
// @access  Private
router.post('/forgot', (req, res) => {
    
});




/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     description: Get logged in user details
 *     tags: [Users Auth]
 *     responses:
 *       200:
 *         description: Returns user details).
 *       400:
 *          description: User profile not found error
*/

router.get('/me', async (req, res) => {

    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let resMsg = {Type: "error", Message: "Not found", Body: {} }

    let sqlQuery = "select u.id, u.image, u.username, u.email, u.mobile, u.firstname, u.surname, u.status, u.createdate, u.countryId, u.role, " 
    
    sqlQuery += " COALESCE(s.firstname, '') as supervisorfirstname, COALESCE(s.surname, '') as supervisorsurname, ";
    sqlQuery += " COALESCE(s.email, '') as supervisoremail, COALESCE(s.mobile, '') as supervisormobile, ";
    sqlQuery += " COALESCE(s.image, '') as supervisorimage, COALESCE(s.role, '') as supervisorrole, ";
    sqlQuery += " COALESCE(s.username, '') as supervisorusername,  ";

    sqlQuery += " COALESCE(m.firstname, '') as managerfirstname, COALESCE(m.surname, '') as managersurname, ";
    sqlQuery += " COALESCE(m.email, '') as manageremail, COALESCE(m.mobile, '') as managermobile, ";
    sqlQuery += " COALESCE(m.image, '') as managerimage , COALESCE(m.role, '') as managerrole,  ";
    sqlQuery += " COALESCE(m.username, '') as managerusername  ";
    
    sqlQuery += " from users as u ";
    
    sqlQuery += " left join users as s on u.supervisorId = s.id ";
    sqlQuery += " left join users as m on s.supervisorId = m.id ";
    sqlQuery += " left join countries as c on u.countryId = c.id where u.id = $1 ";

    
    try {
        let result = await pgsql.query(sqlQuery, [jwtToken.userId])
        resMsg.Type = "success"
        resMsg.Body = result.rows
        resMsg.Message = `found ${result.rowCount} matching user(s) `
        return res.json(resMsg);

    } catch(error) {
        console.log(error)
        resMsg.Type = "error"
        resMsg.Message = `unable to retrieve records`
        return res.status(400).json(resMsg);
    }
    
});

export default router;