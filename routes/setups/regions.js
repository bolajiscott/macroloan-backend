import express from 'express';
import {pgsql, sqlTableInsert, sqlTableUpdate} from '../../dbtables/pgsql.js';
import { jwtVerify, isSuperUser } from '../../config/utils.js'
import { regions } from '../../dbtables/base.js';

const router = express.Router();


// @desc    Search for regions
// @route   POST /api/setups/regions
// @access  Public

/**
 * @swagger
 * tags:
 *  name: Regions
 *  description: regions setup Routes
 * 
*/


/**
 * @swagger
 * /api/setups/regions/search:
 *   post:
 *     description: retrieve a region details
 *     tags: [Regions]
 *     parameters:
 *     - name: text 
 *       description: registered region details
 *       in: formData
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching region(s) .
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


    let sqlQuery = "select id, code, name, description, createdate, status from regions where name like $1 ";


    if (!isSuperUser(jwtToken.role)) {
        sqlParams.push(jwtToken.countryId)
        sqlQuery += ` and id = $${sqlParams.length}`;
    }

    sqlQuery += ` order by name`;

    let result = await pgsql.query(sqlQuery, sqlParams)

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "success"
    resMsg.Body = result.rows
    resMsg.Message = `found ${result.rowCount} matching region(s) `

    return res.json(resMsg);
});


// @desc    Fetch a single region
// @route   GET /api/setups/regions
// @access  Private

/**
 * @swagger
 * /api/setups/regions/{id}/activate:
 *   get:
 *     description: activate region details
 *     tags: [Regions]
 *     parameters:
 *     - name: id
 *       description: registered regions id
 *       in: path
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching regions(s) .
 *       400:
 *          description: unable to retrieve records
*/

router.get('/:id/activate', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""
    resMsg.Message = `Region: [${req.params.id}] has been activated`

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can activate regions"
        return res.status(400).json(resMsg);
    }

    const sqlQuery = "update regions set status = 'active' where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to update region [${req.params.id}]`
    }
});

// @desc    Fetch a single region
// @route   GET /api/setups/regions
// @access  Private

/**
 * @swagger
 * /api/setups/regions/{id}/deactivate:
 *   get:
 *     description: deactivate region details
 *     tags: [Regions]
 *     parameters:
 *     - name: id
 *       description: registered regions id
 *       in: path
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching regions(s) .
 *       400:
 *          description: unable to retrieve records
*/

router.get('/:id/deactivate', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""
    resMsg.Message = `Region: [${req.params.id}] has been deactivated`

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can deactivate regions"
        return res.status(400).json(resMsg);
    }

    const sqlQuery = "update regions set status = 'inactive' where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to update region [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
});


// @desc    Fetch a single region
// @route   GET /api/setups/regions
// @access  Private



router.get('/:id', async (req, res) => {
    
    const sqlQuery = "select id, code, name, description, createdate, status  from regions where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "success"
    resMsg.Body = result.rows
    resMsg.Message = `found ${result.rowCount} matching region(s) `

    return res.json(resMsg);
});


// @desc    Create a new region
// @route   POST /api/setups/regions
// @access  Public

/**
 * @swagger
 * /api/setups/regions:
 *   post:
 *     description: Create Region Route
 *     tags: [Regions]
 *     parameters:
 *     - name: name
 *       description: region's name
 *       in: formData
 *       required: true
 *       type: string
 *     - name: code
 *       description: region's code
 *       in: formData
 *       required: true
 *       type: string
 *     - name: description
 *       description: region's description
 *       in: formData
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns region id.
 *       400:
 *          description: error in parameters provided
*/


router.post('/', async (req, res) => {

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "error"
    resMsg.Message = ``

    // console.log(req.body)

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Message = "Only super admin can create regions"
        return res.status(400).json(resMsg);
    }

    if(req.body.id && req.body.id > 0) {
        resMsg.Message = "update not allowed via post"
        return res.status(400).json(resMsg);
    }

    req.body.name = req.body.name.trim()
    if (!req.body.name) {
        resMsg.Message = "Please Fill All Fields"
        return res.status(400).json(resMsg);
    }
    req.body.name = req.body.name.trim()

    try {
        const sqlQuery = "select * from regions where name = $1";
        let result = await pgsql.query(sqlQuery, [req.body.name ])
        if (result.rowCount > 0) {
            resMsg.Message = "Duplicates are not allowed"
            return res.status(400).json(resMsg);
        }
    } catch (error) {
        console.log(error)
    }

    req.body.status = "active";

    sqlTableInsert("regions", regions, req.body, jwtToken).then((result) => {
        //console.log("result: ", result)
        resMsg.Message = `${req.body.name} created`
        resMsg.Type = "success"
        resMsg.Body = regions.id
        return res.json(resMsg);
    })

});

// @desc    Update regions
// @route   PUT /api/setups/regions
// @access  Public

/**
 * @swagger
 * /api/setups/regions:
 *   put:
 *     description: Create Region Route
 *     tags: [Regions]
 *     parameters:
 *     - name: id
 *       description: region's id
 *       in: formData
 *       required: true
 *       type: interger
 *     - name: name
 *       description: region's name
 *       in: formData
 *       required: true
 *       type: string
 *     - name: code
 *       description: region's code
 *       in: formData
 *       required: true
 *       type: string
 *     - name: description
 *       description: region's description
 *       in: formData
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns region id.
 *       400:
 *          description: error in parameters provided
*/

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

    if(req.body.code !== undefined) {
        fieldsToUpdate["code"] = req.body.code
    }

    if(req.body.description !== undefined) {
        fieldsToUpdate["description"] = req.body.description
    }

    if(req.body.status !== undefined) {
        fieldsToUpdate["status"] = req.body.status
    }


    fieldsToUpdate["id"] = req.body.id

    try {
        const sqlQuery = "select * from regions where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.id ])
        if (result.rowCount == 0) {
            resMsg.Message = "No matching record found"
            return res.status(400).json(resMsg);
        } else {
            let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
            if(fieldsToUpdate.countryId !== undefined && fieldsToUpdate.countryId !== null){
                jwtPayload.countryId = fieldsToUpdate.countryId
            }

            sqlTableUpdate("regions", regions, fieldsToUpdate, jwtPayload).then((result) => {
                resMsg.Message = `Region updated`
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