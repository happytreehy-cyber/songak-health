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

  const header = rows[0].map(h => String(h || "").trim());
  const dataRows = rows.slice(1);

  const idx = {
    grade: findCol(header, ["학년"]),
    classNum: findCol(header, ["반"]),
    number: findCol(header, ["번호"]),
    name: findCol(header, ["이름"]),
    femaleIssue: findCol(header, ["여성질환"]),
    headache: findCol(header, ["두통으로치료중", "두통", "두통으로 치료중"]),
    rhinitis: findCol(header, ["비염"]),
    atopy: findCol(header, ["아토피"]),
    asthma: findCol(header, ["천식"]),
    allergy: findCol(header, ["동물/식품/약품 알러지", "동물/식품알레르기", "동물/식품/약품알러지"]),
    careNeeded: findCol(header, ["관리필요"]),
    helpClass: findCol(header, ["도움반"]),
    note: findCol(header, ["교내 활동시 확인", "교내활동시확인"])
  };

  const students = dataRows
    .filter(r => r[idx.name])
    .map(r => {
      const conditions = [];
      function push(label, value, type) {
        if (value && String(value).trim()) conditions.push({ label, value: String(value).trim(), type });
      }
      push("여성질환", idx.femaleIssue !== -1 ? r[idx.femaleIssue] : "", "female");
      push("두통", idx.headache !== -1 ? r[idx.headache] : "", "headache");
      push("비염", idx.rhinitis !== -1 ? r[idx.rhinitis] : "", "rhinitis");
      push("아토피", idx.atopy !== -1 ? r[idx.atopy] : "", "atopy");
      push("천식", idx.asthma !== -1 ? r[idx.asthma] : "", "asthma");
      push("알레르기", idx.allergy !== -1 ? r[idx.allergy] : "", "allergy");

      return {
        grade: idx.grade !== -1 ? r[idx.grade] || "" : grade,
        classNum: idx.classNum !== -1 ? r[idx.classNum] || "" : "",
        number: idx.number !== -1 ? r[idx.number] || "" : "",
        name: r[idx.name] || "",
        conditions,
        careNeeded: idx.careNeeded !== -1 ? (r[idx.careNeeded] || "") : "",
        helpClass: idx.helpClass !== -1 ? (r[idx.helpClass] || "") : "",
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
