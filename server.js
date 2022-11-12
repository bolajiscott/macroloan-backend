import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import cookieParser from 'cookie-parser';
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express'

import authRoutes from './routes/auths/auths.js';
import elearningRoutes from './routes/elearning/_routes.js';
import setupsRoutes from './routes/setups/_routes.js';
import walletsetupRoutes from './routes/walletsetup/_routes.js';
import driverappRoutes from './routes/driverapp/_routes.js';

import deleteRoutes from './routes/delete/_routes.js';
import driversRoutes from './routes/drivers/_routes.js';
import profilesRoutes from './routes/profiles/_routes.js';
import documentsRoutes from './routes/documents/_routes.js';
import nextofkinsRoutes from './routes/nextofkins/_routes.js';
import guarantorsRoutes from './routes/guarantors/_routes.js';
import nationalidsRoutes from './routes/nationalids/_routes.js';
import passportidsRoutes from './routes/passportids/_routes.js';
import visaidsRoutes from './routes/visaids/_routes.js';
import bankdetailsRoutes from './routes/bankdetails/_routes.js';
import driverLicensesRoutes from './routes/driverlicenses/_routes.js';
import verificationscheduleRoutes from './routes/verificationschedule/_routes.js';
import transporterRoutes from './routes/transporter/_routes.js';
import websiteRoute from './routes/website/website.route.js';
import systosysRoute from './routes/systosys/_routes.js';
import vehicleassignmentRoutes from './routes/vehicleassignment/_routes.js';
import featureFlagRoutes from "./routes/featureFlags/_routes.js"
import { sqlDBInit } from './dbtables/pgsql.js';
import { opscmsSQLDBInit } from './dbtables/pgsqlopscms.js';
import checkAuth from './config/auth.js'
import { checkJWTCookie } from './config/utils.js'
import mung from 'express-mung'
import AuditMiddleware from './middleware/audit.js';
import InitSequelize from "./models/database.js"
import Config from "./config/config.js";
import updateDriversWalletTask from "./jobs/updateDriversWallet.js"
import jobRoutes from "./routes/job/_routes.js"
import auditRoutes from "./routes/audit/_routes.js"
import errorHandlerMiddleware from './middleware/error_handler.js'
import headerMiddleware from './middleware/header.js'

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8181

sqlDBInit()
opscmsSQLDBInit()
InitSequelize()

updateDriversWalletTask.start()

const allowCORS = function (req, res, next) {
    var origin = req.get('origin');
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
};

app.use(cookieParser())
app.use(cors());
app.options('*', cors())
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json({ limit: '50mb' }));
app.use(headerMiddleware)

//website routes
app.use('/api/website', allowCORS, checkAuth, websiteRoute)


//driver basic info routes
app.use('/api/systosys', allowCORS, checkAuth, systosysRoute)

app.use(checkJWTCookie)

// audit req and response
if (Config.feature.auditReqRes === "enabled") {
    app.use(AuditMiddleware.LogRequest)
    app.use(mung.jsonAsync(AuditMiddleware.LogResponse))
}

//auth routes
app.use('/api/auth', authRoutes)

//elearning routes
app.use('/api/elearning', elearningRoutes)

//transporter routes
app.use('/api/transporter', transporterRoutes)

//setup routes
app.use('/api/setups', setupsRoutes)

//Wallet Setup routes
app.use('/api/walletsetup', walletsetupRoutes)

//DriverApp Setup routes
app.use('/api/driverapp', driverappRoutes)

//drivers routes
app.use('/api/drivers', driversRoutes)

//profiles routes
app.use('/api/profiles', profilesRoutes)

//documents routes
app.use('/api/documents', documentsRoutes)

//nextofkins routes
app.use('/api/nextofkins', nextofkinsRoutes)

//guarantors routes
app.use('/api/guarantors', guarantorsRoutes)

//nationalids routes
app.use('/api/nationalids', nationalidsRoutes)

//passportids routes
app.use('/api/passportids', passportidsRoutes)

//visaids routes
app.use('/api/visaids', visaidsRoutes)

//bankdetails routes
app.use('/api/bankdetails', bankdetailsRoutes)

//drivers routes
app.use('/api/driverlicenses', driverLicensesRoutes)

//verificationschedule routes
app.use('/api/verificationschedule', verificationscheduleRoutes)

//vehicle assignment routes
app.use('/api/vehicleassignment', vehicleassignmentRoutes)

//delete-driver-profile
app.use('/api/delete-driver-profile', deleteRoutes)

app.use('/api/features', featureFlagRoutes)

app.use('/api/job', jobRoutes)

app.use('/api/audit', auditRoutes)

app.use(express.static('uiapp'))

// Extended: https://swagger.io/specification/#infoObject
const swaggerOptions = {
    swaggerDefinition: {
        info: {
            title: 'Moove Onboarding',
            description: 'The onboarding app for Moove Africa in SSA markets',
            contact: {
                name: 'Moove Technology'
            },
            servers: ['http://localhost:8080']
        }
    },

    // 
    apis: ['./routes/*/*.js']
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.use(errorHandlerMiddleware)

app.listen(PORT, console.log(`server is running in ${process.env.NODE_ENV} mode on port ${PORT}`))
