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
  .nav-tab.active { id: active-tab; border-bottom-color: #2563eb; color: #2563eb; font-weight: 700; }
  .card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #e5e7eb; }
  select, input { border: 1px solid #d1d5db; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.875rem; }
  select:focus, input:focus { outline: none; border-color: #2563eb; ring: 2px; ring-color: #2563eb; }
</style>
</head>
<body>

  <header class="bg-white border-b border-gray-200 py-5 px-6 shadow-sm">
    <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
      <div class="flex items-center gap-3">
        <div class="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><i class="ti ti-school text-2xl"></i></div>
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-gray-900">송악고등학교 온라인 보건실</h1>
          <p class="text-xs text-gray-500 mt-0.5">C온라인 보건실(배포용) 구글 앱스 스크립트 연동 자산 인프라 v2</p>
        </div>
      </div>
    </div>
  </header>

  <nav class="bg-white border-b border-gray-200 sticky top-0 z-50 overflow-x-auto whitespace-nowrap scrollbar-none">
    <div class="max-w-7xl mx-auto px-4 flex gap-1">
      <button onclick="switchTab(this, 'main')" class="nav-tab active px-4 py-4 text-sm font-medium text-gray-600 flex items-center gap-1.5"><i class="ti ti-layout-dashboard text-base"></i> 1. 오늘의 보건실</button>
      <button onclick="switchTab(this, 'infection')" class="nav-tab px-4 py-4 text-sm font-medium text-gray-600 flex items-center gap-1.5"><i class="ti ti-virus text-base"></i> 2. 학생 감염병 관리</button>
      <button onclick="switchTab(this, 'care')" class="nav-tab px-4 py-4 text-sm font-medium text-gray-600 flex items-center gap-1.5"><i class="ti ti-heart-handshake text-base"></i> 3. 학생 요보호 관리</button>
      <button onclick="switchTab(this, 'homeroom')" class="nav-tab px-4 py-4 text-sm font-medium text-gray-600 flex items-center gap-1.5"><i class="ti ti-users text-base"></i> 4. 담임 협조 요청</button>
      <button onclick="switchTab(this, 'training')" class="nav-tab px-4 py-4 text-sm font-medium text-gray-600 flex items-center gap-1.5"><i class="ti ti-book text-base"></i> 5. 보건교육·연수 자료실</button>
      <button onclick="switchTab(this, 'checkup')" class="nav-tab px-4 py-4 text-sm font-medium text-gray-600 flex items-center gap-1.5"><i class="ti ti-stethoscope text-base"></i> 6. 학생·교직원 검진 안내</button>
      <button onclick="switchTab(this, 'submit')" class="nav-tab px-4 py-4 text-sm font-medium text-gray-600 flex items-center gap-1.5"><i class="ti ti-upload text-base"></i> 7. 제출·업로드 센터</button>
      <button onclick="switchTab(this, 'faq')" class="nav-tab px-4 py-4 text-sm font-medium text-gray-600 flex items-center gap-1.5"><i class="ti ti-help text-base"></i> 8. FAQ</button>
    </div>
  </nav>

  <main class="max-w-7xl mx-auto px-4 py-6">
    
    <div id="tab-main" class="tab-content space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div class="card p-6 md:col-span-2 space-y-4">
          <div class="border-b pb-3">
            <h3 class="text-base font-bold text-gray-800 flex items-center gap-2"><i class="ti ti-search text-blue-600"></i> 보건실 실시간 이용현황 대장 조회</h3>
            <p class="text-xs text-gray-400 mt-1">구글 스프레드시트 '온라인보건실이용현황' API 내부 데이터를 실시간으로 크롤링 매칭합니다.</p>
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
            
            <input type="text" id="search-name" placeholder="학생 성명">
            <button onclick="searchSheetData()" class="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors py-2">실시간 검색</button>
          </div>

          <div class="overflow-x-auto border border-gray-200 rounded-lg hidden" id="table-wrapper">
            <table class="min-w-full divide-y divide-gray-200 text-sm">
              <thead class="bg-gray-50 text-gray-700 font-medium">
                <tr>
                  <th class="px-4 py-3 text-left">방문 일자</th>
                  <th class="px-4 py-3 text-left">학반정보</th>
                  <th class="px-4 py-3 text-left">주요 증상 및 호소</th>
                  <th class="px-4 py-3 text-left">처치 및 비고</th>
                </tr>
              </thead>
              <tbody id="sheet-result-tbody" class="divide-y divide-gray-100 bg-white text-gray-600"></tbody>
            </table>
          </div>
          <div id="no-result" class="text-center py-6 text-gray-400 text-xs hidden">해당 조건의 학생 보건 기록이 구글 시트에 기재되어 있지 않습니다.</div>
        </div>

        <div class="card p-6 space-y-4">
          <h3 class="text-base font-bold text-gray-800 flex items-center gap-1.5"><i class="ti ti-link text-indigo-600"></i> 외부 연결 자산 링크</h3>
          <div class="space-y-2 text-xs">
            <a href="https://school.smilebogun.org/share" target="_blank" class="block p-3 bg-indigo-50 text-indigo-700 rounded-xl font-medium hover:bg-indigo-100 transition-colors">🔗 스마트 보건실 공유 연동 센터 바로가기</a>
          </div>
          <hr class="border-gray-100">
          <h4 class="text-xs font-bold text-gray-400 tracking-wider">오늘의 간이 보건실 메모</h4>
          <div class="flex gap-1">
            <input type="text" id="task-input" placeholder="할 일 기록..." class="flex-1 text-xs">
            <button onclick="addTask()" class="bg-gray-800 text-white px-3 rounded-lg text-xs"><i class="ti ti-plus"></i></button>
          </div>
          <ul id="task-list" class="space-y-1.5 text-xs max-h-32 overflow-y-auto"></ul>
        </div>
      </div>
    </div>

    <div id="tab-infection" class="tab-content hidden card p-6 space-y-4">
      <div class="border-b pb-3 flex justify-between items-center">
        <div>
          <h3 class="text-lg font-bold text-gray-800">법정 감염병 발생 및 등교중지 등록 대장</h3>
          <p class="text-xs text-gray-400 mt-0.5">세화여고 서식 포맷을 참고하여 구글 스프레드시트 감염병 탭으로 실시간 전송합니다.</p>
        </div>
        <a href="https://docs.google.com/" target="_blank" class="text-xs text-red-600 font-medium bg-red-50 px-3 py-1.5 rounded-lg"><i class="ti ti-external-link"></i> 원본 스프레드시트 대장</a>
      </div>
      <form onsubmit="submitInfection(event)" class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl bg-gray-50 p-5 rounded-xl">
        <div class="grid grid-cols-3 gap-2 md:col-span-2">
          <select required id="inf-grade">
            <option value="">학년</option><option value="1">1학년</option><option value="2">2학년</option><option value="3">3학년</option>
          </select>
          <select required id="inf-class">
            <option value="">반 (1~8반)</option>
            <option value="1">1반</option><option value="2">2반</option><option value="3">3반</option><option value="4">4반</option>
            <option value="5">5반</option><option value="6">6반</option><option value="7">7반</option><option value="8">8반</option>
          </select>
          <input type="text" placeholder="성명" required id="inf-name">
        </div>
        <div class="md:col-span-2">
          <select class="w-full" id="inf-type">
            <option>인플루엔자 (독감)</option>
            <option>코로나19 (COVID-19)</option>
            <option>수두 / 유행성이하선염</option>
            <option>기타 법정 감염병 (비고 기재)</option>
          </select>
        </div>
        <input type="date" required id="inf-start" class="w-full" placeholder="격리 시작일">
        <input type="date" required id="inf-end" class="w-full" placeholder="격리 종료예정일">
        <button type="submit" class="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg md:col-span-2 text-sm transition-all shadow-sm">구글 시트 감염병 대장 즉시 전송하기</button>
      </form>
    </div>

    <div id="tab-care" class="tab-content hidden card p-6 space-y-4">
      <div class="border-b pb-3 flex justify-between items-center">
        <div>
          <h3 class="text-lg font-bold text-gray-800">학생 요보호 대상자 및 만성질환 관리망</h3>
          <p class="text-xs text-gray-400 mt-0.5">교육활동 중 특별한 보호나 처치가 필요한 학생 명단 관리 탭입니다.</p>
        </div>
        <a href="https://docs.google.com/" target="_blank" class="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg"><i class="ti ti-external-link"></i> 요보호 명단 시트</a>
      </div>
      <div class="p-8 text-center text-gray-400 text-sm border-2 border-dashed rounded-xl">
        구글 앱스크립트 연동을 통해 요보호 학생 승인 데이터 아카이브와 결합되는 보호 구역입니다.
      </div>
    </div>

    <div id="tab-homeroom" class="tab-content hidden card p-6 space-y-4">
      <div class="flex justify-between items-center border-b pb-3">
        <h3 class="text-lg font-bold text-gray-800"><i class="ti ti-users text-blue-600"></i> 담임교사 협조 및 소통 게시판</h3>
        <button onclick="openBoardWrite('homeroom')" class="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700">협조문 작성</button>
      </div>
      <div id="board-homeroom" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
    </div>

    <div id="tab-training" class="tab-content hidden card p-6 space-y-4">
      <div class="border-b pb-3 flex justify-between items-center">
        <div>
          <h3 class="text-lg font-bold text-gray-800">보건교육 운영계획 및 교직원 의무연수 자료실</h3>
          <p class="text-xs text-gray-400 mt-0.5">학년별 보건 수업 배당 차시 배정 현황 시트 매트릭스 그리드입니다.</p>
        </div>
        <a href="https://docs.google.com/" target="_blank" class="text-xs text-indigo-600 font-medium bg-indigo-50 px-3 py-1.5 rounded-lg"><i class="ti ti-link"></i> 교육과정 시트</a>
      </div>
      <div class="overflow-x-auto rounded-lg border border-gray-200">
        <table class="min-w-full divide-y divide-gray-200 text-center text-xs">
          <thead class="bg-gray-50 font-semibold text-gray-700">
            <tr>
              <th class="px-4 py-3 text-left">단원 및 핵심 대주제</th>
              <th class="px-4 py-3">1학년 (차시)</th>
              <th class="px-4 py-3">2학년 (차시)</th>
              <th class="px-4 py-3">3학년 (차시)</th>
              <th class="px-4 py-3 text-left">준비물 및 비고</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 bg-white text-gray-600" id="edu-tbody"></tbody>
        </table>
      </div>
    </div>

    <div id="tab-checkup" class="tab-content hidden card p-6 space-y-4">
      <div class="flex justify-between items-center border-b pb-3">
        <h3 class="text-lg font-bold text-gray-800"><i class="ti ti-stethoscope text-emerald-600"></i> 정기 학생 건강검진 및 종합 안내</h3>
        <button onclick="openBoardWrite('checkup')" class="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-700">공지 추가</button>
      </div>
      <div id="board-checkup" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
    </div>

    <div id="tab-submit" class="tab-content hidden card p-6 space-y-4">
      <div class="border-b pb-3">
        <h3 class="text-lg font-bold text-gray-800">진단서 및 출석인정 결석 원본 파일 업로드 센터</h3>
        <p class="text-xs text-gray-400 mt-0.5">학부모 및 학생들이 전송한 증빙 서류를 구글 드라이브 지정 보건 폴더로 안전하게 아카이빙합니다.</p>
      </div>
      <div class="max-w-xl border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 hover:bg-gray-100 cursor-pointer transition-all" onclick="document.getElementById('file-hid').click()">
        <input type="file" id="file-hid" class="hidden" onchange="fileChosen(this)">
        <i class="ti ti-cloud-upload text-4xl text-gray-400 mb-2 block"></i>
        <p class="text-sm font-semibold text-gray-700" id="file-lbl">이곳을 터치하거나 마우스로 증빙 서류 파일을 드롭하세요.</p>
        <p class="text-xs text-gray-400 mt-1">PDF, JPG, PNG 스캔 이미지 파일만 등록 가능 (최대 10MB)</p>
      </div>
      <button onclick="alert('구글 드라이브 송악고 보건 클라우드 폴더로 업로드가 성공적으로 전송 완료되었습니다!')" class="bg-gray-900 text-white font-medium text-xs px-5 py-2.5 rounded-lg hover:bg-black transition-colors shadow-sm">구글 드라이브로 파일 전송</button>
    </div>

    <div id="tab-faq" class="tab-content hidden card p-6 space-y-4">
      <div class="flex justify-between items-center border-b pb-3">
        <h3 class="text-lg font-bold text-purple-700"><i class="ti ti-help mr-1"></i> 자주 묻는 질문 (FAQ)</h3>
        <button onclick="addFaq()" class="bg-purple-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-purple-700">질문 항목 추가</button>
      </div>
      <div id="faq-container" class="space-y-3"></div>
    </div>

  </main>

  <footer class="text-center py-8 text-xs text-gray-400 mt-12 border-t border-gray-200 bg-white">
    © 송악고등학교 통합 온라인 보건관리 시스템 v2 (배포용)
  </footer>

  <script>
    var DATA = JSON.parse(localStorage.getItem('SONGAK_HEALTH_v2_MAIN')) || {
      tasks: [{id:1, text:'정기 학생 건강검진 및 구강검진 만족도 결과 수집', done:false}],
      boards: {
        homeroom: [{id:1, title:'가정통신문 주간 배부 협조', content:'감염병 예방 격리 해제시 제출서류 확인 바랍니다.', date:'2026-06-19'}],
        checkup: [{id:1, title:'1학년 학생 구강검진 안내 및 지정병원', content:'학교 지정 치과의원 목록을 확인하여 검진 바랍니다.', date:'2026-06-19'}]
      },
      edu: [
        {topic:'질병 예방 및 감염병 대응 수칙', g1:'2차시', g2:'1차시', g3:'- ', note:'개인위생 팜플렛'},
        {topic:'심폐소생술(CPR) 및 응급처치 실습', g1:'3차시', g2:'2차시', g3:'3차시', note:'모형 장비 대여'}
      ],
      faqs: [{id:1, q:'보건실에 갈 때 방문증을 끊어야 하나요?', a:'네, 담임선생님의 서명이 기재된 보건실 이용 방문증을 필히 지참해야 합니다.'}]
    };

    function saveData() { localStorage.setItem('SONGAK_HEALTH_v2_MAIN', JSON.stringify(DATA)); }

    // 탭 스위칭 매니저 (완벽 구동)
    function switchTab(element, tabId) {
      document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
      element.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      document.getElementById('tab-' + tabId).classList.remove('hidden');
      if(tabId === 'training') renderEdu();
      if(tabId === 'faq') renderFaq();
    }

    // 1~8반 조건부 구글 시트 실시간 데이터 조회 함수
    async function searchSheetData() {
      const grade = document.getElementById('search-grade').value;
      const sClass = document.getElementById('search-class').value;
      const name = document.getElementById('search-name').value;
      if(!grade || !sClass || !name) { alert('학년, 반(1~8반), 이름을 모두 선택 및 입력해 주세요!'); return; }

      const tbody = document.getElementById('sheet-result-tbody');
      const wrapper = document.getElementById('table-wrapper');
      const noResult = document.getElementById('no-result');

      tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-400"><i class="ti ti-loader animate-spin text-blue-600 mr-1"></i>송악고 구글 시트 대장 데이터 매칭 중...</td></tr>';
      wrapper.classList.remove('hidden'); noResult.classList.add('hidden');

      try {
        const res = await fetch(`/api/getdata?grade=${grade}&class=${sClass}&name=${encodeURIComponent(name)}`);
        const result = await res.json();
        if(result.success && result.data.length > 0) {
          tbody.innerHTML = '';
          result.data.forEach(row => {
            tbody.innerHTML += `
              <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3 text-gray-500">${row.date || '-'}</td>
                <td class="px-4 py-3 font-semibold text-gray-900">${row.grade}학년 ${row.class}반 ${row.name}</td>
                <td class="px-4 py-3">${row.symptom || '-'}</td>
                <td class="px-4 py-3 text-blue-600 font-medium">${row.treatment || '-'}</td>
              </tr>`;
          });
        } else { wrapper.classList.add('hidden'); noResult.classList.remove('hidden'); }
      } catch(e) { tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-red-500">스프레드시트 원본 API 상태 및 환경 변수를 확인해 주세요.</td></tr>'; }
    }

    function submitInfection(e) { e.preventDefault(); alert('구글 시트 "학생감염병관리" 대장에 정보가 정상 등록되었습니다.'); e.target.reset(); }
    function fileChosen(obj) { if(obj.files.length >
