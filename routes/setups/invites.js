import express from 'express';
import { pgsql, sqlTableInsert, sqlTableUpdate } from '../../dbtables/pgsql.js';
import { jwtVerify, transporter as mailSender } from '../../config/utils.js'
import { invites } from '../../dbtables/base.js';
import MailTemplates from "../../config/mail/index.js"

const router = express.Router();

/**
 * @swagger
 * tags:
 *  name: Driver Invite
 *  description: Prospective Driver Invitation Routes
 * 
*/

/**
 * @swagger
 * /api/setups/invites/search:
 *   post:
 *     description: Search for invites
 *     tags: [Driver Invite]
 *     parameters:
 *     - name: searchtext
 *       description: search parameter
 *       in: formData
 *       required: false
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching Invites(s).
 *       400:
 *          description: search error
*/

// @desc    Search for invites
// @route   POST /api/setups/invites/search
// @access  Private
router.post('/search', async (req, res) => {

    let sqlParams = []
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let searchtext = "%"
    if (req.body.text !== undefined) {
        searchtext = `%${req.body.text}%`
    }
    sqlParams.push(searchtext)

    let sqlQuery = "select i.id, i.productid, i.marketid, i.firstname, i.middlename, i.surname, i.link, i.email, i.mode, i.mobile, i.invitedate, i.referrer, i.createdby, concat(COALESCE(u.surname,' '),' ',COALESCE(u.firstname,' ')) as createdbyname, COALESCE(c.name, '') as country, COALESCE(p.name, '') as product, COALESCE(m.name, '') as market, i.createdate, i.status  from invites as i ";
    sqlQuery += "left join markets as m on m.id = i.marketid ";
    sqlQuery += "left join products as p on p.id = i.productid ";
    sqlQuery += "left join users as u on u.id = i.createdby ";
    sqlQuery += "left join countries as c on i.countryId = c.id  where (lower(i.surname) like lower($1) or lower(i.firstname) like lower($1) or lower(i.mode) like lower($1) or lower(u.surname) like lower($1)) and not (i.status = 'deactivate') ";
    if (jwtToken.role == 'agency') {
        sqlParams.push(jwtToken.userId)
        sqlQuery += ` and i.createdby = $${sqlParams.length}`;
    }
    
    if (jwtToken.role == 'agency-manager') {
        sqlParams.push(jwtToken.userId)
        sqlQuery += ` and i.createdby in (select id from users where supervisorid = $${sqlParams.length})`;
    }

    if (jwtToken.role !== 'superadmin') {
        sqlParams.push(jwtToken.countryId)
        sqlQuery += ` and i.countryId = $${sqlParams.length}`;
    }
    if (req.body.status !== undefined) {
        sqlParams.push(`%${req.body.status}%`)
        sqlQuery += ` and lower(i.status) like lower($${sqlParams.length}) `;
    }
    if (req.body.createdbyId !== undefined) {
        if (req.body.createdbyId > 0) {
            sqlParams.push(req.body.createdbyId)
            sqlQuery += ` and i.createdby = $${sqlParams.length} `;
        } else {
            sqlQuery += ` and i.createdby = 0 `;
        }
    }
    if (req.body.productId !== undefined) {
        if (req.body.productId > 0) {
            sqlParams.push(req.body.productId)
            sqlQuery += ` and i.productid = $${sqlParams.length} `;
        } else {
            sqlQuery += ` and i.productid = 0 `;
        }
    }

    sqlQuery += ` order by i.createdate desc `;

    let result = await pgsql.query(sqlQuery, sqlParams)


    let resMsg = { Type: "", Message: "", Body: {} }
    resMsg.Type = "success"
    resMsg.Body = result.rows
    resMsg.Message = `found ${result.rowCount} matching Invite(s) `

    return res.json(resMsg);
});

router.post('/eligibleforselfonboarding', async (req, res) => {
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    let resMsg = { Type: "success", Message: "", Body: {} }


    let sqlQuery = "select i.id, i.productid, i.marketid, i.firstname, i.middlename, i.surname, i.link, i.email, i.mobile, i.invitedate, i.referrer, COALESCE(c.name, '') as country, COALESCE(p.name, '') as product, i.createdate, i.status  from invites as i ";
    sqlQuery += "left join products as p on p.id = i.productid ";
    sqlQuery += "left join countries as c on i.countryId = c.id  where i.status = 'pending' and i.productid is not null and i.marketid is not null and i.countryid = $1 ";

    try {
        let result = await pgsql.query(sqlQuery, [jwtToken.countryId])
        if (result.rowCount >= 1) {
            resMsg.Body = result.rows
            resMsg.Message = `${result.rowCount} prospect(s) are eligible for selfonboarding`
            return res.json(resMsg);
        } else {
            resMsg.Type = "error"
            resMsg.Message = `no prospect(s) found eligible for selfonboarding`
            return res.json(resMsg);
        }

    } catch (error) {
        console.log(error)
        resMsg.Type = "error"
        resMsg.Message = 'search error'
        return res.status(400).json(resMsg)
    }


});

/**
 * @swagger
 * /api/setups/invites/drivers/resendmail:
 *   post:
 *     description: Send mail to invite driver regardless their invite status for self onboarding Route
 *     tags: [Driver Invite]
 *     parameters:
 *     - name: invites
 *       description: array of  invite id
 *       in: formData
 *       required: true
 *       type: array
 *     responses:
 *       200:
 *         description: 
 *       400:
 *          description: error in parameters provided
*/

// @desc    Send Mail/Sms to driver
// @route   POST /api/setups/invites/drivers/resendmail
// @access  Private
router.post('/drivers/resendmail', async (req, res) => {
    let resMsg = { Type: "", Message: "", Body: {} }
    resMsg.Type = ""
    if (!req.body.invites || req.body.invites.length == 0) {
        resMsg.Message = "No record was selected"
        return res.status(400).json(resMsg);
    }

    let invitedDriver = 0

    for (let item of (req.body.invites)) {
        let sqlQueryName = "select i.surname, i.firstname, i.status, i.link, i.mobile, i.email, COALESCE(c.name, '') as country, COALESCE(p.name, '') as product,  COALESCE(m.name, '') as market , COALESCE(ml.address, '') as address from invites as i ";
        sqlQueryName += "left join products as p on p.id = i.productid ";
        sqlQueryName += "left join markets as m on m.id = i.marketid ";
        sqlQueryName += "left join marketlocations as ml on ml.marketid = i.marketid and ml.name = 'office' ";
        sqlQueryName += "left join countries as c on i.countryId = c.id  where i.id = $1";

        // console.log(sqlQueryName);

        let resultName = await pgsql.query(sqlQueryName, [item])
        if (resultName.rows[0] !== []) {
            let email = resultName.rows[0].email;
            let fullname = `${resultName.rows[0].surname} ${resultName.rows[0].firstname}`
            let product = resultName.rows[0].product
            let market = resultName.rows[0].market
            let mobile = resultName.rows[0].mobile
            let address = resultName.rows[0].address
            let country = resultName.rows[0].country
            let link = resultName.rows[0].link
            let msg = {
                to: email,
                from: 'no-reply-onboarding@moove.africa', //Change to your verified sender
                fromname: 'Moove Africa',
                subject: 'Get In A Moove Vehicle And Drive!',

            };
            switch (resultName.rows[0].country) {
                case "Nigeria":
                    msg.subject = "Register and Get on the Moove!"
                    msg.html = MailTemplates.Nigeria.invitationToRegisterTemplate(fullname, link, mobile, address, market, country)
                    break
                case "Kenya":
                case "Uganda":
                    msg.subject = "Register and Get on the Moove!"
                    msg.html = MailTemplates.Eastafrica.invitationToRegisterTemplate(fullname, link, mobile)
                break
                case "South Africa":
                    msg.subject = "Register and Get on the Moove!"
                    msg.html = MailTemplates.Southafrica.invitationToRegisterTemplate(fullname, link, mobile, address, market, country)
                break
                case "Ghana":
                    msg.subject = "Register and Get on the Moove!"
                    msg.html = MailTemplates.Ghana.invitationToRegisterTemplate(fullname, link, mobile,)
                break
                case "United Arab Emirates":
                    msg.html = MailTemplates.UAE.invitationToRegisterTemplate(fullname, product, market, country, link, mobile, address)
                break
                case "United Kingdom":
                    msg.subject = "Register on Moove"
                    msg.html = MailTemplates.UK.invitationToRegisterTemplate(fullname, link, mobile)
                break
                case "India":
                    msg.html = MailTemplates.India.invitationToRegisterTemplate(fullname, product, market, country, mobile, address)
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

            invitedDriver++
        }
    }

    resMsg.Message = `${invitedDriver} records invited`
    if (invitedDriver !== 0) {
        resMsg.Type = "success"
        return res.json(resMsg);
    }
    return res.status(400).json(resMsg);
});

/**
 * @swagger
 * /api/setups/invites/drivers:
 *   post:
 *     description: Send mail to invite driver that dont haven't been sent a mail invite before for self onboarding Route
 *     tags: [Driver Invite]
 *     parameters:
 *     - name: invites
 *       description: array of  invite id
 *       in: formData
 *       required: true
 *       type: array
 *     responses:
 *       200:
 *         description: 
 *       400:
 *          description: error in parameters provided
*/

// @desc    Invite and Send Mail/Sms to driver
// @route   POST /api/setups/invites/drivers
// @access  Private
router.post('/drivers', async (req, res) => {
    let resMsg = { Type: "", Message: "", Body: {} }
    resMsg.Type = ""
    // console.log(req.body);
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    let loggedInDriver = jwtToken.userId
    if (!req.body.invites || req.body.invites.length == 0) {
        resMsg.Message = "No record was selected"
        return res.status(400).json(resMsg);
    }
    if ((req.body.mode == undefined || req.body.mode == '' || req.body.mode == null) && jwtToken.country !== 'India') {
        resMsg.Message = "No Mode was selected"
        return res.status(400).json(resMsg);
    }

    if (req.body.mode == 'online' && req.body.address == null) {
        resMsg.Message = "Please add a link"
        return res.status(400).json(resMsg);
    }

    let invitedDriver = 0
    let uninvitedDriver = 0

    for (let item of (req.body.invites)) {
        let sqlQueryName = "select i.surname, i.firstname, i.status, i.link, i.mobile, i.email, COALESCE(c.name, '') as country, COALESCE(p.name, '') as product, COALESCE(ml.address, '') as location, COALESCE(m.name, '') as market from invites as i ";
        sqlQueryName += "left join products as p on p.id = i.productid ";
        sqlQueryName += "left join markets as m on m.id = i.marketid ";
        sqlQueryName += "left join marketlocations as ml on ml.marketid = i.marketid and ml.name = 'office'";
        sqlQueryName += "left join countries as c on i.countryId = c.id  where i.id = $1";

        // console.log(sqlQueryName);

        let resultName = await pgsql.query(sqlQueryName, [item])
        // console.log(resultName.rows[0], "resultName.rows[0]");
        if (resultName.rows[0].status !== "invited") {
            let todayDate = new Date().toUTCString();
            let email = resultName.rows[0].email;
            let fullname = `${resultName.rows[0].surname} ${resultName.rows[0].firstname}`
            let product = resultName.rows[0].product
            let market = resultName.rows[0].market
            let mobile = resultName.rows[0].mobile
            let address = "";
            if (req.body.mode == 'face to face') {
                address = resultName.rows[0].location
            } else {
                address = req.body.address
            }

            // console.log(address, "address");
            let country = resultName.rows[0].country
            let link = resultName.rows[0].link
            let msg = {
                to: email,
                from: 'no-reply-onboarding@moove.africa', //Change to your verified sender
                fromname: 'Moove Africa',
                subject: 'Get In A Moove Vehicle And Drive!',

            };
            switch (resultName.rows[0].country) {
                case "Nigeria":
                    msg.html = MailTemplates.Nigeria.invitationToRegisterTemplate(fullname, link, address, market, country)
                break
                case "South Africa":
                    msg.subject = "Register and Get on the Moove!"
                    msg.html = MailTemplates.Southafrica.invitationToRegisterTemplate(fullname, link, mobile, address, market, country)
                    break
                case "Ghana":
                    msg.subject = "Register and Get on the Moove!"
                    msg.html = MailTemplates.Ghana.invitationToRegisterTemplate(fullname, link, mobile)
                break
                case "Kenya":
                case "Uganda":
                    msg.subject = "Register and Get on the Moove!"
                    msg.html = MailTemplates.Eastafrica.invitationToRegisterTemplate(fullname, link, mobile)
                break
                case "United Arab Emirates":
                    msg.html = MailTemplates.UAE.invitationToRegisterTemplate(fullname, product, market, country, link, mobile, address)
                break
                case "United Kingdom":
                    msg.subject = "Register on Moove"
                    msg.html = MailTemplates.UK.invitationToRegisterTemplate(fullname, link, mobile)
                break
                case "India":
                    msg.html = MailTemplates.India.invitationToRegisterTemplate(fullname, product, market, country, mobile, address)
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

            invitedDriver++
            const sqlQuery = `update invites set status = 'invited', invitedate = '${todayDate}', updatedate = '${todayDate}', updatedby = '${loggedInDriver}', mode = '${req.body.mode}' where id = $1`;
            await pgsql.query(sqlQuery, [item])
        } else {
            uninvitedDriver++
        }
    }

    resMsg.Message = `${invitedDriver} records invited, ${uninvitedDriver} previously invited`
    if (invitedDriver > 0) {
        resMsg.Type = "success"
        return res.json(resMsg);
    }
    return res.status(400).json(resMsg);
});

/**
 * @swagger
 * /api/setups/invites/import:
 *   post:
 *     description: Driver's self invite Route
 *     tags: [Driver Invite]
 *     parameters:
 *     - name: productId
 *       description: registered productmarket id
 *       in: formData
 *       required: true
 *       type: integer
 *     - name: marketId
 *       description: registered market id
 *       in: formData
 *       required: true
 *       type: integer
 *     - name: invites
 *       description: invites csv file
 *       in: formData
 *       required: true
 *       type: file
 *     - name: referrer
 *       description: Invite source
 *       in: formData
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns message.
 *       400:
 *          description: error in parameters provided
*/

// @desc    Create a new driver invites by import
// @route   POST /api/setups/invites/import
// @access  Private
router.post('/import', async (req, res) => {

    let resMsg = { Type: "", Message: "", Body: {} }
    resMsg.Type = "error"
    resMsg.Message = ``

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    let generatedlink = ""
    // if (!isSuperUser(jwtToken.role)) {
    //     resMsg.Message = "Only super admins can import banks"
    //     return res.status(400).json(resMsg);
    // }
    if (!req.body.referrer) {
        resMsg.Message = "Source is not provided"
        return res.status(400).json(resMsg);
    } else {
        req.body.referrer = req.body.referrer.toLowerCase()
    }

    if (!req.body.marketId || req.body.marketId < 0) {
        resMsg.Message = "Market is not provided"
        return res.status(400).json(resMsg);
    }

    if (!req.body.productId || req.body.productId < 0) {
        resMsg.Message = "Product is not provided"
        return res.status(400).json(resMsg);
    } else {
        try {
            const sqlQueryName = "select name from productmarkets where productmarkets.productid = $1 and productmarkets.marketid = $2 and productmarkets.countryid = $3";
            let resultName = await pgsql.query(sqlQueryName, [req.body.productId, req.body.marketId, jwtToken.countryId])
            if (resultName.rows !== 0) {
                generatedlink = req.body.url + "/#/selfonboard/" + resultName.rows[0].name
            }
        } catch (error) {
            console.log(error)
        }
    }

    if (!req.body.invites || req.body.invites.length == 0) {
        resMsg.Message = "please provide import list"
        return res.status(400).json(resMsg);
    }


    let existingRecordList = {}

    try {
        const sqlQuery = "select lower(surname) as surname, email, mobile, id from invites where productid = $1 order by surname";
        let result = await pgsql.query(sqlQuery, [req.body.productId])
        if (result.rows !== undefined) {
            existingRecordList = result.rows
        }
    } catch (error) {
        resMsg.Type = "error"
        resMsg.Message = `unable to import records`
        console.log(error)
        return res.status(400).json(resMsg);
    }


    let importedRecords = 0
    let duplicateRecords = 0
    let importedList = req.body.invites

    importedList.shift()
    for (const record of importedList) {
        let recordArray = record.split(",")
        if (recordArray.length > 1) {
            let checkDuplicate = existingRecordList.find((r) => r.email == recordArray[4].trim().toLowerCase() && r.mobile == recordArray[3].trim().toLowerCase() && r.surname == recordArray[2].trim().toLowerCase())
            if (checkDuplicate == [] || checkDuplicate == undefined) {
                let newRecord = {
                    status: "pending",
                    surname: recordArray[2].trim().toLowerCase(),
                    firstname: recordArray[1].trim().toLowerCase(),
                    mobile: recordArray[3].trim(),
                    email: recordArray[4].trim(),
                    link: generatedlink,
                    productId: req.body.productId,
                    marketId: req.body.marketId,
                    referrer: req.body.referrer,
                    invitedate: null,
                    countryId: jwtToken.countryId
                }
                importedRecords++
                sqlTableInsert("invites", invites, newRecord, jwtToken).then(() => {
                })
                await new Promise(r => setTimeout(r, 5));
            } else {
                duplicateRecords++
            }
        }
    }


    resMsg.Message = `${importedRecords} records imported, ${duplicateRecords} duplicates ignored`
    if (duplicateRecords == 0) {
        resMsg.Type = "success"
        return res.json(resMsg);
    }
    return res.status(400).json(resMsg);

});

/**
 * @swagger
 * /api/setups/invites/selfinvite:
 *   post:
 *     description: Driver's self invite Route
 *     tags: [Driver Invite]
 *     parameters:
 *     - name: countryId
 *       description: registered country id
 *       in: formData
 *       required: true
 *       type: integer
 *     - name: productId
 *       description: registered productmarket id
 *       in: formData
 *       required: true
 *       type: integer
 *     - name: marketid
 *       description: registered market id
 *       in: formData
 *       required: true
 *       type: integer
 *     - name: surname
 *       description: driver's surname
 *       in: formData
 *       required: true
 *       type: string
 *     - name: firstname
 *       description: driver's firstname
 *       in: formData
 *       required: true
 *       type: string
 *     - name: middlename
 *       description: driver's middlename
 *       in: formData
 *       required: false
 *       type: string
 *     - name: mobile
 *       description: driver's mobile
 *       in: formData
 *       required: true
 *       type: string
 *     - name: email
 *       description: driver's email
 *       in: formData
 *       required: true
 *       type: string
 *     - name: referrer
 *       description: Invite source
 *       in: formData
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns invites id.
 *       400:
 *          description: error in parameters provided
*/

// @desc    Driver self invite
// @route   POST /api/setups/invites
// @access  Public
router.post('/selfinvite', async (req, res) => {

    let resMsg = { Type: "", Message: "", Body: {} }
    let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
    resMsg.Type = "error"
    resMsg.Message = ``
    if (!req.body.productId || req.body.productId < 0) {
        resMsg.Message = "Product is not provided"
        return res.status(400).json(resMsg);
    }
    if (!req.body.countryId || req.body.countryId < 0) {
        resMsg.Message = "Country is not provided"
        return res.status(400).json(resMsg);
    }

    if (!req.body.marketId || req.body.marketId < 0) {
        resMsg.Message = "Market is not provided"
        return res.status(400).json(resMsg);
    }

    if (!req.body.surname || !req.body.firstname || !req.body.mobile || !req.body.email) {
        resMsg.Message = "Please Fill All Fields"
        return res.status(400).json(resMsg);
    }

    if (!req.body.referrer) {
        resMsg.Message = "Source is not provided"
        return res.status(400).json(resMsg);
    } else {
        req.body.referrer = req.body.referrer.toLowerCase()
    }

    if (req.body.email !== undefined && req.body.email !== "") {
        const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if (!re.test(req.body.email)) {
            resMsg.Message = "email not a valid address"
            return res.status(400).json(resMsg);
        }
    }

    if (!req.body.surname.trim().match(/^(\s)*[A-Za-z]+((\s)?((\'|\-|\.)?([A-Za-z])+))*(\s)*$/)) {
        resMsg.Message = "surname must  be alphabets"
        return res.status(400).json(resMsg);
    } else {
        req.body.surname = req.body.surname.toLowerCase()
    }

    if (!req.body.firstname.trim().match(/^(\s)*[A-Za-z]+((\s)?((\'|\-|\.)?([A-Za-z])+))*(\s)*$/)) {
        resMsg.Message = "firstname must  be alphabets"
        return res.status(400).json(resMsg);
    } else {
        req.body.firstname = req.body.firstname.toLowerCase()
    }

    if (req.body.middlename != undefined && req.body.middlename != "") {
        req.body.middlename = req.body.middlename.toLowerCase()
    }

    try {
        const sqlQuery = "select * from invites where surname = $1 and email = $2 and mobile = $3";
        let result = await pgsql.query(sqlQuery, [req.body.surname, req.body.email, req.body.mobile])
        if (result.rowCount > 0) {
            resMsg.Message = "Duplicates email, Surname and Phone Number are not allowed"
            return res.status(400).json(resMsg);
        }
    } catch (error) {
        console.log(error)
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
        const sqlQueryName = "select name from productmarkets where productmarkets.productid = $1 and productmarkets.marketid = $2";
        let resultName = await pgsql.query(sqlQueryName, [req.body.productId, req.body.marketId])
        if (resultName.rows !== 0) {
            req.body.link = req.body.url + "/#/selfonboard/" + resultName.rows[0].name
        }
    } catch (error) {
        console.log(error)
    }


    req.body.status = "pending";


    req.body.invitedate = null

    sqlTableInsert("invites", invites, req.body, jwtPayload).then((result) => {
        resMsg.Message = `Invite created for ${req.body.surname + ' ' + req.body.firstname}`
        resMsg.Type = "success"
        resMsg.Body = invites.id
        return res.json(resMsg);
    })
});

/**
 * @swagger
 * /api/setups/invites:
 *   post:
 *     description: Create Driver invite Route
 *     tags: [Driver Invite]
 *     parameters:
 *     - name: productId
 *       description: registered productmarket id
 *       in: formData
 *       required: true
 *       type: integer
 *     - name: marketid
 *       description: registered market id
 *       in: formData
 *       required: true
 *       type: integer
 *     - name: surname
 *       description: driver's surname
 *       in: formData
 *       required: true
 *       type: string
 *     - name: firstname
 *       description: driver's firstname
 *       in: formData
 *       required: true
 *       type: string
 *     - name: middlename
 *       description: driver's middlename
 *       in: formData
 *       required: false
 *       type: string
 *     - name: mobile
 *       description: driver's mobile
 *       in: formData
 *       required: true
 *       type: string
 *     - name: email
 *       description: driver's email
 *       in: formData
 *       required: true
 *       type: string
 *     - name: referrer
 *       description: Invite source
 *       in: formData
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns invites id.
 *       400:
 *          description: error in parameters provided
*/

// @desc    Create a new driver invite
// @route   POST /api/setups/invites
// @access  Private
router.post('/', async (req, res) => {

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

    if (!req.body.surname || !req.body.firstname || !req.body.mobile || !req.body.email) {
        resMsg.Message = "Please Fill All Fields"
        return res.status(400).json(resMsg);
    }

    if (req.body.email !== undefined && req.body.email !== "") {
        const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if (!re.test(req.body.email)) {
            resMsg.Message = "email not a valid address"
            return res.status(400).json(resMsg);
        }
    }
    if (!req.body.referrer) {
        resMsg.Message = "Source is not provided"
        return res.status(400).json(resMsg);
    } else {
        req.body.referrer = req.body.referrer.toLowerCase()
    }

    if (!req.body.surname.trim().match(/^(\s)*[A-Za-z]+((\s)?((\'|\-|\.)?([A-Za-z])+))*(\s)*$/)) {
        resMsg.Message = "surname must  be alphabets"
        return res.status(400).json(resMsg);
    } else {
        req.body.surname = req.body.surname.toLowerCase()
    }

    if (!req.body.firstname.trim().match(/^(\s)*[A-Za-z]+((\s)?((\'|\-|\.)?([A-Za-z])+))*(\s)*$/)) {
        resMsg.Message = "firstname must  be alphabets"
        return res.status(400).json(resMsg);
    } else {
        req.body.firstname = req.body.firstname.toLowerCase()
    }

    if (req.body.middlename != undefined && req.body.middlename != "") {
        req.body.middlename = req.body.middlename.toLowerCase()
    }

    try {
        const sqlQuery = "select * from invites where surname = $1 and email = $2 and mobile = $3";
        let result = await pgsql.query(sqlQuery, [req.body.surname, req.body.email, req.body.mobile])
        if (result.rowCount > 0) {
            resMsg.Message = "Duplicates email, Surname and Phone Number are not allowed"
            return res.status(400).json(resMsg);
        }
    } catch (error) {
        console.log(error)
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
        const sqlQueryName = "select name from productmarkets where productmarkets.productid = $1 and productmarkets.marketid = $2";
        let resultName = await pgsql.query(sqlQueryName, [req.body.productId, req.body.marketId])
        if (resultName.rows !== 0) {
            req.body.link = req.body.url + "/#/selfonboard/" + resultName.rows[0].name
        }
    } catch (error) {
        console.log(error)
    }

    // delete req.body['I'];

    req.body.status = "pending";
    let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
    if (req.body.countryId > 0 && (jwtPayload.countryId == undefined || jwtPayload.countryId == 0)) {
        jwtPayload.countryId = req.body.countryId
    }

    req.body.invitedate = null

    sqlTableInsert("invites", invites, req.body, jwtPayload).then(async (result) => {
        resMsg.Message = `Invite created for ${req.body.surname + ' ' + req.body.firstname}`
        resMsg.Type = "success"
        resMsg.Body = invites.id

        return res.json(resMsg);
    })
});

/**
 * @swagger
 * /api/setups/invites:
 *   put:
 *     description: Create Driver invite Route
 *     tags: [Driver Invite]
 *     parameters:
 *     - name: id
 *       description: registered invite id
 *       in: formData
 *       required: true
 *       type: integer
 *     - name: productId
 *       description: registered productmarket id
 *       in: formData
 *       required: false
 *       type: integer
 *     - name: marketid
 *       description: registered market id
 *       in: formData
 *       required: false
 *       type: integer
 *     - name: surname
 *       description: driver's surname
 *       in: formData
 *       required: false
 *       type: string
 *     - name: firstname
 *       description: driver's firstname
 *       in: formData
 *       required: false
 *       type: string
 *     - name: middlename
 *       description: driver's middlename
 *       in: formData
 *       required: false
 *       type: string
 *     - name: mobile
 *       description: driver's mobile
 *       in: formData
 *       required: false
 *       type: string
 *     - name: email
 *       description: driver's email
 *       in: formData
 *       required: false
 *       type: string
 *     - name: referrer
 *       description: Invite source
 *       in: formData
 *       required: false
 *       type: string
 *     responses:
 *       200:
 *         description: Returns updated invites id.
 *       400:
 *          description: error in parameters provided
*/

// @desc    Update driver invite
// @route   PUT /api/setups/invites
// @access  Private
router.put('/', async (req, res) => {

    let resMsg = { Type: "error", Message: "", Body: {} }
    // let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    // if (jwtToken.role !== 'superadmin') {
    //     resMsg.Message = "Only super admin can update  record"
    //     return res.status(400).json(resMsg);
    // }

    if (!req.body.id || req.body.id == 0) {
        resMsg.Message = "id is required"
        return res.status(400).json(resMsg);
    }

    // if(!req.body.productId || req.body.productId == 0) {
    //     resMsg.Message = "product is required"
    //     return res.status(400).json(resMsg);
    // }

    // if (!req.body.marketId || req.body.marketId == 0) {
    //     resMsg.Message = "market is required"
    //     return res.status(400).json(resMsg);
    // }


    let fieldsToUpdate = {}
    if (req.body.productId !== undefined) {
        fieldsToUpdate["productId"] = req.body.productId
        try {
            const sqlQueryName = "select name from productmarkets where productmarkets.productid = $1 and productmarkets.marketid = $2";
            let resultName = await pgsql.query(sqlQueryName, [req.body.productId, req.body.marketId])
            if (resultName.rows !== 0) {
                fieldsToUpdate["link"] = req.body.url + "/#/selfonboard/" + resultName.rows[0].name
            }
        } catch (error) {
            console.log(error)
        }
    }


    if (req.body.planId !== undefined) {
        fieldsToUpdate["planId"] = req.body.planId
    }
    if (req.body.marketId !== undefined) {
        fieldsToUpdate["marketId"] = req.body.marketId
    }

    if (req.body.surname !== undefined) {
        fieldsToUpdate["surname"] = req.body.surname
    }

    if (req.body.firstname !== undefined) {
        fieldsToUpdate["firstname"] = req.body.firstname
    }

    if (req.body.middlename !== undefined) {
        fieldsToUpdate["middlename"] = req.body.middlename
    }

    if (req.body.email !== undefined) {
        fieldsToUpdate["email"] = req.body.email
    }
    // if(req.body.countryId !== undefined) {
    //     fieldsToUpdate["countryId"] = req.body.countryId
    // }
    if (req.body.mobile !== undefined) {
        fieldsToUpdate["mobile"] = req.body.mobile
    }

    fieldsToUpdate["id"] = req.body.id

    try {
        const sqlQuery = "select * from invites where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.id])
        if (result.rowCount == 0) {
            resMsg.Message = "No matching record found"
            return res.status(400).json(resMsg);
        } else {
            let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
            if (fieldsToUpdate.countryId !== undefined && fieldsToUpdate.countryId !== null) {
                jwtPayload.countryId = fieldsToUpdate.countryId
            }

            sqlTableUpdate("invites", invites, fieldsToUpdate, jwtPayload).then((result) => {
                resMsg.Message = `Invites updated`
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

});

/**
 * @swagger 
 * /api/setups/invites/export:
 *    get:
 *      description: Export All Invites record in the signed in user's country
 *      tags: [Driver Invite]
 *      responses:
 *        200:
 *          description: Returns csv file of Invites
 *        400:
 *          description: no records found to export 
 * 
*/

router.get('/export', async (req, res) => {
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])


    let sqlParams = []
    let searchtext = "%"
    if (req.query.text) {
        searchtext = `%${req.query.text}%`
    }

    sqlParams.push(searchtext)

    

    let exportHeaders = ["#", "FirstName", "Surname", "Mobile", "Email", "Link", "Product", "Market", "Status", "Mode", "Invite By", "Invited Date", "Createdate", "Createdby"]
    let exportDriversList = []
    exportDriversList.push('"' + exportHeaders.join('", "') + '"')


    let sqlQuery = " select i.firstname, i.surname, i.mobile, i.email, i.link, i.referrer, i.mode, "
    sqlQuery += " COALESCE(p.name,'') as product, "
    sqlQuery += " COALESCE(m.name,'') as market, "

    sqlQuery += "  i.status, i.invitedate, "
    sqlQuery += " i.createdate as createdate , concat(COALESCE(users.firstname,' '),' ',COALESCE(users.surname,' ')) as createdby from invites as i "


    sqlQuery += " left join products as p on p.id = i.productid "
    sqlQuery += " left join markets as m on m.id = i.marketid "
    sqlQuery += " left join users on users.id = i.createdby "

    sqlQuery += " where i.countryid = $1 and  ";

    if (req.query.id == 0) {
        console.log(req.query.id);
        sqlQuery += " i.createdby = 0 and ";
    }
    sqlQuery += " (lower(m.name) like lower($2) or lower(p.name) like lower($2)) order by i.surname desc";

    try {
        let result = await pgsql.query(sqlQuery, [jwtToken.countryId, searchtext])

        result.rows.forEach(function (invite, index) {
            let exportRecord = [index + 1,
            invite.firstname, invite.surname, invite.mobile,
            invite.email, invite.link, invite.product,
            invite.market, invite.status, invite.mode, invite.referrer, invite.invitedate, invite.createdate, invite.createdby
            ]
            // let exportRecord = [ index+1,
            //     driver.code, driver.status, driver.mobile, driver.firstname, driver.middlename, driver.surname, driver.email, driver.gender, driver.dateofbirth, driver.maritalstatus, 
            //     driver.nationality, driver.address, driver.postcode, driver.townofresidence, driver.cityareaofresidence, driver.regionstateofresidence, 
            //     driver.townoforigin, driver.cityareaoforigin, driver.regionstateoforigin, jwtToken.country, driver.idtype+ " - "+driver.idnumber
            // ]
            exportDriversList.push('"' + exportRecord.join('", "') + '"')
        });
    } catch (error) {
        console.log(error)
    }


    let csvFile = exportDriversList.join("\r\n")
    let todayDate = new Date().toISOString().slice(0, 10);
    res.writeHead(200, {
        "Content-Disposition": "inline;filename=invites-export" + todayDate + "-file.csv",
        'Content-Type': "text/csv",
        'Content-Length': Buffer.byteLength(csvFile, 'utf8'),
    });
    res.write(csvFile)
    res.end();

});

router.post('/deactivate', async (req, res) => {
    let resMsg = { Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let deactivateDriver = 0
    if (!req.body.invites || req.body.invites.length == 0) {
        const sqlQueryName = "select id from invites where invites.countryId = $1";
        let resultName = await pgsql.query(sqlQueryName, [jwtToken.countryId])
        if (resultName.rowCount > 0) {
            let inviteList = []
            inviteList = resultName.rowCount
            for (let item of (inviteList)) {
                const sqlQueryName = "select id from invites where invites.id = $1";
                let resultName = await pgsql.query(sqlQueryName, [item.id])
                if (resultName.rows == 0) {
                    resMsg.Type = "error"
                    resMsg.Message = `Unable to find invite with id [${item.id}]`
                    return res.status(400).json(resMsg);
                }

                const sqlQuery = "update invites set status = 'deactivated' where id = $1";
                await pgsql.query(sqlQuery, [item.id])

                deactivateDriver++
            }
            resMsg.Message = `${deactivateDriver} records deactivated`
            if (deactivateDriver != 0) {
                resMsg.Type = "success"
                return res.json(resMsg);
            }
            return res.status(400).json(resMsg);
        }
    } else {
        for (let item of (req.body.invites)) {
            const sqlQueryName = "select id from invites where invites.id = $1";
            let resultName = await pgsql.query(sqlQueryName, [item])
            if (resultName.rows == 0) {
                resMsg.Type = "error"
                resMsg.Message = `Unable to find invite with id [${item}]`
                return res.status(400).json(resMsg);
            }

            const sqlQuery = "update invites set status = 'deactivated' where id = $1";
            await pgsql.query(sqlQuery, [item])
            deactivateDriver++
        }
        resMsg.Message = `${deactivateDriver} records deactivated`
        if (deactivateDriver != 0) {
            resMsg.Type = "success"
            return res.json(resMsg);
        }
        return res.status(400).json(resMsg);
    }
});

router.post('/update', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    
    try {
        const sqlInvite = "select * from invites where id = $1";
        let result = await pgsql.query(sqlInvite, [jwtToken.inviteId])

        if (result.rowCount !== 0) {
            const sqlQuery = `update invites set status = '${req.body.status}' where id = $1`;
            await pgsql.query(sqlQuery, [result.rows[0].id])

            // console.log(result.rows[0]);
        
        }
        resMsg.Type = "success"
        return res.json(resMsg);
        
    } catch (error) {
        console.log(error)
    }
});
export default router;