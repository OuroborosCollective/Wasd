// @ts-nocheck
import { Router } from 'express';
import { OracleEndpoint } from './oracle.endpoint';

const router: Router = Router();

router.use('/oracle', OracleEndpoint);

export default router;