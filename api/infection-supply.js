// /api/infection-supply.js
// 물품신청 관련 기능을 한 파일에 모아둠 (Vercel 무료플랜 함수 개수 제한 때문)
// POST body.action: "submit"(기본값) | "list" | "update"
// GET ?action=status&id=...&name=...
const { google } = require("googleapis");

const SHEET_TAB_NAME = "물품신청";
const HEADER = ["신청번호","제출일시","학년","반","마스크","소독티슈","손소독제","신청자","비고","처리상태","관리자메시지","처리일시"];

function getSheetsClient(scopes) {
  return google.sheets({
    version: "v4",
    auth: new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
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

async function handleSubmit(req, res) {
  const { grade, classNum, masks, tissues, sanitizer, applicantName, memo } = req.body;
  if (!grade || !classNum || !applicantName) {
    res.status(400).json({ success: false, message: "학년·반·신청자 이름을 모두 입력해주세요." });
    return;
  }
  const m = Number(masks) || 0, t = Number(tissues) || 0, s = Number(sanitizer) || 0;
  if (m === 0 && t === 0 && s === 0) {
    res.status(400).json({ success: false, message: "물품을 1개 이상 신청해주세요." });
    return;
  }
  const sheets = getSheetsClient(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheetId = process.env.GOOGLE_SHEET_ID;
  await ensureTab(sheets, sheetId);
  const now = new Date();
  const submittedAt = now.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  const id = "S" + now.getTime().toString().slice(-8);
  const row = [id, submittedAt, grade, classNum, m, t, s, applicantName, memo || "", "접수", "", ""];
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId, range: `${SHEET_TAB_NAME}!A1`,
    valueInputOption: "RAW", insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] }
  });
  res.status(200).json({ success: true, message: "신청이 접수되었습니다.", id });
}

async function handleList(req, res) {
  const { password } = req.body;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ success: false, message: "비밀번호가 올바르지 않습니다." });
    return;
  }
  const sheets = getSheetsClient(["https://www.googleapis.com/auth/spreadsheets.readonly"]);
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const result = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `${SHEET_TAB_NAME}!A2:L` });
  const rows = result.data.values || [];
  const list = rows.map(r => ({
    id: r[0], submittedAt: r[1], grade: r[2], classNum: r[3],
    masks: r[4] || 0,
