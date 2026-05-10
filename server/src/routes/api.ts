import { Router } from 'express';
import { OracleEndpoint } from './oracleRoute';

const router: Router = Router();

router.use('/oracle', OracleEndpoint);

export default router;