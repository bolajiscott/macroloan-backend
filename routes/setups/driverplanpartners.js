import express from 'express';
import {pgsql, sqlTableInsert, sqlTableUpdate} from '../../dbtables/pgsql.js';
import { jwtVerify } from '../../config/utils.js'
import { driverplanpartners } from '../../dbtables/base.js';

const router = express.Router();


// @desc    Search for driverplanpartners
// @route   POST /api/setups/driverplanpartners
// @access  Public
router.post('/search', async (req, res) => {
    
    let sqlParams = []
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let searchtext = "%"
    if (req.body.text !== undefined) {
        searchtext = `%${req.body.text}%`
    }
    sqlParams.push(searchtext)

    let sqlQuery = "select dp.id, dp.name, dp.marketId, dp.driverId, dp.countryId, ";
    sqlQuery += " dp.createdate, dp.status, concat(COALESCE(p.firstname,' '),' ',COALESCE(p.surname,' ')) as driver,  COALESCE(pp.name, '') as partner, COALESCE(c.name, '') as country from driverplanpartners as dp ";
    sqlQuery += "left join planpartners as pp on dp.planpartnerId = pp.id ";
    sqlQuery += "left join countries as c on dp.countryId = c.id ";
    sqlQuery += "left join profiles as p on dp.driverId = p.id ";
    sqlQuery += "left join markets as m on dp.marketId = m.id where dp.name like $1 ";
    
    if (jwtToken.role !== 'superadmin') {
        sqlParams.push(jwtToken.countryId)
        sqlQuery += ` and dp.countryid = $${sqlParams.length}`;
    }

    if (req.body.status !== undefined) {
        sqlParams.push(req.body.status)
        sqlQuery += ` and lower(dp.status) = lower($${sqlParams.length}) and lower(p.status) = lower($${sqlParams.length})`;
    }

    
    sqlQuery += ` order by dp.name`;

    let resMsg = {Type: "", Message: "", Body: {} }
    try {

        let result = await pgsql.query(sqlQuery, sqlParams)
        
        resMsg.Type = "success"
        resMsg.Body = result.rows
        resMsg.Message = `found ${result.rowCount} matching partners driver(s) `
        return res.json(resMsg);

    } catch(error) {
        // console.log(error)
        // console.log(sqlQuery)
        resMsg.Message = `search error`
        return res.status(400).json(resMsg)
    }


});


// @desc    delete a single driverplanpartner
// @route   GET /api/setups/driverplanpartners/:id/delete
// @access  Private

router.get('/:id/delete', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    // if (!isSuperUser(jwtToken.role)) {
    //     resMsg.Type = "error"
    //     resMsg.Message = "Only super admin can deactivate driverplanpartners"
    //     return res.status(400).json(resMsg);
    // }

    const sqlQueryName = "select id from driverplanpartners where driverplanpartners.id = $1";
    let resultName = await pgsql.query(sqlQueryName, [req.params.id])
    if (resultName.rows == 0 ) {
        resMsg.Type = "error"
        resMsg.Message = `Unable to find driverplanpartner with id [${req.params.id}]`
        return res.status(400).json(resMsg);
    }
    resMsg.Message = `driverplanpartner has been deleted`

    const sqlQuery = "delete from driverplanpartners where id = $1";
    let result = await pgsql.query(sqlQuery, [req.params.id])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to delete planpartner`
        return res.status(400).json(resMsg);
    }
});

// @desc    Fetch a single driverplanpartner
// @route   GET /api/setups/driverplanpartners
// @access  Private
router.get('/:id', async (req, res) => {
    
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    let sqlQuery = "select dp.id, dp.name, dp.marketId, dp.driverId, dp.planpartnerId, dp.countryId, ";
    sqlQuery += " dp.createdate, dp.status, concat(COALESCE(p.firstname,' '),' ',COALESCE(p.surname,' ')) as driver,  COALESCE(pp.name, '') as partner, COALESCE(c.name, '') as country from driverplanpartners as dp ";
    sqlQuery += "left join planpartners as pp on dp.planpartnerId = pp.id ";
    sqlQuery += "left join countries as c on dp.countryId = c.id ";
    sqlQuery += "left join profiles as p on dp.driverId = p.id where dp.driverId = $1 ";
    
    let result = await pgsql.query(sqlQuery, [req.params.id])

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "success"
    resMsg.Body = result.rows[0]
    resMsg.Message = `found ${result.rowCount} matched driver added to partner(s) `

    return res.json(resMsg);
});

// @desc    Create a new driverplanpartner
// @route   POST /api/setups/driverplanpartners
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
        resMsg.Message = "You have no permission to create driverplanpartners"
        return res.status(400).json(resMsg);
    }

    if(req.body.id && req.body.id > 0) {
        resMsg.Message = "update not allowed via post"
        return res.status(400).json(resMsg);
    }

    if (!req.body.driverId || req.body.driverId < 0 ) {
        resMsg.Message = "Please Add DriverId"
        return res.status(400).json(resMsg);
    }

    if (!req.body.planPartnerId || req.body.planPartnerId < 0 ) {
        resMsg.Message = "Please Add PlanpartnerId"
        return res.status(400).json(resMsg);
    }

    if (!req.body.code || req.body.code < 0 ) {
        resMsg.Message = "Driver's partner unique id not provided"
        return res.status(400).json(resMsg);
    }
    // req.body.name = req.body.name.trim()
    try {
        const sqlQuery = "select * from profiles where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.driverId])
        if (result.rowCount == 0) {
            resMsg.Message = "Selected Profile do not exist"
            return res.status(400).json(resMsg);
        }
    } catch (error) {
        console.log(error)
    }

    try {
        const sqlQuery = "select * from planpartners where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.planPartnerId])
        if (result.rowCount == 0) {
            resMsg.Message = "Selected Planpartners do not exist"
            return res.status(400).json(resMsg);
        }
    } catch (error) {
        console.log(error)
    }
  
    try {
        const sqlQuery = "select * from driverplanpartners where driverid = $1 and planPartnerid = $2";
        let result = await pgsql.query(sqlQuery, [req.body.driverId, req.body.planPartnerId ])
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
    sqlTableInsert("driverplanpartners", driverplanpartners, req.body, jwtPayload).then((result) => {
        resMsg.Message = "driver partner created"
        resMsg.Type = "success"
        resMsg.Body = req.body
        return res.json(resMsg);
    })

});

// @desc    Update driverplanpartners
// @route   PUT /api/setups/driverplanpartners
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

    if(req.body.driverId !== undefined) {
        fieldsToUpdate["driverId"] = req.body.driverId
    }

    if(req.body.planPartnerId !== undefined) {
        fieldsToUpdate["planPartnerId"] = req.body.planPartnerId
    }

    if(req.body.code !== undefined) {
        fieldsToUpdate["code"] = req.body.code
    }

    fieldsToUpdate["id"] = req.body.id

    try {
        const sqlQuery = "select * from profiles where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.driverId])
        if (result.rowCount == 0) {
            resMsg.Message = "Selected Profile do not exist"
            return res.status(400).json(resMsg);
        }
    } catch (error) {
        console.log(error)
    }

    try {
        const sqlQuery = "select * from planpartners where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.planPartnerId])
        if (result.rowCount == 0) {
            resMsg.Message = "Selected Planpartners do not exist"
            return res.status(400).json(resMsg);
        }
    } catch (error) {
        console.log(error)
    }

    try {
        const sqlQuery = "select * from driverplanpartners where id = $1";
        let result = await pgsql.query(sqlQuery, [req.body.id ])
        if (result.rowCount == 0) {
            resMsg.Message = "No matching record found"
            return res.status(400).json(resMsg);
        } else {
            let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
            if(fieldsToUpdate.countryId !== undefined && fieldsToUpdate.countryId !== null){
                jwtPayload.countryId = fieldsToUpdate.countryId
            }

            sqlTableUpdate("driverplanpartners", driverplanpartners, fieldsToUpdate, jwtPayload).then((result) => {
                resMsg.Message = `driverplanpartner updated`
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