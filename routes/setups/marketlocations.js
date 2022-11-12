import express from 'express';
import {pgsql, sqlTableInsert, sqlTableUpdate} from '../../dbtables/pgsql.js';
import { jwtVerify } from '../../config/utils.js'
import { marketlocations } from '../../dbtables/base.js';

const router = express.Router();


// @desc    Search for marketlocations
// @route   POST /api/setups/marketlocations
// @access  Public
router.post('/search', async (req, res) => {
    
    let sqlParams = []
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let searchtext = "%"
    if (req.body.text !== undefined) {
        searchtext = `%${req.body.text}%`
    }
    sqlParams.push(searchtext)

    let sqlQuery = "select ml.id, ml.name, ml.address, ml.marketId, ml.countryId, ml.status, ";
    sqlQuery += " COALESCE(m.name, '') as market, COALESCE(c.name, '') as country from marketlocations as ml ";
    sqlQuery += "left join countries as c on ml.countryId = c.id ";
    sqlQuery += "left join markets as m on ml.marketId = m.id where ml.name like $1 ";
    
    if (jwtToken.role !== 'superadmin') {
        sqlParams.push(jwtToken.countryId)
        sqlQuery += ` and ml.countryid = $${sqlParams.length}`;
    }

    if (req.body.status !== undefined) {
        sqlParams.push(req.body.status)
        sqlQuery += ` and lower(ml.status) = lower($${sqlParams.length}) and lower(p.status) = lower($${sqlParams.length})`;
    }

    
    sqlQuery += ` order by ml.name`;

    let resMsg = {Type: "", Message: "", Body: {} }
    try {

        let result = await pgsql.query(sqlQuery, sqlParams)
        
        resMsg.Type = "success"
        resMsg.Body = result.rows
        resMsg.Message = `found ${result.rowCount} matching location(s) `
        return res.json(resMsg);

    } catch(error) {
        console.log(error)
        // console.log(sqlQuery)
        resMsg.Message = `search error`
        return res.status(400).json(resMsg)
    }


});


// @desc    delete a single marketlocation
// @route   GET /api/setups/marketlocations/:id/delete
// @access  Private

router.get('/:id/delete', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    // if (!isSuperUser(jwtToken.role)) {
    //     resMsg.Type = "error"
    //     resMsg.Message = "Only super admin can deactivate marketlocations"
    //     return res.status(400).json(resMsg);
    // }

    const sqlQueryName = "select id from marketlocations where marketlocations.id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0 ) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find marketlocation with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `marketlocation has been deleted`

    const sqlQuery = "delete from marketlocations where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to delete marketlocation`
        return res.status(400).json(resMsg);
    }
});

// @desc    Fetch a single marketlocation
// @route   GET /api/setups/marketlocations
// @access  Private
router.get('/:id', async (req, res) => {
    
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    let sqlQuery = "select ml.id, ml.name, ml.marketId, ml.countryId, ";
    sqlQuery += " COALESCE(m.name, '') as market, COALESCE(c.name, '') as country from marketlocations as ml ";
    sqlQuery += "left join countries as c on ml.countryId = c.id ";
    sqlQuery += "left join markets as m on ml.marketId = m.id where ml.id like $1 ";
    
    let result = await pgsql.query(sqlQuery, [req.params.id])

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "success"
    resMsg.Body = result.rows
    resMsg.Message = `found ${result.rowCount} matching marketlocation(s) `

    return res.json(resMsg);
});

// @desc    Create a new marketlocation
// @route   POST /api/setups/marketlocations
// @access  Private
router.post('/', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "error"
    resMsg.Message = ``

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Message = "You have no permission to create marketlocations"
        return res.status(400).json(resMsg);
    }

    if(req.body.id && req.body.id > 0) {
        resMsg.Message = "update not allowed via post"
        return res.status(400).json(resMsg);
    }

    if (!req.body.name) {
        resMsg.Message = "Please add a name"
        return res.status(400).json(resMsg);
    }

    if (!req.body.address) {
        resMsg.Message = "Please add an address"
        return res.status(400).json(resMsg);
    }

    if (!req.body.marketId || req.body.marketId < 0 ) {
        resMsg.Message = "Please Add MarketId"
        return res.status(400).json(resMsg);
    }

    req.body.name = req.body.name.toLowerCase()
    try {
        const sqlQuery = "select * from markets where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.marketId])
        if (result.rowCount == 0) {
            resMsg.Message = "Selected Market do not exist"
            return res.status(400).json(resMsg);
        }
    } catch (error) {
        console.log(error)
    }

    try {
        const sqlQuery = "select * from marketlocations where marketid = $1 and name = $2 and address = $3";
        let result = await pgsql.query(sqlQuery, [req.body.marketId, req.body.name, req.body.address ])
        console.log(result.rowCount, "result");
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
    sqlTableInsert("marketlocations", marketlocations, req.body, jwtPayload).then((result) => {
        resMsg.Message = "marketlocation created"
        resMsg.Type = "success"
        resMsg.Body = req.body
        return res.json(resMsg);
    })

});

// @desc    Update marketlocations
// @route   PUT /api/setups/marketlocations
// @access  Private
router.put('/', async (req, res) => {
    
    let resMsg = {Type: "error", Message: "", Body: {} }
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    
    if ( jwtToken.role !== 'superadmin'){
        resMsg.Message = "You have no permission to update record"
        return res.status(400).json(resMsg);
    }

    if(!req.body.id || req.body.id == 0) {
        resMsg.Message = "id is required"
        return res.status(400).json(resMsg);
    }
    let fieldsToUpdate = {}

    if(req.body.marketid !== undefined) {
        fieldsToUpdate["marketId"] = req.body.marketid
    }

    if(req.body.name !== undefined) {
        fieldsToUpdate["name"] = req.body.name.toLowerCase()
    }

    if(req.body.address !== undefined) {
        fieldsToUpdate["address"] = req.body.address
    }

    fieldsToUpdate["id"] = req.body.id

    try {
        const sqlQuery = "select * from markets where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.marketid])
        if (result.rowCount == 0) {
            resMsg.Message = "Selected Market do not exist"
            return res.status(400).json(resMsg);
        }
    } catch (error) {
        console.log(error)
    }

    try {
        const sqlQuery = "select * from marketlocations where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.id ])
        if (result.rowCount == 0) {
            resMsg.Message = "No matching record found"
            return res.status(400).json(resMsg);
        } else {
            let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
            if(fieldsToUpdate.countryId !== undefined && fieldsToUpdate.countryId !== null){
                jwtPayload.countryId = fieldsToUpdate.countryId
            }

            sqlTableUpdate("marketlocations", marketlocations, fieldsToUpdate, jwtPayload).then((result) => {
                resMsg.Message = `marketlocation updated`
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