// /api/care.js
// "1학년 요보호" / "2학년 요보호" / "3학년 요보호" 탭에서 학생 요보호 데이터를 읽어온다.
const { google } = require("googleapis");

const TAB_BY_GRADE = {
  "1": "1학년 요보호",
  "2": "2학년 요보호",
  "3": "3학년 요보호"
};

// 시트 상단 6행은 요약 통계(학습도움반/관리필요/비염아토피/천식/알러지 수), 7행부터 데이터 시작.
// 헤더는 6행(A6:M6) 기준.
const ROW_RANGE = "A6:M300";

function getSheetsClient() {
  return google.sheets({
    version: "v4",
    auth: new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    )
  });
}

function findCol(header, candidates) {
  for (const c of candidates) {
    const i = header.indexOf(c);
    if (i !== -1) return i;
  }
  return -1;
}

async function fetchGradeTab(sheets, sheetId, grade) {
  const tabName = TAB_BY_GRADE[grade];
  let rows = [];
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${tabName}!${ROW_RANGE}`
    });
    rows = result.data.values || [];
  } catch (e) {
    return { tabFound: false, students: [], error: e.message || e.toString() };
  }

  if (!rows.length) return { tabFound: true, students: [] };

  // 헤더 글자나 위치가 시트마다 달라서(머리글 오타, 머리글 줄 없음 등),
  // "학년" 칸 숫자가 이 탭의 학년과 정확히 일치하는 줄만 진짜 학생 데이터로 인정한다.
  const idx = {
    grade: 0, classNum: 1, number: 2, name: 3,
    femaleIssue: 4, headache: 5, rhinitis: 6, atopy: 7, asthma: 8, allergy: 9,
    careNeeded: 10, helpClass: 11, note: 12
  };

  const dataRows = rows.filter(r => String(r[idx.grade] || "").trim() === String(grade));

  const students = dataRows
    .filter(r => r[idx.name] && String(r[idx.name]).trim())
    .map(r => {
      const conditions = [];
      function push(label, value, type) {
        if (value && String(value).trim()) conditions.push({ label, value: String(value).trim(), type });
      }
      push("여성질환", r[idx.femaleIssue], "female");
      push("두통", r[idx.headache], "headache");
      push("비염", r[idx.rhinitis], "rhinitis");
      push("아토피", r[idx.atopy], "atopy");
      push("천식", r[idx.asthma], "asthma");
      push("알레르기", r[idx.allergy], "allergy");

      return {
        grade: r[idx.grade] || grade,
        classNum: r[idx.classNum] || "",
        number: r[idx.number] || "",
        name: r[idx.name] || "",
        conditions,
        careNeeded: r[idx.careNeeded] || "",
        helpClass: r[idx.helpClass] || "",
        note: idx.note !== -1 ? (r[idx.note] || "") : ""
      };
    })
    .sort((a, b) => {
      const ca = Number(a.classNum) || 0, cb = Number(b.classNum) || 0;
      if (ca !== cb) return ca - cb;
      return (Number(a.number) || 0) - (Number(b.number) || 0);
    });

  return { tabFound: true, students };
}

module.exports = async (req, res) => {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ success: false, message: "허용되지 않은 요청입니다." });
    }

    const sheetId = process.env.GOOGLE_SHEET_ID;
    const sheets = getSheetsClient();

    if (req.query.debug === "1") {
      const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
      const titles = meta.data.sheets.map(s => s.properties.title);
      return res.status(200).json({ success: true, allTabs: titles });
    }

    if (req.query.debugheader && TAB_BY_GRADE[req.query.debugheader]) {
      const g = req.query.debugheader;
      const tabName = TAB_BY_GRADE[g];
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${tabName}!${ROW_RANGE}`
      });
      const rows = result.data.values || [];
      return res.status(200).json({
        success: true,
        tabName,
        headerRow: rows[0] || [],
        sampleDataRows: rows.slice(1, 4)
      });
    }

    const gradeParam = req.query.grade;
    const grades = gradeParam && TAB_BY_GRADE[gradeParam] ? [gradeParam] : ["1", "2", "3"];

    const results = {};
    let anyTabMissing = [];
    let errors = {};
    for (const g of grades) {
      const r = await fetchGradeTab(sheets, sheetId, g);
      results[g] = r.students;
      if (!r.tabFound) anyTabMissing.push(TAB_BY_GRADE[g]);
      if (r.error) errors[g] = r.error;
    }

    res.status(200).json({
      success: true,
      data: results,
      missingTabs: anyTabMissing,
      errors
    });
  } catch (error) {
    console.error("care api error:", error);
    res.status(500).json({ success: false, message: error.toString() });
  }
};
