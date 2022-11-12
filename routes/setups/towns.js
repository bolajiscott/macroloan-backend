import express from 'express';
import {pgsql, sqlTableInsert, sqlTableUpdate} from '../../dbtables/pgsql.js';
import { jwtVerify, isSuperUser } from '../../config/utils.js'
import { towns } from '../../dbtables/base.js';

const router = express.Router();


// @desc    Search for towns
// @route   POST /api/setups/towns
// @access  Public

/**
 * @swagger
 * tags:
 *  name: towns
 *  description: cityarea setup Routes
 * 
*/


/**
 * @swagger
 * /api/setups/towns/search:
 *   post:
 *     description: retrieve towns details
 *     tags: [towns]
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
    
    let sqlParams = []
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let searchtext = "%"

    if (req.body.text !== undefined) {
        searchtext = `%${req.body.text}%`
    }

    let resMsg = {Type: "", Message: "", Body: {} }
    let sqlQuery = "select town.id, town.name, town.countryId, town.regionstateId, town.cityareaId, COALESCE(c.name, '') as country, ";
    sqlQuery += "COALESCE(r.name, '') as regionstate, COALESCE(ca.name, '') as cityarea, town.createdate, town.status from towns as town ";
    sqlQuery += "left join countries as c on c.id = town.countryId ";
    sqlQuery += "left join regionstates as r on r.id = town.regionstateId ";
    sqlQuery += "left join cityareas as ca on ca.id = town.cityareaId  where "
    

    sqlParams.push(searchtext)
    sqlQuery += ` (lower(town.name) like lower($${sqlParams.length}) or lower(ca.name) like lower($${sqlParams.length}) or lower(r.name) like lower($${sqlParams.length}) or lower(c.name) like lower($${sqlParams.length})) `;

    if (req.body.cityarea !== undefined) {
        sqlParams.push(`%${req.body.cityarea}%`)
        sqlQuery += ` and lower(ca.name) like lower($${sqlParams.length}) `;
    }

    if (req.body.regionstate !== undefined) {
        sqlParams.push(`%${req.body.regionstate}%`)
        sqlQuery += ` and lower(r.name) like lower($${sqlParams.length}) `;
    }

    if (jwtToken.role !== 'superadmin') {
        sqlParams.push(jwtToken.countryId)
        sqlQuery += ` and town.countryid = $${sqlParams.length}`;
    }
    
    sqlQuery += ` order by c.name, r.name, ca.name, town.name`;


    try {
        let result = await pgsql.query(sqlQuery, sqlParams)
        resMsg.Type = "success"
        resMsg.Body = result.rows
        resMsg.Message = `found ${result.rowCount} matching towns `    
        return res.json(resMsg);

    } catch(error) {
        console.log(sqlQuery)
        console.log(sqlParams)
        console.log(error)
        resMsg.Type = "error"
        resMsg.Message = `unable to retrieve records`
        return res.status(400).json(resMsg);
    }
    
});


// @desc    Fetch a single cityarea
// @route   GET /api/setups/towns
// @access  Private

/**
 * @swagger
 * /api/setups/towns/{id}/activate:
 *   get:
 *     description: activate city area
 *     tags: [towns]
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
        resMsg.Message = "Only super admin can activate towns"
        return res.status(400).json(resMsg);
    }

    const sqlQueryName = "select name from towns where towns.id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0 ) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find city/area with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `City/Area: [${resultName.rows[0].name}] has been activated`

    const sqlQuery = "update towns set status = 'active' where id = $1";
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
 * /api/setups/towns/{id}/deactivate:
 *   get:
 *     description: deactivate city area
 *     tags: [towns]
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
        resMsg.Message = "Only super admin can deactivate towns"
        return res.status(400).json(resMsg);
    }

    const sqlQueryName = "select name from towns where towns.id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0 ) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find city/area with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `City/Area: [${resultName.rows[0].name}] has been deactivated`

    const sqlQuery = "update towns set status = 'inactive' where id = $1";
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
// @route   GET /api/setups/towns
// @access  Private

/**
 * @swagger
 * /api/setups/towns/{id}/deactivate:
 *   get:
 *     description: fetch a city area
 *     tags: [towns]
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
    
    
    ////old is below to be removed
    
    
    // let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    // let sqlQuery = "select ca.id, ca.name, ca.countryId, ca.regionstateId, COALESCE(c.name, '') as country COALESCE(r.name, '') as regionstate, ";
    // sqlQuery += "ca.createdate, ca.status  from towns as city ";
    // sqlQuery += "left join countries as c on ca.countryId = c.id ";
    // sqlQuery += "left join towns as r on ca.regionstateId = r.id ";
    // sqlQuery += "where ca.id = $1";
    // let result = await pgsql.query(sqlQuery, [req.params.id])



    let sqlParams = []
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let resMsg = {Type: "", Message: "", Body: {} }

    let sqlQuery = "select town.id, town.name, town.countryId, town.regionstateId, town.cityareaId, COALESCE(c.name, '') as country, ";
    sqlQuery += "COALESCE(r.name, '') as regionstate, COALESCE(ca.name, '') as cityarea, town.createdate, town.status from towns as town ";
    sqlQuery += "left join countries as c on c.id = town.countryId ";
    sqlQuery += "left join regionstates as r on r.id = town.regionstateId ";
    sqlQuery += "left join cityareas as ca on ca.id = town.cityareaId  where town.id = $1 "
    

    sqlParams.push(req.params.id)
    sqlQuery += ` town.id = $${sqlParams.length} `;

    if (!isSuperUser(jwtToken.role)) {
        sqlParams.push(jwtToken.countryId)
        sqlQuery += ` and town.countryid = $${sqlParams.length}`;
    }

    try {
        let result = await pgsql.query(sqlQuery, [req.params.id])
        resMsg.Type = "success"
        resMsg.Body = result.rows
        resMsg.Message = `found ${result.rowCount} matching towns `    
        return res.json(resMsg);

    } catch(error) {
        resMsg.Type = "error"
        resMsg.Message = `unable to retrieve records`
        return res.status(400).json(resMsg);
    }
});


// @desc    Create a new country
// @route   POST /api/setups/townstowns
// @access  Public

/**
 * @swagger
 * /api/setups/towns/:
 *   post:
 *     description: create a new city area
 *     tags: [towns]
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
        resMsg.Message = "Only super admin can create towns"
        return res.status(400).json(resMsg);
    }

    if(req.body.id && req.body.id > 0) {
        resMsg.Message = "update not allowed via post"
        return res.status(400).json(resMsg);
    }

    if (!req.body.name || !req.body.cityareaId || !req.body.countryId || !req.body.regionstateId || !req.body.countryId ) {
        resMsg.Message = "Please Fill All Fields"
        return res.status(400).json(resMsg);
    }
    req.body.name = req.body.name.trim()

    try {
        const sqlQuery = "select * from towns where name = $1 and cityareaid = $2 and countryid = $3";
        let result = await pgsql.query(sqlQuery, [req.body.name, req.body.cityareaId, req.body.countryId ])
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
    
    sqlTableInsert("towns", towns, req.body, jwtPayload).then((result) => {
        resMsg.Message = `${req.body.name} created`
        resMsg.Body = req.body.id
        resMsg.Type = "success"
        return res.json(resMsg);
    })

});



/**
 * @swagger
 * /api/setups/towns/:
 *   put:
 *     description: update a city area
 *     tags: [towns]
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
        const sqlQuery = "select * from towns where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.id ])
        if (result.rowCount == 0) {
            resMsg.Message = "No matching record found"
            return res.status(400).json(resMsg);
        } else {
            let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
            if(fieldsToUpdate.countryId !== undefined && fieldsToUpdate.countryId !== null){
                jwtPayload.countryId = fieldsToUpdate.countryId
            }

            sqlTableUpdate("towns", towns, fieldsToUpdate, jwtPayload).then((result) => {
                resMsg.Message = `Town updated`
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


// @desc    Import new towns
// @route   POST /api/towns/import
// @access  Public
router.post('/import', async (req, res) => {

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "error"
    resMsg.Message = ``

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    if (!isSuperUser(jwtToken.role)) {
        resMsg.Message = "Only super admins can import towns"
        return res.status(400).json(resMsg);
    }

    
    if(!req.body.regionstateId || req.body.regionstateId == 0) {
        resMsg.Message = "please select a  province / region / state"
        return res.status(400).json(resMsg);
    }

    if(!req.body.towns || req.body.towns.length == 0) {
        resMsg.Message = "please provide import list"
        return res.status(400).json(resMsg);
    }


    let existingRecordList = {}
    let existingRecordParentList = {}
    
    try {
        let sqlQueryParent = "select lower(cityareas.name) as name, lower(COALESCE(r.name,'')) as regionstate, "
        sqlQueryParent += " cityareas.id as id, cityareas.regionstateid, cityareas.countryid from cityareas "
        sqlQueryParent += " left join regionstates as r on r.id = cityareas.regionstateid "
        sqlQueryParent += " where cityareas.regionstateid = $1 order by r.name, cityareas.name "

        let resultParent = await pgsql.query(sqlQueryParent, [req.body.regionstateId])
        if (resultParent.rows !== undefined) {
            resultParent.rows.forEach( record => {
                existingRecordParentList[record.name] = record
            })
        }


        let sqlQuery = "select lower(towns.name) as name, lower(COALESCE(cityareas.name,'')) as cityarea from towns ";
        sqlQuery += " left join cityareas on cityareas.id = towns.cityareaid where towns.regionstateid = $1 order by towns.name limit 50";
        
        let result = await pgsql.query(sqlQuery, [req.body.regionstateId])
        if (result.rows !== undefined) {
            result.rows.forEach( record => {
                existingRecordList[`${record.cityarea}-${record.name}`] = record
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
    let importedList = req.body.towns

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
                        cityareaId: existingRecordParentList[parentKey].id,
                        regionstateId: existingRecordParentList[parentKey].regionstateid,
                        countryId: existingRecordParentList[parentKey].countryid,
                    }
                    
                    
                    importedRecords++
                    existingRecordList[key] = {name:newRecord.name.toLowerCase()  }
                    sqlTableInsert("towns", towns, newRecord, jwtToken).then(() => {
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