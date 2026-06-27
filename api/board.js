// /api/board.js
// 담임 협조 요청(coop) + 보건소식 카드(notice)를 관리하는 통합 API
const { google } = require("googleapis");

const NOTICE_TAB = "보건소식카드";
// 기존 칸(제목,날짜,마감기한,상태,링크)은 그대로 두고, 새 칸(내용,첨부유형)은 맨 뒤에 추가했습니다.
const NOTICE_HEADER = ["제목", "날짜", "마감기한", "상태", "링크", "내용", "첨부유형"];

const COOP_TAB = "담임협조요청";
// 기존 칸(제목,내용,등록일,마감상태,첨부유형,첨부값)은 그대로 두고, 새 칸(마감기한)은 맨 뒤에 추가했습니다.
const COOP_HEADER = ["제목", "내용", "등록일", "마감상태", "첨부유형", "첨부값", "마감기한"];

// 결핵검진 페이지(tb-checkup.html)의 "교직원 검사안내" 공지사항 게시판 전용 탭입니다.
// 메뉴4의 "공지사항"/"보건소식카드"/"담임협조요청" 탭과는 별도로 분리했습니다.
const CHECKUP_TAB = "결핵검진_공지사항";
const CHECKUP_HEADER = ["제출일시", "제목", "대상", "내용", "일시", "링크", "파일링크", "상태"];

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

function checkPw(req) {
  const pw = (req.body && req.body.password) || (req.query && req.query.password);
  return !!pw && pw === process.env.ADMIN_PASSWORD;
}

async function ensureTab(sheets, sheetId, tabName, header) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const exists = meta.data.sheets.some(s => s.properties.title === tabName);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: tabName } } }] }
    });
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId, range: `${tabName}!A1`,
      valueInputOption: "RAW", requestBody: { values: [header] }
    });
  }
}

async function getTabRows(sheets, sheetId, tabName, lastCol) {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId, range: `${tabName}!A2:${lastCol}`
    });
    return result.data.values || [];
  } catch (e) {
    return [];
  }
}

async function deleteRow(sheets, sheetId, tabName, rowNum) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const tab = meta.data.sheets.find(s => s.properties.title === tabName);
  if (!tab) return false;
  const sheetRowNumber = Number(rowNum) + 2;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: { requests: [{
      deleteDimension: { range: { sheetId: tab.properties.sheetId, dimension: "ROWS", startIndex: sheetRowNumber - 1, endIndex: sheetRowNumber } }
    }] }
  });
  return true;
}

/* ---------------- 보건소식 카드 ---------------- */

async function handleListNotice(req, res) {
  const sheets = getSheetsClient(["https://www.googleapis.com/auth/spreadsheets.readonly"]);
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const rows = await getTabRows(sheets, sheetId, NOTICE_TAB, "G");
  const items = rows
    .filter(r => r[0])
    .map((r, i) => ({
      rowNum: i,
      title: r[0] || "",
      date: r[1] || "",
      deadline: r[2] || "",
      status: (r[3] || "진행중").trim() === "마감" ? "closed" : "ongoing",
      attachValue: r[4] || "",
      content: r[5] || "",
      attachType: r[6] || ""
    }));
  res.status(200).json({ success: true, items });
}

async function handleAddNotice(req, res) {
  if (!checkPw(req)) { res.status(401).json({ success: false, message: "비밀번호가 올바르지 않습니다." }); return; }
  const { title, content, date, deadline, status, attachType, attachValue } = req.body;
  if (!title) { res.status(400).json({ success: false, message: "제목을 입력해주세요." }); return; }
  const sheets = getSheetsClient(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheetId = process.env.GOOGLE_SHEET_ID;
  await ensureTab(sheets, sheetId, NOTICE_TAB, NOTICE_HEADER);
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId, range: `${NOTICE_TAB}!A1`,
    valueInputOption: "RAW", insertDataOption: "INSERT_ROWS",
    requestBody: { values: [[title, date || "", deadline || "", status === "closed" ? "마감" : "진행중", attachValue || "", content || "", attachType || ""]] }
  });
  res.status(200).json({ success: true, message: "등록되었습니다." });
}

async function handleEditNotice(req, res) {
  if (!checkPw(req)) { res.status(401).json({ success: false, message: "비밀번호가 올바르지 않습니다." }); return; }
  const { rowNum, title, content, date, deadline, status, attachType, attachValue } = req.body;
  if (rowNum === undefined || !title) { res.status(400).json({ success: false, message: "잘못된 요청입니다." }); return; }
  const sheets = getSheetsClient(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheetRowNumber = Number(rowNum) + 2;
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId, range: `${NOTICE_TAB}!A${sheetRowNumber}:G${sheetRowNumber}`,
    valueInputOption: "RAW", requestBody: { values: [[title, date || "", deadline || "", status === "closed" ? "마감" : "진행중", attachValue || "", content || "", attachType || ""]] }
  });
  res.status(200).json({ success: true, message: "수정되었습니다." });
}

async function handleUpdateNoticeStatus(req, res) {
  if (!checkPw(req)) { res.status(401).json({ success: false, message: "비밀번호가 올바르지 않습니다." }); return; }
  const { rowNum, status } = req.body;
  if (rowNum === undefined || !status) { res.status(400).json({ success: false, message: "잘못된 요청입니다." }); return; }
  const sheets = getSheetsClient(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheetRowNumber = Number(rowNum) + 2;
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId, range: `${NOTICE_TAB}!D${sheetRowNumber}`,
    valueInputOption: "RAW", requestBody: { values: [[status === "closed" ? "마감" : "진행중"]] }
  });
  res.status(200).json({ success: true, message: "상태가 변경되었습니다." });
}

async function handleDeleteNotice(req, res) {
  if (!checkPw(req)) { res.status(401).json({ success: false, message: "비밀번호가 올바르지 않습니다." }); return; }
  const { rowNum } = req.body;
  const sheets = getSheetsClient(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const ok = await deleteRow(sheets, sheetId, NOTICE_TAB, rowNum);
  if (!ok) { res.status(404).json({ success: false, message: "탭을 찾을 수 없습니다." }); return; }
  res.status(200).json({ success: true, message: "삭제되었습니다." });
}

/* ---------------- 담임 협조 요청 ---------------- */

async function handleListCoop(req, res) {
  const sheets = getSheetsClient(["https://www.googleapis.com/auth/spreadsheets.readonly"]);
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const rows = await getTabRows(sheets, sheetId, COOP_TAB, "G");
  const items = rows
    .filter(r => r[0])
    .map((r, i) => ({
      rowNum: i,
      title: r[0] || "",
      content: r[1] || "",
      date: r[2] || "",
      status: (r[3] || "진행중").trim() === "마감" ? "closed" : "ongoing",
      attachType: r[4] || "",
      attachValue: r[5] || "",
      deadline: r[6] || ""
    }));
  res.status(200).json({ success: true, items });
}

async function handleAddCoop(req, res) {
  if (!checkPw(req)) { res.status(401).json({ success: false, message: "비밀번호가 올바르지 않습니다." }); return; }
  const { title, content, date, deadline, status, attachType, attachValue } = req.body;
  if (!title) { res.status(400).json({ success: false, message: "제목을 입력해주세요." }); return; }
  const sheets = getSheetsClient(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheetId = process.env.GOOGLE_SHEET_ID;
  await ensureTab(sheets, sheetId, COOP_TAB, COOP_HEADER);
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId, range: `${COOP_TAB}!A1`,
    valueInputOption: "RAW", insertDataOption: "INSERT_ROWS",
    requestBody: { values: [[title, content || "", date || "", status === "closed" ? "마감" : "진행중", attachType || "", attachValue || "", deadline || ""]] }
  });
  res.status(200).json({ success: true, message: "등록되었습니다." });
}

async function handleEditCoop(req, res) {
  if (!checkPw(req)) { res.status(401).json({ success: false, message: "비밀번호가 올바르지 않습니다." }); return; }
  const { rowNum, title, content, date, deadline, status, attachType, attachValue } = req.body;
  if (rowNum === undefined || !title) { res.status(400).json({ success: false, message: "잘못된 요청입니다." }); return; }
  const sheets = getSheetsClient(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheetRowNumber = Number(rowNum) + 2;
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId, range: `${COOP_TAB}!A${sheetRowNumber}:G${sheetRowNumber}`,
    valueInputOption: "RAW", requestBody: { values: [[title, content || "", date || "", status === "closed" ? "마감" : "진행중", attachType || "", attachValue || "", deadline || ""]] }
  });
  res.status(200).json({ success: true, message: "수정되었습니다." });
}

async function handleUpdateCoopStatus(req, res) {
  if (!checkPw(req)) { res.status(401).json({ success: false, message: "비밀번호가 올바르지 않습니다." }); return; }
  const { rowNum, status } = req.body;
  if (rowNum === undefined || !status) { res.status(400).json({ success: false, message: "잘못된 요청입니다." }); return; }
  const sheets = getSheetsClient(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheetRowNumber = Number(rowNum) + 2;
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId, range: `${COOP_TAB}!D${sheetRowNumber}`,
    valueInputOption: "RAW", requestBody: { values: [[status === "closed" ? "마감" : "진행중"]] }
  });
  res.status(200).json({ success: true, message: "상태가 변경되었습니다." });
}

async function handleDeleteCoop(req, res) {
  if (!checkPw(req)) { res.status(401).json({ success: false, message: "비밀번호가 올바르지 않습니다." }); return; }
  const { rowNum } = req.body;
  const sheets = getSheetsClient(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const ok = await deleteRow(sheets, sheetId, COOP_TAB, rowNum);
  if (!ok) { res.status(404).json({ success: false, message: "탭을 찾을 수 없습니다." }); return; }
  res.status(200).json({ success: true, message: "삭제되었습니다." });
}

/* ---------------- 검사안내 게시판 (tb-checkup.html과 시트 공유) ---------------- */

async function handleListCheckup(req, res) {
  const sheets = getSheetsClient(["https://www.googleapis.com/auth/spreadsheets.readonly"]);
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const rows = await getTabRows(sheets, sheetId, CHECKUP_TAB, "H");
  const items = rows
    .filter(r => r[1]) // 제목(2번째 칸)이 있는 줄만
    .map((r, i) => ({
      rowNum: i,
      submittedAt: r[0] || "",
      title: r[1] || "",
      target: r[2] || "",
      content: r[3] || "",
      datetime: r[4] || "",
      link: r[5] || "",
      fileUrl: r[6] || "",
      status: (r[7] || "진행중").trim() === "마감" ? "closed" : "ongoing"
    }));
  res.status(200).json({ success: true, items });
}

async function handleAddCheckup(req, res) {
  if (!checkPw(req)) { res.status(401).json({ success: false, message: "비밀번호가 올바르지 않습니다." }); return; }
  const { title, target, content, datetime, link, status, fileUrl } = req.body;
  if (!title || !content) { res.status(400).json({ success: false, message: "제목과 내용을 입력해주세요." }); return; }
  const sheets = getSheetsClient(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheetId = process.env.GOOGLE_SHEET_ID;
  await ensureTab(sheets, sheetId, CHECKUP_TAB, CHECKUP_HEADER);
  const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId, range: `${CHECKUP_TAB}!A1`,
    valueInputOption: "RAW", insertDataOption: "INSERT_ROWS",
    requestBody: { values: [[now, title, target || "", content, datetime || "", link || "", fileUrl || "", status === "closed" ? "마감" : "진행중"]] }
  });
  res.status(200).json({ success: true, message: "등록되었습니다." });
}

async function handleEditCheckup(req, res) {
  if (!checkPw(req)) { res.status(401).json({ success: false, message: "비밀번호가 올바르지 않습니다." }); return; }
  const { rowNum, title, target, content, datetime, link, status, fileUrl } = req.body;
  if (rowNum === undefined || !title) { res.status(400).json({ success: false, message: "잘못된 요청입니다." }); return; }
  const sheets = getSheetsClient(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheetRowNumber = Number(rowNum) + 2;
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId, range: `${CHECKUP_TAB}!A${sheetRowNumber}:H${sheetRowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [[new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }), title, target || "", content, datetime || "", link || "", fileUrl || "", status === "closed" ? "마감" : "진행중"]] }
  });
  res.status(200).json({ success: true, message: "수정되었습니다." });
}

async function handleUpdateCheckupStatus(req, res) {
  if (!checkPw(req)) { res.status(401).json({ success: false, message: "비밀번호가 올바르지 않습니다." }); return; }
  const { rowNum, status } = req.body;
  if (rowNum === undefined || !status) { res.status(400).json({ success: false, message: "잘못된 요청입니다." }); return; }
  const sheets = getSheetsClient(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheetRowNumber = Number(rowNum) + 2;
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId, range: `${CHECKUP_TAB}!H${sheetRowNumber}`,
    valueInputOption: "RAW", requestBody: { values: [[status === "closed" ? "마감" : "진행중"]] }
  });
  res.status(200).json({ success: true, message: "상태가 변경되었습니다." });
}

async function handleDeleteCheckup(req, res) {
  if (!checkPw(req)) { res.status(401).json({ success: false, message: "비밀번호가 올바르지 않습니다." }); return; }
  const { rowNum } = req.body;
  const sheets = getSheetsClient(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const ok = await deleteRow(sheets, sheetId, CHECKUP_TAB, rowNum);
  if (!ok) { res.status(404).json({ success: false, message: "탭을 찾을 수 없습니다." }); return; }
  res.status(200).json({ success: true, message: "삭제되었습니다." });
}

/* ---------------- 관리자 비밀번호 단순 확인 (통합 로그인용) ---------------- */
async function handleCheckAdminPw(req, res) {
  const { password } = req.body;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    res.status(200).json({ success: false, message: "비밀번호가 올바르지 않습니다." });
    return;
  }
  res.status(200).json({ success: true });
}

module.exports = async (req, res) => {
  try {
    const type = req.query.type;
    if (req.method === "GET") {
      if (type === "notice") return await handleListNotice(req, res);
      if (type === "coop") return await handleListCoop(req, res);
      if (type === "checkup") return await handleListCheckup(req, res);
      res.status(400).json({ success: false, message: "type 파라미터가 필요합니다. (notice, coop 또는 checkup)" });
      return;
    }
    if (req.method === "POST") {
      const action = req.body.action;
      if (action === "checkpw") return await handleCheckAdminPw(req, res);
      if (type === "notice") {
        if (action === "add") return await handleAddNotice(req, res);
        if (action === "edit") return await handleEditNotice(req, res);
        if (action === "updatestatus") return await handleUpdateNoticeStatus(req, res);
        if (action === "delete") return await handleDeleteNotice(req, res);
      }
      if (type === "coop") {
        if (action === "add") return await handleAddCoop(req, res);
        if (action === "edit") return await handleEditCoop(req, res);
        if (action === "updatestatus") return await handleUpdateCoopStatus(req, res);
        if (action === "delete") return await handleDeleteCoop(req, res);
      }
      if (type === "checkup") {
        if (action === "add") return await handleAddCheckup(req, res);
        if (action === "edit") return await handleEditCheckup(req, res);
        if (action === "updatestatus") return await handleUpdateCheckupStatus(req, res);
        if (action === "delete") return await handleDeleteCheckup(req, res);
      }
      res.status(400).json({ success: false, message: "알 수 없는 요청입니다." });
      return;
    }
    res.status(405).json({ success: false, message: "허용되지 않는 메서드입니다." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.toString() });
  }
};
