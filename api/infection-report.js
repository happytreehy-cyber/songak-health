// /api/infection-report.js
// 감염병 발생 보고 관련 기능을 한 파일에 모아둠 (Vercel 무료플랜 함수 개수 제한 때문)
// GET (action 없음 또는 ?action=summary) -> 공개용 집계
// POST body.action: "submit"(기본값) | "list"(교직원용, 비밀번호 필요)
const { google } = require("googleapis");

const SHEET_TAB_NAME = "감염병발생보고";
const HEADER = ["제출일시","학년","반","번호","학생명","감염병종류","진단일","등교중지시작일","등교중지종료예정일","비고","처리상태","보건교사확인","안내완료"];

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

as
