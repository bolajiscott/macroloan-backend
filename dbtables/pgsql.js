import pg from 'pg'
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { SALT } from '../config/utils.js'
import _ from "lodash"


pg.types.setTypeParser(1082, (value) => {
    return value;
});

pg.types.setTypeParser(pg.types.builtins.INT8, (value) => {
    return parseInt(value);
});

pg.types.setTypeParser(pg.types.builtins.FLOAT8, (value) => {
    return parseFloat(value);
});

pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => {
    return parseFloat(value);
});


dotenv.config();
const connectionString = process.env.DB_CONN

if (!connectionString || connectionString === "") {
    console.log("DB_CONN environment variables not set")
    process.exit(0)
}

export let pgsql = {}
const { Pool } = pg

try {
    pgsql = new Pool({ connectionString, })
} catch (error) {
    console.log(error)
    process.exit(0)
}

pgsql.on('error', (err) => {
    console.error('Error:', err);
});


import { users, profiles, loans, loanfinances } from '../dbtables/base.js';

const defaultFields = {
    id: "int8",
    createdBy: "int8",
    updatedBy: "int8",
    createDate: "timestamp",
    updateDate: "timestamp",
    status: "text",
    tableindex: ["createdby", "updatedby", "createdate", "updatedate", "status"],
    tableunique: ["id"]
}

//generate primary key
export const sqlTableID = () => {
    return Math.round(Date.now() * 10)
}


export const sqlDBInit = async () => {
    process.env.TZ = "Africa/Lagos";
    console.log("connecting to database")
    try {
        await pgsql.connect();
        console.log("connected to onboarding database!!!")
    } catch (error) {
        console.log(error)
        process.exit(0)
    }

    const allTables = {
        users: users, profiles: profiles, loans: loans, loanfinances: loanfinances
    }


    const sqlTable = "SELECT c.relname as tablename FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = $1 AND c.relkind = 'r' "

    for (const tableName in allTables) {
        try {
            let result = await pgsql.query(sqlTable, [tableName])
            if (result.rowCount == 0) {
                sqlTableCreate(tableName, allTables[tableName]).then((result) => {
                    if (result === true) {
                        switch (tableName) {
                            case "users":
                                // eslint-disable-next-line no-case-declarations
                                let defaultUser = {
                                    role: "superadmin",
                                    status: "active",
                                    failedMax: 10,
                                    mobile: "080",
                                    email: "superadmin@macroloan.com",
                                    firstname: "Super",
                                    surname: "Admin",
                                    username: "superadmin",
                                    password: "",
                                }

                                defaultUser.password = bcrypt.hashSync("supermacro", SALT)

                                sqlTableInsert("users", users, defaultUser, {
                                    userId: 0
                                }).then((result) => {
                                    //console.log("result: ", result)
                                })
                                break
                        }
                    }
                });
            }
        } catch (err) {
            console.log(err)
        }

    }
}


export const sqlTableCreate = async (tableName, tableFields) => {
    let success = false;

    if (tableName == "") {
        return success
    }

    function customizer(objValue, srcValue) {
        if (_.isArray(objValue)) {
            return _.union(objValue, srcValue);
        }
    }
    _.mergeWith(tableFields, defaultFields, customizer)



    let sqlCreate = "", sqlIndex = ""
    for (const fieldName in tableFields) {

        if (fieldName.toLowerCase() == "tableindex") {
            for (let indexFieldName of tableFields["tableindex"]) {
                sqlIndex += ` create index idx_${indexFieldName}_${tableName} on ${tableName} (${indexFieldName}); `
            }
        } else if (fieldName.toLowerCase() == "tableunique") {
            for (let uniqueFieldName of tableFields["tableunique"]) {
                sqlIndex += ` create unique index unq_idx_${uniqueFieldName}_${tableName} on ${tableName} (${uniqueFieldName}); `
            }
        } else {
            let defaultValue = ""
            const fieldType = tableFields[fieldName];

            switch (fieldType) {
                case "bool":
                    defaultValue = "DEFAULT false"
                    break;

                case "date":
                    defaultValue = "DEFAULT current_date"
                    break;

                case "time":
                    defaultValue = "DEFAULT current_time"
                    break;

                case "timestamp":
                    defaultValue = "DEFAULT current_timestamp"
                    break;

                case "text":
                    defaultValue = "DEFAULT ''"
                    break;

                case "float":
                case "float8":
                    defaultValue = "DEFAULT 0.0"
                    break;

                case "int":
                case "int8":
                    defaultValue = "DEFAULT 0"
                    break;

                default:
                    //console.log(`filedName [${fieldName}] fieldType [${fieldType}] is not catered for`)
                    break;
            }

            if (defaultValue !== "") {
                sqlCreate += `${fieldName} ${fieldType} ${defaultValue}`
            }

            if (sqlCreate !== "") {
                sqlCreate += ", "
            }
        }
    }

    if (sqlCreate == "") {
        return success
    }

    sqlCreate = sqlCreate.split(',').slice(0, -1).join(',')
    sqlCreate = `create table ${tableName} (${sqlCreate}); `

    // const sqlDrop = `drop table ${tableName}`
    // try {
    //     await pgsql.query(sqlDrop)
    // } catch (err) { console.log("drop table error") }

    try {
        let result = await pgsql.query(sqlCreate)
        if (sqlIndex !== "") {
            try {
                await pgsql.query(sqlIndex)
            } catch (err) {
                console.log(tableName, sqlIndex)
                console.log(tableFields)
                console.log(err)
            }
        }
        success = true
    } catch (err) {
        console.log(err);
        console.log(sqlCreate)
    }


    return success
}

export const sqlTableInsert = async (tableName, tableFields, jsonRecord, jwtToken) => {

    if (tableName == "") {
        return false
    }

    function customizer(objValue, srcValue) {
        if (_.isArray(objValue)) {
            return _.union(objValue, srcValue);
        }
    };

    _.mergeWith(tableFields, defaultFields, customizer)

    jsonRecord.id = sqlTableID()

    if (jsonRecord.marketId == undefined || jsonRecord.marketId == null) {
        jsonRecord.marketId = (jwtToken.marketId === undefined) ? 0 : jwtToken.marketId
    }

    if (jsonRecord.countryId == undefined || jsonRecord.countryId == null) {
        jsonRecord.countryId = (jwtToken.countryId === undefined) ? 0 : jwtToken.countryId
    }

    jsonRecord.createdBy = (jwtToken.userId === undefined) ? 0 : jwtToken.userId
    jsonRecord.updatedBy = (jwtToken.userId === undefined) ? 0 : jwtToken.userId

    jsonRecord.createDate = new Date().toUTCString();
    jsonRecord.updateDate = new Date().toUTCString();
    if (jsonRecord.status == null || jsonRecord.status == undefined || jsonRecord.status == "") {
        jsonRecord.status = "inactive"
    }

    let sqlInsert = "", sqlValues = "", sqlParams = []
    for (const fieldName in jsonRecord) {
        switch (fieldName.toLowerCase()) {
            case "tableindex":
            case "tableunique":
                break;

            default:
                const fieldType = tableFields[fieldName];
                switch (fieldType) {
                    case "bool":
                    case "date":
                    case "float":
                    case "float8":
                    case "int":
                    case "int8":
                    case "text":
                    case "time":
                    case "timestamp":

                        sqlInsert += `${fieldName}`
                        sqlParams.push(jsonRecord[fieldName])
                        sqlValues += "$" + (sqlParams.length)

                        if (sqlInsert !== "") {
                            sqlInsert += ", "
                        }
                        if (sqlValues !== "") {
                            sqlValues += ", "
                        }
                        break;

                    default:
                        //console.log(`filedName [${fieldName}] fieldType [${fieldType}] is not catered for`)
                        break;
                }
        }
    }

    if (sqlInsert == "") {
        return false
    }

    sqlInsert = sqlInsert.split(',').slice(0, -1).join(',')
    sqlValues = sqlValues.split(',').slice(0, -1).join(',')
    sqlInsert = `insert into ${tableName} (${sqlInsert}) values (${sqlValues});`

    try {
        let result = await pgsql.query(sqlInsert, sqlParams)
        if (result.rowCount > 0) {
            return true
        } else {
            return false
        }
    } catch (err) { console.log(err) }
}

export const sqlTableUpdate = async (tableName, tableFields, jsonRecord, jwtToken) => {

    if (tableName == "") {
        return false
    }

    if (jsonRecord.id == null || jsonRecord.id == undefined || jsonRecord.id == 0) {
        return false
    }

    function customizer(objValue, srcValue) {
        if (_.isArray(objValue)) {
            return _.union(objValue, srcValue);
        }
    };

    _.mergeWith(tableFields, defaultFields, customizer)

    jsonRecord.updateDate = new Date().toUTCString();

    jsonRecord.updatedBy = (jwtToken.userId === undefined) ? 0 : jwtToken.userId

    let sqlUpdate = "", sqlParams = []
    for (const fieldName in jsonRecord) {
        switch (fieldName.toLowerCase()) {
            case "id":
            case "createdby":
            case "createdate":
            case "tableindex":
            case "tableunique":
                break;

            default:
                const fieldType = tableFields[fieldName];
                switch (fieldType) {
                    case "bool":
                    case "date":
                    case "float":
                    case "float8":
                    case "int":
                    case "int8":
                    case "text":
                    case "time":
                    case "timestamp":

                        sqlParams.push(jsonRecord[fieldName])
                        sqlUpdate += `${fieldName} = $${sqlParams.length}`

                        if (sqlUpdate !== "") {
                            sqlUpdate += ", "
                        }

                        break;

                    default:
                        console.log(`filedName [${fieldName}] fieldType [${fieldType}] is not catered for`)
                        break;
                }
        }
    }

    if (sqlUpdate == "") {
        return false
    }

    sqlParams.push(jsonRecord.id)
    sqlUpdate = sqlUpdate.split(',').slice(0, -1).join(',')
    sqlUpdate = `update ${tableName} set ${sqlUpdate} where id = $${sqlParams.length};`
    // console.log(sqlUpdate)
    // console.log(sqlParams)

    try {
        let result = await pgsql.query(sqlUpdate, sqlParams)
        if (result.rowCount > 0) {
            return true
        } else {
            return false
        }
    } catch (err) { console.log(err) }
}
