import jwt from 'jsonwebtoken'

const HTTP_BAD_REQUEST = 400
const SECRET = process.env.SECRET
const UnauthorizedResponse = {
    Type: "error",
    Message: "You have no permission to access this route",
    Body: {
        Redirect: "signin"
    }
}

const checkAuth = (req, res, next) => {
    let jwtToken = req.headers.authorization
    if (!jwtToken) {
        UnauthorizedResponse.Error = "There is no JWT Token"
        res.status(HTTP_BAD_REQUEST).json(UnauthorizedResponse)
        return
    }

    try {
        if (jwtToken.startsWith("Bearer")) {
            jwtToken = jwtToken.replace("Bearer ", "")
        }
        let token = jwt.verify(jwtToken, SECRET)
        if (!jwtToken) {
            res.status(HTTP_BAD_REQUEST).json(UnauthorizedResponse)
            return
        }

        req.operator = token
        next()
    } catch (error) {
        console.log(`Got error while validating jwt token. Error: ${error}`)
        UnauthorizedResponse.Error = error.message
        res.status(HTTP_BAD_REQUEST).json(UnauthorizedResponse)
        return
    }
}

export default checkAuth