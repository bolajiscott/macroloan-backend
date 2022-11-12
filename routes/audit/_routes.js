import express from "express"
import getRoute from "./get.js"

const router = express.Router()

router.use(getRoute)

export default router
