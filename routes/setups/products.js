import express from 'express';
import {pgsql, sqlTableInsert, sqlTableUpdate} from '../../dbtables/pgsql.js';
import { jwtVerify } from '../../config/utils.js'
import { products } from '../../dbtables/base.js';

const router = express.Router();


// @desc    Search for products
// @route   POST /api/setups/products
// @access  Public
router.post('/search', async (req, res) => {
    
    let sqlParams = []
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let searchtext = "%"
    if (req.body.text !== undefined) {
        searchtext = `%${req.body.text}%`
    }
    sqlParams.push(searchtext)

    let sqlQuery = "select p.id,  p.code,  p.name, p.description, p.createdate, p.status  from products as p ";
    sqlQuery += " where p.name like $1 ";
    
    // if (jwtToken.role !== 'superadmin') {
    //     sqlParams.push(jwtToken.countryId)
    //     sqlQuery += ` and p.countryid = $${sqlParams.length}`;
    // }

    sqlQuery += ` order by p.name`;

    try {
        let result = await pgsql.query(sqlQuery, sqlParams)

        let resMsg = {Type: "", Message: "", Body: {} }
        resMsg.Type = "success"
        resMsg.Body = result.rows
        resMsg.Message = `found ${result.rowCount} matching product(s) `

        return res.json(resMsg);

    } catch(error) {
        console.log(sqlQuery)
        console.log(error)

        let resMsg = {Type: "", Message: "search error", Body: {} }
        return res.status(400).json(resMsg);
    }

    
});


// @desc    Fetch a single product
// @route   GET /api/setups/products
// @access  Private
router.get('/:id/activate', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can activate products"
        return res.status(400).json(resMsg);
    }

    const sqlQueryName = "select name from products where products.id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0 ) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find product with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `Product: [${resultName.rows[0].name}] has been activated`

    const sqlQuery = "update products set status = 'active' where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to update product [${resultName.rows[0].name}]`
        return res.status(400).json(resMsg);
    }
});

// @desc    Fetch a single product
// @route   GET /api/setups/products
// @access  Private
router.get('/:id/deactivate', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can deactivate products"
        return res.status(400).json(resMsg);
    }

    const sqlQueryName = "select name from products where products.id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0 ) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find product with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `Product: [${resultName.rows[0].name}] has been deactivated`

    const sqlQuery = "update products set status = 'inactive' where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to update product [${resultName.rows[0].name}]`
        return res.status(400).json(resMsg);
    }
});


// @desc    Fetch a single product
// @route   GET /api/setups/products
// @access  Private
router.get('/:id', async (req, res) => {
    
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    let sqlQuery = "select p.id, p.name, p.countryId, COALESCE(c.name, '') as country, p.createdate, p.status, "
    sqlQuery += "from products as p  ";
    sqlQuery += "left join countries as c on p.countryId = c.id where p.id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "success"
    resMsg.Body = result.rows
    resMsg.Message = `found ${result.rowCount} matching product(s) `

    return res.json(resMsg);
});

// @desc    Create a new product
// @route   POST /api/setups/products
// @access  Public
router.post('/', async (req, res) => {

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "error"
    resMsg.Message = ``

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Message = "Only super admin can create products"
        return res.status(400).json(resMsg);
    }

    if(req.body.id && req.body.id > 0) {
        resMsg.Message = "update not allowed via post"
        return res.status(400).json(resMsg);
    }

    if (!req.body.name || !req.body.description || !req.body.code ) {
        resMsg.Message = "Please Fill All Fields"
        return res.status(400).json(resMsg);
    }
    req.body.name = req.body.name.trim()
  
    try {
        const sqlQuery = "select * from products where name = $1 and countryid = $2";
        let result = await pgsql.query(sqlQuery, [req.body.name, jwtToken.countryId ])
        if (result.rowCount > 0) {
            resMsg.Message = "Duplicates are not allowed"
            return res.status(400).json(resMsg);
        }
    } catch (error) {
        console.log(error)
    }

    req.body.status = "active";
    if(req.body.countryId > 0 && (jwtToken.countryId == undefined || jwtToken.countryId == 0)){
        jwtToken.countryId = req.body.countryId
    }
    
    sqlTableInsert("products", products, req.body, jwtToken).then((result) => {
        resMsg.Message = `${req.body.name} created`
        resMsg.Type = "success"
        resMsg.Body = req.body.id
        return res.json(resMsg);
    })

});

// @desc    Update products
// @route   PUT /api/setups/products
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

    if(req.body.description !== undefined) {
        fieldsToUpdate["description"] = req.body.description
    }

    if(req.body.status !== undefined) {
        fieldsToUpdate["status"] = req.body.status
    }

    if(req.body.countryId !== undefined) {
        fieldsToUpdate["countryId"] = req.body.countryId
    }

    fieldsToUpdate["id"] = req.body.id

    try {
        const sqlQuery = "select * from products where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.id ])
        if (result.rowCount == 0) {
            resMsg.Message = "No matching record found"
            return res.status(400).json(resMsg);
        } else {
            let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
            if(fieldsToUpdate.countryId !== undefined && fieldsToUpdate.countryId !== null){
                jwtPayload.countryId = fieldsToUpdate.countryId
            }

            sqlTableUpdate("products", products, fieldsToUpdate, jwtPayload).then((result) => {
                resMsg.Message = `Product updated`
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