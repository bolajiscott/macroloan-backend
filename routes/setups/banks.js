import express from 'express';
import {pgsql, sqlTableInsert, sqlTableUpdate} from '../../dbtables/pgsql.js';
import { jwtVerify, isSuperUser } from '../../config/utils.js'
import { banks } from '../../dbtables/base.js';

const router = express.Router();



/**
 * @swagger
 * tags:
 *  name: Bank setups 
 *  description: banks setup Routes
 * 
*/


/**
 * @swagger
 * /api/setups/banks/search:
 *   post:
 *     description: retrieve next of kin details
 *     tags: [Bank setups]
 *     parameters:
 *     - name: bank details 
 *       description: registered bank details
 *       in: formData
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching bank(s) .
 *       400:
 *          description: unable to retrieve records
*/

router.post('/search', async (req, res) => {
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let searchtext = ""

    if (req.body.text !== undefined) {
        searchtext = `%${req.body.text}%`
    }

    let resMsg = {Type: "", Message: "", Body: {} }
    let sqlQuery = "select b.id, b.name, b.code, b.branch, b.countryId, COALESCE(c.name, '') as country, b.createdate, b.status  from banks as b ";
    sqlQuery += "left join countries as c on b.countryId = c.id where ";
    
    
    let sqlParams = []
    if (jwtToken.role !== 'superadmin') {
        sqlParams.push(jwtToken.countryId)
        sqlQuery += ` b.countryid = $${sqlParams.length} and `;
    }

    sqlParams.push(searchtext)
    sqlQuery += ` b.name like $${sqlParams.length} order by c.name, b.name`;

    try {
        let result = await pgsql.query(sqlQuery, sqlParams)

        resMsg.Type = "success"
        resMsg.Body = result.rows
        resMsg.Message = `found ${result.rowCount} matching bank(s) `

        return res.json(resMsg);
        
    } catch(error) {
        resMsg.Type = "error"
        resMsg.Message = `unable to retrieve records`
        return res.status(400).json(resMsg);
    }
});



/**
 * @swagger
 * /api/setups/banks/{id}/activate:
 *   get:
 *     description: activate bank details
 *     tags: [Bank setups]
 *     parameters:
 *     - name: bank id
 *       description: registered bank id
 *       in: path
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching bank(s) .
 *       400:
 *          description: unable to retrieve records
*/

router.get('/:id/activate', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can activate banks"
        return res.status(400).json(resMsg);
    }

    const sqlQueryName = "select name from banks where banks.id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0 ) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find bank with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `Market: [${resultName.rows[0].name}] has been activated`

    const sqlQuery = "update banks set status = 'active' where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to update bank [${resultName.rows[0].name}]`
        return res.status(400).json(resMsg);
    }
});



/**
 * @swagger
 * /api/setups/banks/{id}/deactivate:
 *   get:
 *     description: deactivate driver bank details
 *     tags: [Bank setups]
 *     parameters:
 *     - name: bank id 
 *       description: registered bank id
 *       in: path
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching bank(s) .
 *       400:
 *          description: unable to retrieve records
*/

router.get('/:id/deactivate', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can deactivate banks"
        return res.status(400).json(resMsg);
    }

    const sqlQueryName = "select name from banks where banks.id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0 ) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find bank with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `Market: [${resultName.rows[0].name}] has been deactivated`

    const sqlQuery = "update banks set status = 'inactive' where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to update bank [${resultName.rows[0].name}]`
        return res.status(400).json(resMsg);
    }
});


// @desc    Fetch a single bank
// @route   GET /api/setups/banks
// @access  Private

/**
 * @swagger
 * /api/setups/banks/{id}/:
 *   get:
 *     description: get a bank detail
 *     tags: [Bank setups]
 *     parameters:
 *     - name: country id 
 *       description: registered country id
 *       in: path
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching bank(s) .
 *       400:
 *          description: unable to retrieve records
*/

router.get('/:id', async (req, res) => {
    
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    let sqlQuery = "select b.id, b.name, b.code, b.branch, b.countryId, COALESCE(c.name, '') as country, b.createdate, b.status, "
    sqlQuery += "from banks as b  ";
    sqlQuery += "left join countries as c on b.countryId = c.id where b.id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "success"
    resMsg.Body = result.rows
    resMsg.Message = `found ${result.rowCount} matching bank(s) `

    return res.json(resMsg);
});


/**
 * @swagger
 * /api/setups/banks/:
 *   post:
 *     description: create a new bank detail
 *     tags: [Bank setups]
 *     parameters:
 *     - name: country id 
 *       description: registered country id
 *       in: formData
 *       required: true
 *       type: string
 *     - name: code 
 *       description: registered bank code
 *       in: formData
 *       required: true
 *       type: string
 *     - name: name 
 *       description: bank name
 *       in: formData
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: bank created .
 *       400:
 *          description: unable to retrieve records
*/

router.post('/', async (req, res) => {

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "error"
    resMsg.Message = ``

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (jwtToken.role !== 'superadmin') {
        resMsg.Message = "Only super admin can create banks"
        return res.status(400).json(resMsg);
    }

    if(req.body.id && req.body.id > 0) {
        resMsg.Message = "update not allowed via post"
        return res.status(400).json(resMsg);
    }

    if (!req.body.name || !req.body.code || !req.body.countryId ) {
        resMsg.Message = "Please Fill All Fields"
        return res.status(400).json(resMsg);
    }
    req.body.code = req.body.code.trim()
    req.body.name = req.body.name.trim()
  
    try {
        const sqlQuery = "select * from banks where name = $1 and countryid = $2";
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
    
    sqlTableInsert("banks", banks, req.body, jwtPayload).then((result) => {  
        resMsg.Message = `${req.body.name} created`
        resMsg.Type = "success"
        resMsg.Body = banks.id
        return res.json(resMsg);
    })

});

// @desc    Update banks
// @route   PUT /api/setups/banks
// @access  Public


/**
 * @swagger
 * /api/setups/banks/:
 *   put:
 *     description: create a new bank detail
 *     tags: [Bank setups]
 *     parameters:
 *     - name: country id 
 *       description: registered country id
 *       in: formData
 *       required: true
 *       type: string
 *     - name: code 
 *       description: registered bank code
 *       in: formData
 *       required: true
 *       type: string
 *     - name: name 
 *       description: bank name
 *       in: formData
 *       required: true
 *       type: string
 *     - name: branch 
 *       description: bank branch
 *       in: formData
 *       required: true
 *       type: string
 *     - name: status 
 *       description: bank status
 *       in: formData
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: bank created .
 *       400:
 *          description: unable to retrieve records
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

    if(req.body.branch !== undefined) {
        fieldsToUpdate["branch"] = req.body.branch
    }

    if(req.body.status !== undefined) {
        fieldsToUpdate["status"] = req.body.status
    }

    if(req.body.countryId !== undefined) {
        fieldsToUpdate["countryId"] = req.body.countryId
    }

    fieldsToUpdate["id"] = req.body.id

    try {
        const sqlQuery = "select * from banks where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.id ])
        if (result.rowCount == 0) {
            resMsg.Message = "No matching record found"
            return res.status(400).json(resMsg);
        } else {
            let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
            if(fieldsToUpdate.countryId !== undefined && fieldsToUpdate.countryId !== null){
                jwtPayload.countryId = fieldsToUpdate.countryId
            }

            sqlTableUpdate("banks", banks, fieldsToUpdate, jwtPayload).then((result) => {
                resMsg.Message = `Bank updated`
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



// @desc    Create a new country
// @route   POST /api/setups/banks/import
// @access  Public
router.post('/import', async (req, res) => {

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "error"
    resMsg.Message = ``

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    // if (!isSuperUser(jwtToken.role)) {
    //     resMsg.Message = "Only super admins can import banks"
    //     return res.status(400).json(resMsg);
    // }

    
    if(!req.body.countryId || req.body.countryId == 0) {
        resMsg.Message = "please select a country"
        return res.status(400).json(resMsg);
    }

    if(!req.body.banks || req.body.banks.length == 0) {
        resMsg.Message = "please provide import list"
        return res.status(400).json(resMsg);
    }


    let existingRecordList = {}

    try {
        const sqlQuery = "select lower(name) as name, id from banks where countryid = $1 order by name";
        let result = await pgsql.query(sqlQuery, [jwtToken.countryId])
        if (result.rows !== undefined) {
            result.rows.forEach( record => {
                existingRecordList[record.name] = record
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
    let importedList = req.body.banks
    
    for (const record of importedList) {
        let recordArray = record.split(",")
        
        if (recordArray.length == 2) {

            
            if(existingRecordList[recordArray[0].toLowerCase()] == null ||
                existingRecordList[recordArray[0].toLowerCase()] == undefined) {
                    //create and update existing record list
                let newRecord = {
                    status: "active",
                    code: recordArray[1].trim(),
                    name: recordArray[0].trim(),
                    countryId: req.body.countryId,
                }

                importedRecords++
                existingRecordList[newRecord.name.toLowerCase()] = {name:newRecord.name.toLowerCase()}
                sqlTableInsert("banks", banks, newRecord, jwtToken).then(() => {
                })
                await new Promise(r => setTimeout(r, 5));
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