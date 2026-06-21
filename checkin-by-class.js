const { google } = require('googleapis');

module.exports = async function handler(req, res) {
  try {
    const { startDate, endDate, grade, classNum } = req.query;
    if (!startDate || !endDate || !grade || !classNum) {
      return res.status(400).json({ success: false, message: '기간/학년/반을 입력하세요.' });
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
      range: '입실현황!A:Z',
    });

    const rows = response.data.values || [];
    const header = (rows[0] || []).map(function (h) { return String(h || '').trim(); });
    const dataRows = rows.slice(1);

    function findCol(candidates) {
      for (var c = 0; c < candidates.length; c++) {
        var i = header.indexOf(candidates[c]);
        if (i !== -1) return i;
      }
      return -1;
    }

    const idx = {
      date: findCol(['날짜', '일자', '방문날짜']),
      name: findCol(['이름', '성명', '학생이름', '학생명']),
      classInfo: findCol(['학년반', '학급', '반', '학년/반']),
      number: findCol(['번호', '학번', '출석번호']),
      gender: findCol(['성별']),
      symptom: findCol(['증상']),
      checkin: findCol(['입실', '입실시간', '체크인']),
      checkout: findCol(['퇴실', '퇴실시간', '체크아웃']),
    };

    function parseGradeClass(text) {
      if (!text) return null;
      const nums = String(text).match(/\d+/g);
      if (!nums || nums.length < 2) return null;
      return { grade: parseInt(nums[0], 10), cls: parseInt(nums[1], 10) };
    }

    function inRange(cellValue, start, end) {
      if (!cellValue) return false;
      const d = String(cellValue).slice(0, 10);
      return d >= start && d <= end;
    }

    const wantGrade = parseInt(grade, 10);
    const wantClass = parseInt(classNum, 10);

    const matched = dataRows
      .filter(function (row) {
        const info = parseGradeClass(row[idx.classInfo]);
        if (!info) return false;
        return (
          inRange(row[idx.date], startDate, endDate) &&
          info.grade === wantGrade &&
          info.cls === wantClass
        );
      })
      .map(function (row) {
        return {
          date: String(row[idx.date] || '').slice(0, 10),
          name: row[idx.name] || '',
          number: row[idx.number] || '',
          gender: row[idx.gender] || '',
          symptom: row[idx.symptom] || '',
          checkin: row[idx.checkin] || '',
          checkout: idx.checkout !== -1 ? (row[idx.checkout] || '') : '',
        };
      })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });

    res.status(200).json({ success: true, total: matched.length, records: matched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.toString() });
  }
};
