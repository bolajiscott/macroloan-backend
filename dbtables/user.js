import { pgsql } from "./pgsql.js"

const UserModel = {
    getByEmail: async (email) => {
        try {
            const sqlQuery = "select u.id, u.surname, u.password, u.firstname, u.email, u.mobile, u.status, u.role, COALESCE(p.id, 0) as profileid from users as u left join profiles as p on p.userid = u.id where u.email = $1"
            let result = await pgsql.query(sqlQuery, [email])
            return result
        } catch (error) {
            console.log(`Got error while fetching users, error: ${error}`)
        }
    },
}

export default UserModel