import express from 'express';
import {pgsql, sqlTableInsert, sqlTableUpdate} from '../../dbtables/pgsql.js';
import { jwtVerify } from '../../config/utils.js'
import { markets } from '../../dbtables/base.js';

const router = express.Router();


// @desc    Search for markets
// @route   POST /api/setups/markets
// @access  Public
router.post('/search/public', async (req, res) => {
    
    let sqlParams = []

    let searchtext = "%"
    if (req.body.text !== undefined) {
        searchtext = `%${req.body.text}%`
    }
    sqlParams.push(searchtext)

    let sqlQuery = "select m.id, m.name, m.countryId, COALESCE(c.name, '') as country, m.createdate, m.status  from markets as m ";
    sqlQuery += "left join countries as c on m.countryId = c.id where m.name like $1 ";
    
    if (req.body.countryId !== undefined) {
        sqlParams.push(req.body.countryId)
        sqlQuery += ` and m.countryid = $${sqlParams.length}`;
    }

    sqlQuery += ` order by c.name, m.name`;

    let result = await pgsql.query(sqlQuery, sqlParams)

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "success"
    resMsg.Body = result.rows
    resMsg.Message = `found ${result.rowCount} matching market(s) `

    return res.json(resMsg);
});

// @desc    Search for markets
// @route   POST /api/setups/markets
// @access  Public
router.post('/search', async (req, res) => {
    
    let sqlParams = []
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let searchtext = "%"
    if (req.body.text !== undefined) {
        searchtext = `%${req.body.text}%`
    }
    sqlParams.push(searchtext)

    let sqlQuery = "select m.id, m.name, m.countryId, COALESCE(c.name, '') as country, m.createdate, m.status  from markets as m ";
    sqlQuery += "left join countries as c on m.countryId = c.id where m.name like $1 ";
    
    if (jwtToken.role !== 'superadmin') {
        sqlParams.push(jwtToken.countryId)
        sqlQuery += ` and m.countryid = $${sqlParams.length}`;
    }

    sqlQuery += ` order by c.name, m.name`;

    let result = await pgsql.query(sqlQuery, sqlParams)

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "success"
    resMsg.Body = result.rows
    resMsg.Message = `found ${result.rowCount} matching market(s) `

    return res.json(resMsg);
});


// @desc    Fetch a single market
// @route   GET /api/setups/markets
// @access  Private
router.get('/:id/activate', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can activate markets"
        return res.status(400).json(resMsg);
    }

    const sqlQueryName = "select name from markets where markets.id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0 ) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find market with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `Market: [${resultName.rows[0].name}] has been activated`

    const sqlQuery = "update markets set status = 'active' where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to update market [${resultName.rows[0].name}]`
        return res.status(400).json(resMsg);
    }
});

// @desc    Fetch a single market
// @route   GET /api/setups/markets
// @access  Private
router.get('/:id/deactivate', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can deactivate markets"
        return res.status(400).json(resMsg);
    }

    const sqlQueryName = "select name from markets where markets.id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0 ) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find market with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `Market: [${resultName.rows[0].name}] has been deactivated`

    const sqlQuery = "update markets set status = 'inactive' where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to update market [${resultName.rows[0].name}]`
        return res.status(400).json(resMsg);
    }
});


// @desc    Fetch a single market
// @route   GET /api/setups/markets
// @access  Private
router.get('/:id', async (req, res) => {
    
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    let sqlQuery = "select m.id, m.name, m.countryId, COALESCE(c.name, '') as country, m.createdate, m.status, "
    sqlQuery += "from markets as m  ";
    sqlQuery += "left join countries as c on m.countryId = c.id where m.id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "success"
    resMsg.Body = result.rows
    resMsg.Message = `found ${result.rowCount} matching market(s) `

    return res.json(resMsg);
});

// @desc    Create a new country
// @route   POST /api/setups/markets
// @access  Public
router.post('/', async (req, res) => {

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "error"
    resMsg.Message = ``

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Message = "Only super admin can create markets"
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
  
    try {
        const sqlQuery = "select * from markets where name = $1 and countryid = $2";
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
    
    sqlTableInsert("markets", markets, req.body, jwtPayload).then((result) => {
        resMsg.Message = `${req.body.name} created`
        resMsg.Type = "success"
        resMsg.Body = markets.id
        return res.json(resMsg);
    })

});

// @desc    Update markets
// @route   PUT /api/setups/markets
// @access  Public
router.put('/', async (req, res) => {
    
    let resMsg = {Type: "error", Message: "", Body: {} }
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    
    if (jwtToken.role !== 'superadmin') {
        resMsg.Message = "Only super admin can update  record"
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
        const sqlQuery = "select * from markets where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.id ])
        if (result.rowCount == 0) {
            resMsg.Message = "No matching record found"
            return res.status(400).json(resMsg);
        } else {
            let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
            if(fieldsToUpdate.countryId !== undefined && fieldsToUpdate.countryId !== null){
                jwtPayload.countryId = fieldsToUpdate.countryId
            }

            sqlTableUpdate("markets", markets, fieldsToUpdate, jwtPayload).then((result) => {
                resMsg.Message = `Market updated`
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