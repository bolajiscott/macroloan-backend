import ProfilesModel from "../../../dbtables/profiles.js"
import UserModel from "../../../dbtables/user.js"



const BASE64_REGEX = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/
const FILE_TYPE_REGEX = /[^:]\w+\/[\w-+\d.]+(?=|,)/

const Handler = {
    updateNumberSequence: async (fields, jwtToken) => {
        await NumberSequencesModel.update(fields, jwtToken)
    },
    createProfile: async (reqBody) => {        
        await ProfilesModel.create(reqBody)
    }
}
export default Handler


