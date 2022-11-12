import express from 'express';
import { jwtVerify } from '../../config/utils.js'
import { numbersequences } from '../../dbtables/base.js';
import {pgsql, sqlTableInsert, sqlTableUpdate} from '../../dbtables/pgsql.js';

const router = express.Router();


// @desc    Search for numbersequences
// @route   POST /api/setups/numbersequences
// @access  Public
router.post('/search', async (req, res) => {
    
    let sqlParams = []
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let searchtext = "%"
    if (req.body.text !== undefined) {
        searchtext = `%${req.body.text}%`
    }
    sqlParams.push(searchtext)

    let sqlQuery = "select n.id, n.name, n.code, n.currentnumber, n.countryId, COALESCE(c.name, '') as country, n.createdate, n.status  from numbersequences as n ";
    sqlQuery += "left join countries as c on n.countryId = c.id where n.name like $1 ";


    if (jwtToken.role !== 'superadmin') {
        sqlParams.push(jwtToken.countryId)
        sqlQuery += ` and n.countryid = $${sqlParams.length}`;
    }

    sqlQuery += ` order by c.name, n.name`;

    let result = await pgsql.query(sqlQuery, sqlParams)

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "success"
    resMsg.Body = result.rows
    resMsg.Message = `found ${result.rowCount} matching number sequence(s) `

    return res.json(resMsg);
});


// @desc    Fetch a single numbersequence
// @route   GET /api/setups/numbersequences
// @access  Private
router.get('/:id/activate', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""
    
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can activate numbersequences"
        return res.status(400).json(resMsg);
    }

    const sqlQueryName = "select name from numbersequences where numbersequences.id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0 ) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find number sequence with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `number sequence: [${resultName.rows[0].name}] has been activated`

    const sqlQuery = "update numbersequences set status = 'active' where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to update number sequence [${resultName.rows[0].name}]`
        return res.status(400).json(resMsg);
    }    
});

// @desc    Fetch a single numbersequence
// @route   GET /api/setups/numbersequences
// @access  Private
router.get('/:id/deactivate', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""
    
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can activate numbersequences"
        return res.status(400).json(resMsg);
    }

    const sqlQueryName = "select name from numbersequences where numbersequences.id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0 ) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find number sequence with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `Number sequence: [${resultName.rows[0].name}] has been activated`

    const sqlQuery = "update numbersequences set status = 'inactive' where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to update number sequence [${resultName.rows[0].name}]`
        return res.status(400).json(resMsg);
    }
});


// @desc    Fetch a single numbersequence
// @route   GET /api/setups/numbersequences
// @access  Private
router.get('/:id', async (req, res) => {
    
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    let sqlQuery = "select n.id, n.name, n.code, n.currentnumber, n.description, n.createdate, n.status, "
    sqlQuery += "n.countryId, COALESCE(c.name, '') as country  from numbersequences as n ";
    sqlQuery += "left join countries as c on n.countryId = c.id where n.id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "success"
    resMsg.Body = result.rows
    resMsg.Message = `found ${result.rowCount} matching number sequence(s) `

    return res.json(resMsg);
});

// @desc    Create a new numbersequence
// @route   POST /api/setups/numbersequencesnumbersequences
// @access  Public
router.post('/', async (req, res) => {

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "error"
    resMsg.Message = ``

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Message = "Only super admin can create numbersequences"
        return res.status(400).json(resMsg);
    }

    if(req.body.id && req.body.id > 0) {
        resMsg.Message = "update not allowed via post"
        return res.status(400).json(resMsg);
    }

    if (!req.body.name || !req.body.code || !req.body.currentnumber || !req.body.countryId ) {
        resMsg.Message = "Please Fill All Fields"
        return res.status(400).json(resMsg);
    }
    req.body.code = req.body.code.trim()
    req.body.name = req.body.name.trim()

    if (req.body.code.lenght < 4) {
        resMsg.Message = "Sequence code must be more than 8 chars"
        return res.status(400).json(resMsg);
    }

    const sqlQuery = "select * from numbersequences where( name = $1 or code = $2) and countryId = $3";
    let result = await pgsql.query(sqlQuery, [req.body.name, req.body.code, req.body.countryId ])
    if (result.rowCount > 0) {
        resMsg.Message = "Duplicates are not allowed"
        return res.status(400).json(resMsg);
    }

    req.body.status = "active";
    let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
    if(req.body.countryId > 0 && (jwtPayload.countryId == undefined || jwtPayload.countryId == 0)){
        jwtPayload.countryId = req.body.countryId
    }

    sqlTableInsert("numbersequences", numbersequences, req.body, jwtPayload).then((result) => {
        //console.log("result: ", result)
        resMsg.Message = `${req.body.name} created`
        resMsg.Type = "success"
        resMsg.Body = numbersequences.id
        return res.json(resMsg);
    })

});

// @desc    Update numbersequences
// @route   PUT /api/setups/numbersequences
// @access  Public
router.put('/', async (req, res) => {
    
    let resMsg = {Type: "error", Message: "", Body: {} }
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    
    if (jwtToken.role !== 'superadmin') {
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

    if(req.body.currentnumber !== undefined) {
        fieldsToUpdate["currentnumber"] = req.body.currentnumber
    }

    if(req.body.status !== undefined) {
        fieldsToUpdate["status"] = req.body.status
    }

    if(req.body.countryId !== undefined) {
        fieldsToUpdate["countryId"] = req.body.countryId
    }

    fieldsToUpdate["id"] = req.body.id

    try {
        const sqlQuery = "select * from numbersequences where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.id ])
        if (result.rowCount == 0) {
            resMsg.Message = "No matching record found"
            return res.status(400).json(resMsg);
        } else {
            let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
            if(fieldsToUpdate.countryId !== undefined && fieldsToUpdate.countryId !== null){
                jwtPayload.countryId = fieldsToUpdate.countryId
            }

            sqlTableUpdate("numbersequences", numbersequences, fieldsToUpdate, jwtPayload).then((result) => {
                resMsg.Message = `Number sequence updated`
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



export default router;