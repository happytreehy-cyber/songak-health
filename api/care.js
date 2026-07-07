// /api/care.js
// "1학년 요보호" / "2학년 요보호" / "3학년 요보호" 탭에서 학생 요보호 데이터를 읽어온다.
const { google } = require("googleapis");

const GAS_URL = "https://script.google.com/macros/s/AKfycbykwVQpmUzfPe_WdKMbu6agJ2hW9fc6eaMGmCe3rmoPGPtW_H5luzX68fnXH7RB5dl7/exec";

async function notifyKakao(text) {
  try {
    await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "카카오알림", text })
    });
  } catch (e) {
    // 알림 실패해도 저장 처리는 계속 진행 (실패 무시)
  }
}

const TAB_BY_GRADE = {
  "1": "1학년 요보호",
  "2": "2학년 요보호",
  "3": "3학년 요보호"
};

// 시트 상단 6행은 요약 통계, 7행부터 데이터 시작. 헤더는 6행 기준.
// 2학년은 N열(비고)까지 있어서 N열까지 읽어온다.
const ROW_RANGE = "A6:N300";

// 헤더 글자 자동 인식이 실패할 때 사용할 학년별 고정 위치(직접 확인한 실제 칸 배치)
// 1학년: A학년 B반 C번호 D이름 E여성질환 F두통 G비염 H아토피 I천식 J알레르기 K관리필요 L도움반 M비고
// 2학년: A학년 B반 C번호 D이름 E혈액형(미사용) F여성질환 G두통(숨김칸) H비염 I아토피 J천식 K알레르기 L관리필요 M도움반 N비고
// 3학년: A학년 B반 C번호 D이름 E여성질환(생리통) F비염 G아토피 H천식 I알레르기 J관리필요 K비고 (두통·도움반 없음)
const COLUMN_MAP = {
  "1": { grade: 0, classNum: 1, number: 2, name: 3, femaleIssue: 4, headache: 5, rhinitis: 6, atopy: 7, asthma: 8, allergy: 9, careNeeded: 10, helpClass: 11, note: 12 },
  "2": { grade: 0, classNum: 1, number: 2, name: 3, bloodType: 4, femaleIssue: 5, headache: 6, rhinitis: 7, atopy: 8, asthma: 9, allergy: 10, careNeeded: 11, helpClass: 12, note: 13 },
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
    note: findColByKeywords(headerNorm, ["교내활동시확인", "교내활동"]),
    bloodType: findColByKeywords(headerNorm, ["혈액형"])
  };

  // 헤더 글자를 못 찾았으면(헤더 줄이 없거나 비정상) 직접 확인한 학년별 고정 위치를 대신 사용
  if (idx.name === -1) {
    idx = COLUMN_MAP[grade] || COLUMN_MAP["1"];
  }
  if (idx.bloodType === undefined) idx.bloodType = -1;

  // "학년" 칸 숫자가 이 탭의 학년과 정확히 일치하는 줄만 진짜 학생 데이터로 인정한다.
  const dataRows = rows.filter(r => String(r[idx.grade] || "").trim() === String(grade));

  const students = dataRows
    .filter(r => r[idx.name] && String(r[idx.name]).trim())
    .map(r => {
      const conditions = [];
      function push(label, value, type) {
        if (value && String(value).trim()) {
          let v = String(value).trim();
          // 시트에 점(.)이나 동그라미(•)만 표시된 경우, 칸 제목 글자를 그대로 보여준다.
          if (/^[.·•ㆍ\s]+$/.test(v)) v = label;
          conditions.push({ label, value: v, type });
        }
      }
      push("혈액형", idx.bloodType !== -1 ? r[idx.bloodType] : "", "bloodType");
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

const STUDENT_TAB_NAME = "학생명단";

function getSheetsClientRW() {
  return google.sheets({
    version: "v4",
    auth: new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/spreadsheets"]
    )
  });
}

async function handleGetStudents(req, res) {
  const { grade, classNum } = req.query;
  if (!grade || !classNum) {
    return res.status(400).json({ success: false, message: "학년과 반을 선택해주세요." });
  }
  const gradeNum = String(grade).replace(/[^0-9]/g, "");
  const classNumNum = String(classNum).replace(/[^0-9]/g, "");

  const sheets = getSheetsClient();
  const sheetId = process.env.GOOGLE_SHEET_ID;
  let rows = [];
  try {
    const result = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `${STUDENT_TAB_NAME}!C2:F` });
    rows = result.data.values || [];
  } catch (e) {
    return res.status(200).json({ success: true, students: [], message: "학생명단 탭을 찾을 수 없습니다." });
  }
  const students = rows
    .filter(r => String(r[0] || "").replace(/[^0-9]/g, "") === gradeNum && String(r[1] || "").replace(/[^0-9]/g, "") === classNumNum)
    .filter(r => r[3])
    .map(r => ({ number: r[2], name: r[3] }))
    .sort((a, b) => Number(a.number) - Number(b.number));
  res.status(200).json({ success: true, students });
}

async function handleAddStudent(req, res) {
  const { grade, classNum, number, name, symptoms, etcText, note } = req.body || {};
  if (!grade || !classNum || !number || !name) {
    return res.status(400).json({ success: false, message: "학년·반·번호·이름을 모두 입력해주세요." });
  }
  if (!TAB_BY_GRADE[grade]) {
    return res.status(400).json({ success: false, message: "올바르지 않은 학년입니다." });
  }

  const idx = COLUMN_MAP[grade];
  const tabName = TAB_BY_GRADE[grade];

  const maxIdx = Math.max(...Object.values(idx).filter(v => typeof v === "number" && v >= 0));
  const row = new Array(maxIdx + 1).fill("");
  row[idx.grade] = String(grade);
  row[idx.classNum] = String(classNum);
  row[idx.number] = String(number);
  row[idx.name] = String(name);

  const sym = symptoms || {};
  if (sym.female && idx.femaleIssue !== -1) row[idx.femaleIssue] = "여성질환";
  if (sym.headache && idx.headache !== -1) row[idx.headache] = "두통";
  if (sym.rhinitis && idx.rhinitis !== -1) row[idx.rhinitis] = "비염";
  if (sym.atopy && idx.atopy !== -1) row[idx.atopy] = "아토피";
  if (sym.asthma && idx.asthma !== -1) row[idx.asthma] = "천식";
  if (sym.allergy && idx.allergy !== -1) row[idx.allergy] = "알레르기";

  let noteText = String(note || "").trim();
  if (sym.etc && etcText && String(etcText).trim()) {
    noteText = `[기타: ${String(etcText).trim()}] ${noteText}`.trim();
  }
  if (idx.note !== -1) row[idx.note] = noteText;

  const sheets = getSheetsClientRW();
  const sheetId = process.env.GOOGLE_SHEET_ID;

  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const tab = meta.data.sheets.find(s => s.properties.title === tabName);
    // 6행(헤더) 바로 다음, 7행에 새 줄을 끼워넣어서 최신 등록이 맨 위로 오게 합니다.
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { requests: [{
        insertDimension: { range: { sheetId: tab.properties.sheetId, dimension: "ROWS", startIndex: 6, endIndex: 7 }, inheritFromBefore: false }
      }] }
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${tabName}!A7`,
      valueInputOption: "RAW",
      requestBody: { values: [row] }
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: "시트에 저장하는 중 오류가 발생했습니다: " + (e.message || e.toString()) });
  }

  const symLabels = [];
  if (sym.female) symLabels.push("여성질환");
  if (sym.headache) symLabels.push("두통");
  if (sym.rhinitis) symLabels.push("비염");
  if (sym.atopy) symLabels.push("아토피");
  if (sym.asthma) symLabels.push("천식");
  if (sym.allergy) symLabels.push("알레르기");
  await notifyKakao("💗 요보호 학생 추가\n" + grade + "학년 " + classNum + "반 " + number + "번 " + name + "\n" + (symLabels.length ? symLabels.join(", ") : "(특이사항 없음)"));

  res.status(200).json({ success: true, message: "요보호 학생이 추가되었습니다." });
}

module.exports = async (req, res) => {
  try {
    if (req.method === "GET" && req.query.action === "students") {
      return await handleGetStudents(req, res);
    }

    if (req.method === "POST") {
      return await handleAddStudent(req, res);
    }

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
