import express from 'express';
import { profiles } from '../../dbtables/onboard.js';
import { trainingschedule, cbtsessions } from '../../dbtables/base.js';
import { pgsql, sqlTableInsert, sqlTableUpdate } from '../../dbtables/pgsql.js';
import { jwtVerify, transporter as mailSender, isSuperUser } from '../../config/utils.js'

import {cbtElearningHtml} from '../../config/mail/cbtsession.js'
import { assessmentHtml } from '../../config/mail/assessment.js';


import MailTemplates from "../../config/mail/index.js"

const router = express.Router();


// @desc    Search for training schedule
// @route   POST /api/setups/trainingschedules/search
// @access  Private
router.post('/search', async (req, res) => {

    let sqlParams = []
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let searchtext = "%"
    if (req.body.text !== undefined) {
        searchtext = `%${req.body.text}%`
    }
    sqlParams.push(searchtext)

    let sqlQuery = "select ts.id, ts.scheduledate, ts.scheduletime, ts.productid, ts.location, ts.facilitator, ts.purpose, ts.mode, ts.expirydate, ts.assignedby, ts.status, ts.createdate as createdate, ";
    sqlQuery += " concat(COALESCE(pf.surname,' '),' ',COALESCE(pf.firstname,' ')) as fullname, COALESCE(m.name, '') as market, COALESCE(cs.link, '') as link, COALESCE(cs.attempted, 0) as attempted, COALESCE(cs.total, 0) as total, COALESCE(cs.score, 0) as score, COALESCE(p.name, '') as product, COALESCE(c.name, '') as country from trainingschedule as ts ";
    sqlQuery += "left join profiles as pf on ts.profileId = pf.id ";
    sqlQuery += "left join products as p on ts.productId = p.id ";
    sqlQuery += "left join cbtsessions as cs on ts.id = cs.trainingId ";
    sqlQuery += "left join countries as c on ts.countryId = c.id ";
    sqlQuery += "left join markets as m on ts.marketId = m.id where ts.assignedby like $1 and (lower(pf.surname) like lower($1) or lower(pf.firstname) like lower($1)) ";

    if (jwtToken.role !== 'superadmin') {
        sqlParams.push(jwtToken.countryId)
        sqlQuery += ` and ts.countryId = $${sqlParams.length}`;
    }

    if (req.body.status !== undefined && req.body.status !== "") {
        sqlParams.push(req.body.status)
        sqlQuery += ` and lower(ts.status) like lower($${sqlParams.length}) `;
    } 

    if (req.body.productId !== undefined) {
        sqlParams.push(req.body.productId)
        sqlQuery += ` and ts.productid = $${sqlParams.length} `;
    }
    sqlQuery += ` order by ts.createdate desc `;

    let resMsg = { Type: "", Message: "", Body: {} }
    try {

        let result = await pgsql.query(sqlQuery, sqlParams)

        resMsg.Type = "success"
        resMsg.Body = result.rows
        resMsg.Message = `found ${result.rowCount} matching training schedule(s) `
        return res.json(resMsg);

    } catch (error) {
        console.log(error)
        // console.log(sqlQuery)
        resMsg.Message = `search error`
        return res.status(400).json(resMsg)
    }


});

router.get('/:id/timeline', async (req, res) => {

    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let resMsg = { Type: "error", Message: "", Body: {} }
    if (req.params.id === 'undefined' || req.params.id === undefined) {
        resMsg.Type = "error"
        resMsg.Message = 'no matching training Schedule record found'
        return res.status(400).json(resMsg)
    }

    let sqlQuery = "select ts.id, ts.scheduledate, ts.scheduletime, ts.location, ts.status, ts.facilitator, ts.purpose, ts.expirydate, ts.assignedby, ts.status, ts.createdate, ts.updatedate, ";
    sqlQuery += " concat(COALESCE(pf.surname,' '),' ',COALESCE(pf.firstname,' ')) as fullname, COALESCE(m.name, '') as market, COALESCE(p.name, '') as product, COALESCE(c.name, '') as country from trainingschedule as ts ";
    sqlQuery += "left join profiles as pf on ts.profileId = pf.id ";
    sqlQuery += "left join products as p on ts.productId = p.id ";
    sqlQuery += "left join countries as c on ts.countryId = c.id ";
    sqlQuery += "left join markets as m on ts.marketId = m.id where ts.profileid = $2 and ts.countryId = $1 ";


    // console.log(sqlQuery);


    let sqlParams = [jwtToken.countryId, req.params.id]


    try {
        let timelineOrder = []
        let trainingTimeline = []
        let trainingTimelineObjects = {}
        let searchResult = await pgsql.query(sqlQuery, sqlParams)

        searchResult.rows.forEach(function (linerecord) {

            var sMessage
            var timestamp
            timestamp = new Date(linerecord.createdate).getTime()


            sMessage = "Driver scheduled for " + linerecord.purpose + " training by " + linerecord.assignedby + " on"
            trainingTimelineObjects[timestamp] = { Title: sMessage, Date: linerecord.createdate, Createdby: linerecord.assignedby }
            timelineOrder.push(timestamp)


            if (linerecord.scheduledate != "" && linerecord.scheduletime != "") {
                sMessage = linerecord.purpose + " training Scheduled for " + linerecord.scheduledate + " by " + linerecord.scheduletime

                timestamp = new Date(linerecord.scheduledate).getTime()
                trainingTimelineObjects[timestamp] = { Title: sMessage, Date: "", Createdby: linerecord.assignedby }
                timelineOrder.push(timestamp)
            }

            if (linerecord.expirydate != "") {
                sMessage = linerecord.purpose + " training session ticket expires by"

                timestamp = new Date(linerecord.expirydate).getTime()
                trainingTimelineObjects[timestamp] = { Title: sMessage, Date: linerecord.expirydate, Createdby: linerecord.assignedby }
                timelineOrder.push(timestamp)
            }

            if ((linerecord.createdate !== linerecord.updatedate) && (linerecord.status !== "not tested")) {
                sMessage = linerecord.purpose + " training status updated to " + linerecord.status

                timestamp = new Date(linerecord.updatedate).getTime()
                trainingTimelineObjects[timestamp] = { Title: sMessage, Date: linerecord.updatedate, Createdby: linerecord.assignedby }
                timelineOrder.push(timestamp)
            }
        })
        timelineOrder = timelineOrder.reverse()
        timelineOrder.forEach(function (timestamp) {
            trainingTimeline.push(trainingTimelineObjects[timestamp])
        });

        resMsg.Message = `found ${trainingTimeline.length} matching records(s) `
        resMsg.Body = trainingTimeline
        return res.json(resMsg);

    } catch (error) {
        console.log(error)
        resMsg.Type = "error"
        resMsg.Message = 'search error'
        return res.status(400).json(resMsg)
    }

});

// @desc    Schedule driver for training
// @route   POST /api/setups/trainingschedules
// @access  Private
router.post('/', async (req, res) => {
    let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
    let resMsg = { Type: "", Message: "", Body: {} }
    resMsg.Type = "error"
    resMsg.Message = ``
    if (!req.body.productId || req.body.productId < 0) {
        resMsg.Message = "Product is not provided"
        return res.status(400).json(resMsg);
    }

    if (!req.body.marketId || req.body.marketId < 0) {
        resMsg.Message = "Market is not provided"
        return res.status(400).json(resMsg);
    }

    if (!req.body.profileId || req.body.profileId < 0) {
        resMsg.Message = "Driver is not provided"
        return res.status(400).json(resMsg);
    }

    if (!req.body.location && jwtPayload.country !== 'United Kingdom') {
        resMsg.Message = "Location is not Provided"
        return res.status(400).json(resMsg);
    } else {
        req.body.location = req.body.location.toLowerCase()
    }

    if (req.body.mode) {
        req.body.mode = req.body.mode.toLowerCase()
    }

    if (!req.body.purpose) {
        resMsg.Message = "Purpose is not Provided"
        return res.status(400).json(resMsg);
    } else {
        req.body.purpose = req.body.purpose.toLowerCase()
    }

    // if (!req.body.facilitator && jwtPayload.country !== 'United Kingdom') {
    //     resMsg.Message = "Facilitator is not Provided"
    //     return res.status(400).json(resMsg);
    // } else {
    //     req.body.facilitator = req.body.facilitator.toLowerCase()
    // }

    if (!req.body.scheduledate || !req.body.scheduletime) {
        resMsg.Message = "Please Add schedule date and time"
        return res.status(400).json(resMsg);
    }

    try {
        const sqlQuery = "select * from products where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.productId])
        if (result.rowCount == 0) {
            resMsg.Message = "Invalid Product selected"
            return res.status(400).json(resMsg);
        }
    } catch (error) {
        console.log(error)
    }

    try {
        const sqlQueryMarket = "select name from productmarkets where productmarkets.productid = $1 and productmarkets.marketid = $2";
        let result = await pgsql.query(sqlQueryMarket, [req.body.productId, req.body.marketId])
        if (result.rowCount == 0) {
            resMsg.Message = "Invalid Market selected"
            return res.status(400).json(resMsg);
        }
    } catch (error) {
        console.log(error)
    }
    req.body.assignedby = jwtPayload.surname + " " + jwtPayload.firstname;
    
    req.body.status = "scheduled";
    
    if (req.body.countryId > 0 && (jwtPayload.countryId == undefined || jwtPayload.countryId == 0)) {
        jwtPayload.countryId = req.body.countryId
    }
    
    try {
        const sqlQueryVerify = "select * from verificationschedule where verificationschedule.driverid = $1 and verificationschedule.guarantorid = 0 and verificationschedule.status = 'approved'";
        let result = await pgsql.query(sqlQueryVerify, [req.body.profileId])

        if ((result.rowCount == 0) && jwtPayload.country !== 'United Kingdom' && jwtPayload.country !== 'United Arab Emirates' && jwtPayload.country !== 'India' && jwtPayload.country !== 'Egypt' && jwtPayload.country !== 'South Africa') {
            resMsg.Message = "Driver address hasn't been verified"
            return res.status(400).json(resMsg);
        }
        else{
            sqlTableInsert("trainingschedule", trainingschedule, req.body, jwtPayload).then((result) => {
                resMsg.Message = `Driver with Id ${req.body.profileId} has been scheduled for training`
                resMsg.Type = "success"
                resMsg.Body = req.body
                return res.json(resMsg);
            })
            if (req.body.mode !== 'elearning') {
                try {
                    let sqlQueryProfile = "select  COALESCE(p.surname, '') as surname,  COALESCE(p.firstname, '') as firstname, COALESCE(p.email, '') as email, COALESCE(p.nationality, '') as nationality from trainingschedule as ts ";
                    sqlQueryProfile += "left join profiles as p on p.id = ts.profileid where ts.id = $1";
                    let result = await pgsql.query(sqlQueryProfile, [req.body.id])
                    if (result.rowCount !== 0) {
                        let email = result.rows[0].email;
                        let fullname = result.rows[0].surname + ' ' + result.rows[0].firstname;
                        let date = req.body.scheduledate;
                        let time = req.body.scheduletime;
                        let location = req.body.location
                        let mode = req.body.mode
                        let msg = {
                            to: email,
                            from: 'no-reply-onboarding@moove.africa', //Change to your verified sender
                            fromname: 'Moove Africa',
                            subject: 'Moove Driver Training',
                        };
                        switch (jwtPayload.country) {
                            case "Nigeria":
                                msg.subject = "You are Invited for Training and Assessment"
                                msg.html = MailTemplates.Nigeria.invitedToTrainingAndAssesmentTemplate(fullname, date, time, location)
                            break
                            case "Kenya":
                            case "Uganda":
                                msg.subject = "Invitation for Training and Assessment"
                                msg.html = MailTemplates.Eastafrica.invitedToTrainingAndAssesmentTemplate(fullname, date, time, location)
                            break
                            case "Ghana":
                                msg.subject = "You are Invited for Training and Assessment"
                                msg.html = MailTemplates.Ghana.invitedToTrainingAndAssesmentTemplate(fullname, date, time)
                            break
                            case "South Africa":
                                msg.subject = "You are Invited for Training and Assessment"
                                msg.html = MailTemplates.Southafrica.invitedToTrainingAndAssesmentTemplate(fullname, date, time)
                                break
                            case "Egypt":
                                msg.subject = "You are Invited for Training and Assessment"
                                msg.html = MailTemplates.Egypt.invitedToTrainingAndAssesmentTemplate(fullname, date, time, location)
                                break
                            case "United Arab Emirates":
                                msg.html = MailTemplates.UAE.invitedToTrainingAndAssesmentTemplate(fullname, date, time, location)
                            break
                            case "United Kingdom":
                                msg.subject = "You’ve been verified!"
                                msg.html = MailTemplates.UK.invitedToTrainingAndAssesmentTemplate(fullname, mode, date, time, location)
                            break
                        }
                        if (msg.html !== undefined) {
                            try {
                                await mailSender.sendMail(msg)
                                console.log("Email sent")
                            } catch (error) {
                                console.error(`Got error while sending mail, error: ${error}`)
                            }
                        }
                    }
            
                } catch (error) {
                    console.log(error)
                }
            }
        } 
    }catch (error) {
        console.log(error)
    }

    
});

// @desc    Create a new infosessions by import
// @route   POST /api/setups/infosessions/import
// @access  Private
router.post('/import', async (req, res) => {

    let resMsg = { Type: "", Message: "", Body: {} }
    resMsg.Type = "error"
    resMsg.Message = ``

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    
    if (!req.body.location) {
        resMsg.Message = "Location is not Provided"
        return res.status(400).json(resMsg);
    } else {
        req.body.location = req.body.location.toLowerCase()
    }
    if (!req.body.mode) {
        resMsg.Message = "Mode is not selected"
        return res.status(400).json(resMsg);
    } else {
        req.body.mode = req.body.mode.toLowerCase()
    }

    if (!req.body.purpose) {
        resMsg.Message = "Purpose is not Provided"
        return res.status(400).json(resMsg);
    } else {
        req.body.purpose = req.body.purpose.toLowerCase()
    }


    if (!req.body.scheduledate || !req.body.scheduletime) {
        resMsg.Message = "Please Add schedule date and time"
        return res.status(400).json(resMsg);
    }

    if (!req.body.importList || req.body.importList.length == 0) {
        resMsg.Message = "Please provide import list"
        return res.status(400).json(resMsg);
    }

    let importedRecords = 0
    let notImportedRecords = 0
    let importedList = req.body.importList

    importedList.shift()
    for (const record of importedList) {
        let recordArray = record.split(",")
        if (recordArray.length > 0) {
            let existingRecordList = {}
            // console.log(recordArray[0]);
            let drn = recordArray[0].trim();
            let profile = []
            try {
                let sqlQuery = "select p.id, p.surname, p.firstname, p.code, p.marketid, p.productid, p.countryid, COALESCE(m.name, '') as market,  COALESCE(c.name, '') as country from  profiles as p ";
                sqlQuery += "left join countries as c on p.countryid = c.id "
                sqlQuery += "left join markets as m on p.marketid = m.id where lower(p.code) like lower($1) order by p.surname"
                let result = await pgsql.query(sqlQuery, [drn])
                if (result.rows !== undefined) {
                    profile = result.rows[0]
                    // console.log(profile);
                }
            } catch (error) {
                resMsg.Type = "error"
                resMsg.Message = `unable to import records`
                console.log(error)
                return res.status(400).json(resMsg);
            }


            // let checkDuplicate = existingRecordList.find((r) => r.email == recordArray[4].trim().toLowerCase() && r.mobile == recordArray[3].trim().toLowerCase() && r.surname == recordArray[2].trim().toLowerCase())
            if ((profile !== [] || profile !== undefined) && profile?.countryid == jwtToken.countryId) {
                let newRecord = {
                    drn: drn,
                    productId: profile.productid,
                    marketId: profile.marketid,
                    market: profile.market,
                    country: profile.country,
                    profileId: profile.id,
                    location: req.body.location,
                    purpose: req.body.purpose,
                    expirydate: req.body.expirydate ? req.body.expirydate : null,
                    scheduledate: req.body.scheduledate,
                    scheduletime: req.body.scheduletime,
                    mode: req.body.mode,
                    status: "scheduled",
                    countryId: jwtToken.countryId,
                    assignedby: `${jwtToken.surname} ${jwtToken.firstname}`
                }
                importedRecords++

                // console.log(newRecord);
                sqlTableInsert("trainingschedule", trainingschedule, newRecord, jwtToken).then((result) => {
                    let newCbtRecord = {
                        username : profile.surname.toLowerCase().replace(/\s/g, '')+profile.firstname.toLowerCase().replace(/\s/g, ''),
                        password : profile.code.toLowerCase(),
                        productId: profile.productid,
                        marketId: profile.marketid,
                        profileId: profile.id,
                        purpose: req.body.purpose,
                        trainingId: newRecord.id,
                        moderatorId: jwtToken.userId,
                        countryId: jwtToken.countryId,
                        status: "pending",
                    }
                    sqlTableInsert("cbtsessions", cbtsessions, newCbtRecord, jwtToken).then( async() => {
                        let fieldsToUpdate = {}
                        fieldsToUpdate["id"] = newCbtRecord.id
                        fieldsToUpdate["link"] = req.body.url+"/#/drivercbt/"+newCbtRecord.id

                        await sqlTableUpdate("cbtsessions", cbtsessions, fieldsToUpdate, jwtToken)
                        if (req.body.mode == 'elearning') {
            
                            let email = profile.email;
                            let fullname = profile.surname + ' ' + profile.firstname;
                            let date = newRecord.scheduledate;
                            let time = newRecord.scheduletime;
                            let location = fieldsToUpdate["link"]
                            let mode = newRecord.mode
                            let username = newCbtRecord.username
                            let password = newCbtRecord.password
                            let msg = {
                                to: email,
                                from: 'no-reply-onboarding@moove.africa', //Change to your verified sender
                                fromname: 'Moove Africa',
                                subject : "You’ve been verified!",
                                html : cbtElearningHtml(fullname, mode, date, time, location, username, password)
                            };

                            try {
                                await mailSender.sendMail(msg)
                                console.log("Email sent")
                            } catch (error) {
                                console.error(`Got error while sending mail, error: ${error}`)
                            }
                        }
                    })
                })
                if (req.body.mode !== 'elearning') {
                    let email = profile.email;
                    let fullname = profile.surname + ' ' + profile.firstname;
                    let date = req.body.scheduledate;
                    let time = req.body.scheduletime;
                    let location = req.body.location
                    let mode = req.body.mode
                    let msg = {
                        to: email,
                        from: 'no-reply-onboarding@moove.africa', //Change to your verified sender
                        fromname: 'Moove Africa',
                        subject: 'Moove Driver Training',
                    };
                    switch (jwtToken.country) {
                        case "Nigeria":
                            msg.subject = "You are Invited for Training and Assessment"
                            msg.html = MailTemplates.Nigeria.invitedToTrainingAndAssesmentTemplate(fullname, date, time, location)
                        break
                        case "Kenya":
                        case "Uganda":
                            msg.subject = "Invitation for Training and Assessment"
                            msg.html = MailTemplates.Eastafrica.invitedToTrainingAndAssesmentTemplate(fullname, date, time, location)
                        break
                        case "South Africa":
                            msg.subject = "You are Invited for Training and Assessment"
                            msg.html = MailTemplates.Southafrica.invitedToTrainingAndAssesmentTemplate(fullname, date, time)
                        break
                        case "Ghana":
                            msg.subject = "You are Invited for Training and Assessment"
                            msg.html = MailTemplates.Ghana.invitedToTrainingAndAssesmentTemplate(fullname, date, time)
                            break
                        case "United Arab Emirates":
                            msg.html = MailTemplates.UAE.invitedToTrainingAndAssesmentTemplate(fullname, date, time, location)
                        break
                        case "United Kingdom":
                            msg.subject = "You’ve been verified!"
                            msg.html = MailTemplates.UK.invitedToTrainingAndAssesmentTemplate(fullname, mode, date, time, location)
                        break
                    }
                    if (msg.html !== undefined) {
                        try {
                            await mailSender.sendMail(msg)
                            console.log("Email sent")
                        } catch (error) {
                            console.error(`Got error while sending mail, error: ${error}`)
                        }  
                    }
                }
                await new Promise(r => setTimeout(r, 5));
            } else {
                notImportedRecords++
            }
        }
    }


    resMsg.Message = `${importedRecords} records imported, ${notImportedRecords} record not imported due to wrong DRN provided`
    if (notImportedRecords == 0) {
        resMsg.Type = "success"
        return res.json(resMsg);
    }
    return res.status(400).json(resMsg);

});

// @desc    Update driver training
// @route   PUT /api/setups/trainingschedules
// @access  Private
router.put('/', async (req, res) => {

    let resMsg = { Type: "error", Message: "", Body: {} }
    let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])

    // if (jwtToken.role !== 'superadmin') {
    //     resMsg.Message = "Only super admin can update  record"
    //     return res.status(400).json(resMsg);
    // }

    if (!req.body.id || req.body.id == 0) {
        resMsg.Message = "id is required"
        return res.status(400).json(resMsg);
    }


    let fieldsToUpdate = {}


    if (req.body.scheduledate !== undefined) {
        fieldsToUpdate["scheduledate"] = req.body.scheduledate
    }

    if (req.body.scheduletime !== undefined) {
        fieldsToUpdate["scheduletime"] = req.body.scheduletime
    }

    if (req.body.location !== undefined) {
        req.body.location = req.body.location.toLowerCase()
        fieldsToUpdate["location"] = req.body.location
    }

    if (req.body.facilitator !== undefined && req.body.facilitator !== null) {
        req.body.facilitator = req.body.facilitator.toLowerCase()
        fieldsToUpdate["facilitator"] = req.body.facilitator
    }

    if (req.body.purpose !== undefined) {
        req.body.purpose = req.body.purpose.toLowerCase()
        fieldsToUpdate["purpose"] = req.body.purpose
    }

    if (req.body.expirydate !== undefined) {
        fieldsToUpdate["expirydate"] = req.body.expirydate
    }

    if (req.body.status !== undefined) {
        req.body.status = req.body.status.toLowerCase()
        fieldsToUpdate["status"] = req.body.status
    }


    fieldsToUpdate["id"] = req.body.id

    try {
        const sqlQuery = "select * from trainingschedule where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.id ])
        
        if (result.rows[0].mode == 'elearning' && fieldsToUpdate["status"] !== "") {
            resMsg.Message = "You cant update status for online training "
            return res.status(400).json(resMsg);
        }

        if (fieldsToUpdate["status"] == 'checked in' || fieldsToUpdate["status"] == 'no show') {
            if (result.rows[0].status == 'attended') {
                resMsg.Message = "Driver has already attended the training"
                return res.status(400).json(resMsg);
            }
        }

        if (fieldsToUpdate["status"] == 'attended') {
            if (result.rows[0].status !== 'checked in') {
                resMsg.Message = "Driver needs to check in first"
                return res.status(400).json(resMsg);
            }

            if (result.rows[0].status == 'checked in') {
                let today = new Date()
                let diff = Math.abs(today - result.rows[0].updatedate);
                let minutes = Math.floor((diff/1000)/60);
                if (minutes < 75) {
                    resMsg.Message = "Please try again in 30 minutes"
                    return res.status(400).json(resMsg);
                }
            }
        }
        if (result.rowCount == 0) {
            resMsg.Message = "No matching record found"
            return res.status(400).json(resMsg);
        } else {
            if (fieldsToUpdate.countryId !== undefined && fieldsToUpdate.countryId !== null) {
                jwtPayload.countryId = fieldsToUpdate.countryId
            }

            sqlTableUpdate("trainingschedule", trainingschedule, fieldsToUpdate, jwtPayload).then((result) => {
                resMsg.Message = `Training schedule updated`
                resMsg.Type = "success"
                resMsg.Body = fieldsToUpdate.id
                return res.json(resMsg);

            })
        }
    } catch (error) {
        resMsg.Type = "error"
        resMsg.Message = `unable to retrieve records`
        console.log(error)
        return res.status(400).json(resMsg);
    }

    if (req.body.mode !== 'elearning') {
        try {
            let sqlQueryProfile = "select  ts.profileid, COALESCE(p.surname, '') as surname,  COALESCE(p.firstname, '') as firstname, COALESCE(p.email, '') as email, COALESCE(cs.username, '') as username, COALESCE(cs.password, '') as password, COALESCE(cs.link, '') as link, COALESCE(p.nationality, '') as nationality from trainingschedule as ts ";
            sqlQueryProfile += "left join cbtsessions as cs on ts.id = cs.trainingid ";
            sqlQueryProfile += "left join profiles as p on p.id = ts.profileid where ts.id = $1";
            let result = await pgsql.query(sqlQueryProfile, [req.body.id])
            let updateProfile = { id: 0, status: "" }

            let email = result.rows[0].email;
            let fullname = result.rows[0].surname + ' ' + result.rows[0].firstname;
            let link = result.rows[0].link;
            let username = result.rows[0].username;
            let password = result.rows[0].password;
            let msg = {
                to: email,
                from: 'no-reply-onboarding@moove.africa', //Change to your verified sender
                fromname: 'Moove Africa',
                subject: 'Moove Driver Training',
            };

            switch (fieldsToUpdate["status"]) {
                case "attended":
                    updateProfile.id = result.rows[0].profileid
                    updateProfile.status = `driver-trained`
                    sqlTableUpdate("profiles", profiles, updateProfile, jwtPayload).then(() => {})
                break
            }
            
            if (fieldsToUpdate["status"] == 'attended') {
                msg.subject = "You’ve been trained!"
                msg.html = assessmentHtml(fullname, link, username, password)
                try {
                    await mailSender.sendMail(msg)
                    console.log("Email sent")
                } catch (error) {
                    console.error(`Got error while sending mail, error: ${error}`)
                }
            }

        } catch (error) {
            console.log(error)
        }
    }

});

router.post('/deactivate', async (req, res) => {
    let resMsg = { Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    let deactivateSchedules = 0
    if (!req.body.trainingschedules || req.body.trainingschedules.length == 0) {
        const sqlQueryName = "select id from trainingschedule where trainingschedule.countryId = $1";
        let resultName = await pgsql.query(sqlQueryName, [jwtToken.countryId])
        if (resultName.rowCount > 0) {
            let scheduleList = []
            scheduleList = resultName.rows
            for (let item of (scheduleList)) {
                const sqlQueryName = "select id from trainingschedule where trainingschedule.id = $1";
                let resultName = await pgsql.query(sqlQueryName, [item.id])
                if (resultName.rows == 0) {
                    resMsg.Type = "error"
                    resMsg.Message = `Unable to find trainingschedule with id [${item.id}]`
                    return res.status(400).json(resMsg);
                }

                const sqlQuery = "update trainingschedule set status = 'deactivated' where id = $1";
                await pgsql.query(sqlQuery, [item.id])

                deactivateSchedules++
            }
            resMsg.Message = `${deactivateSchedules} records deactivated`
            if (deactivateSchedules != 0) {
                resMsg.Type = "success"
                return res.json(resMsg);
            }
            return res.status(400).json(resMsg);
        }
    } else {
        for (let item of (req.body.trainingschedules)) {
            const sqlQueryName = "select id from trainingschedule where trainingschedule.id = $1";
            let resultName = await pgsql.query(sqlQueryName, [item])
            if (resultName.rows == 0) {
                resMsg.Type = "error"
                resMsg.Message = `Unable to find trainingschedule with id [${item}]`
                return res.status(400).json(resMsg);
            }

            const sqlQuery = "update trainingschedule set status = 'deactivated' where id = $1";
            await pgsql.query(sqlQuery, [item])
            deactivateSchedules++
        }
        resMsg.Message = `${deactivateSchedules} records deactivated`
        if (deactivateSchedules != 0) {
            resMsg.Type = "success"
            return res.json(resMsg);
        }
        return res.status(400).json(resMsg);
    }
});

router.post('/updatestatus', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    let updatedSchedules = 0
    let notUpdatedSchedules = 0
    if (!req.body.trainingschedules  || req.body.trainingschedules.length == 0) {
        resMsg.Type = "error"
        resMsg.Message = `No training Selected`
        return res.status(400).json(resMsg);
    }else{
        for (let item of (req.body.trainingschedules)) {
            const sqlQueryName = "select id, status, mode, updatedate from trainingschedule where trainingschedule.id = $1";
            let resultName = await pgsql.query(sqlQueryName, [item])
            if (resultName.rows == 0 ) {
                resMsg.Type = "error"
                resMsg.Message = `Unable to find trainingschedule with id [${item}]`
                return res.status(400).json(resMsg);
            }
            let check = false
            if (resultName.rows[0].mode == 'elearning') {
                check = true
            }

            if (req.body.status == 'checked in' || req.body.status == 'no show') {
                if (resultName.rows[0].status == 'attended' || resultName.rows[0].status == 'checked in' || resultName.rows[0].status == 'no show') {
                    check = true
                }
            }

            if (req.body.status == 'attended') {
                if (resultName.rows[0].status !== 'checked in') {
                    check = true
                }
                if (resultName.rows[0].status == 'checked in') {
                    let today = new Date()
                    let diff = Math.abs(today - resultName.rows[0].updatedate);
                    let minutes = Math.floor((diff/1000)/60);
                    if (minutes < 75) {
                        check = true
                        resMsg.Message += `You have only just recently checked In, Please try again in 30 minutes, `
                    }
                }
            }
            if (check !== true) {
                const sqlQuery = `update trainingschedule set status ='${req.body.status}'  where id = $1`;
                await pgsql.query(sqlQuery, [item])
                updatedSchedules++
            } else {
                notUpdatedSchedules++
            }
        }
        resMsg.Message += `${updatedSchedules} records updated and ${notUpdatedSchedules} records not updated`
        if (updatedSchedules != 0) {
            resMsg.Type = "success"
            return res.json(resMsg);
        }else {
            resMsg.Type = "error"
            return res.status(400).json(resMsg);
        }
    }
});

router.get('/export', async (req, res) => {
    const operator = req.operator
    let resMsg = { Type: "success", Message: "", Body: {} }

    if (!isSuperUser(operator.role)) {
        resMsg.Message = "Only managers can export data"
        return res.status(400).json(resMsg);
    }

    let searchtext = "%"
    if (req.query.text) {
        searchtext = `%${req.query.text}%`
    }
    let exportHeaders = [
        "#", "DRN",
        "Status", "Market", "Product",
        "Surname", "FirstName", "Middle Name", "Email", 
        "Mobile", "Scheduled Date", "Scheduled Time", "Location",
        "Created Date/Time", "Score",
        "Mode", "Purpose", "Created By", "Expiry Date"
    ]
    let exportDriversList = []
    exportDriversList.push('"' + exportHeaders.join('", "') + '"')

    let sqlQuery = " select COALESCE(pf.code,'') as drn, COALESCE(pf.firstname,'') as firstname, COALESCE(pf.middlename,'') as middlename, COALESCE(pf.surname,'') as surname, COALESCE(pf.mobile,'') as mobile, "
    sqlQuery += " COALESCE(pf.email,'') as email, COALESCE(m.name,'') as market, COALESCE(p.name,'') as product, COALESCE(cs.score, 0) as score, "

    sqlQuery += "  tran.status, tran.scheduledate, tran.scheduletime, tran.assignedby, tran.mode, tran.purpose, tran.location, "
    sqlQuery += " tran.expirydate as expirydate, tran.createdate as createdate from trainingschedule as tran "


    sqlQuery += " left join products as p on p.id = tran.productid "
    sqlQuery += " left join markets as m on m.id = tran.marketid "
    sqlQuery += " left join profiles as pf on pf.id = tran.profileid "
    sqlQuery += "left join cbtsessions as cs on cs.trainingid = tran.id"

    sqlQuery += " where tran.countryid = $1 and  ";
    sqlQuery += " (lower(m.name) like lower($2) or lower(p.name) like lower($2) or lower(tran.assignedby) like lower($2)) order by tran.assignedby desc";

    try {
        let result = await pgsql.query(sqlQuery, [operator.countryId, searchtext])

        result.rows.forEach((row, index) => {
            let exportRecord = [
                index + 1, row.drn,
                row.status, row.market, row.product,

                // Personal Information
                row.surname, row.firstname, row.middlename, row.email,
                row.mobile, row.scheduledate, row.scheduletime, row.location,
                row.createdate, row.score, row.mode, row.purpose, row.assignedby, row.expirydate

            ]
            exportDriversList.push('"' + exportRecord.join('", "') + '"')
        })
    } catch (error) {
        console.log(error)
    }

    let csvFile = exportDriversList.join("\r\n")
    let todayDate = new Date().toISOString().slice(0, 10);
    res.writeHead(200, {
        "Content-Disposition": "inline;filename=drivers-export" + todayDate + "-file.csv",
        'Content-Type': "text/csv",
        'Content-Length': Buffer.byteLength(csvFile, 'utf8'),
    });
    res.write(csvFile)
    res.end();
});
export default router;