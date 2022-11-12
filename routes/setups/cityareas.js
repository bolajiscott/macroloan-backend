import express from 'express';
import {pgsql, sqlTableInsert, sqlTableUpdate} from '../../dbtables/pgsql.js';
import { jwtVerify, isSuperUser } from '../../config/utils.js'
import { cityareas } from '../../dbtables/base.js';

const router = express.Router();


// @desc    Search for cityareas
// @route   POST /api/setups/cityareas
// @access  Public

/**
 * @swagger
 * tags:
 *  name: cityareas
 *  description: cityarea setup Routes
 * 
*/


/**
 * @swagger
 * /api/setups/cityareas/search:
 *   post:
 *     description: retrieve cityareas details
 *     tags: [cityareas]
 *     parameters:
 *     - name: text 
 *       description: registered cityarea details
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
 *         description: Returns matching cityarea(s) .
 *       400:
 *          description: unable to retrieve records
*/

router.post('/search', async (req, res) => {
   
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let searchtext, regionstate = "%"

    if (req.body.text !== undefined) {
        searchtext = `%${req.body.text}%`
    }
    if (req.body.regionstate !== undefined) {
        regionstate = `%${req.body.regionstate}%`
    }
   
    let resMsg = {Type: "", Message: "", Body: {} }
    let sqlQuery = "select city.id, city.name, city.countryId, city.regionstateId, COALESCE(c.name, '') as country, ";
    sqlQuery += "COALESCE(r.name, '') as regionstate, city.createdate, city.status from cityareas as city ";
    sqlQuery += "left join countries as c on city.countryId = c.id ";
    sqlQuery += "left join regionstates as r on city.regionstateId = r.id where ";

    let sqlParams = []
    if (jwtToken.role !== 'superadmin') {
        sqlParams.push(jwtToken.countryId)
        sqlQuery += ` city.countryid = $${sqlParams.length} and `;
    }

    sqlParams.push(searchtext)
    sqlQuery += ` (lower(city.name) like lower($${sqlParams.length}) or  lower(r.name) like lower($${sqlParams.length}) or lower(c.name) like lower($${sqlParams.length}) ) and `;

    sqlParams.push(regionstate)
    sqlQuery += ` lower(r.name) like lower($${sqlParams.length}) order by c.name, r.name, city.name limit 50`;
    

    try {
        let result = await pgsql.query(sqlQuery, sqlParams)
        resMsg.Type = "success"
        resMsg.Body = result.rows
        resMsg.Message = `found ${result.rowCount} matching cities `    
        return res.json(resMsg);

    } catch(error) {
        resMsg.Type = "error"
        resMsg.Message = `unable to retrieve records`
        return res.status(400).json(resMsg);
    }
    
});


// @desc    Fetch a single cityarea
// @route   GET /api/setups/cityareas
// @access  Private

/**
 * @swagger
 * /api/setups/cityareas/{id}/activate:
 *   get:
 *     description: activate city area
 *     tags: [cityareas]
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
        resMsg.Message = "Only super admin can activate cityareas"
        return res.status(400).json(resMsg);
    }

    const sqlQueryName = "select name from cityareas where cityareas.id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0 ) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find city/area with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `City/Area: [${resultName.rows[0].name}] has been activated`

    const sqlQuery = "update cityareas set status = 'active' where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to update city/area [${resultName.rows[0].name}]`
        return res.status(400).json(resMsg);
    }
});


/**
 * @swagger
 * /api/setups/cityareas/{id}/deactivate:
 *   get:
 *     description: deactivate city area
 *     tags: [cityareas]
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
        resMsg.Message = "Only super admin can deactivate cityareas"
        return res.status(400).json(resMsg);
    }

    const sqlQueryName = "select name from cityareas where cityareas.id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0 ) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find city/area with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `City/Area: [${resultName.rows[0].name}] has been deactivated`

    const sqlQuery = "update cityareas set status = 'inactive' where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to update city/area [${resultName.rows[0].name}]`
        return res.status(400).json(resMsg);
    }
});


// @desc    Fetch a single cityarea
// @route   GET /api/setups/cityareas
// @access  Private

/**
 * @swagger
 * /api/setups/cityareas/{id}/deactivate:
 *   get:
 *     description: fetch a city area
 *     tags: [cityareas]
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
    let sqlQuery = "select city.id, city.name, city.countryId, city.regionstateId, COALESCE(c.name, '') as country COALESCE(r.name, '') as regionstate, ";
    sqlQuery += "city.createdate, city.status  from cityareas as city ";
    sqlQuery += "left join countries as c on city.countryId = c.id ";
    sqlQuery += "left join cityareas as r on city.regionstateId = r.id ";
    sqlQuery += "where city.id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "success"
    resMsg.Body = result.rows
    resMsg.Message = `found ${result.rowCount} matching country(s) `

    return res.json(resMsg);
});


// @desc    Create a new country
// @route   POST /api/setups/cityareascityareas
// @access  Public

/**
 * @swagger
 * /api/setups/cityareas/:
 *   post:
 *     description: create a new city area
 *     tags: [cityareas]
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
 *         description: new city area created .
 *       400:
 *          description: unable to retrieve records
*/

router.post('/', async (req, res) => {

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "error"
    resMsg.Message = ``

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (!isSuperUser(jwtToken.role)) {
        resMsg.Message = "Only super admin can create cityareas"
        return res.status(400).json(resMsg);
    }

    if(req.body.id && req.body.id > 0) {
        resMsg.Message = "update not allowed via post"
        return res.status(400).json(resMsg);
    }

    if (!req.body.name || !req.body.regionstateId || !req.body.countryId ) {
        resMsg.Message = "Please Fill All Fields"
        return res.status(400).json(resMsg);
    }
    req.body.name = req.body.name.trim()

    try {
        const sqlQuery = "select * from cityareas where name = $1 and regionstateid = $2 and countryid = $3";
        let result = await pgsql.query(sqlQuery, [req.body.name, req.body.regionstateId, req.body.countryId ])
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
    
    sqlTableInsert("cityareas", cityareas, req.body, jwtPayload).then((result) => {
        resMsg.Message = `${req.body.name} created`
        resMsg.Body = req.body.id
        resMsg.Type = "success"
        return res.json(resMsg);
    })

});



/**
 * @swagger
 * /api/setups/cityareas/:
 *   put:
 *     description: update a city area
 *     tags: [cityareas]
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
 *         description: City/Area updated.
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
    
    if(req.body.name !== undefined) {
        fieldsToUpdate["name"] = req.body.name
    }

    if(req.body.status !== undefined) {
        fieldsToUpdate["status"] = req.body.status
    }

    if(req.body.regionstateId !== undefined) {
        fieldsToUpdate["regionstateId"] = req.body.regionstateId
    }
    
    if(req.body.countryId !== undefined) {
        fieldsToUpdate["countryId"] = req.body.countryId
    }

    fieldsToUpdate["id"] = req.body.id

    try {
        const sqlQuery = "select * from cityareas where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.id ])
        if (result.rowCount == 0) {
            resMsg.Message = "No matching record found"
            return res.status(400).json(resMsg);
        } else {
            let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
            if(fieldsToUpdate.countryId !== undefined && fieldsToUpdate.countryId !== null){
                jwtPayload.countryId = fieldsToUpdate.countryId
            }

            sqlTableUpdate("cityareas", cityareas, fieldsToUpdate, jwtPayload).then((result) => {
                resMsg.Message = `City/Area updated`
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



// @desc    Import new cityareas
// @route   POST /api/cityareas/import
// @access  Public
router.post('/import', async (req, res) => {

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "error"
    resMsg.Message = ``

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    if (!isSuperUser(jwtToken.role)) {
        resMsg.Message = "Only super admins can import cityareas"
        return res.status(400).json(resMsg);
    }

    
    if(!req.body.countryId || req.body.countryId == 0) {
        resMsg.Message = "please select a country"
        return res.status(400).json(resMsg);
    }

    if(!req.body.cityareas || req.body.cityareas.length == 0) {
        resMsg.Message = "please provide import list"
        return res.status(400).json(resMsg);
    }


    let existingRecordList = {}
    let existingRecordParentList = {}

    try {
        let sqlQueryParent = "select lower(regionstates.name) as name, regionstates.id as id, regionstates.countryid as countryid "
        sqlQueryParent += " from regionstates "
        sqlQueryParent += " where regionstates.countryid = $1 order by regionstates.name "

        let resultParent = await pgsql.query(sqlQueryParent, [req.body.countryId])
        if (resultParent.rows !== undefined) {
            resultParent.rows.forEach( record => {
                existingRecordParentList[record.name] = record
            })
        }

        let sqlQuery = "select lower(cityareas.name) as name, lower(COALESCE(regionstates.name,'')) as regionstate from cityareas ";
        sqlQuery += " left join regionstates on regionstates.id = cityareas.regionstateid where cityareas.countryid = $1 order by cityareas.name ";
        
        let result = await pgsql.query(sqlQuery, [req.body.countryId])
        if (result.rows !== undefined) {
            result.rows.forEach( record => {
                existingRecordList[`${record.regionstate}-${record.name}`] = record
            })
        }

    } catch(error) {        
        resMsg.Type = "error"
        resMsg.Message = `unable to import records`
        console.log(error)
        return res.status(400).json(resMsg);
    }

    

    let importedRecords = 0
    let duplicateRecords = 0
    let importedList = req.body.cityareas
    
    for (const record of importedList) {
        let recordArray = record.split(",")
        if (recordArray.length == 2) {
            let key = `${recordArray[0].toLowerCase().trim()}-${recordArray[1].toLowerCase().trim()}`

            if(existingRecordList[key] == null ||
                existingRecordList[key] == undefined) {
                let parentKey = recordArray[0].toLowerCase().trim()
 
                if(existingRecordParentList[parentKey] !== null &&
                    existingRecordParentList[parentKey] !== undefined) {
                    
                    let newRecord = {
                        status: "active",
                        name: recordArray[1].trim(),
                        regionstateId: existingRecordParentList[parentKey].id,
                        countryId: existingRecordParentList[parentKey].countryid,
                    }
                    
                    importedRecords++
                    existingRecordList[key] = {name:newRecord.name.toLowerCase()  }
                    sqlTableInsert("cityareas", cityareas, newRecord, jwtToken).then(() => {
                    })
                    await new Promise(r => setTimeout(r, 5));
                } else {
                    duplicateRecords++
                }
            } else {
                duplicateRecords++
            }
        } else {
            duplicateRecords++
        }
    }


    resMsg.Message = `${importedRecords} records imported, ${duplicateRecords} duplicates ignored`
    if (duplicateRecords == 0) {
        resMsg.Type = "success"
        return res.json(resMsg);
    }
    return res.status(400).json(resMsg);

});
export default router;