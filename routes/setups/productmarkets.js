import express from 'express';
import {pgsql, sqlTableInsert, sqlTableUpdate} from '../../dbtables/pgsql.js';
import { jwtVerify } from '../../config/utils.js'
import { productmarkets } from '../../dbtables/base.js';

const router = express.Router();


// @desc    Search for productmarkets
// @route   POST /api/setups/productmarkets
// @access  Public
router.post('/search/public', async (req, res) => {
    
    let sqlParams = []

    let searchtext = "%"
    if (req.body.text !== undefined) {
        searchtext = `%${req.body.text}%`
    }
    sqlParams.push(searchtext)


    let sqlQuery = "select pm.id, pm.name, pm.marketId, pm.productId, pm.countryId, ";
    sqlQuery += " pm.createdate, pm.status, COALESCE(c.name, '') as country, COALESCE(m.name, '') as market, ";

    sqlQuery += "COALESCE(p.name, '') as product from productmarkets as pm ";
    sqlQuery += "left join countries as c on pm.countryId = c.id ";
    sqlQuery += "left join markets as m on pm.marketId = m.id ";
    sqlQuery += "left join products as p on pm.productId = p.id where pm.name like $1 ";
    
    if (req.body.countryId !== undefined) {
        sqlParams.push(req.body.countryId)
        sqlQuery += ` and pm.countryid = $${sqlParams.length}`;
    }

    if (req.body.marketId !== undefined) {
        sqlParams.push(req.body.marketId)
        sqlQuery += ` and pm.marketid = $${sqlParams.length}`;
    }

    if (req.body.status !== undefined) {
        sqlParams.push(req.body.status)
        sqlQuery += ` and lower(pm.status) = lower($${sqlParams.length}) and lower(p.status) = lower($${sqlParams.length})`;
    }

    
    sqlQuery += ` order by c.name, pm.name`;

    let resMsg = {Type: "", Message: "", Body: {} }
    try {

        let result = await pgsql.query(sqlQuery, sqlParams)
        
        resMsg.Type = "success"
        resMsg.Body = result.rows
        resMsg.Message = `found ${result.rowCount} matching product(s) `
        return res.json(resMsg);

    } catch(error) {
        console.log(error)
        console.log(sqlQuery)
        resMsg.Message = `search error`
        return res.status(400).json(resMsg)
    }


});


// @desc    Search for productmarkets
// @route   POST /api/setups/productmarkets
// @access  Public
router.post('/search', async (req, res) => {
    
    let sqlParams = []
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let searchtext = "%"
    if (req.body.text !== undefined) {
        searchtext = `%${req.body.text}%`
    }
    sqlParams.push(searchtext)


    let sqlQuery = "select pm.id, pm.name, pm.marketId, pm.productId, pm.countryId, ";
    sqlQuery += " pm.createdate, pm.status, COALESCE(c.name, '') as country, COALESCE(m.name, '') as market, ";

    sqlQuery += "COALESCE(p.name, '') as product from productmarkets as pm ";
    sqlQuery += "left join countries as c on pm.countryId = c.id ";
    sqlQuery += "left join markets as m on pm.marketId = m.id ";
    sqlQuery += "left join products as p on pm.productId = p.id where pm.name like $1 ";
    
    if (jwtToken.role !== 'superadmin') {
        sqlParams.push(jwtToken.countryId)
        sqlQuery += ` and pm.countryid = $${sqlParams.length}`;
    }

    if (req.body.marketId !== undefined) {
        sqlParams.push(req.body.marketId)
        sqlQuery += ` and pm.marketid = $${sqlParams.length}`;
    }

    if (req.body.status !== undefined) {
        sqlParams.push(req.body.status)
        sqlQuery += ` and lower(pm.status) = lower($${sqlParams.length}) and lower(p.status) = lower($${sqlParams.length})`;
    }

    
    sqlQuery += ` order by c.name, pm.name`;

    let resMsg = {Type: "", Message: "", Body: {} }
    try {

        let result = await pgsql.query(sqlQuery, sqlParams)
        
        resMsg.Type = "success"
        resMsg.Body = result.rows
        resMsg.Message = `found ${result.rowCount} matching product(s) `
        return res.json(resMsg);

    } catch(error) {
        console.log(error)
        console.log(sqlQuery)
        resMsg.Message = `search error`
        return res.status(400).json(resMsg)
    }


});


// @desc    Fetch a single productmarket
// @route   GET /api/setups/productmarkets
// @access  Private
router.get('/:id/activate', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can activate productmarkets"
        return res.status(400).json(resMsg);
    }

    const sqlQueryName = "select name from productmarkets where productmarkets.id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0 ) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find productmarket with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `Productmarket: [${resultName.rows[0].name}] has been activated`

    const sqlQuery = "update productmarkets set status = 'active' where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to update productmarket [${resultName.rows[0].name}]`
        return res.status(400).json(resMsg);
    }
});

// @desc    Fetch a single productmarket
// @route   GET /api/setups/productmarkets
// @access  Private
router.get('/:id/deactivate', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can deactivate productmarkets"
        return res.status(400).json(resMsg);
    }

    const sqlQueryName = "select name from productmarkets where productmarkets.id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0 ) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find productmarket with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `Productmarket: [${resultName.rows[0].name}] has been deactivated`

    const sqlQuery = "update productmarkets set status = 'inactive' where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to update productmarket [${resultName.rows[0].name}]`
        return res.status(400).json(resMsg);
    }
});


// @desc    Fetch a single productmarket
// @route   GET /api/setups/productmarkets
// @access  Private
router.get('/:name/public', async (req, res) => {
    
    let sqlQuery = "select pm.id, pm.name, pm.description, pm.marketid, pm.productid, pm.countryId, COALESCE(c.name, '') as country, COALESCE(p.name, '') as product, COALESCE(m.name, '') as market "
    sqlQuery += "from productmarkets as pm  ";
    sqlQuery += "left join markets as m on pm.marketId = m.id ";
    sqlQuery += "left join products as p on pm.productId = p.id ";
    sqlQuery += "left join countries as c on pm.countryId = c.id where pm.name = $1 ";
    // console.log(sqlQuery);
    let result = await pgsql.query(sqlQuery, [req.params.name])
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "success"
    resMsg.Body = result.rows
    resMsg.Message = `found ${result.rowCount} matching productmarket(s) `

    return res.json(resMsg);
});



// @desc    Fetch a single productmarket
// @route   GET /api/setups/productmarkets
// @access  Private
router.get('/:id', async (req, res) => {
    
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    let sqlQuery = "select pm.id, pm.name, pm.countryId, COALESCE(c.name, '') as country, pm.createdate, pm.status, "
    sqlQuery += "from productmarkets as pm  ";
    sqlQuery += "left join countries as c on pm.countryId = c.id where pm.id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "success"
    resMsg.Body = result.rows
    resMsg.Message = `found ${result.rowCount} matching productmarket(s) `

    return res.json(resMsg);
});

// @desc    Create a new productmarkets
// @route   POST /api/setups/productmarkets
// @access  Public
router.post('/', async (req, res) => {

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "error"
    resMsg.Message = ``

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Message = "Only super admin can create productmarkets"
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
        const sqlQuery = "select * from productmarkets where name = $1 and countryid = $2";
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
    
    sqlTableInsert("productmarkets", productmarkets, req.body, jwtPayload).then((result) => {
        resMsg.Message = `${req.body.name} created`
        resMsg.Type = "success"
        resMsg.Body = req.body.id
        return res.json(resMsg);
    })

});

// @desc    Update productmarkets
// @route   PUT /api/setups/productmarkets
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
    
    if(req.body.marketId !== undefined) {
        fieldsToUpdate["marketId"] = req.body.marketId
    }

    if(req.body.productId !== undefined) {
        fieldsToUpdate["productId"] = req.body.productId
    }

    fieldsToUpdate["id"] = req.body.id

    try {
        const sqlQuery = "select * from productmarkets where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.id ])
        if (result.rowCount == 0) {
            resMsg.Message = "No matching record found"
            return res.status(400).json(resMsg);
        } else {
            let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
            if(fieldsToUpdate.countryId !== undefined && fieldsToUpdate.countryId !== null){
                jwtPayload.countryId = fieldsToUpdate.countryId
            }

            sqlTableUpdate("productmarkets", productmarkets, fieldsToUpdate, jwtPayload).then((result) => {
                resMsg.Message = `Productmarket updated`
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


export default router;``