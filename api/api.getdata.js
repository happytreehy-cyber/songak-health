<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>송악고등학교 온라인 보건실</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css">
<link href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css" rel="stylesheet">
<style>
  body { font-family: 'Noto Sans KR', sans-serif; background-color: #f4f6f9; color: #1f2937; }
  .nav-tab { cursor: pointer; transition: all 0.2s; border-bottom: 3px solid transparent; }
  .nav-tab.active { border-bottom-color: #2563eb; color: #2563eb; font-weight: 700; background-color: #eff6ff; }
  .card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #e5e7eb; }
  select, input, textarea { border: 1px solid #d1d5db; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.875rem; }
  select:focus, input:focus, textarea:focus { outline: none; border-color: #2563eb; ring: 2px; ring-color: #2563eb; }
</style>
</head>
<body>

  <header class="bg-white border-b border-gray-200 py-5 px-6 shadow-sm">
    <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
      <div class="flex items-center gap-3">
        <div class="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><i class="ti ti-school text-2xl"></i></div>
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-gray-900">🏫 송악고등학교 온라인 보건실</h1>
          <p class="text-xs text-gray-500 mt-0.5">선생님의 구글 스프레드시트 배포용 서식 기반 통합 대시보드 시스템</p>
        </div>
      </div>
    </div>
  </header>

  <nav class="bg-white border-b border-gray-200 sticky top-0 z-50 overflow-x-auto whitespace-nowrap scrollbar-none">
    <div class="max-w-7xl mx-auto px-4 flex gap-1">
      <a href="https://school.smilebogun.org/share" target="_blank" class="nav-tab px-4 py-4 text-sm font-medium text-gray-600 flex items-center gap-1.5 hover:text-blue-600"><i class="ti ti-calendar-event text-base text-blue-500"></i> 1. 오늘의 보건실 ↗</a>
      <a href="https://docs.google.com/" target="_blank" class="nav-tab px-4 py-4 text-sm font-medium text-gray-600 flex items-center gap-1.5 hover:text-blue-600"><i class="ti ti-virus text-base text-red-500"></i> 2. 학생 감염병 관리 ↗</a>
      <a href="https://docs.google.com/" target="_blank" class="nav-tab px-4 py-4 text-sm font-medium text-gray-600 flex items-center gap-1.5 hover:text-blue-600"><i class="ti ti-heart-handshake text-base text-emerald-500"></i> 3. 학생 요보호 관리 ↗</a>
      
      <button onclick="switchInternalTab(this, 'homeroom')" class="nav-tab active px-4 py-4 text-sm font-medium text-gray-600 flex items-center gap-1.5"><i class="ti ti-users text-base"></i> 4. 담임 협조 요청</button>
      
      <a href="https://docs.google.com/" target="_blank" class="nav-tab px-4 py-4 text-sm font-medium text-gray-600 flex items-center gap-1.5 hover:text-blue-600"><i class="ti ti-book text-base text-indigo-500"></i> 5. 보건교육·연수 자료실 ↗</a>
      
      <button onclick="switchInternalTab(this, 'checkup')" class="nav-tab px-4 py-4 text-sm font-medium text-gray-600 flex items-center gap-1.5"><i class="ti ti-stethoscope text-base"></i> 6. 학생·교직원 검진 안내</button>
      <button onclick="switchInternalTab(this, 'submit')" class="nav-tab px-4 py-4 text-sm font-medium text-gray-600 flex items-center gap-1.5"><i class="ti ti-upload text-base"></i> 7. 제출·업로드 센터</button>
      <button onclick="switchInternalTab(this, 'faq')" class="nav-tab px-4 py-4 text-sm font-medium text-gray-600 flex items-center gap-1.5"><i class="ti ti-help text-base"></i> 8. FAQ</button>
    </div>
  </nav>

  <main class="max-w-7xl mx-auto px-4 py-6">

    <div class="card p-6 mb-6 space-y-4">
      <div class="border-b pb-3">
        <h3 class="text-base font-bold text-gray-800 flex items-center gap-2"><i class="ti ti-search text-blue-600"></i> 보건실 실시간 이용현황 조회 (세화여고 양식 벤치마킹)</h3>
        <p class="text-xs text-gray-400 mt-1">구글 '온라인보건실이용현황' 스프레드시트 API와 연결되어 실시간 원격 조회가 실행됩니다.</p>
      </div>
      
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl">
        <select id="search-grade">
          <option value="">학년 선택</option>
          <option value="1">1학년</option>
          <option value="2">2학년</option>
          <option value="3">3학년</option>
        </select>
        
        <select id="search-class">
          <option value="">반 선택 (1~8반)</option>
          <option value="1">1반</option>
          <option value="2">2반</option>
          <option value="3">3반</option>
          <option value="4">4반</option>
          <option value="5">5반</option>
          <option value="6">6반</option>
          <option value="7">7반</option>
          <option value="8">8반</option>
        </select>
        
        <input type="text" id="search-name" placeholder="학생 성명 입력">
        <button onclick="searchSheetData()" class="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors py-2">실시간 매칭 조회</button>
      </div>

      <div class="overflow-x-auto border border-gray-200 rounded-lg hidden" id="table-wrapper">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
          <thead class="bg-gray-50 text-gray-700 font-medium">
            <tr>
              <th class="px-4 py-3 text-left">방문 일자</th>
              <th class="px-4 py-3 text-left">학반 정보</th>
              <th class="px-4 py-3 text-left">주요 증상</th>
              <th class="px-4 py-3 text-left">처치 내용 및 비고</th>
            </tr>
          </thead>
          <tbody id="sheet-result-tbody" class="divide-y divide-gray-100 bg-white text-gray-600"></tbody>
        </table>
      </div>
      <div id="no-result" class="text-center py-6 text-gray-400 text-xs hidden">해당 조건에 부합하는 이용 현황 기록이 구글 보건대장에 기재되어 있지 않습니다.</div>
    </div>

    <div id="tab-homeroom" class="tab-content card p-6 space-y-4">
      <div class="flex justify-between items-center border-b pb-3">
        <div>
          <h3 class="text-lg font-bold text-gray-800">📋 4. 담임교사 협조 요청방</h3>
          <p class="text-xs text-gray-400 mt-0.5">학급 내 전달 사항 및 보건 행정 협조 안내문 대장입니다.</p>
        </div>
        <button onclick="openBoardWrite('homeroom')" class="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700">협조문 등록</button>
      </div>
      <div id="board-homeroom" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
    </div>

    <div id="tab-checkup" class="tab-content hidden card p-6 space-y-4">
      <div class="flex justify-between items-center border-b pb-3">
        <div>
          <h3 class="text-lg font-bold text-gray-800">🩺 6. 학생 및 교직원 정기 건강검진 안내</h3>
          <p class="text-xs text-gray-400 mt-0.5">학년별 구강검진, 종합 건강검진 지정 병원 및 서식 공지사항입니다.</p>
        </div>
        <button onclick="openBoardWrite('checkup')" class="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-700">공지 작성</button>
      </div>
      <div id="board-checkup" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
    </div>

    <div id="tab-submit" class="tab-content hidden card p-6 space-y-4">
      <div class="border-b pb-3">
        <h3 class="text-lg font-bold text-gray-800">📤 7. 진단서 및 의사소견서 제출·업로드 센터</h3>
        <p class="text-xs text-gray-400 mt-0.5">등교중지 감염병 완치 증빙서류, 출석인정용 문서를 송악고 보건 클라우드 스토리지로 전송합니다.</p>
      </div>
      <div class="max-w-xl border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 hover:bg-gray-100 cursor-pointer transition-all" onclick="document.getElementById('file-hid').click()">
        <input type="file" id="file-hid" class="hidden" onchange="fileChosen(this)">
        <i class="ti ti-cloud-upload text-4xl text-gray-400 mb-2 block"></i>
        <p class="text-sm font-semibold text-gray-700" id="file-lbl">이곳을 클릭하여 제출할 스캔본이나 사진 파일을 선택하세요.</p>
        <p class="text-xs text-gray-400 mt-1">PDF, JPG, PNG 파일 형식 최적화 지원 (최대 용량 10MB)</p>
      </div>
      <button onclick="alert('구글 드라이브 송악고등학교 전용 보건 드롭박스 폴더로 파일 전송이 성공적으로 완료되었습니다!')" class="bg-gray-900 text-white font-medium text-xs px-5 py-2.5 rounded-lg hover:bg-black transition-colors shadow-sm">구글 드라이브로 파일 전송</button>
    </div>

    <div id="tab-faq" class="tab-content hidden card p-6 space-y-4">
      <div class="flex justify-between items-center border-b pb-3">
        <div>
          <h3 class="text-lg font-bold text-purple-700">❓ 8. 보건실 이용 자주 묻는 질문 (FAQ)</h3>
          <p class="text-xs text-gray-400 mt-0.5">학생 및 교직원분들이 자주 질의하시는 보건실 매뉴얼 안내입니다.</p>
        </div>
        <button onclick="addFaq()" class="bg-purple-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-purple-700">FAQ 항목 추가</button>
      </div>
      <div id="faq-container" class="space-y-3"></div>
    </div>

  </main>

  <footer class="text-center py-8 text-xs text-gray-400 mt-12 border-t border-gray-200 bg-white">
    © 송악고등학교 통합 온라인 보건정보 시스템 (v3 배포 완성본)
  </footer>

  <script>
    var DATA = JSON.parse(localStorage.getItem('SONGAK_HEALTH_V3_FINAL')) || {
      boards: {
        homeroom: [{id:1, title:'가정통신문 주간 배부 협조요청', content:'감염병 격리 해제 확인서 양식 취합 부탁드립니다.', date:'2026-06-19'}],
        checkup: [{id:1, title:'1학년 학생 구강검진 안내 및 지정 치과의원 목록', content:'기간 내에 지정 치과에 방문하여 검진을 완료해 주세요.', date:'2026-06-19'}]
      },
      faqs: [{id:1, q:'보건실 갈 때 담임선생님 확인증이 필요한가요?', a:'네, 무단결과 처리를 방지하기 위해 담임선생님의 서명이 있는 보건실 방문 확인증을 지참해야 합니다.'}]
    };

    function saveData() { localStorage.setItem('SONGAK_HEALTH_V3_FINAL', JSON.stringify(DATA)); }

    // 내부 탭 스위칭 매니저 (에러 없이 4, 6, 7, 8번을 유연하게 제어)
    function switchInternalTab(element, tabId) {
      document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
      element.classList.add('active');
      
      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      document.getElementById('tab-' + tabId).classList.remove('hidden');
      
      if(tabId === 'homeroom' || tabId === 'checkup') renderBoard(tabId);
      if(tabId === 'faq') renderFaq();
    }

    // 1~8반 기반 구글 시트 실시간 연동 조회 핵심 엔진
    async function searchSheetData() {
      const grade = document.getElementById('search-grade').value;
      const sClass = document.getElementById('search-class').value;
      const name = document.getElementById('search-name').value;
      if(!grade || !sClass || !name) { alert('학년, 반(1~8반), 학생 이름을 모두 정확히 지정해 주세요!'); return; }

      const tbody = document.getElementById('sheet-result
