const { put } = require('@vercel/blob');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, message: 'POST만 허용됩니다.' });
    }

    const filename = req.headers['x-filename']
      ? decodeURIComponent(req.headers['x-filename'])
      : 'file-' + Date.now();
    const contentType = req.headers['content-type'] || 'application/octet-stream';

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    if (!buffer.length) {
      return res.status(400).json({ success: false, message: '파일 내용이 비어있습니다.' });
    }

    const blob = await put(filename, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: true,
    });

    res.status(200).json({ success: true, url: blob.url });
  } catch (error) {
    res.status(500).json({ success: false, message: error.toString() });
  }
};

module.exports.config = { api: { bodyParser: false } };
