import express from 'express';

import { jwtVerify, jwtGenerate, transporter as mailSender } from '../../config/utils.js'
import {cbtsessions} from '../../dbtables/base.js';
import {pgsql, sqlTableInsert, sqlTableUpdate} from '../../dbtables/pgsql.js';

import {cbtElearningHtml} from '../../config/mail/cbtsession.js'

import MailTemplates from "../../config/mail/index.js"

const router = express.Router(); 



router.post('/', async (req, res) => {
    let resMsg = {Type: "error", Message: "", Body: {} } 
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    // if (jwtToken.role !== 'superadmin' && jwtToken.role !== 'onboarding-manager' && jwtToken.role !== 'channel-manager' && jwtToken.role !== 'country-manager' ) {
    //     resMsg.Type = "error"
    //     resMsg.Message = "Permission to schedule driver for Cbt denied"
    //     return res.status(400).json(resMsg);
    // }
    if (jwtToken.userId !== '') {
        req.body.moderatorId = jwtToken.userId
    }
    if (jwtToken.countryId !== '') {
        req.body.countryId = jwtToken.countryId
    }

    if (!req.body.profileId || req.body.profileId == 0) {
        resMsg.Message = "Please provided Profile"
        return res.status(400).json(resMsg);
    }

    if (!req.body.trainingId || req.body.trainingId == 0) {
        resMsg.Message = "Please provided Training"
        return res.status(400).json(resMsg);
    }

    if (!req.body.productId || req.body.productId == 0) {
        resMsg.Message = "Please select a Product"
        return res.status(400).json(resMsg);
    }

    if (!req.body.marketId || req.body.marketId == 0) {
        resMsg.Message = "Please select a Market"
        return res.status(400).json(resMsg);
    }

    if (!req.body.purpose ) {
        resMsg.Message = "Please provide purpose"
        return res.status(400).json(resMsg);
    }else{
        req.body.purpose = req.body.purpose.toLowerCase()
    }

    if (!req.body.expirydate ) {
        req.body.expirydate = null
    }

    if (!req.body.url ) {
        resMsg.Message = "Please provide a Url"
        return res.status(400).json(resMsg);
    }

    if (req.body.profileId != undefined) {
        try {
            const sqlQuery = "select * from profiles where id = $1";
            let result = await pgsql.query(sqlQuery, [req.body.profileId,])
            if (result.rowCount == 0) {
                resMsg.Message = "Profile does not exist"
                return res.status(400).json(resMsg);
            }else {
                req.body.username = result.rows[0].surname.toLowerCase().replace(/\s/g, '')+result.rows[0].firstname.toLowerCase().replace(/\s/g, '')
                req.body.password = result.rows[0].code.toLowerCase()
            }
        } catch (error) {
            console.log(error)
        }
    }
    try {
        const sqlQuery = "select * from products where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.productId,])
        if (result.rowCount == 0) {
            resMsg.Message = "Product do not exist"
            return res.status(400).json(resMsg);
         }
    } catch (error) {
        console.log(error)
    }
    try {
        const sqlQuery = "select * from markets where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.marketId,])
        if (result.rowCount == 0) {
            resMsg.Message = "Market do not exist"
            return res.status(400).json(resMsg);
         }
    } catch (error) {
        console.log(error)
    }
    req.body.status = "pending"
    
    sqlTableInsert("cbtsessions", cbtsessions, req.body, jwtToken).then( async() => {
        let fieldsToUpdate = {}
        fieldsToUpdate["id"] = req.body.id
        fieldsToUpdate["link"] = req.body.url+"/#/drivercbt/"+req.body.id
        await sqlTableUpdate("cbtsessions", cbtsessions, fieldsToUpdate, jwtToken)
        
        
        resMsg.Message = `Cbt Session created`
        resMsg.Type = "success"
        resMsg.Body = req.body
        return res.json(resMsg);
        
    }).catch(() => {
        resMsg.Message = "Error while creating Cbt Session"
        return res.status(400).json(resMsg);
    })

    try {
        let sqlQuery = "select *, COALESCE(cs.username, '') as username, COALESCE(cs.password, '') as password, COALESCE(cs.link, '') as link, COALESCE(p.surname, '') as surname,  COALESCE(p.firstname, '') as firstname, COALESCE(p.email, '') as email, COALESCE(p.nationality, '') from trainingschedule as ts ";
        sqlQuery += "left join profiles as p on ts.profileId = p.id ";
        sqlQuery += "left join cbtsessions as cs on ts.id = cs.trainingid where ts.id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.trainingId,])

        if (result.rows[0].mode == 'elearning') {
            
            let email = result.rows[0].email;
            let fullname = result.rows[0].surname + ' ' + result.rows[0].firstname;
            let date = result.rows[0].scheduledate;
            let time = result.rows[0].scheduletime;
            let location = result.rows[0].link
            let mode = result.rows[0].mode
            let username = result.rows[0].username
            let password = result.rows[0].password
            let msg = {
                to: email,
                from: 'no-reply-onboarding@moove.africa', //Change to your verified sender
                fromname: 'Moove Africa',
                subject: "You’ve been verified!",
                html: cbtElearningHtml(fullname, mode, date, time, location, username, password)
            };
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
});

router.put('/', async (req, res) => {
    
    let resMsg = {Type: "error", Message: "", Body: {} } 
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    if (!jwtToken.countryId || jwtToken.countryId == 0) {
        resMsg.Message = "Only country level users can update session info"
        return res.status(400).json(resMsg);
    }
    if (jwtToken.role !== 'superadmin' && jwtToken.role !== 'onboarding-manager' && jwtToken.role !== 'channel-manager' && jwtToken.role !== 'country-manager' ) {
        resMsg.Type = "error"
        resMsg.Message = "Permission to update Cbt session denied"
        return res.status(400).json(resMsg);
    }

    if(!req.body.id || req.body.id == 0) {
        resMsg.Message = "id is required"
        return res.status(400).json(resMsg);
    }

    let fieldsToUpdate = {}

    if(req.body.name) {
        fieldsToUpdate["name"] = req.body.name
    }
    if(req.body.productId &&  req.body.productId !== 0 ) {
        try {
            const sqlQuery = "select * from products where id = $1";
            let result = await pgsql.query(sqlQuery, [req.body.productId,])
            if (result.rows == 0) {
                resMsg.Message = "Product do not exist"
                return res.status(400).json(resMsg);
            }
        } catch (error) {
            console.log(error)
        }
        fieldsToUpdate["productid"] = req.body.productId
    }
    if(req.body.profileId &&  req.body.profileId !== 0 ) {
        try {
            const sqlQuery = "select * from profiles where id = $1";
            let result = await pgsql.query(sqlQuery, [req.body.profileId,])
            if (result.rows == 0) {
                resMsg.Message = "Profile does not exist"
                return res.status(400).json(resMsg);
            }
        } catch (error) {
            console.log(error)
        }
        fieldsToUpdate["profileid"] = req.body.profileId
    }
    if(req.body.startedtime) {
        fieldsToUpdate["startedtime"] = req.body.startedtime
    }
    if(req.body.finishedtime) {
        fieldsToUpdate["finishedtime"] = req.body.finishedtime
    }
    if(req.body.attempted) {
        fieldsToUpdate["attempted"] = req.body.attempted
    }
    if(req.body.skipped) {
        fieldsToUpdate["skipped"] = req.body.skipped
    }
    if(req.body.passed) {
        fieldsToUpdate["passed"] = req.body.passed
    }
    if(req.body.failed) {
        fieldsToUpdate["failed"] = req.body.failed
    }
    if(req.body.duration) {
        fieldsToUpdate["duration"] = req.body.duration
    }
    if(req.body.score) {
        fieldsToUpdate["score"] = req.body.score
    }
    if(req.body.penalty) {
        fieldsToUpdate["penalty"] = req.body.penalty
    }
    if(req.body.total) {
        fieldsToUpdate["total"] = req.body.total
    }

    fieldsToUpdate["id"] = req.body.id

    try {
        let sqlQuery = "select * from cbtsessions where cbtsessions.id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.id,])
        if (result.rowCount == 0) {
            resMsg.Message = "No matching record found"
            return res.status(400).json(resMsg);
        }
        if (result.rows[0].moderatorid !== jwtToken.userId) {
            resMsg.Message = "Only cbt moderator can update session's info"
            return res.status(400).json(resMsg);
        }
        await sqlTableUpdate("cbtsessions", cbtsessions, fieldsToUpdate, jwtToken).then(() => {                
            resMsg.Message = `Cbt Session updated`
            resMsg.Type = "success"
            resMsg.Body = fieldsToUpdate.id
            return res.json(resMsg);
        }).catch((err) => { console.log(err) })
    } catch(error) {
        resMsg.Type = "error"
        resMsg.Message = `unable to retrieve records`
        console.log(error)
        return res.status(400).json(resMsg);
    }
});

router.post('/search', async (req, res) => {
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    
    let sqlParams = []

    let searchtext = ""
    if (req.body.text !== undefined) {
        searchtext = `%${req.body.text}%`
        sqlParams.push(`%${searchtext}%`)
    }


    let resMsg = {Type: "success", Message: "", Body: {} }
    
    let sqlQuery = "select els.id, COALESCE(prof.code, '') as DRN, els.name, els.productid, els.profileid, els.link, els.purpose, els.expirydate, els.purpose, els.status, els.score, els.createdate, COALESCE(p.name, '') as product, COALESCE(m.name, '') as market, concat(COALESCE(u.firstname,' '),' ',COALESCE(u.surname,' ')) as supervisor, "
    sqlQuery += " concat(COALESCE(prof.firstname,' '),' ',COALESCE(prof.surname,' ')) as driver from cbtsessions as els "
    sqlQuery += " left join users as u on u.id = els.moderatorid "
    sqlQuery += " left join markets as m on m.id = els.marketid "
    sqlQuery += " left join profiles as prof on prof.id = els.profileid "
    sqlQuery += " left join products as p on p.id = els.productid where lower(els.name) like lower($1) and "


    
    if (jwtToken.role !== 'superadmin') {
        sqlParams.push(jwtToken.countryId)
        sqlQuery += ` els.countryid = $${sqlParams.length}`;
    }

    sqlQuery +=  " order by els.createdate desc ";    

    try {
        let result = await pgsql.query(sqlQuery, sqlParams)
        resMsg.Message = `found ${result.rowCount} matching Cbt Sessions `
        resMsg.Body = result.rows
        return res.json(resMsg);

    } catch (error) {
        console.log(error)
        resMsg.Type = "error"
        resMsg.Message = 'search error'
        return res.status(400).json(resMsg)   
    }
});

router.post('/score', async (req, res) => {
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let resMsg = {Type: "success", Message: "", Body: {} }
    
    let sqlQuery = "select els.score, els.attempted, els.total, els.passed, els.failed from cbtsessions as els where els.profileid = $1 and els.id = $2 "

    try {
        let result = await pgsql.query(sqlQuery, [jwtToken.profileId, jwtToken.sessionId])
        resMsg.Message = `Cbt Sessions score`
        resMsg.Body = result.rows[0]
        return res.json(resMsg);

    } catch (error) {
        console.log(error)
        resMsg.Type = "error"
        resMsg.Message = 'search error'
        return res.status(400).json(resMsg)   
    }
});

router.post('/authenticate', async (req, res) => {
    let resMsg = {Type: "error", Message: "Sign-in failed!", Body: {} } 

    if (req.body.username == null || req.body.username == undefined || req.body.username == "") {
        resMsg.Message = "Username is missing!"
        return res.status(400).json(resMsg);
    }

    if (req.body.password == null || req.body.password == undefined || req.body.password == "") {
        resMsg.Message = "Pasword is missing!"
        return res.status(400).json(resMsg);
    }else {
        req.body.password = req.body.password.toLowerCase()
    }

    if (req.body.id == null || req.body.id == undefined || req.body.id == 0) {
        resMsg.Message = "Id not provided!"
        return res.status(400).json(resMsg);
    }
        
    const sqlCbtsession = "select id, password, profileid, trainingid, username, purpose, status, countryid from cbtsessions where username = $1 and id = $2";
    let sessionResult = await pgsql.query(sqlCbtsession, [req.body.username, req.body.id])


    const sqlTraining = "select status, mode from trainingschedule where profileid = $1 and id = $2";
    let trainingResult = await pgsql.query(sqlTraining, [sessionResult.rows[0].profileid, sessionResult.rows[0].trainingid ])

    if (trainingResult.rowCount == 0 || sessionResult.rowCount == 0) {
        resMsg.Message = "You have not been schedule for a test"
        return res.status(400).json(resMsg);
    }

    if (trainingResult.rows[0].mode !== 'elearning' && trainingResult.rows[0].status !== 'attended') {
        resMsg.Message = "You have not been approved for a test"
        return res.status(400).json(resMsg);
    }
    if (sessionResult.rows[0].password !== req.body.password) {
        resMsg.Message = "Password is incorrect"
        return res.status(400).json(resMsg);
    } 
    if (sessionResult.rows[0].status !== 'active' && sessionResult.rows[0].status !== 'pending') {
        resMsg.Message = "Sorry the test can only be conducted once"
        return res.status(400).json(resMsg);
    }
    // const sqlQuery = `update cbtsessions set status = 'active' where username = $1`;
    // await pgsql.query(sqlQuery, [req.body.username,])
       
    try {
        let sqlQuery = "select p.id, p.productid, p.marketid, p.firstname, p.surname, p.code, p.countryid, COALESCE(c.name,' ') as country from profiles as p "
        sqlQuery += " left join countries as c on c.id = p.countryid where p.id = $1 "
        let profile = await pgsql.query(sqlQuery, [sessionResult.rows[0].profileid,])
        
        let jwtPayload = {
            role: "Cbt",
            userId: 1,
            productId: profile.rows[0].productid,
            marketId: profile.rows[0].marketid,
            firstname: profile.rows[0].firstname,
            surname: profile.rows[0].surname,
            drn: profile.rows[0].code,
            username: sessionResult.rows[0].username,
            purpose: sessionResult.rows[0].purpose,
            mode: trainingResult.rows[0].mode,
            profileId: profile.rows[0].id,
            sessionId: sessionResult.rows[0].id,
            countryId: profile.rows[0].countryid,
            country: profile.rows[0].country,
        };
        
        const jwtAccessToken = jwtGenerate(jwtPayload);
        res.cookie(process.env.COOKIE, jwtAccessToken, {
            maxAge: 24 * 60 * 60 * 1000,
            httpOnly: true
        });
        
        resMsg.Body = { Token: jwtAccessToken}
        resMsg.Message = "You are signed in successfully for Cbt"
        return res.json(resMsg);

    } catch (error) {
        console.log(error)
        resMsg.Type = "error"
        resMsg.Message = 'search error'
        return res.status(400).json(resMsg)   
    }
});

router.post('/materials', async (req, res) => {
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    
    let resMsg = {Type: "success", Message: "", Body: {} }
    let sessionMaterial =[]
    let sqlQuerySection = "select es.id, es.purpose, es.name from elearningsections as es where es.purpose = $1 and es.marketid = $2 and es.productid = $3 and es.status = 'active' "
    let resultSection = await pgsql.query(sqlQuerySection, [jwtToken.purpose, jwtToken.marketId, jwtToken.productId])
        try {
            if (resultSection.rowCount != 0) {
                for (let item of (resultSection.rows)) {
                    let sqlQueryMaterial = "select filepath from elearningmaterials where purpose = $1 and status = 'active' "
                    let resultMaterial = await pgsql.query(sqlQueryMaterial, [jwtToken.purpose])
                    let record = {
                        "section" : item.name,
                        "sectionid" : item.id,
                        "materials" : resultMaterial.rows
                    }
                    sessionMaterial.push(record)
                }
            } 
            resMsg.Message = `found matching Materials `
            resMsg.Body = sessionMaterial.sort().reverse()
            return res.json(resMsg);
        } catch (error) {
            console.log(error)
            resMsg.Type = "error"
            resMsg.Message = 'search error'
            return res.status(400).json(resMsg)   
        }

});

router.post('/questions', async (req, res) => {
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    
    let resMsg = {Type: "success", Message: "", Body: {} }
    let sessionQuestion =[]
    let sqlQuerySection = "select es.id, es.purpose, es.name from elearningsections as es where es.purpose = $1 and es.marketid = $2 and es.productid = $3 and es.status = 'active' "
    let resultSection = await pgsql.query(sqlQuerySection, [jwtToken.purpose, jwtToken.marketId, jwtToken.productId])
        try {
            if (resultSection.rowCount != 0) {
                for (let item of (resultSection.rows)) {
                    let sqlQueryQuestion = "select id, name, questiontype from elearningquestions where purpose = $1 and status = 'active'"
                    let resultQuestion = await pgsql.query(sqlQueryQuestion, [jwtToken.purpose])
                    let record = {
                        "section" : item.name,
                        "sectionid" : item.id,
                        "questions" : resultQuestion.rows,
                    }
                    sessionQuestion.push(record)
                }
            } 
            resMsg.Message = `found matching Questions `
            resMsg.Body = sessionQuestion.sort().reverse()
            return res.json(resMsg);
        } catch (error) {
            console.log(error)
            resMsg.Type = "error"
            resMsg.Message = 'search error'
            return res.status(400).json(resMsg)   
        }

});

router.post('/answers', async (req, res) => {
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    
    let resMsg = {Type: "success", Message: "", Body: {} }    
    
    try {
        let sqlQuery = "select ea.id, ea.questionid, ea.name from elearninganswers as ea where ea.questionid = $1"
        let result = await pgsql.query(sqlQuery, [req.body.id])
        resMsg.Message = `found matching Answers `
        resMsg.Body = result.rows
        return res.json(resMsg);

    } catch (error) {
        console.log(error)
        resMsg.Type = "error"
        resMsg.Message = 'search error'
        return res.status(400).json(resMsg)   
    }

});

router.post('/scoretest', async (req, res) => {
    let resMsg = {Type: "error", Message: "", Body: {} } 
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    let session = req.body
    if (session.length !== 0) {
        let passedQuestion = 0;
        let averagePercentage = 0;
        for (let index = 0; index < session.length; index++) {
            const element = session[index];
            if (element.questiontype !== 'shortanswer' || element.questiontype !== 'paragraph') {
                try {
                    const sqlQuery = "select * from elearninganswers where id = $1 and questionid = $2";
                    let result = await pgsql.query(sqlQuery, [element.name, element.questionid])
                    if (result.rowCount !== 0) {
                        if (result.rows[0].iscorrect == true) {
                            passedQuestion = passedQuestion + 1
                        }
                    }
                } catch (error) {
                    console.log(error)
                }
            }
        }
        
        
        try {
            let sqlQueryTotalNumberOfQuestion = "select count(*) from elearningquestions where status = 'active' and sectionid in(select id from elearningsections where purpose = $1 and marketid = $2 and productid = $3 and status = 'active')"
            let resultTotalNumberOfQuestion = await pgsql.query(sqlQueryTotalNumberOfQuestion, [jwtToken.purpose, jwtToken.marketId, jwtToken.productId])
            
            if (resultTotalNumberOfQuestion.rowCount !== 0) {
                let total = resultTotalNumberOfQuestion.rows[0].count
                averagePercentage = (passedQuestion / total) * 100
            }
            let sqlQueryProfile = "select  ts.profileid, COALESCE(p.surname, '') as surname,  COALESCE(p.firstname, '') as firstname,  COALESCE(p.email, '') as email from cbtsessions as ts ";
            sqlQueryProfile += "left join profiles as p on p.id = ts.profileid where ts.id = $1";
            let result = await pgsql.query(sqlQueryProfile, [jwtToken.sessionId])

            let email = result.rows[0].email;
            let fullname = result.rows[0].surname + ' ' + result.rows[0].firstname;
            
            let msg = {
                to: email,
                from: 'no-reply-onboarding@moove.africa', //Change to your verified sender
                fromname: 'Moove Africa',
            };
            console.log(averagePercentage, passedQuestion, resultTotalNumberOfQuestion.rows[0].count);
            if (averagePercentage > 75) {
                // console.log("ABOVE 75 PERCENT", averagePercentage, passedQuestion, resultTotalNumberOfQuestion.rows[0].count);
                const sqlQuery = `update cbtsessions set passed = 'true' , score = ${averagePercentage}, attempted = ${passedQuestion}, total = ${resultTotalNumberOfQuestion.rows[0].count}, status ='passed' where id = $1`;
                await pgsql.query(sqlQuery, [jwtToken.sessionId])

                const sqlTrainingSchedule = "select * from trainingschedule where id in(select trainingid from cbtsessions where id = $1)";
                let trainingResult = await pgsql.query(sqlTrainingSchedule, [jwtToken.sessionId])
                if (trainingResult.rowCount != 0) {
                    const sqlQuery = `update trainingschedule set status = 'passed' where id = $1`;
                    await pgsql.query(sqlQuery, [trainingResult.rows[0].id])
                }


                switch (jwtToken.country) {
                    case "Nigeria":
                        msg.subject = "Congratulations, You Passed Your Assessment!"
                        msg.html = MailTemplates.Nigeria.assessmentPassedTemplate(fullname)
                    break
                    case "Kenya":
                    case "Uganda":
                        msg.subject = "Congratulations, You Passed Your Assessment!"
                        msg.html = MailTemplates.Eastafrica.assessmentPassedTemplate(fullname)
                    break
                    case "Ghana":
                        msg.subject = "Congratulations, You Passed Your Assessment!"
                        msg.html = MailTemplates.Ghana.assessmentPassedTemplate(fullname)
                    break
                    case "South Africa":
                        msg.subject = "Congratulations, You Passed Your Assessment!"
                        msg.html = MailTemplates.Southafrica.assessmentPassedTemplate(fullname)
                    break
                    case "United Kingdom":
                        msg.subject = " You have passed the assessment!"
                        msg.html = MailTemplates.UK.assessmentPassedTemplate(fullname)
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
            } else {
                // console.log("BELOW 75 PERCENT", averagePercentage ,passedQuestion, resultTotalNumberOfQuestion.rows[0].count);
                const sqlQuery = `update cbtsessions set failed = 'true' , score = ${averagePercentage}, attempted = ${passedQuestion}, total = ${resultTotalNumberOfQuestion.rows[0].count}, status ='failed' where id = $1`;
                await pgsql.query(sqlQuery, [jwtToken.sessionId])

                const sqlTrainingSchedule = "select * from trainingschedule where id in(select trainingid from cbtsessions where id = $1)";
                let trainingResult = await pgsql.query(sqlTrainingSchedule, [jwtToken.sessionId])
                if (trainingResult.rowCount != 0) {
                    const sqlQuery = `update trainingschedule set status = 'failed' where id = $1`;
                    await pgsql.query(sqlQuery, [trainingResult.rows[0].id])
                }

                switch (jwtToken.country) {
                    case "Nigeria":
                        msg.subject = "Unfortunately You Did Not Pass Your Assessment"
                        msg.html = MailTemplates.Nigeria.assessmentFailedTemplate(fullname)
                    break
                    case "Kenya":
                    case "Uganda":
                        msg.subject = "Unfortunately, You Did Not Pass Your Assessment"
                        msg.html = MailTemplates.Eastafrica.assessmentFailedTemplate(fullname)
                    break
                    case "Ghana":
                        msg.subject = "Unfortunately You Did Not Pass Your Assessment"
                        msg.html = MailTemplates.Ghana.assessmentFailedTemplate(fullname)
                    break
                    case "South Africa":
                        msg.subject = "Unfortunately You Did Not Pass Your Assessment"
                        msg.html = MailTemplates.Southafrica.assessmentFailedTemplate(fullname)
                    break
                    case "United Kingdom":
                        msg.subject = "Retake the assessment!"
                        msg.html = MailTemplates.UK.assessmentFailedTemplate(fullname)
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
            resMsg.Message = `Average Percentage ${averagePercentage} `
            return res.json(resMsg);
    
        } catch (error) {
            console.log(error)
            resMsg.Type = "error"
            resMsg.Message = 'search error'
            return res.status(400).json(resMsg)   
        }
    }else{
        resMsg.Type = "error"
        resMsg.Message = 'You did not answer any question'
        return res.status(400).json(resMsg)   

    }
});

router.post('/update', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    
    try {
        const sqlCbtsession = "select * from trainingschedule where id in(select trainingid from cbtsessions where id = $1)";
        let sessionResult = await pgsql.query(sqlCbtsession, [jwtToken.sessionId])

        if (sessionResult.rowCount != 0) {
            const sqlQuery = `update trainingschedule set status = '${req.body.status}' where id = $1`;
            await pgsql.query(sqlQuery, [sessionResult.rows[0].id])

            // console.log(jwtToken);
            if (req.body.status == 'active') {
                const sqlQuery = `update cbtsessions set status = '${req.body.status}' where id = $1`;
                await pgsql.query(sqlQuery, [jwtToken.sessionId])
            }
        }
        resMsg.Type = "success"
        return res.json(resMsg);
        
    } catch (error) {
        console.log(error)
    }
});
export default router;