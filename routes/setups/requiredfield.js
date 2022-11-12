import express from 'express';
import {pgsql, sqlTableInsert, sqlTableUpdate} from '../../dbtables/pgsql.js';
import { jwtVerify, isSuperUser } from '../../config/utils.js'
import { requiredfields } from '../../dbtables/base.js';


const router = express.Router();

/**
 * @swagger
 * tags:
 *  name: requiredfield setups 
 *  description: requiredfields setup Routes
 * 
*/


/**
 * @swagger
 * /api/setups/requiredfields/search:
 *   post:
 *     description: search requiredfields details
 *     tags: [requiredfield setups]
 *     parameters:
 *     - name: requiredfield details 
 *       description: registered requiredfield details
 *       in: formData
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching requiredfield(s) .
 *       400:
 *          description: unable to retrieve records
*/

router.post('/search', async (req, res) => {
    
    let sqlParams = []
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let searchtext = "%"
    if (req.body.text !== undefined) {
        searchtext = `%${req.body.text}%`
    }
    sqlParams.push(searchtext)

    let sqlQuery = "select rf.id, rf.name, rf.marketId, rf.productId, rf.countryId, COALESCE(c.name, '') as country, rf.createdate, rf.status  from requiredfields as rf ";
    sqlQuery += "left join countries as c on rf.countryId = c.id where rf.name like $1 ";
    
    if (jwtToken.role !== 'superadmin') {
        sqlParams.push(jwtToken.countryId)
        sqlQuery += ` and pm.countryid = $${sqlParams.length}`;
    }

    sqlQuery += ` order by c.name, rf.name`;

    let resMsg = {Type: "", Message: "", Body: {} }
    try {

        let result = await pgsql.query(sqlQuery, sqlParams)

        resMsg.Type = "success"
        resMsg.Body = result.rows
        resMsg.Message = `found ${result.rowCount} matching requiredfield(s) `
        return res.json(resMsg);

    } catch(error) {
        console.log(error)
        console.log(sqlQuery)
        esMsg.Message = `search error`
        return res.status(400).json(resMsg)
    }


});



/**
 * @swagger
 * /api/setups/requiredfields/{id}/activate:
 *   get:
 *     description: activate requiredfields details
 *     tags: [requiredfield setups]
 *     parameters:
 *     - name: requiredfields id
 *       description: registered requiredfields id
 *       in: path
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching requiredfields(s) .
 *       400:
 *          description: unable to retrieve records
*/

router.get('/:id/activate', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can activate requiredfields"
        return res.status(400).json(resMsg);
    }

    const sqlQueryName = "select name from requiredfields where requiredfields.id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0 ) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find requiredfields with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `requiredfields: [${resultName.rows[0].name}] has been activated`

    const sqlQuery = "update requiredfields set status = 'active' where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to update requiredfields [${resultName.rows[0].name}]`
        return res.status(400).json(resMsg);
    }
});



/**
 * @swagger
 * /api/setups/requiredfields/{id}/deactivate:
 *   get:
 *     description: deactivate requiredfields details
 *     tags: [requiredfield setups]
 *     parameters:
 *     - name: requiredfields id
 *       description: registered requiredfields id
 *       in: path
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching requiredfields(s) .
 *       400:
 *          description: unable to retrieve records
*/

router.get('/:id/deactivate', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can deactivate requiredfields"
        return res.status(400).json(resMsg);
    }

    const sqlQueryName = "select name from requiredfields where requiredfields.id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0 ) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find requiredfield with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `requiredfield: [${resultName.rows[0].name}] has been deactivated`

    const sqlQuery = "update requiredfields set status = 'inactive' where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to update requiredfield [${resultName.rows[0].name}]`
        return res.status(400).json(resMsg);
    }
});


/**
 * @swagger
 * /api/setups/requiredfields/:id:
 *   get:
 *     description: retrieve requiredfields details
 *     tags: [requiredfield setups]
 *     parameters:
 *     - id: requiredfield id 
 *       description: registered requiredfield id
 *       in: path
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching requiredfield(s) .
 *       400:
 *          description: unable to retrieve records
*/


router.get('/:id', async (req, res) => {
    
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    let sqlQuery = "select rf.id, rf.name, rf.countryId, COALESCE(c.name, '') as country, rf.createdate, rf.status "
    sqlQuery += "from requiredfields as rf  ";
    sqlQuery += "left join countries as c on rf.countryId = c.id where rf.id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "success"
    resMsg.Body = result.rows
    resMsg.Message = `found ${result.rowCount} matching requiredfield(s) `

    return res.json(resMsg);
});



/**
 * @swagger
 * /api/setups/requiredfields/:id:
 *   post:
 *     description: retrieve requiredfields details
 *     tags: [requiredfield setups]
 *     parameters:
 *     - name: requiredfield name 
 *       description: registered requiredfield name
 *       in: formData
 *       required: true
 *       type: string
 *     - category: requiredfield category 
 *       description: registered requiredfield category
 *       in: formData
 *       required: true
 *       type: string
 *     - productId: requiredfield productId 
 *       description: registered requiredfield productId
 *       in: formData
 *       required: true
 *       type: string
 *     - country: requiredfield country 
 *       description: registered requiredfield country
 *       in: formData
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching requiredfield(s) .
 *       400:
 *          description: unable to retrieve records
*/


router.post('/', async (req, res) => {

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "error"
    resMsg.Message = ``

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Message = "Only super admin can create requiredfield"
        return res.status(400).json(resMsg);
    }

    if(req.body.id && req.body.id > 0) {
        resMsg.Message = "update not allowed via post"
        return res.status(400).json(resMsg);
    }

    if (!req.body.name || !req.body.category || !req.body.productId || !req.body.countryId ) {
        resMsg.Message = "Please Fill All Fields"
        return res.status(400).json(resMsg);
    }
    req.body.name = req.body.name.trim()
    req.body.category = req.body.category.trim()


    try {
        const sqlQuery = "select * from requiredfields where name = $1 and countryid = $2";
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
    sqlTableInsert("requiredfields", requiredfields, req.body, jwtPayload).then((result) => {
        console.log("result: ", result)
        resMsg.Message = `${req.body.name} created`
        resMsg.Type = "success"
        resMsg.Body = req.body.id
        return res.json(resMsg);
    })

});



/**
 * @swagger
 * /api/setups/requiredfields/:
 *   put:
 *     description: update a new requiredfield detail
 *     tags: [requiredfield setups]
 *     parameters:
 *     - name: country id 
 *       description: registered country id
 *       in: formData
 *       required: true
 *       type: string
 *     - name: code 
 *       description: registered requiredfield code
 *       in: formData
 *       required: true
 *       type: string
 *     - name: name 
 *       description: requiredfield name
 *       in: formData
 *       required: true
 *       type: string
 *     - name: category 
 *       description: requiredfield category
 *       in: formData
 *       required: true
 *       type: string
 *     - name: productId 
 *       description: requiredfield productId
 *       in: formData
 *       required: true
 *       type: string
 *     - name: description 
 *       description: requiredfield description
 *       in: formData
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: requiredfield created .
 *       400:
 *          description: unable to retrieve records
*/


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

    if(req.body.category !== undefined) {
        fieldsToUpdate["category"] = req.body.status
    }

    if(req.body.productId !== undefined) {
        fieldsToUpdate["productId"] = req.body.status
    }

    if(req.body.countryId !== undefined) {
        fieldsToUpdate["countryId"] = req.body.countryId
    }

    fieldsToUpdate["id"] = req.body.id

    try {
        const sqlQuery = "select * from requiredfields where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.id ])
        if (result.rowCount == 0) {
            resMsg.Message = "No matching record found"
            return res.status(400).json(resMsg);
        } else {
            let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
            if(fieldsToUpdate.countryId !== undefined && fieldsToUpdate.countryId !== null){
                jwtPayload.countryId = fieldsToUpdate.countryId
            }

            sqlTableUpdate("requiredfields", requiredfields, fieldsToUpdate, jwtPayload).then((result) => {
                resMsg.Message = `requiredfields updated`
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