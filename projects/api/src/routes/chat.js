const express = require('express');
const router = express.Router();
const memoryCache = require('../services/memoryCache');
const llmService = require('../services/llmService');

router.post('/agent-interact', async (req, res) => {
    try {
        const { npc_id, message } = req.body;

        if (!npc_id) {
            return res.status(400).json({ error: 'npc_id is required' });
        }

        const context = await memoryCache.recall(npc_id);
        
        const systemPrompt = `
            Character Traits: ${JSON.stringify(context.traits)}
            Relevant Memory Context: ${JSON.stringify(context.memories)}
            Instructions: Act according to the traits and memories provided.
        `;

        const llmResponse = await llmService.generateResponse({
            systemPrompt: systemPrompt,
            userPrompt: message,
            npc_id: npc_id
        });

        res.status(200).json({
            success: true,
            data: llmResponse
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;