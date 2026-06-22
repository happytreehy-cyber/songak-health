// /api/care.js
// "1학년 요보호" / "2학년 요보호" / "3학년 요보호" 탭에서 학생 요보호 데이터를 읽어온다.
const { google } = require("googleapis");

const TAB_BY_GRADE = {
  "1": "1학년 요보호",
  "2": "2학년 요보호",
  "3": "3학년 요보호"
};

// 시트 상단 6행은 요약 통계, 7행부터 데이터 시작. 헤더는 6행 기준.
const ROW_RANGE = "A6:M300";

// 학년마다 칸(컬럼) 배치가 달라서, 학년별로 따로 지정한다.
// 1학년: 학년,반,번호,이름,여성질환,두통,비염,아토피,천식,알레르기,관리필요,도움반,비고
// 2학년: 학년,반,번호,이름,혈액형(미사용),여성질환,비염,아토피,천식,알레르기,관리필요,도움반,비고 (두통 칸 없음, 혈액형 칸 있음)
// 3학년: 학년,반,번호,이름,여성질환(생리통),비염,아토피,천식,알레르기,관리필요,비고 (두통·도움반 없음)
const COLUMN_MAP = {
  "1": { grade: 0, classNum: 1, number: 2, name: 3, femaleIssue: 4, headache: 5, rhinitis: 6, atopy: 7, asthma: 8, allergy: 9, careNeeded: 10, helpClass: 11, note: 12 },
  "2": { grade: 0, classNum: 1, number: 2, name: 3, femaleIssue: 5, headache: -1, rhinitis: 6, atopy: 7, asthma: 8, allergy: 9, careNeeded: 10, helpClass: 11, note: 12 },
  "3": { grade: 0, classNum: 1, number: 2, name: 3, femaleIssue: 4, headache: -1, rhinitis: 5, atopy: 6, asthma: 7, allergy: 8, careNeeded: 9, helpClass: -1, note: 10 }
};

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

function normalize(s) {
  return String(s || "").replace(/[\s\n\r]+/g, "");
}

function findColByKeywords(headerNorm, keywords) {
  for (const kw of keywords) {
    const i = headerNorm.findIndex(h => h.includes(kw));
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

  // 6행(헤더)의 실제 글자를 읽어서 칸 위치를 자동으로 찾는다 (학년마다 구조가 달라도 안전).
  const headerNorm = rows[0].map(h => normalize(h));

  let idx = {
    grade: findColByKeywords(headerNorm, ["학년"]),
    classNum: findColByKeywords(headerNorm, ["반"]),
    number: findColByKeywords(headerNorm, ["번호"]),
    name: findColByKeywords(headerNorm, ["이름"]),
    femaleIssue: findColByKeywords(headerNorm, ["여성질환"]),
    headache: findColByKeywords(headerNorm, ["두통"]),
    rhinitis: findColByKeywords(headerNorm, ["비염"]),
    atopy: findColByKeywords(headerNorm, ["아토피"]),
    asthma: findColByKeywords(headerNorm, ["천식"]),
    allergy: findColByKeywords(headerNorm, ["알레르기", "알러지"]),
    careNeeded: findColByKeywords(headerNorm, ["관리필요"]),
    helpClass: findColByKeywords(headerNorm, ["도움반"]),
    note: findColByKeywords(headerNorm, ["교내활동시확인", "교내활동"])
  };

  // 헤더 글자를 못 찾았으면(헤더 줄이 없거나 비정상) 위치 고정값으로 대신 사용
  if (idx.name === -1) {
    idx = { grade: 0, classNum: 1, number: 2, name: 3, femaleIssue: 4, headache: 5, rhinitis: 6, atopy: 7, asthma: 8, allergy: 9, careNeeded: 10, helpClass: 11, note: 12 };
  }

  // "학년" 칸 숫자가 이 탭의 학년과 정확히 일치하는 줄만 진짜 학생 데이터로 인정한다.
  const dataRows = rows.filter(r => String(r[idx.grade] || "").trim() === String(grade));

  const students = dataRows
    .filter(r => r[idx.name] && String(r[idx.name]).trim())
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
        grade: r[idx.grade] || grade,
        classNum: r[idx.classNum] || "",
        number: r[idx.number] || "",
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
      const headerNorm = (rows[0] || []).map(h => normalize(h));
      const detectedIdx = {
        grade: findColByKeywords(headerNorm, ["학년"]),
        classNum: findColByKeywords(headerNorm, ["반"]),
        number: findColByKeywords(headerNorm, ["번호"]),
        name: findColByKeywords(headerNorm, ["이름"]),
        femaleIssue: findColByKeywords(headerNorm, ["여성질환"]),
        headache: findColByKeywords(headerNorm, ["두통"]),
        rhinitis: findColByKeywords(headerNorm, ["비염"]),
        atopy: findColByKeywords(headerNorm, ["아토피"]),
        asthma: findColByKeywords(headerNorm, ["천식"]),
        allergy: findColByKeywords(headerNorm, ["알레르기", "알러지"]),
        careNeeded: findColByKeywords(headerNorm, ["관리필요"]),
        helpClass: findColByKeywords(headerNorm, ["도움반"]),
        note: findColByKeywords(headerNorm, ["교내활동시확인", "교내활동"])
      };
      return res.status(200).json({
        success: true,
        tabName,
        headerRow: rows[0] || [],
        detectedIdx,
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
