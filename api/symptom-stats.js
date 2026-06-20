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
      range: '입실현황!A:I',
    });

    const rows = response.data.values || [];
    const header = rows[0] || [];
    const dataRows = rows.slice(1);

    const idx = {
      date: header.indexOf('날짜'),
      symptom: header.indexOf('증상'),
    };

    const CATEGORY_MAP = {
      '발열': '감염병 예방', '인후통': '이비인후계', '코막힘': '이비인후계', '콧물': '이비인후계',
      '두통': '근골격계', '생리통': '비뇨생식기', '피부상처(찰과상)': '피부피하계',
      '찰과상(신체도없음)': '피부피하계', '소화불량': '소화기계', '근육통': '근골격계',
      '온,냉찜질': '근골격계'
    };

    function classify(symptomText) {
      if (!symptomText) return '기타';
      const first = symptomText.split(',')[0].trim();
      for (const key in CATEGORY_MAP) {
        if (first.includes(key) || symptomText.includes(key)) return CATEGORY_MAP[key];
      }
      return '기타';
    }

    function splitSymptoms(text) {
      const result = [];
      let depth = 0, cur = '';
      for (const ch of text) {
        if (ch === '(') depth++;
        if (ch === ')') depth = Math.max(0, depth - 1);
        if (ch === ',' && depth === 0) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += ch;
        }
      }
      if (cur.trim()) result.push(cur.trim());
      return result.filter(Boolean);
    }

    const categoryCounts = {};
    const detailCounts = {};

    dataRows.forEach(row => {
      const symptomText = row[idx.symptom] || '';
      if (!symptomText) return;
      const symptoms = splitSymptoms(symptomText).map(s => {
        if (/^근육통\(/.test(s)) return '근육통';
        return s;
      });
      symptoms.forEach(s => {
        detailCounts[s] = (detailCounts[s] || 0) + 1;
      });
      const cat = classify(symptomText);
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const categoryArr = Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const detailArr = Object.entries(detailCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const total = dataRows.length;

    const now = new Date();
    const schoolYearStart = now.getMonth() >= 2 ? now.getFullYear() : now.getFullYear() - 1;
    const rangeStart = schoolYearStart + '-03-01';
    const rangeEnd = (schoolYearStart + 1) + '-02-28';

    let schoolYearTotal = 0;
    dataRows.forEach(row => {
      const d = String(row[idx.date] || '').slice(0, 10);
      if (d && d >= rangeStart && d <= rangeEnd) schoolYearTotal++;
    });

    res.status(200).json({
      success: true,
      total,
      schoolYearLabel: schoolYearStart + '학년도',
      schoolYearTotal,
      categories: categoryArr,
      topSymptoms: detailArr
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.toString() });
  }
};