import express from 'express';
import {pgsql, sqlTableInsert, sqlTableUpdate} from '../../dbtables/pgsql.js';
import { jwtVerify } from '../../config/utils.js'
import { planpartners } from '../../dbtables/base.js';

const router = express.Router();


// @desc    Search for planpartners
// @route   POST /api/setups/planpartners
// @access  Public
router.post('/search', async (req, res) => {
    
    let sqlParams = []
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let searchtext = "%"
    if (req.body.text !== undefined) {
        searchtext = `%${req.body.text}%`
    }
    sqlParams.push(searchtext)


    let sqlQuery = "select pp.id, pp.name, pp.marketId, pp.type, pp.countryId, ";
    sqlQuery += " pp.createdate, pp.status, COALESCE(c.name, '') as country from planpartners as pp ";
    sqlQuery += "left join countries as c on pp.countryId = c.id ";
    sqlQuery += "left join markets as m on pp.marketId = m.id where pp.name like $1 or m.name like $1 ";
    
    if (jwtToken.role !== 'superadmin') {
        sqlParams.push(jwtToken.countryId)
        sqlQuery += ` and pp.countryid = $${sqlParams.length}`;
    }

    if (req.body.status !== undefined) {
        sqlParams.push(req.body.status)
        sqlQuery += ` and lower(pp.status) = lower($${sqlParams.length}) and lower(p.status) = lower($${sqlParams.length})`;
    }

    
    sqlQuery += ` order by pp.name`;

    let resMsg = {Type: "", Message: "", Body: {} }
    try {

        let result = await pgsql.query(sqlQuery, sqlParams)
        
        resMsg.Type = "success"
        resMsg.Body = result.rows
        resMsg.Message = `found ${result.rowCount} matching Partners(s) `
        return res.json(resMsg);

    } catch(error) {
        console.log(error)
        console.log(sqlQuery)
        resMsg.Message = `search error`
        return res.status(400).json(resMsg)
    }


});


// @desc    Fetch a single planpartner
// @route   GET /api/setups/planpartners
// @access  Private
router.get('/:id/activate', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can activate planpartners"
        return res.status(400).json(resMsg);
    }

    const sqlQueryName = "select name from planpartners where planpartners.id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0 ) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find planpartner with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `planpartner: [${resultName.rows[0].name}] has been activated`

    const sqlQuery = "update planpartners set status = 'active' where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to update planpartner [${resultName.rows[0].name}]`
        return res.status(400).json(resMsg);
    }
});

// @desc    Fetch a single planpartner
// @route   GET /api/setups/planpartners
// @access  Private
router.get('/:id/deactivate', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can deactivate planpartners"
        return res.status(400).json(resMsg);
    }

    const sqlQueryName = "select name from planpartners where planpartners.id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0 ) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find planpartner with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `planpartner: [${resultName.rows[0].name}] has been deactivated`

    const sqlQuery = "update planpartners set status = 'inactive' where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to update planpartner [${resultName.rows[0].name}]`
        return res.status(400).json(resMsg);
    }
});

router.get('/:id/delete', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    // if (!isSuperUser(jwtToken.role)) {
    //     resMsg.Type = "error"
    //     resMsg.Message = "Only super admin can deactivate planpartners"
    //     return res.status(400).json(resMsg);
    // }

    const sqlQueryName = "select id from planpartners where planpartners.id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0 ) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find planpartner with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `planpartner has been deleted`

    const sqlQuery = "delete from planpartners where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to delete planpartner`
        return res.status(400).json(resMsg);
    }
});

// @desc    Fetch a single planpartner
// @route   GET /api/setups/planpartners
// @access  Private
router.get('/:id', async (req, res) => {
    
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    let sqlQuery = "select pp.id, pp.name, pp.type, pp.countryId, COALESCE(c.name, '') as country, pp.createdate, pp.status "
    sqlQuery += "from planpartners as pp  ";
    sqlQuery += "left join countries as c on pp.countryId = c.id where pp.id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "success"
    resMsg.Body = result.rows
    resMsg.Message = `found ${result.rowCount} matching partner(s) `

    return res.json(resMsg);
});

// @desc    Create a new planpartner
// @route   POST /api/setups/planpartners
// @access  Private
router.post('/', async (req, res) => {

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "error"
    resMsg.Message = ``

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (
        jwtToken.role !== 'superadmin' && jwtToken.role !== 'onboarding-officer' && 
        jwtToken.role !== 'onboarding-manager' && 
        jwtToken.role !== 'verification-officer' && 
        jwtToken.role !== 'channel-manager' && 
        jwtToken.role !== 'country-manager'
    ) {
        resMsg.Message = "You have no permission to create planpartners"
        return res.status(400).json(resMsg);
    }

    if(req.body.id && req.body.id > 0) {
        resMsg.Message = "update not allowed via post"
        return res.status(400).json(resMsg);
    }

    if (!req.body.name || !req.body.type ) {
        resMsg.Message = "Please Fill All Fields"
        return res.status(400).json(resMsg);
    }
    req.body.name = req.body.name.trim()
  
    try {
        const sqlQuery = "select * from planpartners where name = $1 and type = $2";
        let result = await pgsql.query(sqlQuery, [req.body.name, req.body.type ])
        if (result.rowCount > 0) {
            resMsg.Message = "Duplicates are not allowed"
            return res.status(400).json(resMsg);
        }
    } catch (error) {
        console.log(error)
    }

    // req.body.status = "active";
    let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
    // if(req.body.countryId > 0 && (jwtPayload.countryId == undefined || jwtPayload.countryId == 0)){
    //     jwtPayload.countryId = req.body.countryId
    // }
    
    sqlTableInsert("planpartners", planpartners, req.body, jwtPayload).then((result) => {
        resMsg.Message = `Partner ${req.body.name} created`
        resMsg.Type = "success"
        resMsg.Body = req.body
        return res.json(resMsg);
    })

});

// @desc    Update planpartners
// @route   PUT /api/setups/planpartners
// @access  Private
router.put('/', async (req, res) => {
    
    let resMsg = {Type: "error", Message: "", Body: {} }
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    
    if (
        jwtToken.role !== 'superadmin' && jwtToken.role !== 'onboarding-officer' && 
        jwtToken.role !== 'onboarding-manager' && 
        jwtToken.role !== 'verification-officer' && 
        jwtToken.role !== 'channel-manager' && 
        jwtToken.role !== 'country-manager'
    ){
        resMsg.Message = "You have no permission to update record"
        return res.status(400).json(resMsg);
    }

    if(!req.body.id || req.body.id == 0) {
        resMsg.Message = "id is required"
        return res.status(400).json(resMsg);
    }
   

    let fieldsToUpdate = {}

    if(req.body.name !== undefined) {
        fieldsToUpdate["name"] = req.body.name
    }

    if(req.body.type !== undefined) {
        fieldsToUpdate["type"] = req.body.type
    }

    fieldsToUpdate["id"] = req.body.id

    try {
        const sqlQuery = "select * from planpartners where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.id ])
        if (result.rowCount == 0) {
            resMsg.Message = "No matching record found"
            return res.status(400).json(resMsg);
        } else {
            let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
            if(fieldsToUpdate.countryId !== undefined && fieldsToUpdate.countryId !== null){
                jwtPayload.countryId = fieldsToUpdate.countryId
            }

            sqlTableUpdate("planpartners", planpartners, fieldsToUpdate, jwtPayload).then((result) => {
                resMsg.Message = `partner updated`
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