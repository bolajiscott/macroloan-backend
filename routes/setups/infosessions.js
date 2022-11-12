import express from 'express';
import { pgsql, sqlTableInsert, sqlTableUpdate } from '../../dbtables/pgsql.js';
import { jwtVerify, transporter } from '../../config/utils.js'
import { infosessionHtml } from '../../config/mail/info-session/info-session.js'
import { infosessionGhanaHtml } from '../../config/mail/info-session/info-session-ghana.js'
import { infosessions } from '../../dbtables/base.js';
import Handler from "./handler.js"

const router = express.Router();

/**
 * @swagger
 * tags:
 *  name: Driver Info Session
 *  description: Driver Info Session Routes
 * 
*/

/**
 * @swagger
 * /api/setups/infosessions/search:
 *   post:
 *     description: Search for info sessions
 *     tags: [Driver Info Session]
 *     parameters:
 *     - name: searchtext
 *       description: search parameter
 *       in: formData
 *       required: false
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching info session(s).
 *       400:
 *          description: search error
*/

// @desc    Search for infosessions
// @route   POST /api/setups/infosessions/search
// @access  Private
router.post('/search', async (req, res) => {

    let sqlParams = []
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let searchtext = "%"
    if (req.body.text !== undefined) {
        searchtext = `%${req.body.text}%`
    }
    sqlParams.push(searchtext)

    let sqlQuery = "select info.id, info.marketid, info.firstname, info.middlename, info.surname, info.email, info.mobile, info.invitedate, info.attendedate, info.mode, info.countryid, COALESCE(c.name, '') as country, COALESCE(m.name, '') as market, info.createdate, info.status  from infosessions as info ";
    sqlQuery += "left join markets as m on m.id = info.marketid ";
    sqlQuery += "left join countries as c on info.countryId = c.id  where (lower(info.surname) like lower($1) or lower(info.firstname) like lower($1) or lower(info.mode) like lower($1)) and not (info.status = 'deactivate') ";

    if (jwtToken.role !== 'superadmin') {
        sqlParams.push(jwtToken.countryId)
        sqlQuery += ` and info.countryId = $${sqlParams.length}`;
    }

    if (jwtToken.role == 'agency-manager') {
        sqlParams.push(jwtToken.userId)
        sqlQuery += ` and info.createdby in (select id from users where supervisorid = $${sqlParams.length})`;
    }
    if (req.body.status !== undefined && req.body.status !== "") {
        sqlParams.push(`%${req.body.status}%`)
        sqlQuery += ` and lower(info.status) like lower($${sqlParams.length}) `;
    }
    if (req.body.marketid !== undefined) {
        sqlParams.push(req.body.marketid)
        sqlQuery += ` and info.marketid = $${sqlParams.length} `;
    }
    
    sqlQuery += ` order by info.updatedate desc `;
    
    let result = await pgsql.query(sqlQuery, sqlParams)


    let resMsg = { Type: "", Message: "", Body: {} }
    resMsg.Type = "success"
    resMsg.Body = result.rows
    resMsg.Message = `found ${result.rowCount} matching Info Session(s) `

    return res.json(resMsg);
});

router.post('/eligibleforinvite', async (req, res) => {
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    let resMsg = { Type: "success", Message: "", Body: {} }


    let sqlQuery = "select info.id, info.marketid, info.firstname, info.middlename, info.surname, info.email, info.mobile, info.invitedate, info.attendedate, info.countryid, COALESCE(c.name, '') as country, COALESCE(m.name, '') as market, info.createdate, info.status  from infosessions as info ";
    sqlQuery += "left join markets as m on m.id = info.marketid ";
    sqlQuery += "left join countries as c on info.countryId = c.id  where info.status = 'pending' and info.marketid is not null and info.countryid = $1 ";

    try {
        let result = await pgsql.query(sqlQuery, [jwtToken.countryId])
        if (result.rowCount >= 1) {
            resMsg.Body = result.rows
            resMsg.Message = `${result.rowCount} prospect(s) are eligible for invite`
            return res.json(resMsg);
        } else {
            resMsg.Type = "error"
            resMsg.Message = `no prospect(s) found eligible for invite`
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
 * /api/setups/infosessions/drivers:
 *   post:
 *     description: Send mail to info session prospect and update their status to invited Route
 *     tags: [Driver Info Session]
 *     parameters:
 *     - name: infosessions
 *       description: array of  info session id
 *       in: formData
 *       required: true
 *       type: array
 *     responses:
 *       200:
 *         description: 
 *       400:
 *          description: error in parameters provided
*/

// @desc    Update Info Session status to invited and Send Mail/Sms to driver
// @route   POST /api/setups/infosessions/drivers
// @access  Private
router.post('/drivers', async (req, res) => {
    let resMsg = { Type: "", Message: "", Body: {} }
    resMsg.Type = ""
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    let loggedInDriver = jwtToken.userId
    if (!req.body.infosessions || req.body.infosessions.length == 0) {
        resMsg.Message = "No record was selected"
        return res.status(400).json(resMsg);
    }

    if (req.body.mode == undefined || req.body.mode == '' || req.body.mode == null) {
        resMsg.Message = "No Mode was selected"
        return res.status(400).json(resMsg);
    }

    if (req.body.mode == 'online' && req.body.address == null) {
        resMsg.Message = "Please add a link"
        return res.status(400).json(resMsg);
    }

    let invitedDriver = 0
    let uninvitedDriver = 0

    for (let item of (req.body.infosessions)) {
        let sqlQueryName = "select info.surname, info.firstname, info.status, info.mobile, info.email, info.marketid, COALESCE(c.name, '') as country, COALESCE(ml.address, '') as location, COALESCE(m.name, '') as market from infosessions as info ";
        sqlQueryName += "left join markets as m on m.id = info.marketid ";
        sqlQueryName += "left join marketlocations as ml on ml.marketid = info.marketid and ml.name = 'showroom'";
        sqlQueryName += "left join countries as c on info.countryId = c.id  where info.id = $1";

        // console.log(req.body);

        let resultName = await pgsql.query(sqlQueryName, [item])
        // console.log(resultName.rows[0], "resultName.rows[0]");
        if (resultName.rows[0].status !== "invited" && !resultName.rows[0].status.includes('attended')) {
            let todayDate = new Date().toUTCString();
            let email = resultName.rows[0].email;
            let fullname = resultName.rows[0].surname + ' ' + resultName.rows[0].firstname;
            let location = "";
            if (req.body.mode == 'face to face') {
                location = resultName.rows[0].location
            } else {
                location = req.body.address
            }

            let time = req.body.time;
            let date = req.body.date;
            let msg = {
                to: email,
                from: 'no-reply-onboarding@moove.africa', //Change to your verified sender
                fromname: 'Moove Africa',
                subject: 'Invitation To Moove’s Info Session!',
            };
            if (resultName.rows[0].country == "Ghana") {
                try {
                    msg.html = infosessionGhanaHtml(fullname, location, time, date)
                    transporter.sendMail(msg).then(() => {
                        console.log('Email sent')
                    }).catch((error) => {
                        console.error(error)
                    });
                } catch (error) {
                    console.log(error);
                }
            } else {
                try {
                    msg.html = infosessionHtml(fullname, location, time, date)
                    transporter.sendMail(msg).then(() => {
                        console.log('Email sent')
                    }).catch((error) => {
                        console.error(error)
                    });
                } catch (error) {
                    console.log(error);
                }
            }
            invitedDriver++
            const sqlQuery = `update infosessions set status = 'invited', invitedate = '${todayDate}', updatedate = '${todayDate}', updatedby = '${loggedInDriver}', mode = '${req.body.mode}' where id = $1`;
            await pgsql.query(sqlQuery, [item])
        } else {
            uninvitedDriver++
        }
    }

    resMsg.Message = `${invitedDriver} records invited, ${uninvitedDriver} previously invited`
    if (uninvitedDriver == 0) {
        resMsg.Type = "success"
        return res.json(resMsg);
    }
    return res.status(400).json(resMsg);
});

/**
 * @swagger
 * /api/setups/infosessions/import:
 *   post:
 *     description: Driver's self info session Route
 *     tags: [Driver Info Session]
 *     parameters:
 *     - name: marketId
 *       description: registered market id
 *       in: formData
 *       required: true
 *       type: integer
 *     - name: infosessions
 *       description: infosessions csv file
 *       in: formData
 *       required: true
 *       type: file
 *     responses:
 *       200:
 *         description: Returns message.
 *       400:
 *          description: error in parameters provided
*/

// @desc    Create a new infosessions by import
// @route   POST /api/setups/infosessions/import
// @access  Private
router.post('/import', async (req, res) => {

    let resMsg = { Type: "", Message: "", Body: {} }
    resMsg.Type = "error"
    resMsg.Message = ``

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'acquisition-officer') {
        resMsg.Message = "Only acquisition officer can create record"
        return res.status(400).json(resMsg);
    }
    if (!req.body.marketId || req.body.marketId < 0) {
        resMsg.Message = "Market is not provided"
        return res.status(400).json(resMsg);
    }

    if (!req.body.infosessions || req.body.infosessions.length == 0) {
        resMsg.Message = "please provide import list"
        return res.status(400).json(resMsg);
    }


    let existingRecordList = {}

    try {
        const sqlQuery = "select lower(surname) as surname, email, mobile, id from infosessions where marketid = $1 order by surname";
        let result = await pgsql.query(sqlQuery, [req.body.marketId])
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
    let importedList = req.body.infosessions

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
                    marketId: req.body.marketId,
                    invitedate: null,
                    attendedate: null,
                    countryId: jwtToken.countryId
                }
                importedRecords++
                sqlTableInsert("infosessions", infosessions, newRecord, jwtToken).then(() => {
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
 * /api/setups/infosessions:
 *   post:
 *     description: Create info session Route
 *     tags: [Driver Info Session]
 *     parameters:
 *     - name: marketid
 *       description: registered market id
 *       in: formData
 *       required: true
 *       type: integer
 *     - name: surname
 *       description: prospect surname
 *       in: formData
 *       required: true
 *       type: string
 *     - name: firstname
 *       description: prospect firstname
 *       in: formData
 *       required: true
 *       type: string
 *     - name: middlename
 *       description: prospect middlename
 *       in: formData
 *       required: false
 *       type: string
 *     - name: mobile
 *       description: prospect mobile
 *       in: formData
 *       required: true
 *       type: string
 *     - name: email
 *       description: prospect email
 *       in: formData
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns infosessions id.
 *       400:
 *          description: error in parameters provided
*/

// @desc    Create a new infosession
// @route   POST /api/setups/infosessions
// @access  Private
router.post('/', async (req, res) => {

    let resMsg = { Type: "", Message: "", Body: {} }
    resMsg.Type = "error"
    resMsg.Message = ``
    let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
    if (req.body.countryId > 0 && (jwtPayload.countryId == undefined || jwtPayload.countryId == 0)) {
        jwtPayload.countryId = req.body.countryId
    }

    if (jwtPayload.role !== 'acquisition-officer') {
        resMsg.Message = "Only acquisition officer can create record"
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
        const sqlQuery = "select * from infosessions where surname = $1 and email = $2 and mobile = $3";
        let result = await pgsql.query(sqlQuery, [req.body.surname, req.body.email, req.body.mobile])
        if (result.rowCount > 0) {
            resMsg.Message = "Duplicates email, Surname and Phone Number are not allowed"
            return res.status(400).json(resMsg);
        }
    } catch (error) {
        console.log(error)
    }

    try {
        const sqlQuery = "select * from markets where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.marketId])
        if (result.rowCount == 0) {
            resMsg.Message = "Invalid Product selected"
            return res.status(400).json(resMsg);
        }
    } catch (error) {
        console.log(error)
    }

    // delete req.body['I'];

    req.body.status = "pending";


    req.body.invitedate = null
    req.body.attendedate = null

    sqlTableInsert("infosessions", infosessions, req.body, jwtPayload).then((result) => {
        resMsg.Message = `Info Session created for ${req.body.surname + ' ' + req.body.firstname}`
        resMsg.Type = "success"
        resMsg.Body = infosessions.id
        return res.json(resMsg);
    })
});

/**
 * @swagger
 * /api/setups/infosessions:
 *   put:
 *     description: Create Driver info session Route
 *     tags: [Driver Info Session]
 *     parameters:
 *     - name: id
 *       description: registered info session id
 *       in: formData
 *       required: true
 *       type: integer
 *     - name: marketid
 *       description: registered market id
 *       in: formData
 *       required: false
 *       type: integer
 *     - name: surname
 *       description: prospect surname
 *       in: formData
 *       required: false
 *       type: string
 *     - name: firstname
 *       description: prospect firstname
 *       in: formData
 *       required: false
 *       type: string
 *     - name: middlename
 *       description: prospect middlename
 *       in: formData
 *       required: false
 *       type: string
 *     - name: mobile
 *       description: prospect mobile
 *       in: formData
 *       required: false
 *       type: string
 *     - name: email
 *       description: prospect email
 *       in: formData
 *       required: false
 *       type: string
 *     responses:
 *       200:
 *         description: Returns updated infosessions id.
 *       400:
 *          description: error in parameters provided
*/

// @desc    Update driver info session
// @route   PUT /api/setups/infosessions
// @access  Private
router.put('/', async (req, res) => {

    let resMsg = { Type: "error", Message: "", Body: {} }
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    // if (jwtToken.role !== 'acquisition-officer') {
    //     resMsg.Message = "Only acquisition officer can update record"
    //     return res.status(400).json(resMsg);
    // }

    if (!req.body.id || req.body.id == 0) {
        resMsg.Message = "id is required"
        return res.status(400).json(resMsg);
    }

    // if(!req.body.productid || req.body.productid == 0) {
    //     resMsg.Message = "product is required"
    //     return res.status(400).json(resMsg);
    // }

    // if (!req.body.marketId || req.body.marketId == 0) {
    //     resMsg.Message = "market is required"
    //     return res.status(400).json(resMsg);
    // }


    let fieldsToUpdate = {}
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
        const sqlQuery = "select * from infosessions where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.id])
        if (result.rowCount == 0) {
            resMsg.Message = "No matching record found"
            return res.status(400).json(resMsg);
        } else {
            let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
            if (fieldsToUpdate.countryId !== undefined && fieldsToUpdate.countryId !== null) {
                jwtPayload.countryId = fieldsToUpdate.countryId
            }

            sqlTableUpdate("infosessions", infosessions, fieldsToUpdate, jwtPayload).then((result) => {
                resMsg.Message = `Info Session updated`
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
 * /api/setups/infosessions/export:
 *    get:
 *      description: Export All Info Session record in the signed in user's country
 *      tags: [Driver Info Session]
 *      responses:
 *        200:
 *          description: Returns csv file of Info Session
 *        400:
 *          description: no records found to export 
 * 
*/

router.get('/export', async (req, res) => {
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let searchtext = "%"
    if (req.query.text) {
        searchtext = `%${req.query.text}%`
    }

    let exportHeaders = ["#", "FirstName", "Surname", "Mobile", "Email", "Market", "Mode", "Status", "Invited Date", "Attended Date", "Created Date", "Createdby"]
    let exportDriversList = []
    exportDriversList.push('"' + exportHeaders.join('", "') + '"')


    let sqlQuery = " select info.firstname, info.surname, info.mobile, info.email, info.mode, "
    sqlQuery += " COALESCE(m.name,'') as market, "

    sqlQuery += "  info.status, info.invitedate, info.attendedate, "
    sqlQuery += " info.createdate as createdate , concat(COALESCE(users.firstname,' '),' ',COALESCE(users.surname,' ')) as createdby from infosessions as info "


    sqlQuery += " left join markets as m on m.id = info.marketid "
    sqlQuery += " left join users on users.id = info.createdby "

    sqlQuery += " where info.countryid = $1 and  ";
    sqlQuery += " (lower(m.name) like lower($2) or lower(info.surname) like lower($2)) order by info.surname desc";

    try {
        let result = await pgsql.query(sqlQuery, [jwtToken.countryId, searchtext])

        result.rows.forEach(function (invite, index) {
            let exportRecord = [index + 1,
            invite.firstname, invite.surname, invite.mobile, invite.email,
            invite.market, invite.mode, invite.status, invite.invitedate, invite.attendedate, invite.createdate, invite.createdby
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
        "Content-Disposition": "inline;filename=infosessions-export" + todayDate + "-file.csv",
        'Content-Type': "text/csv",
        'Content-Length': Buffer.byteLength(csvFile, 'utf8'),
    });
    res.write(csvFile)
    res.end();

});

router.post('/:id/updatestatus', async (req, res) => {
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    let resMsg = { Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let status = req.body.status.toLowerCase()

    const sqlQueryName = "select * from infosessions where infosessions.id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find info session with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `Info Session with id : ${resultName.rows[0].id} has been updated to ${req.body.status}`

    if (status != 'no show') {
        let date = new Date().toUTCString();
        const sqlQuery = `update infosessions set status = '${status}', attendedate = '${date}' where id = $1`;
        let result = await pgsql.query(sqlQuery, [req.params.id])
        if (result.rowCount > 0) {
            if (status == 'attended and interested') {
                await Handler.sendAttendedAndInterestedEmail(resultName.rows[0], jwtToken)
            }
            return res.json(resMsg);
        } else {
            resMsg.Type = "error"
            resMsg.Message = `Unable to update info session [${resultName.rows[0].id}]`
            return res.status(400).json(resMsg);
        }

    } else {
        const sqlQuery = `update infosessions set status = '${status}' where id = $1`;
        let result = await pgsql.query(sqlQuery, [req.params.id])
        if (result.rowCount > 0) {
            return res.json(resMsg);
        } else {
            resMsg.Type = "error"
            resMsg.Message = `Unable to update info session [${resultName.rows[0].id}]`
            return res.status(400).json(resMsg);
        }

    }
});
export default router;