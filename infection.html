const { google } = require('googleapis');

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
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
    };

    const now = new Date();
    const schoolYearStart = now.getMonth() >= 2 ? now.getFullYear() : now.getFullYear() - 1;
    const rangeStart = schoolYearStart + '-03-01';
    const rangeEnd = (schoolYearStart + 1) + '-02-28';

    function inSchoolYear(row) {
      const d = String(row[idx.date] || '').slice(0, 10);
      return d && d >= rangeStart && d <= rangeEnd;
    }

    const schoolYearRows = dataRows.filter(inSchoolYear);

    function toYMD(d) {
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    const period = (req.query.period || 'year').toLowerCase();
    let rankStart = rangeStart;
    let periodLabel = schoolYearStart + '학년도 누적';
    if (period === 'month') {
      const d = new Date(now); d.setMonth(d.getMonth() - 1);
      rankStart = toYMD(d);
      periodLabel = '최근 1개월';
    } else if (period === 'quarter') {
      const d = new Date(now); d.setMonth(d.getMonth() - 3);
      rankStart = toYMD(d);
      periodLabel = '최근 3개월';
    }
    const rankEnd = toYMD(now);

    const rankRows = dataRows.filter(function (row) {
      const d = String(row[idx.date] || '').slice(0, 10);
      return d && d >= rankStart && d <= rankEnd;
    });

    const classCounts = {};
    const studentCounts = {};

    rankRows.forEach(function (row) {
      const cls = row[idx.classInfo] || '미확인';
      classCounts[cls] = (classCounts[cls] || 0) + 1;

      const num = row[idx.number] || '';
      const nm = row[idx.name] || '';
      const key = cls + (num ? ' ' + num + '번' : '') + (nm ? ' ' + nm : '');
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

    const gradeCounts = { 1: 0, 2: 0, 3: 0 };
    schoolYearRows.forEach(function (row) {
      const nums = String(row[idx.classInfo] || '').match(/\d+/g);
      if (!nums || !nums.length) return;
      const g = parseInt(nums[0], 10);
      if (gradeCounts[g] !== undefined) gradeCounts[g]++;
    });

    const gradeYearly = [1, 2, 3].map(function (g) { return { name: g + '학년', count: gradeCounts[g] }; });

    res.status(200).json({
      success: true,
      classRanking: classRanking,
      studentRanking: studentRanking,
      gradeYearly: gradeYearly,
      schoolYearLabel: schoolYearStart + '학년도',
      periodLabel: periodLabel
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.toString() });
  }
};
