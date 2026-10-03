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
Przy wycenie w pierwszej kolejności szukaj ofert UŻYWANYCH egzemplarzy dokładnie tego samego produktu, modelu i wariantu.
Oferty nowe traktuj tylko pomocniczo i nie używaj ich jako głównej podstawy wyceny używanego przedmiotu.
Preferuj polski rynek: OLX, Allegro, Allegro Lokalnie i inne wiarygodne polskie źródła.
Porównuj stan, wersję, pojemność, platformę, kompletność zestawu i inne cechy wpływające na cenę.
Quick_sale ma oznaczać realistyczną cenę szybkiej sprzedaży używanego przedmiotu, a nie średnią cenę ofertową.
Jeśli nie znajdziesz wystarczających ofert używanych, wyraźnie zaznacz to w reason i obniż confidence.
  Do wiarygodnej wyceny użyj minimum 3 porównywalnych ofert używanych, a jeśli to możliwe 5 lub więcej.
Odrzucaj ceny wyraźnie odstające od pozostałych ofert, zarówno podejrzanie niskie, jak i zawyżone.
Nie opieraj wyceny na jednej ofercie.
Jeśli znajdziesz mniej niż 3 dobre porównania, ustaw wyższe ryzyko i obniż confidence.
  Przy obliczaniu estimated_costs uwzględnij realistyczne koszty sprzedaży, prowizje platformy, możliwą wysyłkę oraz niewielki margines bezpieczeństwa.
KUP tylko jeśli przewidywany zysk po kosztach wynosi minimum 30 zł i ROI minimum 25%, a ryzyko nie jest wysokie.
NEGOCJUJ jeśli przedmiot może być opłacalny po obniżeniu ceny zakupu albo ROI jest bliskie 25%.
ODRZUĆ jeśli przewidywany zysk jest poniżej 30 zł, ROI poniżej 20% lub ryzyko jest wysokie.
Max_buy wylicz tak, aby po wszystkich kosztach pozostał co najmniej wymagany minimalny zysk i odpowiednie ROI.
  Minimum 3 porównania muszą dotyczyć ofert UŻYWANYCH. Oferty nowe NIE liczą się do wymaganego minimum 3 porównań.
Jeśli znajdziesz mniej niż 3 wiarygodne oferty używane, nie ustawiaj decyzji KUP; ustaw NEGOCJUJ albo BRAK DANYCH i obniż confidence.
W comparables oznacz wyraźnie, czy każda oferta jest używana czy nowa.
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
    if (result.confidence <= 1) result.confidence = Math.round(result.confidence * 100);
    const usedOffers = Array.isArray(result.comparables)
  ? result.comparables.filter(o => /używan/i.test(o.title || ""))
  : [];

if (usedOffers.length < 3 && result.decision === "KUP") {
  result.decision = "NEGOCJUJ";
  result.risk = "wysokie";
}
    res.json(result);
  } catch (e) {
    res.status(500).json({error: e?.message || "Błąd analizy."});
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`ZyskAI: http://localhost:${port}`));
