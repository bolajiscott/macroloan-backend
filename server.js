import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auths/route.js';
import { sqlDBInit } from './dbtables/pgsql.js';
import checkAuth from './config/auth.js'
import { checkJWTCookie } from './config/utils.js'

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8181;

sqlDBInit()


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

// //website routes
// app.use('/api/website', allowCORS, checkAuth, websiteRoute)


// //driver basic info routes
// app.use('/api/systosys', allowCORS, checkAuth, systosysRoute)

app.use(checkJWTCookie)

//auth routes
app.use('/api/auth', authRoutes)


app.use(express.static('uiapp'))

// app.listen(PORT, console.log(`server is running in ${process.env.NODE_ENV} mode on port ${PORT}`))

app.listen(PORT, function(){
    console.log("App is running on port " + PORT);
});
