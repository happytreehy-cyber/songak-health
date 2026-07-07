// /api/infection-supply.js
const { google } = require("googleapis");

const SHEET_TAB_NAME = "물품신청";
const HEADER = ["신청번호","제출일시","학년","반","KF94덴탈마스크","방역마스크(새부리형)","소독티슈","손소독제","신청자","비고","처리상태","관리자메시지","처리일시"];
const GAS_URL = "https://script.google.com/macros/s/AKfycbxywdJoi66cnblvlO1BMXpVFPzvG4vJ_E-fr1GoaEwc_VYz4ONJrhN1t_2SGoGotySoKg/exec";

async function notifyKakao(text) {
  try {
    await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "카카오알림", text })
    });
  } catch (e) {
    // 알림 실패해도 신청 처리는 계속 진행 (실패 무시)
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

// 1학년 1반 -> "11", 2학년 2반 -> "22", 10반 -> "110"
// 부서: 교무실1->1, 교무실2->2, 교무실3->3, 행정실->4, 기타->5
const OFFICE_CODE = { "교무실1": "1", "교무실2": "2", "교무실3": "3", "행정실": "4", "기타": "5" };
function classCode(grade, classNum) {
  if (!grade) return "00";
  if (OFFICE_CODE[grade]) return OFFICE_CODE[grade];
  if (grade.indexOf("학년") === -1) return grade;
  const g = grade.replace(/[^0-9]/g, "");
  const c = (classNum || "").replace(/[^0-9]/g, "");
  return g + c;
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

async function handleSubmit(req, res) {
  const { grade, classNum, kf94, beak, tissues, sanitizer, applicantName, memo } = req.body;
  if (!grade || !classNum) {
    res.status(400).json({ success: false, message: "학년·반(또는 부서)을 선택해주세요." });
    return;
  }
  const k = Number(kf94) || 0, b = Number(beak) || 0, t = Number(tissues) || 0, s = Number(sanitizer) || 0;
  if (k === 0 && b === 0 && t === 0 && s === 0) {
    res.status(400).json({ success: false, message: "물품을 1개 이상 신청해주세요." });
    return;
  }
  const sheets = getSheetsClient(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheetId = process.env.GOOGLE_SHEET_ID;
  await ensureTab(sheets, sheetId);
  const now = new Date();
  const submittedAt = now.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  const id = classCode(grade, classNum);
  const row = [id, submittedAt, grade, classNum, k, b, t, s, applicantName || "-", memo || "", "접수", "", ""];
  await insertRowAtTop(sheets, sheetId, SHEET_TAB_NAME, row);
  const items = [];
  if (k) items.push("KF94 " + k);
  if (b) items.push("방역마스크 " + b);
  if (t) items.push("소독티슈 " + t);
  if (s) items.push("손소독제 " + s);
  await notifyKakao("📦 방역물품 신청\n" + grade + " " + classNum + " (" + (applicantName || "-") + ")\n" + items.join(", "));
  res.status(200).json({ success: true, message: "신청이 접수되었습니다.", id, submittedAt });
}

async function handleList(req, res) {
  const { password } = req.body;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ success: false, message: "비밀번호가 올바르지 않습니다." });
    return;
  }
  const sheets = getSheetsClient(["https://www.googleapis.com/auth/spreadsheets.readonly"]);
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const result = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `${SHEET_TAB_NAME}!A2:M` });
  const rows = result.data.values || [];
  const list = rows.map((r, i) => ({
    rowNum: i, id: r[0], submittedAt: r[1], grade: r[2], classNum: r[3],
    kf94: r[4] || 0, beak: r[5] || 0, tissues: r[6] || 0, sanitizer: r[7] || 0,
    applicantName: r[8], memo: r[9] || "",
    status: r[10] || "접수", adminMessage: r[11] || "", updatedAt: r[12] || ""
  }));
  res.status(200).json({ success: true, list });
}

async function handleUpdate(req, res) {
  const { password, rowNum, status, message } = req.body;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ success: false, message: "비밀번호가 올바르지 않습니다." });
    return;
  }
  if (rowNum === undefined || !status) {
    res.status(400).json({ success: false, message: "필수 항목이 누락되었습니다." });
    return;
  }
  const sheets = getSheetsClient(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheetRowNumber = Number(rowNum) + 2;
  const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId, range: `${SHEET_TAB_NAME}!K${sheetRowNumber}:M${sheetRowNumber}`,
    valueInputOption: "RAW", requestBody: { values: [[status, message || "", now]] }
  });
  res.status(200).json({ success: true, message: "처리 완료되었습니다." });
}

async function handleStatus(req, res) {
  const { id } = req.query;
  if (!id) {
    res.status(400).json({ success: false, message: "신청번호를 입력해주세요." });
    return;
  }
  const sheets = getSheetsClient(["https://www.googleapis.com/auth/spreadsheets.readonly"]);
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const result = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `${SHEET_TAB_NAME}!A2:M` });
  const rows = result.data.values || [];
  // 같은 신청번호(반)가 여러 번 신청됐을 수 있으니, 가장 마지막(최신) 것을 반환
  let found = null;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i][0] === id) { found = rows[i]; break; }
  }
  if (!found) {
    res.status(404).json({ success: false, message: "신청 내역을 찾을 수 없습니다. 신청번호를 확인해주세요." });
    return;
  }
  res.status(200).json({
    success: true,
    data: {
      id: found[0], submittedAt: found[1], grade: found[2], classNum: found[3],
      kf94: found[4], beak: found[5], tissues: found[6], sanitizer: found[7],
      applicantName: found[8], memo: found[9],
      status: found[10] || "접수", adminMessage: found[11] || "", updatedAt: found[12] || ""
    }
  });
}

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      return await handleStatus(req, res);
    }
    if (req.method === "POST") {
      const action = req.body.action || "submit";
      if (action === "list") return await handleList(req, res);
      if (action === "update") return await handleUpdate(req, res);
      return await handleSubmit(req, res);
    }
    res.status(405).json({ success: false, message: "허용되지 않은 요청입니다." });
  } catch (err) {
    console.error("infection-supply error:", err);
    res.status(500).json({ success: false, message: "서버 오류가 발생했습니다." });
  }
};
