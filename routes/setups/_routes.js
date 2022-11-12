import express from 'express';

const router = express.Router();

//admin setup routes
import bankRoutes from './banks.js';
import townRoutes from './towns.js';
import userRoutes from './users.js';
import marketRoutes from './markets.js';
import inviteRoutes from './invites.js';
import infosessionRoutes from './infosessions.js';
import cbtsessionRoutes from './cbtsessions.js';
import productRoutes from './products.js';
import planpartnerRoutes from './planpartners.js';
import driverplanpartnerRoutes from './driverplanpartners.js';
import marketlocationRoutes from './marketlocations.js';
import trainingscheduleRoutes from './trainingschedules.js';
import marketplanpartnerRoutes from './marketplanpartners.js';
import productmarketRoutes from './productmarkets.js';
import countryRoutes from './countries.js';
import cityareaRoutes from './cityareas.js';
import regionRoutes from './regions.js';
import regionstateRoutes from './regionstates.js';
import riderareamappingRoutes from './riderareamappings.js';
import documenttypeRoutes from './documenttypes.js';
import sequenceRoutes from './numbersequences.js';
import requiredfieldRoutes from './requiredfield.js'
import datamigrationsRoutes from './datamigrations.js'
import documentmigrationssas3Routes from './documentmigrations-sa-s3.js'

router.use('/banks', bankRoutes)
router.use('/towns', townRoutes)
router.use('/users', userRoutes)
router.use('/invites', inviteRoutes)
router.use('/infosessions', infosessionRoutes)
router.use('/cbtsessions', cbtsessionRoutes)
router.use('/markets', marketRoutes)
router.use('/marketlocations', marketlocationRoutes)
router.use('/trainingschedules', trainingscheduleRoutes)
router.use('/products', productRoutes)
router.use('/planpartners', planpartnerRoutes)
router.use('/driverplanpartners', driverplanpartnerRoutes)
router.use('/marketplanpartners', marketplanpartnerRoutes)
router.use('/productmarkets', productmarketRoutes)
router.use('/countries', countryRoutes)
router.use('/cityareas', cityareaRoutes)
router.use('/regions', regionRoutes)
router.use('/regionstates', regionstateRoutes)
router.use('/riderareamappings', riderareamappingRoutes)
router.use('/documenttypes', documenttypeRoutes)
router.use('/numbersequences', sequenceRoutes)
router.use('/requiredfields', requiredfieldRoutes)
router.use('/datamigrations', datamigrationsRoutes)
router.use('/documentmigrations-sa-s3', documentmigrationssas3Routes)
//adminsetup routes


export default router;