return send(res, 200, {
  openai_exists: !!process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || null,
  webhook: !!process.env.WEBHOOK_SECRET,
  business: process.env.BUSINESS_NAME || null
});
