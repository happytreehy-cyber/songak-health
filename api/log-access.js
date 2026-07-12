// /api/log-access.js
// 교직원이 본인확인(로그인)에 성공하면 호출됩니다.
// 1) 구글시트 "접속로그" 탭에 이름+시간을 기록하고
// 2) 카카오톡으로 접속 알림을 보냅니다.

const { google } = require("googleapis");

const SHEET_TAB_NAME = "접속로그";
const HEADER = ["접속일시", "이름"];
const GAS_URL = "https://script.google.com/macros/s/AKfycbykwVQpmUzfPe_WdKMbu6agJ2hW9fc6eaMGmCe3rmoPGPtW_H5luzX68fnXH7RB5dl7/exec";

async function notifyKakao(text) {
  try {
    await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "카카오알림", text })
    });
  } catch (e) {
    // 알림 실패해도 로그 기록은 계속 진행 (실패 무시)
  }
}

function getSheetsClient(scopes) {
  return google.sheets({
    version: "v4",
    auth: new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      scopes
    )
  });
}

async function ensureTab(sheets, sheetId) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const exists = meta.data.sheets.some(s => s.properties.title === SHEET_TAB_NAME);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: SHEET_TAB_NAME } } }] }
    });
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${SHEET_TAB_NAME}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [HEADER] }
    });
  }
}

async function insertRowAtTop(sheets, sheetId, tabName, row) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const tab = meta.data.sheets.find(s => s.properties.title === tabName);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: { requests: [{
      insertDimension: { range: { sheetId: tab.properties.sheetId, dimension: "ROWS", startIndex: 1, endIndex: 2 }, inheritFromBefore: false }
    }] }
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId, range: `${tabName}!A2`,
    valueInputOption: "RAW", requestBody: { values: [row] }
  });
}

module.exports = async (req, res) => {
  try {
    const name = (req.query && req.query.name) ? String(req.query.name).trim() : "";
    if (!name) {
      res.status(400).json({ success: false, message: "이름이 없습니다." });
      return;
    }

    const sheets = getSheetsClient(["https://www.googleapis.com/auth/spreadsheets"]);
    const sheetId = process.env.GOOGLE_SHEET_ID;

    await ensureTab(sheets, sheetId);

    const now = new Date();
    const loggedAt = now.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
    const row = [loggedAt, name];

    await insertRowAtTop(sheets, sheetId, SHEET_TAB_NAME, row);

    await notifyKakao("👤 접속 알림\n" + name + "님이 접속했습니다.\n🕒 " + loggedAt);

    res.status(200).json({ success: true, message: "접속기록이 저장되었습니다.", loggedAt });
  } catch (err) {
    console.error("log-access error:", err);
    res.status(500).json({ success: false, message: "서버 오류가 발생했습니다." });
  }
};
