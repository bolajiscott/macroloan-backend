import express from 'express';
import bcrypt from 'bcryptjs';
import mime from 'mime-types';
import {pgsql, sqlTableInsert, sqlTableUpdate} from '../../dbtables/pgsql.js';
import { SALT, jwtVerify, awsS3Upload, awsS3Download, isSuperUser } from '../../config/utils.js'
import { users } from '../../dbtables/base.js';

const router = express.Router();


// @desc    Search for users
// @route   POST /api/setups/users
// @access  Public

/**
 * @swagger
 * tags:
 *  name: users
 *  description: users setup Routes
 * 
*/



/**
 * @swagger
 * /api/setups/users/search:
 *   post:
 *     description: search for a user
 *     tags: [users]
 *     parameters:
 *     - name: text 
 *       description: registered users details
 *       in: formData
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching user(s) .
 *       400:
 *          description: unable to retrieve records
*/

router.post('/search', async (req, res) => {
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    
    let searchtext;
    let sqlParams = [];
    if (req.body.text !== undefined) {
        searchtext = `%${req.body.text}%`
    }
    sqlParams.push(searchtext);

    let resMsg = {Type: "", Message: "", Body: {} }
    
    let sqlQuery = "select u.id, u.image, u.username, u.email, u.mobile, u.firstname, u.surname, u.status, u.createdate, u.role, "  
    sqlQuery += " u.countryId, COALESCE(c.name, '') as country, COALESCE(s.firstname, '') as supervisorfirstname, ";
    sqlQuery += " COALESCE(s.surname, '') as supervisorsurname, COALESCE(s.email, '') as supervisoremail, ";
    sqlQuery += " COALESCE(s.mobile, '') as supervisormobile from users as u ";
     
    sqlQuery += " left join users as s on u.supervisorId = s.id ";
    sqlQuery += " left join countries as c on u.countryId = c.id ";
    
    sqlQuery += " where u.username not in ('superadmin') and (u.username like $1 or u.surname like $1 or u.firstname like $1 or ";
    sqlQuery += " u.mobile like $1 or u.email like $1 ) ";



    if (jwtToken.role !== 'superadmin') {
        sqlParams.push(jwtToken.countryId)
        sqlQuery += ` and u.countryId = $${sqlParams.length} `
    } else {
        if (req.body.countryid && req.body.countryid > 0) {
            sqlParams.push(`${req.body.countryid}`);
            sqlQuery += ` and u.countryId = $${sqlParams.length} `
        }        
    }
    if (jwtToken.role == 'agency-manager' && req.body.role == undefined) {
        sqlParams.push(jwtToken.userId)
        sqlQuery += `and u.createdby = $${sqlParams.length} or  u.supervisorId = $${sqlParams.length}`;
    }
    
    if (jwtToken.role == 'agency-manager' && req.body.role == 'agency-manager') {
        sqlParams.push(jwtToken.userId)
        sqlQuery += ` and u.id = $${sqlParams.length}`;
    }
    
    if (req.body.role !== undefined) {
        sqlParams.push(`%${req.body.role}%`);
        sqlQuery += ` and u.role like $${sqlParams.length} `
    }

    sqlQuery += "  order by u.username ";
   
    try {
        let result = await pgsql.query(sqlQuery, sqlParams)
        resMsg.Type = "success"
        resMsg.Body = result.rows
        resMsg.Message = `found ${result.rowCount} matching user(s)`
        return res.json(resMsg);

    } catch(error) {
        console.log(error)
        console.log(sqlQuery)
        console.log(sqlParams)
        resMsg.Type = "error"
        resMsg.Message = `unable to retrieve records`
        return res.status(400).json(resMsg);
    }

});



// @desc    Fetch my profile
// @route   GET /api/setups/users
// @access  Private

/**
 * @swagger
 * /api/setups/users/me:
 *   get:
 *     description: Fetch my profile
 *     tags: [users]
 *     responses:
 *       200:
 *         description: Found matching user(s) .
 *       400:
 *          description: unable to retrieve records
*/

router.get('/me', async (req, res) => {
    
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let resMsg = {Type: "", Message: "", Body: {} }
    
    let sqlQuery = "select u.id, u.image, u.username, u.email, u.mobile, u.firstname, u.surname, u.status, u.createdate, u.role, " 
    sqlQuery += " u.countryId, COALESCE(s.firstname, '') as supervisorfirstname, COALESCE(s.surname, '') as supervisorsurname, ";
    sqlQuery += " COALESCE(s.email, '') as supervisoremail, COALESCE(s.mobile, '') as supervisormobile from users as u ";
    sqlQuery += " left join users as s on u.supervisorId = s.id ";
    sqlQuery += " left join countries as c on u.countryId = c.id where u.id = $1 ";
    
    try {
        let result = await pgsql.query(sqlQuery, [jwtToken.userId])
        resMsg.Type = "success"
        resMsg.Body = result.rows
        resMsg.Message = `found ${result.rowCount} matching user(s) `
        return res.json(resMsg);

    } catch(error) {
        resMsg.Type = "error"
        resMsg.Message = `unable to retrieve records`
        return res.status(400).json(resMsg);
    }
});


/**
 * @swagger
 * /api/setups/users/{username}/:
 *   get:
 *     description: Fetch a single user
 *     tags: [users]
 *     parameters:
 *     - name: username 
 *       description: registered username
 *       in: path
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching user(s) .
 *       400:
 *          description: unable to retrieve records
*/

router.get('/:username', async (req, res) => {
    
    let resMsg = {Type: "", Message: "", Body: {} }

    let sqlQuery = "select u.id, u.image, u.username, u.email, u.mobile, u.firstname, u.surname, u.status, u.createdate, " 
    sqlQuery += " u.countryId, COALESCE(s.firstname, '') as supervisorfirstname, COALESCE(s.surname, '') as supervisorsurname, ";
    sqlQuery += " COALESCE(s.email, '') as supervisoremail, COALESCE(s.mobile, '') as supervisormobile from users as u ";
    sqlQuery += " left join users as s on u.supervisorId = s.id ";
    sqlQuery += " left join countries as c on u.countryId = c.id where u.username = $1 ";


    try {
        let result = await pgsql.query(sqlQuery, [req.params.username])
        resMsg.Type = "success"
        resMsg.Body = result.rows
        resMsg.Message = `found ${result.rowCount} matching user(s) `
        return res.json(resMsg);
    } catch(error) {
        resMsg.Type = "error"
        resMsg.Message = `unable to retrieve records`
        return res.status(400).json(resMsg);
    }
});

// @desc    Fetch a single user
// @route   GET /api/setups/users
// @access  Private

/**
 * @swagger
 * /api/setups/users/{username}/activate:
 *   get:
 *     description: activate user
 *     tags: [users]
 *     parameters:
 *     - name: username 
 *       description: registered username
 *       in: path
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching user(s) .
 *       400:
 *          description: unable to retrieve records
*/

router.get('/:username/image', async (req, res) => {
    const jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    let resMsg = {Type: "error", Message: "", Body: {} }

    let sqlQuery = " select u.image from users as u where u.username = $1 limit 1";
    
    try {
        let result = await pgsql.query(sqlQuery, [req.params.username])
        
        
        if (result.rowCount == 1) {
            
            let imagePath = result.rows[0].image
            let downloadFile = await awsS3Download( imagePath )
            
            if (downloadFile !== null && downloadFile !== undefined) {
                res.writeHead(200, {
                    "Content-Disposition": "inline;filename=" + req.params.username+"."+mime.extension(downloadFile.ContentType),
                    'Content-Type': downloadFile.ContentType,
                    'Content-Length': downloadFile.ContentLength,
                });
                res.write(downloadFile.Body);
                res.end();
            } else {
                resMsg.Message = 'no user image found on s3 for '+imagePath
                return res.status(400).json(resMsg)    
            }

        } else {
            resMsg.Message = 'no matching user image found'
            return res.status(400).json(resMsg) 
        }
        

    } catch(error) {
        console.log(error)
        resMsg.Type = "error"
        resMsg.Message = 'image error'
        return res.status(400).json(resMsg)   
    }
});


// @desc    Fetch a single user
// @route   GET /api/setups/users
// @access  Private

/**
 * @swagger
 * /api/setups/users/{username}/activate:
 *   get:
 *     description: activate user
 *     tags: [users]
 *     parameters:
 *     - name: username 
 *       description: registered username
 *       in: path
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching user(s) .
 *       400:
 *          description: unable to retrieve records
*/

router.get('/:username/activate', async (req, res) => {

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Message = `User: [${req.params.username}] has been activated`

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (!isSuperUser(jwtToken.role)) {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can activate users"
        return res.status(400).json(resMsg);
    }
    

    try {
        const sqlQuery = "update users set status = 'active' where username = $1";
        let result = await pgsql.query(sqlQuery, [req.params.username])
        if (result.rowCount > 0) {
            return res.json(resMsg);
        } else {
            resMsg.Type = "error"
            resMsg.Message = `Unable to update user [${req.params.username}]`
            return res.status(400).json(resMsg);
        }
        
    } catch(error) {
        resMsg.Type = "error"
        resMsg.Message = `unable to retrieve records`
        return res.status(400).json(resMsg);
    }


});

// @desc    Fetch a single user
// @route   GET /api/setups/users
// @access  Private

/**
 * @swagger
 * /api/setups/users/{username}/deactivate:
 *   get:
 *     description: deactivate user
 *     tags: [users]
 *     parameters:
 *     - name: username 
 *       description: registered username
 *       in: path
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching user(s) .
 *       400:
 *          description: unable to retrieve records
*/

router.get('/:username/deactivate', async (req, res) => {
    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = ""
    resMsg.Message = `User: [${req.params.username}] has been deactivated`

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    if (!isSuperUser(jwtToken.role)) {
        resMsg.Type = "error"
        resMsg.Message = "Only super admin can deactivate users"
        return res.status(400).json(resMsg);
    }

    const sqlQuery = "update users set status = 'inactive' where username = $1";
    let result = await pgsql.query(sqlQuery, [req.params.username])
    if (result.rowCount > 0) {
        return res.json(resMsg);
    } else {
        resMsg.Type = "error"
        resMsg.Message = `Unable to update user [${req.params.username}]`
        return res.status(400).json(resMsg);
    }
});

// @desc    Create a new user
// @route   POST /api/setups/users
// @access  Public

/**
 * @swagger
 * /api/setups/users/:
 *   post:
 *     description: create a user
 *     tags: [users]
 *     parameters:
 *     - name: countryId 
 *       description: users countryId
 *       in: formData
 *       required: true
 *     - name: firstname 
 *       description: users firstname
 *       in: formData
 *       required: true
 *       type: string
 *     - name: surname 
 *       description: users surname
 *       in: formData
 *       required: true
 *       type: string
 *     - name: email 
 *       description: users email
 *       in: formData
 *       required: true
 *       type: string
 *     - name: password 
 *       description: users password
 *       in: formData
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching user(s) .
 *       400:
 *          description: unable to retrieve records
*/

router.post('/', async (req, res) => {

    let resMsg = {Type: "error", Message: "", Body: {} }
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    if (!isSuperUser(jwtToken.role)) {
        resMsg.Message = "Only super admin can create users"
        return res.status(400).json(resMsg);
    }

    if(req.body.id && req.body.id > 0) {
        resMsg.Message = "update not allowed via post"
        return res.status(400).json(resMsg);
    }

    // Validate name, email and password
    if (!req.body.countryId || !req.body.firstname || !req.body.surname || !req.body.email || !req.body.password) {
        resMsg.Message = "Please Fill All Fields"
        return res.status(400).json(resMsg);
    }
    req.body.username = req.body.username.trim()
    req.body.email = req.body.email.trim()

     if(req.body.password !== undefined) {
         if (!checkPassword(req.body.password)) {
              resMsg.Message = "Password must be minimum 8 letter with at least a symbol, uppercase, lowercase letters and a number";
              return res.status(400).json(resMsg);
         }
     }

    if (!req.body.role) {
        resMsg.Message = "Please provide role"
        return res.status(400).json(resMsg);
    }
    
    if (req.body.role === 'agency' && req.body.supervisorId == 0) {
        resMsg.Message = "Please provide supervisor"
        return res.status(400).json(resMsg);
    }



    const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!re.test(req.body.email)) {
        resMsg.Message = "Email do not match correct format"
        return res.status(400).json(resMsg);
    }

    

    try {
        const sqlQuery = "select * from users where username = $1 or email = $2";
        let result = await pgsql.query(sqlQuery, [req.body.username, req.body.email ])
        if (result.rowCount > 0) {
            resMsg.Message = "Duplicate accounts are not allowed"
            return res.status(400).json(resMsg);
        } else {

            req.body.password = bcrypt.hashSync(req.body.password, SALT)
            req.body.status = "active";

            let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
            if(req.body.countryId > 0 && (jwtPayload.countryId == undefined || jwtPayload.countryId == 0)){
                jwtPayload.countryId = req.body.countryId
            }

            //check for base64 string
            if (req.body.image !== undefined) {                
                const re = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/
                if (req.body.image.split("base64,").length==2 && re.test(req.body.image.split("base64,")[1])) {
                    try {
                        let bucketName = "user-images"
                        let filetype = req.body.image.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)[0];
                        let filename = `${bucketName}-${req.body.username}.${mime.extension(filetype)}`
                        awsS3Upload(filename, filetype, req.body.image)
                        req.body.image = filename
                    } catch (error) {
                        console.log(error)
                    }
                }
            }
            //check for base64 string

            sqlTableInsert("users", users, req.body, jwtPayload).then((result) => {
                resMsg.Message = `${req.body.username} created`
                resMsg.Type = "success"
                resMsg.Body = users.id
                return res.json(resMsg);
            })
        }
    } catch(error) {
        resMsg.Type = "error"
        resMsg.Message = `unable to retrieve records`
        return res.status(400).json(resMsg);
    }
});

// @desc    Update users
// @route   PUT /api/setups/users
// @access  Public

/**
 * @swagger
 * /api/setups/users/:
 *   put:
 *     description: update a user profile
 *     tags: [users]
 *     parameters:
 *     - name: mobile 
 *       description: users mobile number
 *       in: formData
 *       required: true
 *     - name: firstname 
 *       description: users firstname
 *       in: formData
 *       required: true
 *       type: string
 *     - name: surname 
 *       description: users surname
 *       in: formData
 *       required: true
 *       type: string
 *     - name: email 
 *       description: users email
 *       in: formData
 *       required: true
 *       type: string
 *     - name: password 
 *       description: users password
 *       in: formData
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns matching user(s) .
 *       400:
 *          description: unable to retrieve records
*/

router.put('/', async (req, res) => {
    
    let resMsg = {Type: "error", Message: "", Body: {} }
    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])
    
    if (!isSuperUser(jwtToken.role)) {
        resMsg.Message = "Only super admin can update users"
        return res.status(400).json(resMsg);
    }

    if(!req.body.id || req.body.id == 0) {
        resMsg.Message = "id is required"
        return res.status(400).json(resMsg);
    }
   
    if(!req.body.username || req.body.username == '') {
        resMsg.Message = "username is required"
        return res.status(400).json(resMsg);
    }


    let fieldsToUpdate = {}
    if(req.body.surname !== undefined) {
        fieldsToUpdate["surname"] = req.body.surname
    }

    if(req.body.firstname !== undefined) {
        fieldsToUpdate["firstname"] = req.body.firstname
    }

    if(req.body.username !== undefined) {
        fieldsToUpdate["username"] = req.body.username
    }

    if(req.body.mobile !== undefined) {
        fieldsToUpdate["mobile"] = req.body.mobile
    }

    if(req.body.email !== undefined) {
        fieldsToUpdate["email"] = req.body.email

        const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if (!re.test(req.body.email)) {
            resMsg.Message = "Email do not match correct format"
            return res.status(400).json(resMsg);
        }
    }

    if(req.body.password !== undefined) {
        if (!checkPassword(req.body.password)) {
            resMsg.Message = "Password must be minimum 8 letter with at least a symbol, uppercase, lowercase letters and a number";
            return res.status(400).json(resMsg);
        }
        fieldsToUpdate["password"] = bcrypt.hashSync(req.body.password, SALT)
    }

    if(req.body.role !== undefined) {
        fieldsToUpdate["role"] = req.body.role
    }

    if(req.body.countryId !== undefined) {
        fieldsToUpdate["countryId"] = req.body.countryId
    }

    if(req.body.supervisorId !== undefined) {
        fieldsToUpdate["supervisorId"] = req.body.supervisorId
    }

    fieldsToUpdate["id"] = req.body.id

    try {
        const sqlQuery = "select * from users where id = $1 ";
        let result = await pgsql.query(sqlQuery, [req.body.id ])
        if (result.rowCount == 0) {
            resMsg.Message = "No matching record found"
            return res.status(400).json(resMsg);
        } else {
            let jwtPayload = jwtVerify(req.cookies[process.env.COOKIE])
            if(fieldsToUpdate.countryId !== undefined && fieldsToUpdate.countryId !== null){
                jwtPayload.countryId = fieldsToUpdate.countryId
            }

            //check for base64 string
            if (req.body.image !== undefined) {
                const re = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/
                if (req.body.image.split("base64,").length==2 && re.test(req.body.image.split("base64,")[1])) {
                    try {
                        let bucketName = "user-images"
                        let filetype = req.body.image.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)[0];
                        let filename = `${bucketName}-${req.body.username}.${mime.extension(filetype)}`
                        awsS3Upload(filename, filetype, req.body.image)
                        fieldsToUpdate["image"] = filename
                    } catch (error) {
                        console.log(error)
                    }
                }
            }
            //check for base64 string

            sqlTableUpdate("users", users, fieldsToUpdate, jwtPayload).then((result) => {
                resMsg.Message = `${req.body.username} updated`
                resMsg.Type = "success"
                resMsg.Body = fieldsToUpdate.id
                return res.json(resMsg);
            })
        }
    } catch(error) {
        resMsg.Type = "error"
        resMsg.Message = `unable to retrieve records`
        return res.status(400).json(resMsg);
    }
    
});

function checkPassword(str) {
    var re = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    return re.test(str);
}



export default router;