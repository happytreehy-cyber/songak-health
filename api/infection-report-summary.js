// /api/infection-report-summary.js
// 학생 이름 등 개인정보 없이, 집계 수치만 반환 (공개 화면에 표시 가능)
const { google } = require("googleapis");

const SHEET_TAB_NAME = "감염병발생보고";

function parseKoreanDate(str) {
  const d = new Date(str);
  if (!isNaN(d)) return d;
  return null;
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ success: false, message: "허용되지 않은 요청입니다." });
    return;
  }
  try {
    const sheets = google.sheets({
      version: "v4",
      auth: new google.auth.JWT(
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, null,
        (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
        ["https://www.googleapis.com/auth/spreadsheets.readonly"]
      )
    });
    const sheetId = process.env.GOOGLE_SHEET_ID;

    let rows = [];
    try {
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId, range: `${SHEET_TAB_NAME}!A2:I`
      });
      rows = result.data.values || [];
    } catch (e) {
      rows = [];
    }

    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const byDisease = {};
    const byGrade = {};
    let last7days = 0;
    let currentlyExcluded = 0;

    rows.forEach(r => {
      const grade = r[1], disease = r[5], diagnosisDate = r[6];
      const exclusionEnd = r[8];

      if (disease) byDisease[disease] = (byDisease[disease] || 0) + 1;
      if (grade) byGrade[grade] = (byGrade[grade] || 0) + 1;

      const diagDate = parseKoreanDate(diagnosisDate);
      if (diagDate && diagDate >= sevenDaysAgo) last7days++;

      if (exclusionEnd) {
        const endDate = parseKoreanDate(exclusionEnd);
        if (endDate && endDate >= today) currentlyExcluded++;
      }
    });

    res.status(200).json({
      success: true,
      summary: {
        totalCases: rows.length,
        byDisease, byGrade,
        last7days, currentlyExcluded
      }
    });
  } catch (err) {
    console.error("infection-report-summary error:", err);
    res.status(500).json({ success: false, message: "현황을 불러오지 못했습니다." });
  }
};
