import ProfilesModel from "../../dbtables/profiles.js"
import { NAME_REGEX, EMAIL_REGEX, PASSWORD_REGEX } from "../../config/constants.js"

export const validateUpdateRequest = async (req, jwtToken) => {
    let duplicateError = await checkIfProfileExist(req, jwtToken)
    if (duplicateError != null) {
        return duplicateError
    }

    return null
}

export const validateRequest = (req) => {
    if (!req.body.email || req.body.email === "") {
        return "Email is missing"
    }

    if (!req.body.password || req.body.password === "") {
        return "Password is missing"
    }

    if (!EMAIL_REGEX.test(req.body.email)) {
        return "Email is not a valid"
    }
    if (!PASSWORD_REGEX.test(req.body.password)) {
        return "Password must be minimum 8 letter with at least a symbol, uppercase, lowercase letters and a number"
    }

    return null
}

export const checkIfProfileExist = async (req, jwtToken) => {
    try {
        let profilesByEmail = await ProfilesModel.getByEmail(jwtToken.email);
        if (profilesByEmail.rowCount == 0) {
            let errorMsg = "Profile with this email doesn't exists"
            return errorMsg
        }
    } catch (error) {
        return error.message
    }

    return null
}
