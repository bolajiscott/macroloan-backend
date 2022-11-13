import ProfilesModel from "../../../dbtables/profiles.js"
import { NAME_REGEX, EMAIL_REGEX, PASSWORD_REGEX } from "../../../config/constants.js"

export const validateSignInRequest = async (req) => {
    // let tokenErr = validateJWTToken(jwtToken)
    // if (tokenErr != null) {
    //     return tokenErr
    // }

    let reqError = validateRequest(req)
    if (reqError != null) {
        return reqError
    }

    let UsersByEmail = await ProfilesModel.getByEmail(req.body.email);
    if (UsersByEmail.rowCount == 0) {
        let errorMsg = "No Profile with this email exist"
        return errorMsg
    }

    return null
}

export const validateSignUpRequest = async (req) => {
    // let tokenErr = validateJWTToken(jwtToken)
    // if (tokenErr != null) {
    //     return tokenErr
    // }

    let reqError = validateCreateRequest(req)
    if (reqError != null) {
        return reqError
    }

    let duplicateError = await checkIfProfileExist(req)
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

export const validateCreateRequest = (req) => {
    if (!req.body.surname || !req.body.firstname || !req.body.dateofbirth || !req.body.mobile || !req.body.occupation || !req.body.placeofwork || !req.body.address) {
        return "Please provide fullname, date of birth and mobile phone, address, occupation, place of work,"
    }

    if (!req.body.surname.trim().match(NAME_REGEX)) {
        return "Surname must be alphabets"
    }

    if (!req.body.firstname.trim().match(NAME_REGEX)) {
        return "Firstname must be alphabets"
    }

    if (req.body.email === "") {
        return "Email must be provided"
    }

    if (req.body.password === "") {
        return "Password must be provided"
    }

    if (!EMAIL_REGEX.test(req.body.email)) {
        return "Email is not a valid"
    }
    if (!PASSWORD_REGEX.test(req.body.password)) {
        return "Password must be minimum 8 letter with at least a symbol, uppercase, lowercase letters and a number"
    }

    return null
}

export const checkIfProfileExist = async (req) => {
    try {
        let profilesByEmail = await ProfilesModel.getByEmail(req.body.email);
        if (profilesByEmail.rowCount > 0) {
            let errorMsg = "Profile with this email already exists"
            return errorMsg
        }

        let profilesByMobile = await ProfilesModel.getByMobile(req.body.mobile)
        if (profilesByMobile.rowCount > 0) {
            let errorMsg = "Profile with this mobile number already exists"
            return errorMsg
        }
    } catch (error) {
        return error.message
    }

    return null
}
