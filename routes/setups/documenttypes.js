import express from 'express';
import { jwtVerify } from '../../config/utils.js'
import { documenttypes } from '../../dbtables/base.js';
import {pgsql, sqlTableInsert, sqlTableUpdate} from '../../dbtables/pgsql.js';

const router = express.Router();


// @desc    Search for documenttypes
// @route   POST /api/setups/documenttypes
// @access  Public
router.post('/search', async (req, res) => {
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let searchtext = ""

    if (req.body.text !== undefined) {
        searchtext = `%${req.body.text}%`
    }

    let resMsg = {Type: "", Message: "", Body: {} }
    let sqlQuery = "select dt.id, dt.name, dt.code, dt.category, dt.position, dt.isrequired, dt.countryId, COALESCE(c.name, '') as country, ";
    sqlQuery += "dt.createdate, dt.status  from documenttypes as dt ";
    sqlQuery += "left join countries as c on dt.countryId = c.id where ";


    
    let sqlParams = []
    if (jwtToken.role !== 'superadmin') {
        sqlParams.push(jwtToken.countryId)
        sqlQuery += ` dt.countryid = $${sqlParams.length} and `;
    }

    if (req.body.category !== undefined) {
        sqlParams.push(req.body.category)
        sqlQuery += ` dt.category = $${sqlParams.length} and `;
    }
   
    if (req.body.status !== undefined) {
        sqlParams.push(req.body.status)
        sqlQuery += ` dt.status = $${sqlParams.length} and `;
    }


    sqlParams.push(searchtext)
    sqlQuery += ` (lower(dt.name) like lower($${sqlParams.length}) or dt.category like $${sqlParams.length} or lower(c.name) like lower($${sqlParams.length}) )  order by dt.position, dt.name`;
    
    let result = await pgsql.query(sqlQuery, sqlParams)

    resMsg.Type = "success"
    resMsg.Body = result.rows
    resMsg.Message = `found ${result.rowCount} matching document type(s) `

    return res.json(resMsg);

});

// @desc    Fetch a single documenttype
// @route   GET /api/setups/documenttypes
// @access  Private
router.get('/:id/activate', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can activate documenttypes"
        return res.status(400).json(resMsg);
    }

    const sqlQueryName = "select name from documenttypes where id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0 ) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find bank with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `Document Type: [${resultName.rows[0].name}] has been activated`

    const sqlQuery = "update documenttypes set status = 'active' where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to update documenttype [${resultName.rows[0].name}]`
        return res.status(400).json(resMsg);
    }
});

// @desc    Fetch a single documenttype
// @route   GET /api/setups/documenttypes
// @access  Private
router.get('/:id/deactivate', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can deactivate documenttypes"
        return res.status(400).json(resMsg);
    }

    const sqlQueryName = "select name from documenttypes where id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0 ) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find bank with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `Document Type: [${resultName.rows[0].name}] has been deactivated`

    const sqlQuery = "update documenttypes set status = 'inactive' where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to update documenttype [${resultName.rows[0].name}]`
        return res.status(400).json(resMsg);
    }
});


// @desc    Fetch a single documenttype
// @route   GET /api/setups/documenttypes
// @access  Private
router.get('/:id', async (req, res) => {

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    let sqlQuery = "select dt.id, dt.name, dt.code, dt.category, dt.position, dt.isrequired, dt.countryId, COALESCE(c.name, '') as country, "
    sqlQuery += "dt.createdate, dt.status  from documenttypes as dt ";
    sqlQuery += "left join countries as c on dt.countryId = c.id where b.id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "success"
    resMsg.Body = result.rows
    resMsg.Message = `found ${result.rowCount} matching document type(s) `

    return res.json(resMsg);
});


// @desc    Create a new documenttype
// @route   POST /api/setups/documenttypesdocumenttypes
// @access  Public
router.post('/', async (req, res) => {

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "error"
    resMsg.Message = ``

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Message = "Only super admin can create documenttypes"
        return res.status(400).json(resMsg);
    }

    if(req.body.id && req.body.id > 0) {
        resMsg.Message = "update not allowed via post"
        return res.status(400).json(resMsg);
    }

    if (!req.body.name || !req.body.category || !req.body.countryId ) {
        resMsg.Message = "Please Fill All Fields"
        return res.status(400).json(resMsg);
    }
    req.body.name = req.body.name.trim()
    req.body.category = req.body.category.trim()


    try {
        const sqlQuery = "select * from documenttypes where name = $1 and countryid = $2";
        let result = await pgsql.query(sqlQuery, [req.body.name, req.body.countryId ])
        if (result.rowCount > 0) {
            resMsg.Message = "Duplicates are not allowed"
            return res.status(400).json(resMsg);
        }
    } catch (error) {
        console.log(error)
    }

    req.body.status = "active";
    let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
    if(req.body.countryId > 0 && (jwtPayload.countryId == undefined || jwtPayload.countryId == 0)){
        jwtPayload.countryId = req.body.countryId
    }
    sqlTableInsert("documenttypes", documenttypes, req.body, jwtPayload).then((result) => {
        //console.log("result: ", result)
        resMsg.Message = `${req.body.name} created`
        resMsg.Type = "success"
        resMsg.Body = documenttypes.id
        return res.json(resMsg);
    })

});

// @desc    Update documenttypes
// @route   PUT /api/setups/documenttypes
// @access  Public
router.put('/', async (req, res) => {
    
    let resMsg = {Type: "error", Message: "", Body: {} }
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    
    if (jwtToken.role !== 'superadmin') {
        resMsg.Message = "Only super admin can update document types"
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

    if(req.body.category !== undefined) {
        fieldsToUpdate["category"] = req.body.category
    }

    if(req.body.position !== undefined) {
        fieldsToUpdate["position"] = req.body.position
    }
     
    if(req.body.isrequired !== undefined) {
        fieldsToUpdate["isrequired"] = req.body.isrequired
    }

    if(req.body.status !== undefined) {
        fieldsToUpdate["status"] = req.body.status
    }

    if(req.body.countryId !== undefined) {
        fieldsToUpdate["countryId"] = req.body.countryId
    }

    fieldsToUpdate["id"] = req.body.id

    try {
        const sqlQuery = "select * from documenttypes where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.id ])
        if (result.rowCount == 0) {
            resMsg.Message = "No matching record found"
            return res.status(400).json(resMsg);
        } else {
            let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
            if(fieldsToUpdate.countryId !== undefined && fieldsToUpdate.countryId !== null){
                jwtPayload.countryId = fieldsToUpdate.countryId
            }

            sqlTableUpdate("documenttypes", documenttypes, fieldsToUpdate, jwtPayload).then((result) => {
                resMsg.Message = `Document type updated`
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