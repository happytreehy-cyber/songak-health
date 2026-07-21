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
      valueRenderOption: 'FORMATTED_VALUE',  // ← 날짜를 표시된 문자열로 읽어옴
      dateTimeRenderOption: 'FORMATTED_STRING'
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

    // 날짜를 YYYY-MM-DD 형식으로 정규화 (여러 형식 지원)
    function normalizeDate(val) {
      if (!val) return '';
      var s = String(val).trim();

      // 이미 YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

      // 2026. 7. 14.(화) 형식 — 보건일지 7월부터 사용되는 형식
      var mk = s.match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\./);
      if (mk) return mk[1] + '-' + mk[2].padStart(2,'0') + '-' + mk[3].padStart(2,'0');

      // YYYY.M.D 또는 YYYY/M/D (공백 없는 버전)
      var m1 = s.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})/);
      if (m1) return m1[1] + '-' + m1[2].padStart(2,'0') + '-' + m1[3].padStart(2,'0');

      // YY.M.D (예: 26.6.30)
      var m2 = s.match(/^(\d{2})[./](\d{1,2})[./](\d{1,2})/);
      if (m2) return '20' + m2[1] + '-' + m2[2].padStart(2,'0') + '-' + m2[3].padStart(2,'0');

      // 엑셀 시리얼 숫자 (예: 46638)
      var num = parseFloat(s);
      if (!isNaN(num) && num > 40000 && num < 60000) {
        var d = new Date(Math.round((num - 25569) * 86400000));
        var y = d.getUTCFullYear(), mo = d.getUTCMonth() + 1, dy = d.getUTCDate();
        return y + '-' + String(mo).padStart(2,'0') + '-' + String(dy).padStart(2,'0');
      }

      // 날짜 파싱 시도
      var parsed = new Date(s);
      if (!isNaN(parsed.getTime())) {
        return parsed.getFullYear() + '-' + String(parsed.getMonth()+1).padStart(2,'0') + '-' + String(parsed.getDate()).padStart(2,'0');
      }

      return s.slice(0, 10);
    }

    function inRange(cellValue, start, end) {
      var d = normalizeDate(cellValue);
      if (!d) return false;
      return d >= start && d <= end;
    }

    function parseGradeClass(text) {
      if (!text) return null;
      const nums = String(text).match(/\d+/g);
      if (!nums || nums.length < 2) return null;
      return { grade: parseInt(nums[0], 10), cls: parseInt(nums[1], 10) };
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
          date: normalizeDate(row[idx.date]),
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
