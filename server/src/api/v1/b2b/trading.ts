import { Router, Request, Response } from 'express';
import { AREStateCompiler } from '../../../engine/AREStateCompiler';

const router: Router = Router();

interface B2BOrderRequest {
    orderId: string;
    clientId: string;
    pair: string;
    side: 'BUY' | 'SELL';
    amount: string;
    price: string;
    timestamp: number;
    proofState: string;
    signature: string;
}

interface ValidationResult {
    isValid: boolean;
    merkleRoot: string;
    rejectionReason?: string;
}

router.post('/order', async (req: Request, res: Response) => {
    try {
        const orderData: B2BOrderRequest = req.body;

        if (!orderData.orderId || !orderData.proofState) {
            return res.status(400).json({ error: 'INVALID_PAYLOAD' });
        }

        const stateCompiler = new AREStateCompiler();

        const validation: ValidationResult = await stateCompiler.validateTransition({
            state: orderData.proofState,
            event: {
                type: 'ORDER_PLACEMENT',
                payload: {
                    clientId: orderData.clientId,
                    pair: orderData.pair,
                    side: orderData.side,
                    amount: orderData.amount,
                    price: orderData.price
                }
            },
            signature: orderData.signature
        });

        if (!validation.isValid) {
            return res.status(422).json({
                error: 'STATE_VALIDATION_FAILED',
                reason: validation.rejectionReason
            });
        }

        const transitionId = await stateCompiler.commitOrderToState({
            orderId: orderData.orderId,
            merkleRoot: validation.merkleRoot,
            processedAt: Date.now()
        });

        return res.status(201).json({
            status: 'ACCEPTED',
            transitionId,
            merkleRoot: validation.merkleRoot,
            timestamp: Date.now()
        });

    } catch (error) {
        return res.status(500).json({ error: 'INTERNAL_COMPUTE_ERROR' });
    }
});

router.get('/status/:orderId', async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;
        const stateCompiler = new AREStateCompiler();
        const status = await stateCompiler.queryOrderState(Array.isArray(orderId) ? orderId[0] : orderId);

        if (!status) {
            return res.status(404).json({ error: 'ORDER_NOT_FOUND' });
        }

        return res.status(200).json(status);
    } catch (error) {
        return res.status(500).json({ error: 'QUERY_FAILURE' });
    }
});

export default router;