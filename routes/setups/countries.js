import express from 'express';
import {pgsql, sqlTableInsert, sqlTableUpdate} from '../../dbtables/pgsql.js';
import { jwtVerify, isSuperUser } from '../../config/utils.js'
import { countries } from '../../dbtables/base.js';

const router = express.Router();


// @desc    Search for countries
// @route   POST /api/setups/countries
// @access  Public

/**
 * @swagger
 * tags:
 *  name: countries
 *  description: countries setup Routes
 * 
*/


/**
 * @swagger
 * /api/setups/countries/search:
 *   post:
 *     description: retrieve a country details
 *     tags: [countries]
 *     parameters:
 *     - name: text 
 *       description: registered cityarea details
 *       in: formData
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching cityarea(s) .
 *       400:
 *          description: unable to retrieve records
*/
router.post('/search/public', async (req, res) => {

    let sqlParams = []

    let searchtext = "%"
    if (req.body.text !== undefined) {
        searchtext = `%${req.body.text}%`
    }
    sqlParams.push(searchtext)


    let sqlQuery = "select id, name, currency, symbol, usdrate, createdate, status from countries where name like $1 ";

    sqlQuery += ` order by name`;

    let result = await pgsql.query(sqlQuery, sqlParams)

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "success"
    resMsg.Body = result.rows
    resMsg.Message = `found ${result.rowCount} matching country(s) `

    return res.json(resMsg);
});


router.post('/search', async (req, res) => {

    let sqlParams = []
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let searchtext = "%"
    if (req.body.text !== undefined) {
        searchtext = `%${req.body.text}%`
    }
    sqlParams.push(searchtext)
    
    let sqlQuery = "select c.id, c.name, c.currency, c.regionid, c.symbol, c.usdrate, COALESCE(r.name, '') as region, c.createdate, c.status from countries as c ";
    sqlQuery += `left join regions as r on r.id = c.regionid where c.name like $1 `;
    
    if (jwtToken.role == "channel-manager") {
        let sqlQuerycountry = "select c.regionid from countries as c where c.id = $1";
        let result = await pgsql.query(sqlQuerycountry, [jwtToken.countryId])
        sqlParams.push(result.rows[0].regionid)
        sqlQuery += ` and c.regionid = $${sqlParams.length}`;
    }
    
    if (jwtToken.role != "superadmin" && jwtToken.role != "channel-manager") {
        sqlParams.push(jwtToken.countryId)
        sqlQuery += ` and c.id = $${sqlParams.length}`;
    }
    
    sqlQuery += ` order by c.name`;

    let result = await pgsql.query(sqlQuery, sqlParams)

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "success"
    resMsg.Body = result.rows
    resMsg.Message = `found ${result.rowCount} matching country(s) `

    return res.json(resMsg);
});


// @desc    Fetch a single country
// @route   GET /api/setups/countries
// @access  Private

/**
 * @swagger
 * /api/setups/countries/{name}/activate:
 *   get:
 *     description: activate countries
 *     tags: [countries]
 *     parameters:
 *     - name: name
 *       description: country name
 *       in: path
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching city(s) .
 *       400:
 *          description: Unable to update country
*/

router.get('/:name/activate', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""
    resMsg.Message = `Country: [${req.params.name}] has been activated`

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can activate countries"
        return res.status(400).json(resMsg);
    }

    const sqlQuery = "update countries set status = 'active' where name = $1";
    let result = await pgsql.query(sqlQuery, [req.params.name])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to update country [${req.params.name}]`
    }
});

// @desc    Fetch a single country
// @route   GET /api/setups/countries
// @access  Private

/**
 * @swagger
 * /api/setups/countries/{name}/deactivate:
 *   get:
 *     description: deactivate city area
 *     tags: [countries]
 *     parameters:
 *     - name: name
 *       description: country name
 *       in: path
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching city(s) .
 *       400:
 *          description: Unable to update country
*/

router.get('/:name/deactivate', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""
    resMsg.Message = `Country: [${req.params.name}] has been deactivated`

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can deactivate countries"
        return res.status(400).json(resMsg);
    }

    const sqlQuery = "update countries set status = 'inactive' where name = $1";
    let result = await pgsql.query(sqlQuery, [req.params.name])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to update country [${req.params.name}]`
        return res.status(400).json(resMsg);
    }
});


// @desc    Fetch a single country
// @route   GET /api/setups/countries
// @access  Private

/**
 * @swagger
 * /api/setups/countries/{name}:
 *   get:
 *     description: Fetch a single country
 *     tags: [countries]
 *     parameters:
 *     - name: name
 *       description: country name
 *       in: path
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching country(s) .
 *       400:
 *          description: Unable to update country
*/

router.get('/:name', async (req, res) => {
    
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    const sqlQuery = "select id, name, currency, symbol, usdrate, createdate, status  from countries where name = $1";
    let result = await pgsql.query(sqlQuery, [req.params.name])

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "success"
    resMsg.Body = result.rows
    resMsg.Message = `found ${result.rowCount} matching country(s) `

    return res.json(resMsg);
});


// @desc    Create a new country
// @route   POST /api/setups/countriescountries
// @access  Public

/**
 * @swagger
 * /api/setups/countries/:
 *   post:
 *     description: create a country
 *     tags: [countries]
 *     parameters:
 *     - name: name
 *       description: country name
 *       in: formData
 *       required: true
 *       type: string
 *     - name: currency
 *       description: country currency
 *       in: formData
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns country created.
 *       400:
 *          description: Unable to create country
*/

router.post('/', async (req, res) => {

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "error"
    resMsg.Message = ``

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Message = "Only super admin can create countries"
        return res.status(400).json(resMsg);
    }

    if(req.body.id && req.body.id > 0) {
        resMsg.Message = "update not allowed via post"
        return res.status(400).json(resMsg);
    }

    // req.body.name = req.body.name.trim()
    if (!req.body.regionId) {
        resMsg.Message = "Please select a region"
        return res.status(400).json(resMsg);
    }
    if (!req.body.name || !req.body.currency ) {
        resMsg.Message = "Please Fill All Fields"
        return res.status(400).json(resMsg);
    }
    req.body.name = req.body.name.trim()

    try {
        const sqlQuery = "select * from countries where name = $1";
        let result = await pgsql.query(sqlQuery, [req.body.name ])
        if (result.rowCount > 0) {
            resMsg.Message = "Duplicates are not allowed"
            return res.status(400).json(resMsg);
        }
    } catch (error) {
        console.log(error)
    }

    req.body.status = "active";

    sqlTableInsert("countries", countries, req.body, 
    jwtVerify(req.cookies[process.env.COOKIE])).then((result) => {
        //console.log("result: ", result)
        resMsg.Message = `${req.body.name} created`
        resMsg.Type = "success"
        resMsg.Body = countries.id
        return res.json(resMsg);
    })

});

// @desc    Update countries
// @route   PUT /api/setups/countries
// @access  Public

/**
 * @swagger
 * /api/setups/countries/:
 *   put:
 *     description: Update countries
 *     tags: [countries]
 *     parameters:
 *     - name: name
 *       description: country name
 *       in: path
 *       required: true
 *       type: string
 *     - name: code
 *       description: country code
 *       in: formData
 *       required: true
 *       type: string
 *     - name: status
 *       description: country status
 *       in: formData
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns country created.
 *       400:
 *          description: Unable to create country
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

    if(req.body.regionId !== undefined) {
        fieldsToUpdate["regionId"] = req.body.regionId
    }
    
    if(req.body.status !== undefined) {
        fieldsToUpdate["status"] = req.body.status
    }


    fieldsToUpdate["id"] = req.body.id

    try {
        const sqlQuery = "select * from countries where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.id ])
        if (result.rowCount == 0) {
            resMsg.Message = "No matching record found"
            return res.status(400).json(resMsg);
        } else {
            let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
            if(fieldsToUpdate.countryId !== undefined && fieldsToUpdate.countryId !== null){
                jwtPayload.countryId = fieldsToUpdate.countryId
            }

            sqlTableUpdate("countries", countries, fieldsToUpdate, jwtPayload).then((result) => {
                resMsg.Message = `Country updated`
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