// /api/og-thumb.js
// 링크 주소를 넣으면 그 페이지의 대표 이미지(og:image)를 찾아서 돌려줍니다.
// 메뉴5(필수이수연수) 등록 시 썸네일을 자동으로 채우는 용도입니다.

module.exports = async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      res.status(400).json({ success: false, message: "url 파라미터가 필요합니다." });
      return;
    }

    const pageRes = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SongakHealthBot/1.0)" }
    });
    const html = await pageRes.text();

    // og:image, twitter:image 순서로 찾아봅니다.
    const patterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i
    ];

    let image = "";
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) { image = match[1]; break; }
    }

    if (!image) {
      res.status(200).json({ success: false, message: "대표 이미지를 찾지 못했습니다." });
      return;
    }

    // 상대경로인 경우 절대경로로 변환
    if (image.startsWith("/")) {
      const u = new URL(url);
      image = u.origin + image;
    }

    res.status(200).json({ success: true, image });
  } catch (error) {
    res.status(200).json({ success: false, message: error.toString() });
  }
};
