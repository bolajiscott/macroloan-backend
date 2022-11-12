import express from 'express';
import {pgsql, sqlTableInsert, sqlTableUpdate} from '../../dbtables/pgsql.js';
import { jwtVerify, isSuperUser } from '../../config/utils.js'
import { regionstates } from '../../dbtables/base.js';


const router = express.Router();


// @desc    Search for regionstates
// @route   POST /api/regionstates
// @access  Public
router.post('/search', async (req, res) => {
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let searchtext = ""
    if (req.body.text !== undefined) {
        searchtext = `%${req.body.text}%`
    }

    let resMsg = {Type: "", Message: "", Body: {} }
    let sqlQuery = "select r.id, r.name, r.countryId, COALESCE(c.name, '') as country, r.createdate, r.status  from regionstates as r ";
    sqlQuery += "left join countries as c on r.countryId = c.id where "

    let sqlParams = []
    if (jwtToken.role !== 'superadmin') {
        sqlParams.push(jwtToken.countryId)
        sqlQuery += ` r.countryid = $${sqlParams.length} and `;
    }
    sqlParams.push(searchtext)
    sqlQuery += ` (lower(r.name) like lower($${sqlParams.length}) or lower(c.name) like lower($${sqlParams.length})) order by c.name, r.name  limit 50`;
    
    try {
        let result = await pgsql.query(sqlQuery, sqlParams)
        resMsg.Type = "success"
        resMsg.Body = result.rows
        resMsg.Message = `found ${result.rowCount} matching region/state(s) `
        return res.json(resMsg);

    } catch(error) {
        resMsg.Type = "error"
        resMsg.Message = `unable to retrieve records`
        return res.status(400).json(resMsg);
    }

});


// @desc    Fetch a single regionstate
// @route   GET /api/regionstates
// @access  Private
router.get('/:id/activate', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (!isSuperUser(jwtToken.role)) {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can activate regionstates"
        return res.status(400).json(resMsg);
    }

    
    try {
        const sqlQueryName = "select name from regionstates where regionstates.id = $1";
        let resultName = await pgsql.query(sqlQueryName, [req.params.id])
        if (resultName.rows == 0 ) {
            resMsg.Type = "error"
            resMsg.Message = `Unable to find region/state with id [${req.params.id}]`
            return res.status(400).json(resMsg);
        } else {
            resMsg.Message = `Region/State: [${resultName.rows[0].name}] has been activated`

            try {
                const sqlQuery = "update regionstates set status = 'active' where id = $1";
                let result = await pgsql.query(sqlQuery, [req.params.id])
                if (result.rowCount > 0) {
                    return res.json(resMsg);
                } else {
                    resMsg.Type = "error"
                    resMsg.Message = `Unable to update region/state [${resultName.rows[0].name}]`
                    return res.status(400).json(resMsg);
                }
            } catch(error) {
                resMsg.Type = "error"
                resMsg.Message = `unable to retrieve records`
                return res.status(400).json(resMsg);
            }
        }
    } catch(error) {
        resMsg.Type = "error"
        resMsg.Message = `unable to retrieve records`
        return res.status(400).json(resMsg);
    }
});

// @desc    Fetch a single regionstate
// @route   GET /api/regionstates
// @access  Private
router.get('/:id/deactivate', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (!isSuperUser(jwtToken.role)) {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can deactivate regionstates"
        return res.status(400).json(resMsg);
    }

    try {
        const sqlQueryName = "select name from regionstates where regionstates.id = $1";
        let resultName = await pgsql.query(sqlQueryName, [req.params.id])
        if (resultName.rows == 0 ) {
            resMsg.Type = "error"
            resMsg.Message = `Unable to find region/state with id [${req.params.id}]`
            return res.status(400).json(resMsg);
        } else {
            resMsg.Message = `Region/State: [${resultName.rows[0].name}] has been deactivated`

            try {
                const sqlQuery = "update regionstates set status = 'inactive' where id = $1";
                let result = await pgsql.query(sqlQuery, [req.params.id])
                if (result.rowCount > 0) {
                    return res.json(resMsg);
                } else {
                    resMsg.Type = "error"
                    resMsg.Message = `Unable to update region/state [${resultName.rows[0].name}]`
                    return res.status(400).json(resMsg);
                }
            } catch(error) {
                resMsg.Type = "error"
                resMsg.Message = `unable to retrieve records`
                return res.status(400).json(resMsg);
            }
        }
    } catch(error) {
        resMsg.Type = "error"
        resMsg.Message = `unable to retrieve records`
        return res.status(400).json(resMsg);
    }
});


// @desc    Fetch a single regionstate
// @route   GET /api/regionstates
// @access  Private
router.get('/:id', async (req, res) => {
    
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    let sqlQuery = "select r.id, r.name, r.countryId, COALESCE(c.name, '') as country, r.createdate, r.status ";
    sqlQuery += "from regionstates as r ";
    sqlQuery += "left join countries as c on r.countryId = c.id where r.id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "success"
    resMsg.Body = result.rows
    resMsg.Message = `found ${result.rowCount} matching region/state(s) `

    return res.json(resMsg);
});

// @desc    Create a new country
// @route   POST /api/regionstates
// @access  Public
router.post('/', async (req, res) => {

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "error"
    resMsg.Message = ``

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (!isSuperUser(jwtToken.role)) {
        resMsg.Message = "Only super admin can create regionstates"
        return res.status(400).json(resMsg);
    }

    if(req.body.id && req.body.id > 0) {
        resMsg.Message = "update not allowed via post"
        return res.status(400).json(resMsg);
    }

    if (!req.body.name || !req.body.countryId ) {
        resMsg.Message = "Please Fill All Fields"
        return res.status(400).json(resMsg);
    }
    req.body.name = req.body.name.trim()

    const sqlQuery = "select * from regionstates where name = $1 and countryid = $2";
    let result = await pgsql.query(sqlQuery, [req.body.name, req.body.countryId ])
    if (result.rowCount > 0) {
        resMsg.Message = "Duplicates are not allowed"
        return res.status(400).json(resMsg);
    }

    req.body.status = "active";
    let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
    if(req.body.countryId > 0 && (jwtPayload.countryId == undefined || jwtPayload.countryId == 0)){
        jwtPayload.countryId = req.body.countryId
    }

    sqlTableInsert("regionstates", regionstates, req.body, jwtPayload).then((result) => {
        resMsg.Message = `${req.body.name} created`
        resMsg.Type = "success"
        resMsg.Body = req.body.id
        return res.json(resMsg);
    })

});

// @desc    Update regionstates
// @route   PUT /api/regionstates
// @access  Public
router.put('/', async (req, res) => {
    
    let resMsg = {Type: "error", Message: "", Body: {} }
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    
    if (!isSuperUser(jwtToken.role)) {
        resMsg.Message = "Only super admin can update number sequences"
        return res.status(400).json(resMsg);
    }

    if(!req.body.id || req.body.id == 0) {
        resMsg.Message = "id is required"
        return res.status(400).json(resMsg);
    }
   

    let fieldsToUpdate = {}
    if(req.body.code !== undefined) {
        fieldsToUpdate["code"] = req.body.code
    }
    
    if(req.body.name !== undefined) {
        fieldsToUpdate["name"] = req.body.name
    }

    if(req.body.status !== undefined) {
        fieldsToUpdate["status"] = req.body.status
    }

    if(req.body.countryId !== undefined) {
        fieldsToUpdate["countryId"] = req.body.countryId
    }

    fieldsToUpdate["id"] = req.body.id

    try {
        const sqlQuery = "select * from regionstates where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.id ])
        if (result.rowCount == 0) {
            resMsg.Message = "No matching record found"
            return res.status(400).json(resMsg);
        } else {
            let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
            if(fieldsToUpdate.countryId !== undefined && fieldsToUpdate.countryId !== null){
                jwtPayload.countryId = fieldsToUpdate.countryId
            }

            sqlTableUpdate("regionstates", regionstates, fieldsToUpdate, jwtPayload).then((result) => {
                resMsg.Message = `Region/State updated`
                resMsg.Type = "success"
                resMsg.Body = fieldsToUpdate.id
                return res.json(resMsg);
            })
        }
    } catch(error) {
        resMsg.Type = "error"
        resMsg.Message = `unable to retrieve records`
        console.log(error)
        return res.status(400).json(resMsg);
    }
    
});


// @desc    Create a new country
// @route   POST /api/regionstates/import
// @access  Public
router.post('/import', async (req, res) => {

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "error"
    resMsg.Message = ``

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    if (!isSuperUser(jwtToken.role)) {
        resMsg.Message = "Only super admins can import regionstates"
        return res.status(400).json(resMsg);
    }

    
    if(!req.body.countryId || req.body.countryId == 0) {
        resMsg.Message = "please select a country"
        return res.status(400).json(resMsg);
    }

    if(!req.body.regionstates || req.body.regionstates.length == 0) {
        resMsg.Message = "please provide import list"
        return res.status(400).json(resMsg);
    }


    let existingRecordList = {}

    try {
        const sqlQuery = "select lower(name) as name, id from regionstates where countryid = $1 order by name";
        let result = await pgsql.query(sqlQuery, [jwtToken.countryId])
        if (result.rows !== undefined) {
            result.rows.forEach( record => {
                existingRecordList[record.name] = record
            })
        }
    } catch(error) {
        resMsg.Type = "error"
        resMsg.Message = `unable to import records`
        console.log(error)
        return res.status(400).json(resMsg);
    }

    


    let importedRecords = 0
    let duplicateRecords = 0
    let importedList = req.body.regionstates
    
    for (const record of importedList) {
        let recordArray = record.split(",")
        
        if (recordArray.length == 1) {

            
            if(existingRecordList[recordArray[0].toLowerCase()] == null ||
                existingRecordList[recordArray[0].toLowerCase()] == undefined) {
                    //create and update existing record list
                let newRecord = {
                    status: "active",
                    name: recordArray[0].trim(),
                    countryId: req.body.countryId,
                }

                importedRecords++
                existingRecordList[newRecord.name.toLowerCase()] = {name:newRecord.name.toLowerCase()}
                sqlTableInsert("regionstates", regionstates, newRecord, jwtToken).then(() => {
                })
                await new Promise(r => setTimeout(r, 5));
            } else {
                duplicateRecords++
            }
        } else {
            duplicateRecords++
        }
    }


    resMsg.Message = `${importedRecords} records imported, ${duplicateRecords} duplicates ignored`
    if (duplicateRecords == 0) {
        resMsg.Type = "success"
        return res.json(resMsg);
    }
    return res.status(400).json(resMsg);

});

export default router;