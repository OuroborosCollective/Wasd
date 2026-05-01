import { Router } from 'express';
import { 
    getTradingPairs, 
    executeTrade, 
    getTradeHistory 
} from './trading.controller.js';
import { validateTradeRequest } from './trading.validator.js';
import { authenticateB2B } from '../../middleware/auth.js';
import { logger } from '../../../utils/logger.js';

const router = Router();

/**
 * @route GET /api/v1/b2b/trading/pairs
 * @desc Get all available trading pairs
 */
router.get('/pairs', authenticateB2B, getTradingPairs);

/**
 * @route POST /api/v1/b2b/trading/execute
 * @desc Execute a new trade
 */
router.post('/execute', authenticateB2B, validateTradeRequest, executeTrade);

/**
 * @route GET /api/v1/b2b/trading/history
 * @desc Get trade history for the authenticated partner
 */
router.get('/history', authenticateB2B, getTradeHistory);

export default router;