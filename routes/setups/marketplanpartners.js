import express from 'express';
import {pgsql, sqlTableInsert, sqlTableUpdate} from '../../dbtables/pgsql.js';
import { jwtVerify, isSuperUser } from '../../config/utils.js'
import { marketplanpartners } from '../../dbtables/base.js';

const router = express.Router();


// @desc    Search for marketplanpartners
// @route   POST /api/setups/marketplanpartners
// @access  Public
router.post('/search', async (req, res) => {
    
    let sqlParams = []
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let searchtext = "%"
    if (req.body.text !== undefined) {
        searchtext = `%${req.body.text}%`
    }
    sqlParams.push(searchtext)
    
    
    let sqlQuery = "select dp.id, dp.name, dp.marketId, dp.planpartnerId, dp.countryId, ";
    sqlQuery += " dp.createdate, dp.status, COALESCE(m.name, '') as market, COALESCE(pp.name, '') as partner, COALESCE(c.name, '') as country from marketplanpartners as dp ";
    sqlQuery += "left join planpartners as pp on dp.planpartnerId = pp.id ";
    sqlQuery += "left join countries as c on dp.countryId = c.id ";
    sqlQuery += "left join markets as m on dp.marketId = m.id where dp.name like $1 ";
    
    if (jwtToken.role !== 'superadmin') {
        sqlParams.push(jwtToken.countryId)
        sqlQuery += ` and dp.countryid = $${sqlParams.length}`;
    }
    
    if (req.body.status !== undefined) {
        sqlParams.push(req.body.status)
        sqlQuery += ` and lower(dp.status) = lower($${sqlParams.length}) and lower(m.status) = lower($${sqlParams.length})`;
    }

    if (req.body.marketId !== undefined) {
        sqlParams.push(req.body.marketId)
        sqlQuery += ` and dp.marketId = $${sqlParams.length}`;
    }
    
    sqlQuery += ` order by dp.name`;

    let resMsg = {Type: "", Message: "", Body: {} }
    try {

        let result = await pgsql.query(sqlQuery, sqlParams)
        
        resMsg.Type = "success"
        resMsg.Body = result.rows
        resMsg.Message = `found ${result.rowCount} matching partner market(s) `
        return res.json(resMsg);

    } catch(error) {
        console.log(error)
        console.log(sqlQuery)
        resMsg.Message = `search error`
        return res.status(400).json(resMsg)
    }


});

router.get('/:id/activate', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (!isSuperUser(jwtToken.role)) {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can activate marketplanpartners"
        return res.status(400).json(resMsg);
    }

    
    try {
        const sqlQueryName = "select name from marketplanpartners where marketplanpartners.id = $1";
        let resultName = await pgsql.query(sqlQueryName, [req.params.id])
        if (resultName.rows == 0 ) {
            resMsg.Type = "error"
            resMsg.Message = `Unable to find partner market with id [${req.params.id}]`
            return res.status(400).json(resMsg);
        } else {
            resMsg.Message = `Partner Market: [${resultName.rows[0].name}] has been activated`

            try {
                const sqlQuery = "update marketplanpartners set status = 'active' where id = $1";
                let result = await pgsql.query(sqlQuery, [req.params.id])
                if (result.rowCount > 0) {
                    return res.json(resMsg);
                } else {
                    resMsg.Type = "error"
                    resMsg.Message = `Unable to update partner market [${resultName.rows[0].name}]`
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

router.get('/:id/deactivate', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (!isSuperUser(jwtToken.role)) {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can activate marketplanpartners"
        return res.status(400).json(resMsg);
    }

    
    try {
        const sqlQueryName = "select name from marketplanpartners where marketplanpartners.id = $1";
        let resultName = await pgsql.query(sqlQueryName, [req.params.id])
        if (resultName.rows == 0 ) {
            resMsg.Type = "error"
            resMsg.Message = `Unable to find partner market with id [${req.params.id}]`
            return res.status(400).json(resMsg);
        } else {
            resMsg.Message = `Partner Market: [${resultName.rows[0].name}] has been activated`

            try {
                const sqlQuery = "update marketplanpartners set status = 'inactive' where id = $1";
                let result = await pgsql.query(sqlQuery, [req.params.id])
                if (result.rowCount > 0) {
                    return res.json(resMsg);
                } else {
                    resMsg.Type = "error"
                    resMsg.Message = `Unable to update partner market [${resultName.rows[0].name}]`
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

// @desc    delete a single marketplanpartner
// @route   GET /api/setups/marketplanpartners/:id/delete
// @access  Private

router.get('/:id/delete', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    // if (!isSuperUser(jwtToken.role)) {
    //     resMsg.Type = "error"
    //     resMsg.Message = "Only super admin can deactivate marketplanpartners"
    //     return res.status(400).json(resMsg);
    // }

    const sqlQueryName = "select id from marketplanpartners where marketplanpartners.id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0 ) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find marketplanpartner with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `marketplanpartner has been deleted`

    const sqlQuery = "delete from marketplanpartners where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to delete partner market`
        return res.status(400).json(resMsg);
    }
});

// @desc    Fetch a single marketplanpartner
// @route   GET /api/setups/marketplanpartners
// @access  Private
router.get('/:id', async (req, res) => {
    
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    let sqlQuery = "select dp.id, dp.name, dp.marketId, dp.countryId, ";
    sqlQuery += " dp.createdate, dp.status, COALESCE(m.name, '') as market, COALESCE(pp.name, '') as partner, COALESCE(c.name, '') as country from marketplanpartners as dp ";
    sqlQuery += "left join planpartners as pp on dp.planpartnerId = pp.id ";
    sqlQuery += "left join countries as c on dp.countryId = c.id ";
    sqlQuery += "left join markets as m on dp.marketId = m.id where dp.id = $1 ";
    
    let result = await pgsql.query(sqlQuery, [req.params.id])

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "success"
    resMsg.Body = result.rows
    resMsg.Message = `found ${result.rowCount} matching marketplanpartner(s) `

    return res.json(resMsg);
});

// @desc    Create a new marketplanpartner
// @route   POST /api/setups/marketplanpartners
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
        resMsg.Message = "You have no permission to create marketplanpartners"
        return res.status(400).json(resMsg);
    }

    if(req.body.id && req.body.id > 0) {
        resMsg.Message = "update not allowed via post"
        return res.status(400).json(resMsg);
    }

    if (!req.body.marketId || req.body.marketId < 0 ) {
        resMsg.Message = "Please Add MarketId"
        return res.status(400).json(resMsg);
    }

    if (!req.body.planPartnerId || req.body.planPartnerId < 0 ) {
        resMsg.Message = "Please Add PartnerId"
        return res.status(400).json(resMsg);
    }
    // req.body.name = req.body.name.trim()
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
        const sqlQuery = "select * from planpartners where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.planPartnerId])
        if (result.rowCount == 0) {
            resMsg.Message = "Selected Partners do not exist"
            return res.status(400).json(resMsg);
        }
    } catch (error) {
        console.log(error)
    }
  
    try {
        const sqlQuery = "select * from marketplanpartners where marketid = $1 and planPartnerid = $2";
        let result = await pgsql.query(sqlQuery, [req.body.marketId, req.body.planPartnerId ])
        console.log(result.rowCount, "result");
        if (result.rowCount > 0) {
            resMsg.Message = "Duplicates are not allowed"
            return res.status(400).json(resMsg);
        }
    } catch (error) {
        console.log(error)
    }

    // req.body.status = "active";
    let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
    if(req.body.countryId > 0 && (jwtPayload.countryId == undefined || jwtPayload.countryId == 0)){
        jwtPayload.countryId = req.body.countryId
    }
    console.log(req.body);
    sqlTableInsert("marketplanpartners", marketplanpartners, req.body, jwtPayload).then((result) => {
        resMsg.Message = "market added to partner successfully"
        resMsg.Type = "success"
        resMsg.Body = req.body
        return res.json(resMsg);
    })

});

// @desc    Update marketplanpartners
// @route   PUT /api/setups/marketplanpartners
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

    if(req.body.marketId !== undefined) {
        fieldsToUpdate["marketId"] = req.body.marketId
    }

    if(req.body.planPartnerId !== undefined) {
        fieldsToUpdate["planPartnerId"] = req.body.planPartnerId
    }

    fieldsToUpdate["id"] = req.body.id

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
        const sqlQuery = "select * from planpartners where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.planPartnerId])
        if (result.rowCount == 0) {
            resMsg.Message = "Selected partners do not exist"
            return res.status(400).json(resMsg);
        }
    } catch (error) {
        console.log(error)
    }

    try {
        const sqlQuery = "select * from marketplanpartners where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.id ])
        if (result.rowCount == 0) {
            resMsg.Message = "No matching record found"
            return res.status(400).json(resMsg);
        } else {
            let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
            if(fieldsToUpdate.countryId !== undefined && fieldsToUpdate.countryId !== null){
                jwtPayload.countryId = fieldsToUpdate.countryId
            }

            sqlTableUpdate("marketplanpartners", marketplanpartners, fieldsToUpdate, jwtPayload).then((result) => {
                resMsg.Message = `partner market updated`
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