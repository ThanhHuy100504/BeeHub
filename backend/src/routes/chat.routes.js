const express = require('express');
const chatAttachmentsController = require('../controllers/chat-attachments.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { handleChatAttachmentUpload } = require('../middleware/upload.middleware');

const router = express.Router();

const NEXT_INTERNAL_URL = process.env.NEXT_INTERNAL_URL || 'http://127.0.0.1:3001';

router.post(
  '/attachments',
  requireAuth,
  handleChatAttachmentUpload,
  chatAttachmentsController.uploadAttachment,
);

router.post('/ai', async (req, res) => {
  try {
    const response = await fetch(`${NEXT_INTERNAL_URL}/api/chat/ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
      },
      body: JSON.stringify(req.body || {}),
    });

    const data = await response.json().catch(() => ({}));
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[Chat AI Proxy] Error forwarding to Next.js:', error);
    return res.status(502).json({
      error: 'Xin lỗi, hiện tại chưa kết nối được trợ lý AI. Vui lòng thử lại sau.',
    });
  }
});

module.exports = router;
