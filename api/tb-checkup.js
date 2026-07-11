// /api/tb-checkup.js
// tb-checkup.html의 요청을 대신 GAS로 전달해주는 중계 역할입니다.
// 브라우저가 GAS_URL로 직접 요청하면 CORS에 막히기 때문에, Vercel 서버를 한번 거치도록 합니다.

const GAS_URL = "https://script.google.com/macros/s/AKfycbykwVQpmUzfPe_WdKMbu6agJ2hW9fc6eaMGmCe3rmoPGPtW_H5luzX68fnXH7RB5dl7/exec";

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      const params = new URLSearchParams(req.query).toString();
      const url = GAS_URL + (params ? "?" + params : "");
      const gasRes = await fetch(url);
      const text = await gasRes.text();
      res.setHeader("Content-Type", "application/json");
      return res.status(200).send(text);
    }

    if (req.method === "POST") {
      // req.body가 문자열(text/plain)로 올 수도, 객체(JSON)로 올 수도 있어서 둘 다 처리합니다.
      const bodyStr = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

      const gasRes = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: bodyStr
      });
      const text = await gasRes.text();
      res.setHeader("Content-Type", "application/json");
      return res.status(200).send(text);
    }

    return res.status(405).json({ result: "error", message: "허용되지 않은 요청입니다." });
  } catch (err) {
    return res.status(500).json({ result: "error", message: err.toString() });
  }
};
