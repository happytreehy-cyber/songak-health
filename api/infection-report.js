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

  if (!grade || !classNum || !studentNumber || !studentName || !diagnosisDate ||
