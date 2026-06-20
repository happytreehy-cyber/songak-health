const { google } = require('googleapis');

module.exports = async function handler(req, res) {
  try {
    const { date, grade, classNum } = req.query;
    if (!date || !grade || !classNum) {
      return res.status(400).json({ success: false, message: '날짜/학년/반을 입력하세요.' });
    }

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
      date: header.indexOf('날짜'),
      name: header.indexOf('이름'),
      classInfo: header.indexOf('학년반'),
      number: header.indexOf('번호'),
      gender: header.indexOf('성별'),
      symptom: header.indexOf('증상'),
      checkin: header.indexOf('입실'),
    };

    function parseGradeClass(text) {
      if (!text) return null;
      const nums = String(text).match(/\d+/g);
      if (!nums || nums.length < 2) return null;
      return { grade: parseInt(nums[0], 10), cls: parseInt(nums[1], 10) };
    }

    function sameDate(cellValue, target) {
      if (!cellValue) return false;
      return String(cellValue).slice(0, 10) === target;
    }

    const wantGrade = parseInt(grade, 10);
    const wantClass = parseInt(classNum, 10);

    const matched = dataRows
      .filter(function (row) {
        const info = parseGradeClass(row[idx.classInfo]);
        if (!info) return false;
        return (
          sameDate(row[idx.date], date) &&
          info.grade === wantGrade &&
          info.cls === wantClass
        );
      })
      .map(function (row) {
        return {
          name: row[idx.name] || '',
          number: row[idx.number] || '',
          gender: row[idx.gender] || '',
          symptom: row[idx.symptom] || '',
          checkin: row[idx.checkin] || '',
        };
      });

    res.status(200).json({ success: true, total: matched.length, records: matched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.toString() });
  }
};
