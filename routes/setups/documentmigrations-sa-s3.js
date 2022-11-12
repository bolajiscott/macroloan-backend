import express from 'express';
import {pgsql, sqlTableInsert} from '../../dbtables/pgsql.js';
import { jwtVerify, isSuperUser, awsS3Upload } from '../../config/utils.js'
import { documents } from '../../dbtables/onboard.js';
import axios from 'axios';

const router = express.Router();

/**
 * @swagger
 * /api/setups/migrations/import:
 *   post:
 *     description: import csv of driver information from different country
 *     tags: [migrations]
 *     parameters:
 *     - name: csv 
 *       description: csv file of driver information
 *       required: true
 *       type: string
 *     - name: countryid 
 *       description: country of migrated data
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: Returns number of succesfull imports.
 *       400:
 *          description: unable to import records
*/


router.post('/import', async (req, res) => {
    req.setTimeout(600000);

    let resMsg = {Type: "", Message: "", Body: {} }
    resMsg.Type = "error"
    resMsg.Message = ``

    let jwtToken = jwtVerify(req.cookies[process.env.COOKIE])

    if (!isSuperUser(jwtToken.role)) {
        resMsg.Message = "Only managers can migrate data"
        return res.status(400).json(resMsg);
    }
    
    if(!req.body.countryId || req.body.countryId == 0) {
        req.body.countryId = jwtToken.countryId;
    }
    
    if (req.body.countryId == 0) {
        resMsg.Message = "Please select country"
        return res.status(400).json(resMsg);
    }

    if (!req.body.documents || req.body.documents.length == 0) {
        resMsg.Message = "no documents to import"
        return res.status(400).json(resMsg);
    }


    //1 - Find the document type for header 1
    let existingDocumentTypes = [];
    try {
        const resExistingDocumentTypes = await pgsql.query(`select dt.id as id, dt.category as category, lower(dt.name) as name, dt.countryid, c.name as country  from documenttypes as dt left join countries as c on c.id = dt.countryid where dt.category='drivers' and dt.countryid = ${req.body.countryId}`);
        if (resExistingDocumentTypes.rows !== undefined) {
            existingDocumentTypes = resExistingDocumentTypes.rows;
            // resExistingDocumentTypes.rows.forEach(record => {
            //     existingDocumentTypes[record.name.toLowerCase()] = record
            // })
        }
    } catch (err) {
        resMsg.Type = "error"
        resMsg.Message = `unable to find existing docuemnt types for the country`
        console.log(err)
        return res.status(400).json(resMsg);
    }

    //2 - Find the existing drivers
    let existingProfiles = {};
    try {
        const resExistingProfiles = await pgsql.query(`select id, code from profiles`);
        if (resExistingProfiles.rows !== undefined) {
            resExistingProfiles.rows.forEach(record => {
                existingProfiles[record.code.toLowerCase()] = record
            })
        }
    } catch (err) {
        resMsg.Type = "error"
        resMsg.Message = `unable to find existing profiles`
        console.log(err)
        return res.status(400).json(resMsg);
    }

    //3 - Find the existing driver's documents
    let existingDocuments = {};
    try {
        const resExistingDocuments = await pgsql.query(`select id, code, profileid, doctypeid from documents where countryid = ${req.body.countryId}`);
        if (resExistingDocuments.rows !== undefined) {
            resExistingDocuments.rows.forEach(record => {
                let key = `${record.profileid}-${record.doctypeid}`
                existingDocuments[key] = record
            })
        }
    } catch (err) {
        console.log(err)
    }
    

    //3 - Find the existing next of kin's documents @todo
 
    let importedRecords = 0
    let skippedRecords = 0
    let importedList = req.body.documents

    let headerKeys = []
    let docTypeOne = {}
    let docTypeTwo = {}

    let docTypeOneName = ''
    let docTypeTwoName = ''

    
    let saS3BucketURL = 'https://moove-onboarding-sa-docs.s3.eu-west-1.amazonaws.com/media/'
    
    
    let index = 0;
    for (const linerecord of importedList) {
        index++;
        
        let record = linerecord.split(",");
        if (linerecord.trim() == "" || record.length !== 3) {
            // console.log("skipping empty line");
            continue;
        }

        if (index == 1) {
            headerKeys = record

            let docTypeList = existingDocumentTypes.filter(docType => docType.name.toLowerCase().includes(headerKeys[1].toLowerCase()))
            if (docTypeList.length > 0) {
                docTypeOne = docTypeList[0]
                docTypeOneName = docTypeOne.name
            }
            
            docTypeList = existingDocumentTypes.filter(docType => docType.name.toLowerCase().includes(headerKeys[2].toLowerCase()))
            if (docTypeList.length > 0) {
                docTypeTwo = docTypeList[0]
                docTypeTwoName = docTypeTwo.name
            }

            continue;
        }
        
        let importedLine = {
            code: record[0],
            doc1: record[1],
            doc2: record[2],
        }


        let documentArray = []
        if (importedLine.doc1.trim() !== "") {
            documentArray.push({
                key: headerKeys[1],
                value: importedLine.doc1
            })
        }

        if (importedLine.doc2.trim() !== "") {
            documentArray.push({
                key: headerKeys[2],
                value: importedLine.doc2
            })
        }

        if (documentArray.length == 0) {
            skippedRecords++
            continue
        }

        //find driver exists:
        if (!existingProfiles[importedLine.code.toLowerCase()]) {
            console.log(`skipping ${importedLine.code} as it does not exist - please import driver data before document`)
            skippedRecords++
            continue
        }

        let driverProfile = existingProfiles[importedLine.code.toLowerCase()]


        
        let docCounter = 0
        for (const doc of documentArray) {
            docCounter++
            
            let docType = {id:0, name:"", category: "", country:""}
            //find doc type exists:
            if (docCounter == 1 && docTypeOneName !== '') {
                docType = docTypeOne
            } 

            if (docCounter == 2 && docTypeTwoName !== '') {
                docType = docTypeTwo
            }

           
            if (docType.name == "") {
                skippedRecords++
                continue
            }

            //check if doc exists

            let key = `${driverProfile.id}-${docType.id}`
            if (existingDocuments[key]) {
                console.log(`skipping doc ${doc.value} of doctype ${docType.name} since it already exists for ${driverProfile.code}`)
                skippedRecords++
                continue
            }
             

            let docData = {
                code: docType.category,
                name: doc.value,
                doctypeId: docType.id,
                profileId: driverProfile.id,
                countryId: req.body.countryId,
                filename: doc.value,
                filetype: "",
                filepath: "",
            }

            let bucketName = `${docType.country}-${docType.category}`.toLowerCase().replace(/\s/g, '')
            docData.filepath = `${bucketName}-${driverProfile.code}-${docData.filename}`
            
            let image = {}
            try {
                image = await axios.get(`${saS3BucketURL}${docData.filename}`, {
                    responseType: 'arraybuffer'
                });
            } catch(err) {
                console.log(`unable to fetch image doc ${doc.value} of doctype ${docType.name} for DRN ${driverProfile.code}`)
                console.log(err)
                skippedRecords++
                continue
            }

            const raw = Buffer.from(image.data).toString('base64');
            let base64 = "data:" + image.headers["content-type"] + ";base64," + raw;
            docData.filetype = image.headers["content-type"]

            try {
                 await awsS3Upload(docData.filepath, image.headers["content-type"], base64)
                 sqlTableInsert("documents", documents, docData, jwtToken)
                 importedRecords++
            } catch (err) {
                 console.log(err)
             }
            await new Promise(r => setTimeout(r, 5));
        }
    }

    resMsg.Type = "success"
    resMsg.Message = `${importedRecords} records imported, ${skippedRecords} records skipped`
    return res.status(200).json(resMsg);

});
export default router;