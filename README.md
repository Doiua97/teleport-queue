# Teleporty do Margonem NI

Dodatek autorstwa **Doiua**, wersja **0.1.4**. Panel ma 60 miejsc na teleporty z torby, kolejkę ręczną oraz automat uruchamiany przez gracza.

Wersja 0.1.4 poprawia dostępne skróty Ctrl+litera i Ctrl+Shift+litera, w tym Ctrl+K. Rozróżnia AltGr używany do pisania od zwykłego Ctrl+Alt. Pozostałe funkcje i dane wersji 0.1.3 są zachowane.

[Plik do instalacji w Tampermonkey](https://raw.githubusercontent.com/Doiua97/teleport-queue/main/teleporty.user.js)

Wykonano testy lokalne: **50 testów logiki i 54 scenariusze przeglądarkowe**, w tym zapis i użycie 45 dostępnych kombinacji Ctrl/Ctrl+Shift oraz oryginalny parser klawiatury gry. Nie instalowano dodatku na prawdziwej postaci. Testy z kontrolowanymi odpowiedziami nie potwierdzają działania na serwerze; zakres i pozostałe sprawdzenia opisuje [raport](REPORT.md).

## Używanie

1. Zainstaluj wskazany plik w Tampermonkey i odśwież NI.
2. Otwórz **Teleporty** z belki gry. Gdy belki są pełne, dodatek poczeka na wolne miejsce.
3. Przeciągnij teleport z torby do wybranego slotu lub kliknij **Pobierz teleporty**. Pobieranie uzupełnia wolne miejsca od początku cyklu, a następnie od 1; zachowuje istniejący układ.
4. **F9** albo **Użyj ręcznie** wykonuje jedną próbę. Puste, zablokowane i niedostępne miejsca są pomijane.
5. Koło zębate otwiera konfigurację. Zaznacz **Włącz tryb automatyczny**; **F10** lub przycisk automatu rozpoczyna działanie, wstrzymuje je albo wznawia. Domyślny odstęp to 120 sekund.
6. **STOP** zatrzymuje automat i wraca do początku cyklu. Ukrycie panelu zachowuje działający automat.

**Ctrl + lewy przycisk myszy** blokuje lub odblokowuje dane miejsce, także puste. Kłódka oznacza, że kolejka go nie użyje. Można nadal zmieniać jego przypisanie; blokada pozostaje na pozycji. **Odblokuj zablokowane** usuwa wszystkie kłódki i pojawia się tylko wtedy, gdy są potrzebne. Opcja **Blokuj zastąpienie slotu** oddzielnie chroni zajęte miejsca przed zastąpieniem przez przeciągnięcie z torby.

Zgodne teleporty zużywalne są podczas pobierania przedstawiane razem: dwa stosy po 5 i 7 sztuk pokazują 12 w jednym miejscu. Ich cel i ograniczenia muszą się zgadzać. Dwa ręcznie ustawione miejsca pozostają oddzielne. Jedna próba używa najwyżej jednego rzeczywistego przedmiotu. Torba nie jest zmieniana przez pobieranie ani grupowanie.

Przeciąganie między slotami zamienia przypisania, także całe grupy. Prawy przycisk myszy otwiera **Użyj** i **Usuń**; zablokowane miejsce udostępnia tylko usunięcie. Przeciągnięcie poza panel usuwa skrót. Rzeczywiste przedmioty pozostają w torbie.

Pod liczbą przypisań znajdują się wybrany slot i ustawienie początku cyklu. Cykl od 12 obejmuje wyłącznie 12–60 i wraca do 12, nawet jeśli pobieranie uzupełni też miejsca 1–11. Numer, podświetlenie i nazwa celu zawsze wskazują ten sam następny gotowy teleport. Gdy go brak, nie podświetla się pustego miejsca. Odnowienie pokazuje sekundy poniżej minuty, a następnie minuty: np. 90m zamiast 2h.

Natywny przycisk rozmiaru ma trzy warianty w każdym oknie: panel zachowuje siedem kolumn i wysokości obszaru 140/220/310 px, konfiguracja 260/420/560 px, a okno skrótu szerokości 300/340/380 px. Nagłówki można przeciągać także za tekst, po rozwinięciu i zwinięciu. Pełna nazwa następnej lokacji jest dostępna po najechaniu na zwiniętą belkę.

Kliknięcie aktualnego skrótu w konfiguracji otwiera **Ustaw skrót klawiszowy**. Naciśnij kombinację i kliknij **Zapisz** — zaczyna obowiązywać od razu. **Wyczyść** przygotowuje usunięcie, zatwierdzane przez **Zapisz**. **Anuluj**, krzyżyk lub Escape zachowuje wcześniejszy skrót.

Sama litera i kombinacja to oddzielne skróty: K, Ctrl+K i Ctrl+Shift+litera są oceniane osobno. Możesz przypisać np. Ctrl+B do użycia ręcznego i Ctrl+Shift+B do automatu; zapis działa od razu. Pisanie w polach, natywne przypisywanie klawiszy, blokady gry i wcześniejsze obsłużenie zdarzenia mają pierwszeństwo. Przytrzymanie nie ponawia użycia. Wyłączona funkcja nie przejmuje klawisza.

Dla Ctrl+A–Z dostępne są litery poza N, T i W. Dla Ctrl+Shift+A–Z dostępne są litery poza K, N, T i W. Karty i okna przeglądarki zachowują pierwszeństwo; Ctrl+Shift+K pozostaje ostrożnościowo zablokowane ze względu na duplikowanie karty w Edge. Inne rzeczywiste zajęte przypisania również mogą uniemożliwić zapis. Pełna lista i powody znajdują się w [raporcie](REPORT.md).

Ctrl+K oraz dostarczane stronie, możliwe do zatrzymania skróty, takie jak Ctrl+F czy Ctrl+Shift+C, nie są już odrzucane tylko dlatego, że przeglądarka ma dla nich własną funkcję. Działanie wymaga fokusu na grze; nie przejmujemy klawiszy z paska adresu, menu przeglądarki ani systemu. Dostępność może różnić się przy innych przeglądarkach, ustawieniach i rozszerzeniach.

**AltGr pozostaje do wpisywania znaków.** Nie uruchamia przypisanego Ctrl+Alt+litera. W oknie skrótu AltGr jest pokazywany jako AltGr, a taka kombinacja nie zostaje zapisana; wybierz zwykły Ctrl/Alt. Jeżeli przeglądarka zgłasza także fizyczny Ctrl+Alt jako AltGraph, dodatek ostrożnościowo pozostawia go do pisania.

Komunikat **Ten skrót jest już zajęty.** obejmuje identyczny skrót dodatku, wykrywalne zajęte przypisanie oraz chronione klawisze przeglądarki/systemu. Wykrywanie cudzych skrótów jest ograniczone do jawnych wpisów w rejestrze klawiszy gry i widocznego wcześniejszego obsłużenia zdarzenia; prywatnych skrótów wszystkich dodatków nie można automatycznie odczytać.

Odznaczenie **Włącz tryb automatyczny** od razu wykonuje STOP i zapisuje wyłączenie. Ponowne zaznaczenie zapisuje włączenie; uruchomienie nadal wymaga Start lub skrótu. Pozostałe opcje zatwierdź przez **Zapisz**.

Zaakceptowane użycie przesuwa kolejkę. Normalne ładowanie mapy zachowuje aktywny automat; następny pełny odstęp zaczyna się po odpowiedzi i gotowości gry. Rzeczywista śmierć, walka, dialog lub inna blokada zatrzymuje automat do ręcznego wznowienia. Odświeżenie całej strony przywraca wcześniejszy automat w pauzie.

KC bez miejsca otwiera wybór w grze i zachowuje slot. Automat pauzuje; wybierz miejsce i wznów go, gdy będziesz gotowy. Przy odrzuceniu albo braku potwierdzenia wskaźnik pozostaje. Brak odpowiedzi utrzymuje blokadę kolejnego żądania do późnej odpowiedzi lub odświeżenia.

**Aktualizacja 0.1.3 → 0.1.4 zachowuje dane v2.** Nie resetuje slotów, grup, kłódek, skrótów ani wyglądu. Dane 0.1.1 nadal nie są przenoszone, ale pozostają zachowane. Położenie widgetu nadal zapisuje gra.

## Pliki i testy

| Plik | Przeznaczenie |
| --- | --- |
| `teleporty.user.js` | Loader i dostęp do pamięci Tampermonkey; wersjonowane zasoby 0.1.4. |
| `teleporty.core.js` | Okna, widget, grupy, blokady, import, kolejka i skróty. |
| `teleporty.css` | Wygląd ograniczony do elementów dodatku. |
| `assets/widget.png` | Ikona 32 × 32 px z przezroczystością, zachowana bez zmian. |
| `tests/core.test.cjs` | Testy logiki, profili, grup i konfliktów. |
| `tests/browser.cjs` | Przeglądarka, oryginalne moduły klienta i kontrolowane odpowiedzi. |
| `REPORT.md` | Przyczyny napraw, model danych, komunikaty i weryfikacja. |

Projekt nie wymaga bundlera ani bibliotek produkcyjnych.

```powershell
node --test tests/core.test.cjs
$env:MARGO_SOURCE_DIR = 'E:\Kod margonem'
$env:TP_BROWSER_CHANNEL = 'msedge'
node tests/browser.cjs
```

Test przeglądarkowy wymaga Playwright dostępnego dla Node (np. przez `NODE_PATH`), Edge lub Chromium, głównego JS i CSS klienta oraz plików `vendors.min.Dme5lfFa.js` i `rolldown-runtime.min.7_rZTKki.js`. Test odczytuje źródła lokalnie; nie są częścią repozytorium. Wywołania serwera są kontrolowane lokalnie i nie trafiają do Margonem.

Opcjonalne `TP_NATIVE_ASSET_ORIGIN` pozwala pobrać publiczne grafiki `/img/`, a `TP_SCREENSHOT` zapisać podglądy PNG. Pobierane są wyłącznie grafiki, bez logowania i żądań użycia przedmiotów.

Schemat danych ma numer 2, a klucz `margo-tp:v2:<world>:<characterId>`. Aktualizując loader, zmień `@version`, `?v=` oraz commit zasobów. Loader aktualizuje się z gałęzi `main`, a core, CSS i ikona są przypięte do konkretnego commita wydania w `Doiua97/teleport-queue`, aby pobrać zgodny komplet plików.
