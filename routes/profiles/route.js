import express from "express"
import bcrypt from 'bcryptjs';

import { jwtVerify, SALT, jwtGenerate, jwtGenerateLong } from "../../config/utils.js"

import { pgsql } from "../../dbtables/pgsql.js"
import UserModel from "../../dbtables/user.js"
import {validateUpdateRequest } from "./validation.js"
import Handler from "./handler.js"

const router = express.Router()


router.get('/me', async (req, res) => {

    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let resMsg = {Type: "error", Message: "Not found", Body: {} }

    let sqlQuery = "select p.email, p.mobile, p.firstname, p.surname, p.role, p.dateofbirth, p.occupation, p.placeofwork, p.address "
    
    sqlQuery += " from profiles as p where p.userId = $1";

    
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

router.put('/me', async (req, res) => {

    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let errResponse = {Type: "error", Message: "Not found", Body: {} }

    let validationErr = await validateUpdateRequest(req, jwtToken)
    if (validationErr != null) {
        errResponse.Message = validationErr
        res.status(400).json(errResponse)
        return
    }
    
    let fieldsToUpdate = {}

    if(req.body.surname) {
        fieldsToUpdate["surname"] = req.body.surname
    }
    
    if(req.body.firstname) {
        fieldsToUpdate["firstname"] = req.body.firstname
    }
    
    if(req.body.maritalstatus) {
        fieldsToUpdate["maritalstatus"] = req.body.maritalstatus
    }
    
    fieldsToUpdate["id"] = jwtToken.profileId
    
    try {
        await Handler.updateProfile(fieldsToUpdate, jwtToken)
    } catch (error) {
        errResponse.Message = error.message
        res.status(400).json(errResponse)
        return
    }

    let successResponse = {
        Message: `Profile updated successfully`,
        Type: "success",
    }
    return res.json(successResponse)

});

export default router