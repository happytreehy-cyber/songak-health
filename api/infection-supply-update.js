// /api/infection-supply-update.js
const { google } = require("googleapis");

const SHEET_TAB_NAME = "물품신청";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, message: "허용되지 않은 요청입니다." });
    return;
  }
  try {
    const { password, id, status, message } = req.body;
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      res.status(401).json({ success: false, message: "비밀번호가 올바르지 않습니다." });
      return;
    }
    if (!id || !status) {
      res.status(400).json({ success: false, message: "필수 항목이 누락되었습니다." });
      return;
    }

    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/spreadsheets"]
    );
    const sheets = google.sheets({ version: "v4", auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEET_TAB_NAME}!A2:L`
    });
    const rows = result.data.values || [];
    const rowIndex = rows.findIndex(r => r[0] === id);

    if (rowIndex === -1) {
      res.status(404).json({ success: false, message: "해당 신청을 찾을 수 없습니다." });
      return;
    }

    const sheetRowNumber = rowIndex + 2; // A2부터 시작이므로 +2
    const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${SHEET_TAB_NAME}!J${sheetRowNumber}:L${sheetRowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [[status, message || "", now]] }
    });

    res.status(200).json({ success: true, message: "처리 완료되었습니다." });
  } catch (err) {
    console.error("infection-supply-update error:", err);
    res.status(500).json({ success: false, message: "업데이트 중 오류가 발생했습니다." });
  }
};
