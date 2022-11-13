import express from "express"
import bcrypt from 'bcryptjs';

import { jwtVerify, SALT, jwtGenerate, jwtGenerateLong } from "../../config/utils.js"

import { pgsql } from "../../dbtables/pgsql.js"
import UserModel from "../../dbtables/user.js"
import {validateSignUpRequest, validateSignInRequest } from "./validation.js"
import Handler from "./handler.js"

const router = express.Router()


router.post("/signup", async (req, res) => {
    let errResponse = { Type: "error", Message: "", Body: {} }

    
    let validationErr = await validateSignUpRequest(req)
    if (validationErr != null) {
        errResponse.Message = validationErr
        res.status(400).json(errResponse)
        return
    }

    req.body.code = await Math.random().toString(36).substring(2,7);
    req.body.status = "pending"

    

    req.body.password = bcrypt.hashSync(req.body.password.toLowerCase(), SALT)
    
    console.log(req.body);

    // // handle creating profile
    try {
        await Handler.createProfile(req.body)
    } catch (error) {
        errResponse.Message = error.message
        res.status(400).json(errResponse)
        return
    }

    let successResponse = {
        Message: `Record created for User with Name: ${req.body.firstname} ${req.body.surname} , email: ${req.body.email} and role: ${req.body.role}`,
        Type: "success",
    }
    return res.json(successResponse)
})


router.post('/signin', async (req, res) => {
    
    let errResponse = {Type: "error", Message: "Sign-in failed!", Body: {} } 


    let validationErr = await validateSignInRequest(req)
    if (validationErr != null) {
        errResponse.Message = validationErr
        res.status(400).json(errResponse)
        return
    }

    let profilesByEmail = await UserModel.getByEmail(req.body.email);

    let user = profilesByEmail.rows[0]

    req.body.password = req.body.password.toLowerCase()
    // Check Password
    bcrypt.compare(req.body.password, user.password).then((isMatch) => {
        if (isMatch) {
            // User Matched
            
            // Create JWT
            let jwtPayload = { 
                userId: user.id, 
                role: user.role, 
                mobile: user.mobile, 
                firstname: user.firstname, 
                surname: user.surname, 
                email: user.email, 
                profileId: user.profileid
            }; 

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

            errResponse.Body = {Redirect:"dashboard", Token: jwtAccessToken}


            errResponse.Message = "User Verified!"
            errResponse.Type = "success"
            return res.json(errResponse);
            
        } else {
            errResponse.Message = "Incorrect Password!"
            return res.status(400).json(errResponse);
        }
    });
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

export default router