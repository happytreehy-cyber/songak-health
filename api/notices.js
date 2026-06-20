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
      range: '입실현황!A:G',
    });

    const rows = response.data.values || [];
    const header = rows[0] || [];
    const dataRows = rows.slice(1);

    const idx = {
      name: header.indexOf('이름'),
      classInfo: header.indexOf('학년반'),
      number: header.indexOf('번호'),
    };

    const classCounts = {};
    const studentCounts = {};

    dataRows.forEach(function (row) {
      const cls = row[idx.classInfo] || '미확인';
      classCounts[cls] = (classCounts[cls] || 0) + 1;

      const key = cls + ' ' + (row[idx.number] || '') + '번 ' + (row[idx.name] || '');
      studentCounts[key] = (studentCounts[key] || 0) + 1;
    });

    const classRanking = Object.entries(classCounts)
      .map(function (e) { return { name: e[0], count: e[1] }; })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, 10);

    const studentRanking = Object.entries(studentCounts)
      .map(function (e) { return { name: e[0], count: e[1] }; })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, 10);

    res.status(200).json({ success: true, classRanking: classRanking, studentRanking: studentRanking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.toString() });
  }
};
