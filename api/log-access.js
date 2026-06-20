const { google } = require('googleapis');

module.exports = async function handler(req, res) {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ success: false, message: '이름이 필요합니다.' });

    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });

    const now = new Date();
    const ts = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') +
      ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: '접속로그!A:B',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [[ts, name]] }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.toString() });
  }
};
