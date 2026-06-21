// /api/infection-report.js
const { google } = require("googleapis");

const SHEET_TAB_NAME = "감염병발생보고";
const HEADER = ["제출일시","학년","반","번호","학생명","감염병종류","진단일","등교중지시작일","등교중지종료예정일","비고","처리상태","보건교사확인","안내완료"];

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
      spreadsheetId: sheetId, range: `${SHEET_TAB_NAME}!A1`,
      valueInputOption: "RAW", requestBody: { values: [HEADER] }
    });
  }
}

function parseKoreanDate(str) {
  const d = new Date(str);
  return isNaN(d) ? null : d;
}

async function handleSubmit(req, res) {
  const {
    grade, classNum, studentNumber, studentName,
    diseaseType, diseaseEtc, diagnosisDate,
    exclusionStartDate, exclusionEndDate, memo
  } = req.body;

  if (!grade || !classNum || !studentNumber || !studentName || !diagnosisDate || (!diseaseType && !diseaseEtc)) {
    res.status(400).json({ success: false, message: "필수 항목을 모두 입력해주세요." });
    return;
  }

  const sheets = getSheetsClient(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheetId = process.env.GOOGLE_SHEET_ID;
  await ensureTab(sheets, sheetId);

  const disease = diseaseType === "기타" ? (diseaseEtc || "기타") : diseaseType;

  const existing = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `${SHEET_TAB_NAME}!A2:G` });
  const rows = existing.data.values || [];
  const dup = rows.some(r =>
    r[1] === grade && r[2] === classNum && r[3] === String(studentNumber) &&
    r[4] === studentName && r[5] === disease && r[6] === diagnosisDate
  );
  if (dup) {
    res.status(409).json({ success: false, message: "이미 같은 내용의 보고가 접수되어 있습니다." });
    return;
  }

  const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  const row = [
    now, grade, classNum, studentNumber, studentName, disease, diagnosisDate,
    exclusionStartDate || "", exclusionEndDate || "", memo || "",
    "접수", "미확인", "미완료"
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId, range: `${SHEET_TAB_NAME}!A1`,
    valueInputOption: "RAW", insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] }
  });

  res.status(200).json({ success: true, message: "감염병 발생 보고가 제출되었습니다." });
}

async function handleSummary(req, res) {
  const sheets = getSheetsClient(["https://www.googleapis.com/auth/spreadsheets.readonly"]);
  const sheetId = process.env.GOOGLE_SHEET_ID;

  let rows = [];
  try {
    const result = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `${SHEET_TAB_NAME}!A2:I` });
    rows = result.data.values || [];
  } catch (e) { rows = []; }

  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const byDisease = {}, byGrade = {};
  let last7days = 0, last30days = 0, currentlyExcluded = 0;

  rows.forEach(r => {
    const grade = r[1], disease = r[5], diagnosisDate = r[6], exclusionEnd = r[8];
    if (disease) byDisease[disease] = (byDisease[disease] || 0) + 1;
    if (grade) byGrade[grade] = (byGrade[grade] || 0) + 1;

    const diagDate = parseKoreanDate(diagnosisDate);
    if (diagDate && diagDate >= sevenDaysAgo) last7days++;
    if (diagDate && diagDate >= thirtyDaysAgo) last30days++;

    if (exclusionEnd) {
      const endDate = parseKoreanDate(exclusionEnd);
      if (endDate && endDate >= today) currentlyExcluded++;
    }
  });

  res.status(200).json({
    success: true,
    summary: { totalCases: rows.length, byDisease, byGrade, last7days, last30days, currentlyExcluded }
  });
}

async function handleList(req, res) {
  const { password } = req.body;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ success: false, message: "비밀번호가 올바르지 않습니다." });
    return;
  }
  const sheets = getSheetsClient(["https://www.googleapis.com/auth/spreadsheets.readonly"]);
  const sheetId = process.env.GOOGLE_SHEET_ID;

  let rows = [];
  try {
    const result = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `${SHEET_TAB_NAME}!A2:M` });
    rows = result.data.values || [];
  } catch (e) { rows = []; }

  const today = new Date();
  const list = rows.map(r => ({
    submittedAt: r[0], grade: r[1], classNum: r[2], studentNumber: r[3],
    studentName: r[4], disease: r[5], diagnosisDate: r[6],
    exclusionStart: r[7], exclusionEnd: r[8], memo: r[9] || "", status: r[10] || "접수"
  })).filter(item => {
    if (!item.exclusionEnd) return false;
    const end = new Date(item.exclusionEnd);
    return !isNaN(end) && end >= today;
  }).reverse();

  res.status(200).json({ success: true, list });
}

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      return await handleSummary(req, res);
    }
    if (req.method === "POST") {
      const action = req.body.action || "submit";
      if (action === "list") return await handleList(req, res);
      return await handleSubmit(req, res);
    }
    res.status(405).json({ success: false, message: "허용되지 않은 요청입니다." });
  } catch (err) {
    console.error("infection-report error:", err);
    res.status(500).json({ success: false, message: "서버 오류가 발생했습니다." });
  }
};
