import express from "express";
import multer from "multer";
import OpenAI from "openai";

const app = express();
const upload = multer({ limits: { fileSize: 8 * 1024 * 1024 } });
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.static("public"));

app.post("/api/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({error:"Dodaj zdjęcie."});
    const buyPrice = Number(req.body.buyPrice);
    if (!Number.isFinite(buyPrice) || buyPrice <= 0)
      return res.status(400).json({error:"Podaj poprawną cenę zakupu."});

    const b64 = req.file.buffer.toString("base64");
    const dataUrl = `data:${req.file.mimetype};base64,${b64}`;

    const prompt = `Jesteś silnikiem ZyskAI dla polskiego rynku rzeczy używanych.
Rozpoznaj przedmiot na zdjęciu. Użytkownik może kupić go za ${buyPrice} PLN.
Obsługiwane kategorie: elektronika, elektronarzędzia, gry/konsole, foto, LEGO.
Jeśli dokładny wariant/model jest niepewny, NIE zgaduj: ustaw needs_more_info=true i napisz, jakiego zdjęcia/danych potrzeba.
Jeśli identyfikacja jest wystarczająca, użyj web search do znalezienia aktualnych polskich cen porównywalnych ofert. Odróżnij cenę ofertową od ceny szybkiej sprzedaży i zaznacz niepewność.
Zwróć WYŁĄCZNIE JSON:
{
 "product":"", "variant":"", "category":"",
 "confidence":0, "needs_more_info":false, "question":"",
 "market_low":0, "market_high":0, "quick_sale":0,
 "max_buy":0, "estimated_costs":0, "profit":0, "roi":0,
 "decision":"KUP|NEGOCJUJ|ODRZUĆ|BRAK DANYCH",
 "risk":"niskie|średnie|wysokie",
 "reason":"krótkie uzasadnienie",
 "comparables":[{"title":"","price":0,"url":""}]
}
Profit = quick_sale - buyPrice - estimated_costs. ROI = profit/buyPrice*100.
Nie nazywaj czegoś okazją, jeśli dane są słabe.`;

    const response = await client.responses.create({
      model: "gpt-6-luna",
      tools: [{ type: "web_search" }],
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: dataUrl, detail: "high" }
        ]
      }]
    });

    const raw = response.output_text.trim().replace(/^```json\s*/,"").replace(/```$/,"");
    let result;
    try { result = JSON.parse(raw); }
    catch { return res.status(502).json({error:"AI zwróciło niepoprawny format.", raw}); }

    result.buyPrice = buyPrice;
    res.json(result);
  } catch (e) {
    res.status(500).json({error: e?.message || "Błąd analizy."});
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`ZyskAI: http://localhost:${port}`));
