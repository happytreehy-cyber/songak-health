// /api/infection-supply-status.js
const { google } = require("googleapis");

const SHEET_TAB_NAME = "물품신청";

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ success: false, message: "허용되지 않은 요청입니다." });
    return;
  }
  try {
    const { id, name } = req.query;
    if (!id || !name) {
      res.status(400).json({ success: false, message: "신청번호와 이름을 입력해주세요." });
      return;
    }

    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    );
    const sheets = google.sheets({ version: "v4", auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEET_TAB_NAME}!A2:L`
    });

    const rows = result.data.values || [];
    const found = rows.find(r => r[0] === id && r[7] === name);

    if (!found) {
      res.status(404).json({ success: false, message: "신청 내역을 찾을 수 없습니다. 신청번호와 이름을 확인해주세요." });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: found[0],
        submittedAt: found[1],
        grade: found[2],
        classNum: found[3],
        masks: found[4],
        tissues: found[5],
        sanitizer: found[6],
        applicantName: found[7],
        memo: found[8],
        status: found[9] || "접수",
        adminMessage: found[10] || "",
        updatedAt: found[11] || ""
      }
    });
  } catch (err) {
    console.error("infection-supply-status error:", err);
    res.status(500).json({ success: false, message: "조회 중 오류가 발생했습니다." });
  }
};
