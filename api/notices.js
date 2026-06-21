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
      range: '공지사항!A1:Z200',
    });

    const rows = response.data.values || [];

    // 헤더가 어느 행에서 시작하든 '제목'이 있는 행을 찾아 헤더로 사용
    let headerRowIdx = -1;
    let header = [];
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].some(h => String(h || '').trim() === '제목')) {
        headerRowIdx = i;
        header = rows[i].map(h => String(h || '').trim());
        break;
      }
    }

    if (headerRowIdx === -1) {
      return res.status(200).json({ success: true, notices: [] });
    }

    const dataRows = rows.slice(headerRowIdx + 1);

    function findCol(candidates) {
      for (const c of candidates) {
        const exact = header.indexOf(c);
        if (exact !== -1) return exact;
      }
      for (const c of candidates) {
        const partial = header.findIndex(h => h.indexOf(c) !== -1);
        if (partial !== -1) return partial;
      }
      return -1;
    }

    const idx = {
      title: findCol(['제목']),
      content: findCol(['내용']),
      link: findCol(['링크', '파일']),
      status: findCol(['상태']),
      period: findCol(['기간', '마감일']),
    };

    const notices = dataRows
      .filter(row => row[idx.title])
      .map(row => ({
        title: row[idx.title] || '',
        content: row[idx.content] || '',
        link: row[idx.link] || '',
        period: idx.period !== -1 ? (row[idx.period] || '') : '',
        status: (row[idx.status] || '진행중').trim() === '마감' ? 'closed' : 'ongoing'
      }));

    res.status(200).json({ success: true, notices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.toString() });
  }
};