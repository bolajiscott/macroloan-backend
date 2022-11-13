import { pgsql, sqlTableInsert, sqlTableUpdate } from "./pgsql.js"
import { profiles, users } from "./base.js"

const ProfilesModel = {
    getByEmail: async (email) => {
        try {
            const sqlQuery = "select * from profiles where email = $1"
            let result = await pgsql.query(sqlQuery, [email])
            return result
        } catch (error) {
            console.log(`Got error while fetching profiles, error: ${error}`)
            throw error
        }
    },
    getByMobile: async (mobilePhone) => {
        try {
            const sqlQuery = "select * from profiles where mobile = $1"
            let result = await pgsql.query(sqlQuery, [mobilePhone])
            return result
        } catch (error) {
            console.log(`Got error while fetching profiles, error: ${error}`)
            throw error
        }
    },
    getByIDAndCode: async (id, code) => {
        try {
            const sqlQuery = "select * from profiles where role = 'driver' and id = $1 and code = $2"
            let result = await pgsql.query(sqlQuery, [id, code])
            return result
        } catch (error) {
            console.log(`Got error while fetching profiles, error: ${error}`)
            throw error
        }
    },
    getByCode: async (code) => {
        try {
            const sqlQuery = "select * from profiles where role = 'driver' and code = $1"
            let result = await pgsql.query(sqlQuery, [code])
            return result
        } catch (error) {
            console.log(`Got error while fetching profiles, error: ${error}`)
            throw error
        }
    },
    getById: async (id) => {
        try {
            const sqlQuery = "select * from profiles where role = 'driver' and id = $1"
            let result = await pgsql.query(sqlQuery, [id])
            return result
        } catch (error) {
            console.log(`Got error while fetching profiles, error: ${error}`)
            throw error
        }
    },
    create: async (user) => {
        await sqlTableInsert("users", users, user).then (() => {
            let profile = {
                surname: user.surname,
                firstname: user.firstname,
                email: user.email,
                gender: user.gender,
                mobile: user.mobile,
                dateofbirth: user.dateofbirth,
                occupation: user.occupation,
                placeofwork: user.placeofwork,
                role: user.role,
                address: user.address,
                code: user.code,
                status: user.status,
                userId: user.id
            }
            sqlTableInsert("profiles", profiles, profile)
        })
    },
    update: async (updatedProfile, jwtToken) => {
        await sqlTableUpdate("profiles", profiles, updatedProfile, jwtToken)
    },
    updateByCode: async (updatedProfile) => {
        try {
            const sqlQuery = `Update profiles SET status = '${updatedProfile.status}' where role = 'driver' and code = '${updatedProfile.code}'`
            let result = await pgsql.query(sqlQuery)
            return result
        } catch (error) {
            console.log(`Got error while fetching profiles, error: ${error}`)
            throw error
        }
    },
    getAll: async () => {
        try {
            const sqlQuery = "select * from profiles where role = 'driver'"
            let result = await pgsql.query(sqlQuery)
            return result
        } catch (error) {
            console.log(`Got error while fetching profiles, error: ${error}`)
            throw error
        }
    },
}

export default ProfilesModel