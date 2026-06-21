// /api/infection-supply-list.js
const { google } = require("googleapis");

const SHEET_TAB_NAME = "물품신청";

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
    const list = rows.map(r => ({
      id: r[0], submittedAt: r[1], grade: r[2], classNum: r[3],
      masks: r[4] || 0, tissues: r[5] || 0, sanitizer: r[6] || 0,
      applicantName: r[7], memo: r[8] || "",
      status: r[9] || "접수", adminMessage: r[10] || "", updatedAt: r[11] || ""
    })).reverse(); // 최신순

    res.status(200).json({ success: true, list });
  } catch (err) {
    console.error("infection-supply-list error:", err);
    res.status(500).json({ success: false, message: "목록 조회 중 오류가 발생했습니다." });
  }
};
