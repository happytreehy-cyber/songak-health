// /api/infection-report-list.js
// ⚠️ 학생 이름·감염병명이 포함되므로 비밀번호 확인 후에만 응답합니다.
const { google } = require("googleapis");

const SHEET_TAB_NAME = "감염병발생보고";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, message: "허용되지 않은 요청입니다." });
    return;
  }
  try {
    const { password } = req.body;
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      res.status(401).json({ success: false, message: "비밀번호가 올바르지 않습니다." });
      return;
    }

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
        spreadsheetId: sheetId, range: `${SHEET_TAB_NAME}!A2:M`
      });
      rows = result.data.values || [];
    } catch (e) {
      rows = [];
    }

    const today = new Date();
    const list = rows
      .map(r => ({
        submittedAt: r[0], grade: r[1], classNum: r[2], studentNumber: r[3],
        studentName: r[4], disease: r[5], diagnosisDate: r[6],
        exclusionStart: r[7], exclusionEnd: r[8], memo: r[9] || "",
        status: r[10] || "접수"
      }))
      .filter(item => {
        if (!item.exclusionEnd) return false;
        const end = new Date(item.exclusionEnd);
        return !isNaN(end) && end >= today;
      })
      .reverse();

    res.status(200).json({ success: true, list });
  } catch (err) {
    console.error("infection-report-list error:", err);
    res.status(500).json({ success: false, message: "목록을 불러오지 못했습니다." });
  }
};
