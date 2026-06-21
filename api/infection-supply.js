// /api/infection-supply.js
//
// 감염병예방 물품·소모품 신청 -> 구글시트 저장
//
// ⚠️ 환경변수 이름은 기존 다른 api/*.js 파일들과 동일한 이름을 쓰고 있다면
//    아래 GOOGLE_SHEET_ID / GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY
//    부분을 기존 코드에서 쓰던 이름으로 맞춰주세요. (Vercel 프로젝트 설정의
//    Environment Variables 이름과 100% 일치해야 동작합니다.)

const { google } = require("googleapis");

const SHEET_TAB_NAME = "물품신청"; // 구글시트 내 탭(시트) 이름

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, message: "허용되지 않은 요청입니다." });
    return;
  }

  try {
    const { department, items, quantity, applicantName, memo } = req.body;

    if (!department || !items || items.length === 0 || !applicantName) {
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

    const now = new Date();
    const submittedAt = now.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

    const row = [
      submittedAt,            // 제출일시
      department,             // 학년·부서
      items.join(", "),       // 물품(쉼표로 여러 개)
      quantity,                // 수량
      applicantName,           // 신청자
      memo || "",              // 비고
      "접수"                  // 처리상태 (기본값)
    ];

    // 탭이 없으면 자동 생성 + 헤더 추가
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const tabExists = meta.data.sheets.some(
      (s) => s.properties.title === SHEET_TAB_NAME
    );

    if (!tabExists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: SHEET_TAB_NAME } } }]
        }
      });
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `${SHEET_TAB_NAME}!A1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [
            ["제출일시", "학년·부서", "물품", "수량", "신청자", "비고", "처리상태"]
          ]
        }
      });
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${SHEET_TAB_NAME}!A1`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] }
    });

    res.status(200).json({ success: true, message: "신청이 저장되었습니다." });
  } catch (err) {
    console.error("infection-supply error:", err);
    res.status(500).json({ success: false, message: "서버 오류로 저장에 실패했습니다." });
  }
};
