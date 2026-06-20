const { google } = require('googleapis');

module.exports = async function handler(req, res) {
  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: '공지사항!A:D',
    });

    const rows = response.data.values || [];
    const header = rows[0] || [];
    const dataRows = rows.slice(1);

    const idx = {
      title: header.indexOf('제목'),
      content: header.indexOf('내용'),
      link: header.indexOf('링크'),
      status: header.indexOf('상태'),
    };

    const notices = dataRows
      .filter(row => row[idx.title])
      .map(row => ({
        title: row[idx.title] || '',
        content: row[idx.content] || '',
        link: row[idx.link] || '',
        status: (row[idx.status] || '진행중').trim() === '마감' ? 'closed' : 'ongoing'
      }));

    res.status(200).json({ success: true, notices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.toString() });
  }
};