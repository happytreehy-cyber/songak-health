const { google } = require('googleapis');

module.exports = async function handler(req, res) {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ success: false, message: '이름이 필요합니다.' });

    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const tabName = '접속로그';

    const now = new Date();
    const ts = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') +
      ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const tab = meta.data.sheets.find(s => s.properties.title === tabName);

    if (!tab) {
      // 탭이 아직 없으면 기존 방식대로 추가 (헤더가 없는 새 탭이라 순서가 중요하지 않음)
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: tabName + '!A:B',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [[ts, name]] }
      });
      return res.status(200).json({ success: true });
    }

    // 최신 접속 기록이 맨 위(2번째 줄)에 오도록 삽입 (1번째 줄에 헤더가 있다고 가정)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { requests: [{
        insertDimension: { range: { sheetId: tab.properties.sheetId, dimension: 'ROWS', startIndex: 1, endIndex: 2 }, inheritFromBefore: false }
      }] }
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId, range: tabName + '!A2',
      valueInputOption: 'RAW', requestBody: { values: [[ts, name]] }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.toString() });
  }
};
