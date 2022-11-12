import express from 'express';
import {pgsql, sqlTableInsert, sqlTableUpdate} from '../../dbtables/pgsql.js';
import { jwtVerify, isSuperUser } from '../../config/utils.js'
import { riderareamappings } from '../../dbtables/verify.js';

const router = express.Router();


// @desc    Search for riderareamappings
// @route   POST /api/setups/riderareamappings
// @access  Public

/**
 * @swagger
 * tags:
 *  name: riderareamappings
 *  description: ridermapping setup Routes
 * 
*/


/**
 * @swagger
 * /api/setups/riderareamappings/search:
 *   post:
 *     description: retrieve riderareamappings details
 *     tags: [riderareamappings]
 *     parameters:
 *     - name: text 
 *       description: registered ridermapping details
 *       in: formData
 *       required: true
 *       type: string
 *     - name: regionstate 
 *       description: registered region state
 *       in: formData
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching ridermapping(s) .
 *       400:
 *          description: unable to retrieve records
*/

router.post('/search', async (req, res) => {
   
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let searchtext = "%"
    let regionstate = ""
    let cityarea = ""
    let town = ""

    if (req.body.text !== undefined) {
        searchtext = `%${req.body.text}%`
    }
    if (req.body.town !== undefined) {
        town = `%${req.body.town}%`
    }
    if (req.body.cityarea !== undefined) {
        cityarea = `%${req.body.cityarea}%`
    }
    if (req.body.regionstate !== undefined) {
        regionstate = `%${req.body.regionstate}%`
    }
   
    let resMsg = {Type: "", Message: "", Body: {} }
    let sqlQuery = "select mapping.id, mapping.min, mapping.max, mapping.townId, mapping.cityareaId, ";
    sqlQuery += "mapping.countryId, mapping.regionstateId, COALESCE(c.name, '') as country, "

    sqlQuery += "COALESCE(u.firstname, '') as riderfirstname, COALESCE(u.surname, '') as ridersurname, COALESCE(u.username, '') as riderusername, "
    sqlQuery += "COALESCE(t.name, '') as town, COALESCE(ca.name, '') as cityarea, COALESCE(r.name, '') as regionstate, "
    sqlQuery += "COALESCE(c.name, '') as country, mapping.createdate, mapping.status from riderareamappings as mapping ";

    sqlQuery += "left join users as u on mapping.riderId = u.id ";
    sqlQuery += "left join towns as t on mapping.townId = t.id ";
    sqlQuery += "left join cityareas as ca on mapping.cityareaId = ca.id ";
    sqlQuery += "left join countries as c on mapping.countryId = c.id ";
    sqlQuery += "left join regionstates as r on mapping.regionstateId = r.id where ";

    let sqlParams = []
    if (jwtToken.role !== 'superadmin') {
        sqlParams.push(jwtToken.countryId)
        sqlQuery += ` mapping.countryid = $${sqlParams.length} and `;
    }

    sqlParams.push(searchtext)
    sqlQuery += ` (u.username like $${sqlParams.length} or u.firstname like $${sqlParams.length} or u.surname like $${sqlParams.length} ) `;

    if (town !== "") {
        sqlParams.push(town)
        sqlQuery += ` and (t.name like $${sqlParams.length}) `;
    }

    if (cityarea !== "") {
        sqlParams.push(cityarea)
        sqlQuery += ` and (ca.name like $${sqlParams.length}) `;
    }

    if (regionstate !== "") {
        sqlParams.push(regionstate)
        sqlQuery += ` and r.name like $${sqlParams.length} order by c.name, r.name, ca.name`;   
    }

    try {
        let result = await pgsql.query(sqlQuery, sqlParams)
        resMsg.Type = "success"
        resMsg.Body = result.rows
        resMsg.Message = `found ${result.rowCount} matching mappings `    
        return res.json(resMsg);

    } catch(error) {
        console.log(error)
        resMsg.Type = "error"
        resMsg.Message = `unable to retrieve records`
        return res.status(400).json(resMsg);
    }
    
});


// @desc    Fetch a single ridermapping
// @route   GET /api/setups/riderareamappings
// @access  Private

/**
 * @swagger
 * /api/setups/riderareamappings/{id}/activate:
 *   get:
 *     description: activate mapping
 *     tags: [riderareamappings]
 *     parameters:
 *     - name: city id
 *       description: registered city id
 *       in: path
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching city(s) .
 *       400:
 *          description: unable to retrieve records
*/

router.get('/:id/activate', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (!isSuperUser(jwtToken.role)) {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can activate riderareamappings"
        return res.status(400).json(resMsg);
    }

    const sqlQueryName = "select name from riderareamappings where riderareamappings.id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0 ) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find rider area mapping with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `Rider Area Mapping has been activated`

    const sqlQuery = "update riderareamappings set status = 'active' where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to update rider area mapping`
        return res.status(400).json(resMsg);
    }
});


/**
 * @swagger
 * /api/setups/riderareamappings/{id}/deactivate:
 *   get:
 *     description: deactivate mapping
 *     tags: [riderareamappings]
 *     parameters:
 *     - name: city id
 *       description: registered city id
 *       in: path
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching city(s) .
 *       400:
 *          description: unable to retrieve records
*/

router.get('/:id/deactivate', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (!isSuperUser(jwtToken.role)) {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can deactivate riderareamappings"
        return res.status(400).json(resMsg);
    }

    const sqlQueryName = "select name from riderareamappings where riderareamappings.id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0 ) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find rider area mapping with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `Rider Area Mapping has been deactivated`

    const sqlQuery = "update riderareamappings set status = 'inactive' where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to update rider area mapping`
        return res.status(400).json(resMsg);
    }
});

/**
 * @swagger
 * /api/setups/riderareamappings/{id}/delete:
 *   get:
 *     description: delete mapping
 *     tags: [riderareamappings]
 *     parameters:
 *     - name: city id
 *       description: registered city id
 *       in: path
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching city(s) .
 *       400:
 *          description: unable to retrieve records
*/

router.get('/:id/delete', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (!isSuperUser(jwtToken.role)) {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can deactivate riderareamappings"
        return res.status(400).json(resMsg);
    }

    const sqlQueryName = "select id from riderareamappings where riderareamappings.id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0 ) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find rider area mapping with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `Mapping has been deleted`

    const sqlQuery = "delete from riderareamappings where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to delete mapping`
        return res.status(400).json(resMsg);
    }
});


// @desc    Fetch a single ridermapping
// @route   GET /api/setups/riderareamappings
// @access  Private

/**
 * @swagger
 * /api/setups/riderareamappings/{id}/deactivate:
 *   get:
 *     description: fetch a mapping
 *     tags: [riderareamappings]
 *     parameters:
 *     - name: city id
 *       description: registered city id
 *       in: path
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching city(s) .
 *       400:
 *          description: unable to retrieve records
*/

router.get('/:id', async (req, res) => {
    
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    
    let sqlQuery = "select mapping.id, mapping.min, mapping.max, mapping.townId, mapping.cityareaId, ";
    sqlQuery += "mapping.countryId, mapping.regionstateId, COALESCE(c.name, '') as country, "

    sqlQuery += "COALESCE(u.firstname, '') as riderfirstname, COALESCE(u.surname, '') as ridersurname, COALESCE(u.username, '') as riderusername, "
    sqlQuery += "COALESCE(t.name, '') as town, COALESCE(ca.name, '') as cityarea, COALESCE(r.name, '') as regionstate, "
    sqlQuery += "COALESCE(c.name, '') as country, mapping.createdate, mapping.status from riderareamappings as mapping ";

    sqlQuery += "left join users as u on mapping.riderId = u.id ";
    sqlQuery += "left join towns as t on mapping.townId = t.id ";
    sqlQuery += "left join cityareas as ca on mapping.cityareaId = ca.id ";
    sqlQuery += "left join countries as c on mapping.countryId = c.id ";
    sqlQuery += "left join regionstates as r on mapping.regionstateId = r.id ";


    sqlQuery += "where mapping.id = $1 and mapping.countryid = $2";
    let result = await pgsql.query(sqlQuery, [req.params.id, jwtToken.countryId])

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "success"
    resMsg.Body = result.rows
    resMsg.Message = `found ${result.rowCount} matching country(s) `

    return res.json(resMsg);
});


// @desc    Create a new country
// @route   POST /api/setups/riderareamappingsriderareamappings
// @access  Public

/**
 * @swagger
 * /api/setups/riderareamappings/:
 *   post:
 *     description: create a new mapping
 *     tags: [riderareamappings]
 *     parameters:
 *     - name: name
 *       description: city name
 *       in: path
 *       required: true
 *       type: string
 *     - name: regionstateId
 *       description: new regionstateId
 *       in: path
 *       required: true
 *       type: string
 *     - name: countryId
 *       description: new countryId
 *       in: path
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: new mapping created .
 *       400:
 *          description: unable to retrieve records
*/

router.post('/', async (req, res) => {

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "error"
    resMsg.Message = ``

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (!isSuperUser(jwtToken.role)) {
        resMsg.Message = "Only super admin can create riderareamappings"
        return res.status(400).json(resMsg);
    }

    if(req.body.id && req.body.id > 0) {
        resMsg.Message = "update not allowed via post"
        return res.status(400).json(resMsg);
    }

    if (!req.body.riderId ) {
        resMsg.Message = "Please select a Rider"
        return res.status(400).json(resMsg);
    }
    
    if (!req.body.townId && !req.body.cityareaId ) {
        resMsg.Message = "Please select a town or rider area mapping"
        return res.status(400).json(resMsg);
    }

    if (!req.body.regionstateId || !req.body.countryId ) {
        resMsg.Message = "Please Fill All Fields"
        return res.status(400).json(resMsg);
    }

    if(req.body.max < req.body.min) {
        resMsg.Message = "Max should be greater than Min"
        return res.status(400).json(resMsg);
    }

    // try {
    //     const sqlQuery = "select * from riderareamappings where townid = $1 and cityareaid = $2 and regionstateid = $3 and countryid = $4";
    //     let result = await pgsql.query(sqlQuery, [ req.body.townId, req.body.cityareaId, req.body.regionstateId, req.body.countryId ])
    //     if (result.rowCount > 0) {
    //         resMsg.Message = "Duplicates are not allowed"
    //         return res.status(400).json(resMsg);
    //     }
    // } catch (error) {
    //     console.log(error)
    // }

    req.body.status = "active";
    let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
    if(req.body.countryId > 0 && (jwtPayload.countryId == undefined || jwtPayload.countryId == 0)){
        jwtPayload.countryId = req.body.countryId
    }
    
    sqlTableInsert("riderareamappings", riderareamappings, req.body, jwtPayload).then((result) => {
        resMsg.Message = `Rider mapping created`
        resMsg.Body = req.body.id
        resMsg.Type = "success"
        return res.json(resMsg);
    })

});



/**
 * @swagger
 * /api/setups/riderareamappings/:
 *   put:
 *     description: update a mapping
 *     tags: [riderareamappings]
 *     parameters:
 *     - name: name
 *       description: city name
 *       in: path
 *       required: true
 *       type: string
 *     - name: status
 *       description: city status
 *       in: path
 *       required: true
 *       type: string
 *     - name: regionstateId
 *       description: new regionstateId
 *       in: path
 *       required: true
 *       type: string
 *     - name: countryId
 *       description: new countryId
 *       in: path
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Rider Area Mapping updated.
 *       400:
 *          description: unable to retrieve records
*/

router.put('/', async (req, res) => {
    
    let resMsg = {Type: "error", Message: "", Body: {} }
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    
    if (!isSuperUser(jwtToken.role)) {
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
    
   
    if(req.body.status !== undefined) {
        fieldsToUpdate["status"] = req.body.status
    }

    if(req.body.riderId !== undefined) {
        if (req.body.riderId > 0) {
            fieldsToUpdate["riderid"] = req.body.riderId
        }
    }

    if(req.body.priority !== undefined) {
        fieldsToUpdate["priority"] = req.body.priority
    }
    
    if(req.body.min !== undefined) {
        fieldsToUpdate["min"] = req.body.min
    }

    if(req.body.max !== undefined) {
        if(req.body.max < req.body.min) {
            resMsg.Message = "Max should be greater than Min"
            return res.status(400).json(resMsg);
        }
        fieldsToUpdate["max"] = req.body.max
    }

    if(req.body.townId !== undefined) {
        fieldsToUpdate["townId"] = req.body.townId
    }

    if(req.body.cityareaId !== undefined) {
        fieldsToUpdate["cityareaId"] = req.body.cityareaId
    }

    if(req.body.regionstateId !== undefined) {
        fieldsToUpdate["regionstateId"] = req.body.regionstateId
    }
    
    if(req.body.countryId !== undefined) {
        fieldsToUpdate["countryId"] = req.body.countryId
    }

    fieldsToUpdate["id"] = req.body.id

    try {
        const sqlQuery = "select * from riderareamappings where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.id ])
        if (result.rowCount == 0) {
            resMsg.Message = "No matching record found"
            return res.status(400).json(resMsg);
        } else {
            let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
            if(fieldsToUpdate.countryId !== undefined && fieldsToUpdate.countryId !== null){
                jwtPayload.countryId = fieldsToUpdate.countryId
            }

            sqlTableUpdate("riderareamappings", riderareamappings, fieldsToUpdate, jwtPayload).then((result) => {
                resMsg.Message = `Rider Area Mapping updated`
                resMsg.Type = "success"
                resMsg.Body = fieldsToUpdate.id
                return res.json(resMsg);
            })
        }
    } catch(error) {
        resMsg.Type = "error"
        resMsg.Message = `unable to update record`
        return res.status(400).json(resMsg);
    }
    
});


export default router;