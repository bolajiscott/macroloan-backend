import ProfilesModel from "../../dbtables/profiles.js"

const Handler = {
    createProfile: async (reqBody) => {        
        await ProfilesModel.create(reqBody)
    },
    updateProfile: async (fields, jwtToken) => {        
        await ProfilesModel.update(fields, jwtToken)
    }
}
export default Handler


