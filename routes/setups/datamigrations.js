import express from 'express';
import {pgsql, sqlTableInsert, sqlTableUpdate} from '../../dbtables/pgsql.js';
import { jwtVerify, isSuperUser } from '../../config/utils.js'
import { profiles, bankdetails, driverlicenses, nationalids, nextofkins } from '../../dbtables/onboard.js';

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
    
    if (!req.body.profiles || req.body.profiles.length == 0) {
        resMsg.Message = "no profiles to import"
        return res.status(400).json(resMsg);
    }

    //find market information
    let existingMarket = {};
    try {
        const resExistingMarkets = await pgsql.query(`select * from markets where countryid = ${req.body.countryId}`);
        if (resExistingMarkets.rows !== undefined) {
            resExistingMarkets.rows.forEach(record => {
                existingMarket[record.name.toLowerCase()] = record
            })
        }
    } catch (err) {
        resMsg.Type = "error"
        resMsg.Message = `unable to find existing markets`
        console.log(err)
        return res.status(400).json(resMsg);
    }

    //find regionstate information
    let existingRegionstate = {};
    try {
        const resExistingRegionstates = await pgsql.query(`select * from regionstates where countryid = ${req.body.countryId}`);
        if (resExistingRegionstates.rows !== undefined) {
            resExistingRegionstates.rows.forEach(record => {
                existingRegionstate[record.name.toLowerCase()] = record
            })
        }
    } catch (err) {
        resMsg.Type = "error"
        resMsg.Message = `unable to find existing regions/states/provinces`
        console.log(err)
        return res.status(400).json(resMsg);
    }

    //find regioncity information
    let existingCityarea = {};
    try {
        const resExistingCityarea = await pgsql.query(`select * from cityareas where countryid = ${req.body.countryId}`);
        if (resExistingCityarea.rows !== undefined) {
            resExistingCityarea.rows.forEach(record => {
                existingCityarea[record.name.toLowerCase()] = record
            })
        }
    } catch (err) {
        resMsg.Type = "error"
        resMsg.Message = `unable to find existing city/area`
        console.log(err)
        return res.status(400).json(resMsg);
    }

    //find banking information
    let existingBanks = {};
    try {
        const resExistingBanks = await pgsql.query(`select * from banks where countryid = ${req.body.countryId}`);
        if (resExistingBanks.rows !== undefined) {
            resExistingBanks.rows.forEach(record => {
                existingBanks[record.name.toLowerCase()] = record
            })
        }
    } catch (err) {
        resMsg.Type = "error"
        resMsg.Message = `unable to find existing city/area`
        console.log(err)
        return res.status(400).json(resMsg);
    }

    //find banking information
    let existingBanksDetails = {};
    try {
        const resExistingBanksDetails = await pgsql.query(`select * from bankdetails`);
        if (resExistingBanksDetails.rows !== undefined) {
            resExistingBanksDetails.rows.forEach(record => {
                existingBanksDetails[record.driverId] = record
            })
        }
    } catch (err) {
        resMsg.Type = "error"
        resMsg.Message = `unable to find existing bank details`
        console.log(err)
        return res.status(400).json(resMsg);
    }

    //find driverlicenses information
    let existingDriverlicenses = {};
    try {
        const resExistingDriverlicenses = await pgsql.query(`select * from driverlicenses`);
        if (resExistingDriverlicenses.rows !== undefined) {
            resExistingDriverlicenses.rows.forEach(record => {
                existingDriverlicenses[record.profileId] = record
            })
        }
    } catch (err) {
        resMsg.Type = "error"
        resMsg.Message = `unable to find driver licenses`
        console.log(err)
        return res.status(400).json(resMsg);
    }

    //find nnational ids information
    let existingNationalids = {};
    try {
        const resExistingNationalids = await pgsql.query(`select * from nationalids`);
        if (resExistingNationalids.rows !== undefined) {
            resExistingNationalids.rows.forEach(record => {
                existingNationalids[record.profileId] = record
            })
        }
    } catch (err) {
        resMsg.Type = "error"
        resMsg.Message = `unable to find national id`
        console.log(err)
        return res.status(400).json(resMsg);
    }

    //find existing driver information in profile table
    let existingProfiles = {};
    try {
        // const resExistingProfiles = await pgsql.query(`select * from profiles where countryid = ${req.body.countryId}`);
        const resExistingProfiles = await pgsql.query(`select * from profiles`);
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

    
    let importedRecords = 0
    let updatedRecords = 0
    let importedList = req.body.profiles

    let index = 0;
    for (const linerecord of importedList) {
        index++;
        if(index==1) {
            continue;
        }

        let record = linerecord.split(",");
        if (linerecord.trim() == "" || record.length !== 24) {
            // console.log("skipping empty line");
            continue;
        }
        
        
        let importedLine = {
            code: record[0],
            surname: record[1],
            firstname: record[2],
            middlename: record[3],
            maritalstatus: record[4],
            email: record[5],
            mobile: record[6],
            dateofbirth: record[7],
            gender: record[8],
            address: record[9],
            cityareaofresidence: record[10],
            regionstateofresidence: record[11],
            accountname: record[12],
            accountno: record[13],
            bank_name: record[14],
            market: record[15],
            nationalid: record[16],
            driverlicenseno: record[17],
            driverlicenseexp: record[18],
            nextofkin_firstname: record[19],
            nextofkin_lastname: record[20],
            nextofkin_email: record[21],
            nextofkin_mobile: record[22],
            nextofkin_address: record[23]
        }

        
        try {            

            let newProfile = {
                id: 0,
                code: importedLine.code,
                surname: importedLine.surname,
                firstname: importedLine.firstname,
                middlename: importedLine.middlename,
                maritalstatus: importedLine.maritalstatus,
                email: importedLine.email,
                mobile: importedLine.mobile,
                dateofbirth: importedLine.dateofbirth,
                gender: importedLine.gender,
                address: importedLine.address,
                role: "driver",
                status: "driver-onboarded",
                marketId: existingMarket[importedLine.market.toLowerCase()] ? existingMarket[importedLine.market.toLowerCase()].id : 0,
                cityareaofresidenceId: existingCityarea[importedLine.cityareaofresidence.toLowerCase()] ? existingCityarea[importedLine.cityareaofresidence.toLowerCase()].id : 0,
                regionstateofresidenceId: existingRegionstate[importedLine.regionstateofresidence.toLowerCase()] ? existingRegionstate[importedLine.regionstateofresidence.toLowerCase()].id : 0,
                countryId: req.body.countryId
            }


            await new Promise(r => setTimeout(r, 5));
            try {

                let key = record[0].toLowerCase();
                if (existingProfiles[key]) {
                    updatedRecords++
                    newProfile.id = existingProfiles[key].id
                    // console.log("updating line: ", key, " --id-- ", newProfile.id);
                }

                const profileCode = newProfile.code;
                if (newProfile.id > 0) {
                    // delete newProfile.code;
                    await sqlTableUpdate("profiles", profiles, newProfile, jwtToken);
                } else {
                    await sqlTableInsert("profiles", profiles, newProfile, jwtToken);
                }
                // console.log(new Date().getTime(), ":", newProfile)

                importedRecords++
                let bankDetails = {
                    id:0,
                    driverId: newProfile.id,
                    bank: existingBanks[importedLine.bank_name.toLowerCase()] ? existingBanks[importedLine.bank_name.toLowerCase()].name : importedLine.bank_name.toLowerCase(),
                    name: importedLine.accountname,
                    number: importedLine.accountno,
                    countryId: newProfile.countryId,
                    marketId: newProfile.marketId
                }
                if (existingBanksDetails[bankDetails.driverId]) {
                    bankDetails = existingBanksDetails[bankDetails.driverId].id
                    sqlTableUpdate("bankdetails", bankdetails, bankDetails, jwtToken);
                } else {
                    sqlTableInsert("bankdetails", bankdetails, bankDetails, jwtToken);
                }



                let driversLicense = {
                    code: importedLine.driverlicenseno,
                    name: importedLine.driverlicenseno,
                    profileId: newProfile.id,
                    expirydate: importedLine.driverlicenseexp,
                    countryId: newProfile.countryId,
                    marketId: newProfile.marketId
                }
                if (existingDriverlicenses[driversLicense.profileId]) {
                    driversLicense.id = existingDriverlicenses[driversLicense.profileId].id
                    sqlTableUpdate("driverlicenses", driverlicenses, driversLicense, jwtToken);
                } else {
                    sqlTableInsert("driverlicenses", driverlicenses, driversLicense, jwtToken);
                }
                

                if (importedLine.nationalid.length > 0) {
                    let nationalIdentity = {
                        code: importedLine.nationalid,
                        name: importedLine.nationalid,
                        profileId: newProfile.id,
                        countryId: newProfile.countryId,
                        marketId: newProfile.marketId
                    }
                    if (existingNationalids[nationalIdentity.profileId]) {
                        nationalIdentity.id = existingNationalids[nationalIdentity.profileId].id
                        sqlTableInsert("nationalids", nationalids, nationalIdentity, jwtToken)
                    } else {
                        sqlTableInsert("nationalids", nationalids, nationalIdentity, jwtToken)
                    }
                }

                let nextofKin = {
                    id: 0,
                    code: profileCode + "NOK",
                    surname: importedLine.nextofkin_lastname,
                    firstname: importedLine.nextofkin_firstname,
                    middlename: "",
                    maritalstatus: "",
                    email: importedLine.nextofkin_email,
                    mobile: importedLine.nextofkin_mobile,
                    address: importedLine.nextofkin_address,
                    role: "nextofkin",
                    marketId: existingMarket[importedLine.market.toLowerCase()] ? existingMarket[importedLine.market.toLowerCase()].id : 0,
                    cityareaofresidenceId: existingCityarea[importedLine.cityareaofresidence.toLowerCase()] ? existingCityarea[importedLine.cityareaofresidence.toLowerCase()].id : 0,
                    regionstateofresidenceId: existingRegionstate[importedLine.regionstateofresidence.toLowerCase()] ? existingRegionstate[importedLine.regionstateofresidence.toLowerCase()].id : 0,
                    countryId: req.body.countryId
                }
                if (existingProfiles[nextofKin.code.toLowerCase()]) {
                    nextofKin.id = existingProfiles[nextofKin.code.toLowerCase()].id
                } 


                if (nextofKin.id > 0) {
                    const nextofKinCode = nextofKin.code;
                    // delete nextofKin.code;
                    // console.log("nextofKin:", nextofKin);
                    sqlTableUpdate("profiles", profiles, nextofKin, jwtToken).then(() => {
                        let nextofKinlink = {
                            code: nextofKinCode,
                            driverId: newProfile.id,
                            nextofkinId: nextofKin.id,
                            countryId: req.body.countryId,
                        }
                        // console.log("nextofKinlink:", nextofKinlink)
                        sqlTableInsert("nextofkins", nextofkins, nextofKinlink, jwtToken)
                    });
                } else {
                    sqlTableInsert("profiles", profiles, nextofKin, jwtToken).then(() => {
                        let nextofKinlink = {
                            code: nextofKin.code,
                            driverId: newProfile.id,
                            nextofkinId: nextofKin.id,
                            countryId: req.body.countryId,
                        }
                        // console.log("nextofKinlink:", nextofKinlink)
                        sqlTableInsert("nextofkins", nextofkins, nextofKinlink, jwtToken)
                    });
                }

            } catch(err) {
                console.log(err)
            }
            

        } catch(err) {
            console.log(err)
        }
    }

    resMsg.Type = "success"
    resMsg.Message = `${importedRecords} records imported, ${updatedRecords} records updated`
    resMsg.Data = importedList
    return res.status(200).json(resMsg);

});
export default router;