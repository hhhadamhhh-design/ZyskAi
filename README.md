# ZyskAI v0.2

MVP: zdjęcie + cena zakupu → identyfikacja AI → web search → wycena → KUP/NEGOCJUJ/ODRZUĆ.

## Uruchomienie
1. Zainstaluj Node.js 20+.
2. W folderze projektu:
   npm install
3. Ustaw klucz API jako zmienną środowiskową (NIE wpisuj go do HTML):
   macOS/Linux: export OPENAI_API_KEY="..."
   Windows PowerShell: $env:OPENAI_API_KEY="..."
4. Uruchom:
   npm start
5. Otwórz http://localhost:3000

## Ważne
- To MVP/test, nie gotowy produkt komercyjny.
- Aktualne ceny są wyszukiwane w sieci; dostępność i jakość źródeł może się różnić.
- Przed wdrożeniem publicznym dodaj: logowanie, limity/rate limiting, bazę danych, monitoring kosztów API,
  politykę prywatności, regulamin i stabilne/licencjonowane źródła danych cenowych.
- Nie wkładaj OPENAI_API_KEY do frontendu.
