import express from "express"
import AuditService from "../../services/audit.service.js"

const router = express.Router()

router.get("/", async (req, res) => {
    let { limit, offset } = req.query

    let audits
    try {
        audits = await AuditService.GetAll(limit, offset)
    } catch (error) {
        let errResponse = {
            Type: "error",
            Message: "Got error while fetching audits",
            Error: error.message,
        }
        res.status(400).json(errResponse)
        return
    }

    res.status(200).json(audits)
})

export default router