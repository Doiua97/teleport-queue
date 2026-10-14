# Raport — Teleporty 0.1.3

Data: 15 października 2026. Autor: **Doiua**. Projekt lokalny: `E:\dodatki\margonem-teleporty`. Repozytorium: [Doiua97/teleport-queue](https://github.com/Doiua97/teleport-queue), gałąź `main`.

## Zakres i zmienione pliki

Aktualizacja istniejącej wersji 0.1.2. Zachowano schemat 2 i klucz `margo-tp:v2:<world>:<characterId>`, grupy id/hid, 60 slotów, blokady, zapis klawiszy i wyglądu, widget, import, KC, automat, pauzę, STOP oraz potwierdzanie użycia po ITEM_USED. Brak migracji i resetowania profili. Nie zmieniono backendu, źródeł klienta ani rzeczywistych przedmiotów.

| Plik | Zmiana |
| --- | --- |
| `teleporty.core.js` | Pełne kombinacje, wspólna kontrola konfliktów, obsługa trzech faz klawiatury, format minut, rozmiary trzech okien, wspólny wybór następnego i tooltip na uchwycie. |
| `teleporty.css` | Trzy wysokości konfiguracji, tekst nagłówka przepuszczający wskaźnik, czytelne cyfry odnowienia. |
| `teleporty.user.js` | Wersja 0.1.3 i zasoby nowego wydania przypięte do jego commita. Update/download nadal z main. |
| `tests/core.test.cjs` | Kombinacje/rejestr/system, format czasu, wybór i trwałość kursora. |
| `tests/browser.cjs` | Rzeczywisty InputParser/HotKeys, klawiatura i obce zdarzenia, wymiary, fizyczne przeciąganie, prezentacja kolejki oraz tryb odtwarzania błędów. |
| `README.md`, `REPORT.md` | Instrukcja, analiza, testy, komunikaty i ograniczenia. |

Ikona `assets/widget.png` pozostaje bez zmian: 32 × 32 px, PNG z przezroczystością. Nie dodano plików produkcyjnych, bibliotek, timerów ani osobnych implementacji skalowania.

## Przyczyny błędów i dowód ich odtworzenia

Testy pięciu obszarów uruchomiono przeciw niezmienionemu core i CSS 0.1.2 z commita `0fb06773bcc537c6a4d369423e96d8ab7d726690`. Wszystkie pięć scenariuszy odtworzyło błąd; kod wyjścia 1 był w tym przebiegu oczekiwany. Przeciw 0.1.3 te scenariusze przechodzą.

| Test przeglądarkowy | Wynik na 0.1.2 i przyczyna | Naprawa |
| --- | --- | --- |
| Pełne kombinacje C/K/G, obce skróty, powtórzenia i profile | Shift+C nie zapisuje się: gameConflict porównywał bazowe C, chociaż skrót dodatku przechowywał pełne code i modyfikatory. Samo zatrzymanie keydown nie chroniłoby przed keypress klienta. | Dokładne kombinacje, kontrola zajętości tej samej kombinacji i przejęcie keydown/keypress/keyup jednego obsługiwanego naciśnięcia. |
| Odnowienie 90 i 125 minut na prawdziwym widoku ikony | W przebiegu zatrzymano się na 3600 s: 1h zamiast 60m. Ta sama gałąź Math.ceil(left/3600) dawała 2h dla 90 minut. | Tylko warstwa prezentacji: sekundy poniżej 60, potem Math.ceil(left/60) minut. |
| Rzeczywiste rozmiary PANEL/CONFIG/BIND, scrollbar, pozycja i zapis | CONFIG pozostaje 590/590/590 px zamiast 420/560/260. CONFIG/BIND miały jeden element sizeArray. | Wspólne WindowManageSize z trzema wariantami każdego rodzaju okna; treść PANEL/CONFIG reaguje na natywny indeks, BIND dostaje rzeczywiste szerokości. |
| Fizyczne przeciąganie nagłówków za tytuł, lokację i pustą belkę | Zwinięty PANEL przy geście na nazwie celu zostaje w x=100,y=40. tp-summary zasłaniało natywny uchwyt. | Nieinteraktywny tekst ma pointer-events:none, a tooltip przejął oryginalny draggable-window-element. Bez zmiany pointerDraggable. |
| Numer, podświetlenie i nazwa mają wspólny wybór kolejki | Po usunięciu pierwszego przypisania nadal podświetla się pusty slot 1, podczas gdy find znajduje 2. Numer i podświetlenie używały next, a nazwa wyniku find. | Jedno updateNext pobiera wynik Queue.find i aktualizuje numer, podświetlenie i nazwę. next pozostaje wyłącznie kursorem wyszukiwania. |

## Skróty: kombinacje i pierwszeństwo zdarzeń

Przeanalizowano oryginalne InputParser.keyDown/keyPressProcedure/keyUp, HotKeys.checkKey, hotKeys, getSortedHotKeys, getKeyByClbName i CatchChar. Parser normalizuje KeyboardEvent.key do wielkich liter. Natywne checkKey ignoruje Ctrl, ale nie Shift/Alt/Meta; ruch jest rozpoznawany już w keydown. Dlatego samo dopuszczenie Shift+C przy zapisie byłoby niewystarczające.

Dodatek porównuje code oraz wszystkie cztery modyfikatory; key służy do normalizacji jawnych wpisów klienta według rzeczywistego układu klawiatury. Zapis i wykonanie korzystają z App.conflict/gameConflict. Zwykłe C pozostaje zajęte przez natywną akcję. Shift+C, Shift+K i Shift+G są odrębne i mogą zostać przejęte dokładnie przez Teleporty. To samo dotyczy pozostałych bezpiecznych kombinacji, a nie tylko trzech wskazanych liter.

Listener w capture najpierw sprawdza wcześniejsze defaultPrevented i Engine.catchChar, potem aktywność funkcji, gotowość gry, rzeczywiste blokady i pola edycji (w tym MAGIC_INPUT i contenteditable). Ręczny skrót w pauzie/aktywnym automacie, automat wyłączony w konfiguracji oraz oczekujące żądanie nie przejmują niepotrzebnie klawisza. Aktywny automat nadal może być świadomie wstrzymany własnym skrótem, jeśli interfejs nie wymaga pierwszeństwa.

Dla dozwolonego naciśnięcia zapisywana jest własność fizycznego klawisza. Tylko wtedy keydown, repeat, keypress i końcowe keyup są zatrzymywane przez preventDefault i stopImmediatePropagation. Zmiana modyfikatora w trakcie przytrzymania nie przenosi tego samego naciśnięcia do akcji bazowej. Po keyup własność znika; blur/visibilitychange i destroy także ją czyszczą. Kolejne samodzielne C normalnie dociera do gry.

W naszym oknie przechwytywanie pozostaje modalne. Modyfikatory nie kończą wyboru. Escape/krzyżyk/Anuluj nie zapisuje, Wyczyść wymaga Zapisz. Zwolnienie klawisza naciśniętego w grze przed otwarciem okna nadal dociera do natywnego parsera, żeby nie zostawić go w stanie przytrzymania. Zapis aktualizuje profil i główny formularz bez drugiego zatwierdzenia. Listeners istnieją raz na App i są usuwane przy zmianie postaci.

Wszystkie wykryte konflikty mają jeden tekst: **Ten skrót jest już zajęty.** Nadal oddzielne są nieprawidłowa kombinacja i brak gotowości klienta. Późniejszy konflikt odmawia wykonania i zachowuje zapisane przypisanie.

Istnieją rzeczywiste wyjątki przeglądarkowe: Ctrl+Shift+C uruchamia inspektor, a Ctrl+Shift+K duplikuje kartę w Edge. Nie są to konflikty z samym C/K w grze. Rozpoznawany jest ograniczony katalog **pełnych** kombinacji systemu/przeglądarki, bez uznawania dowolnego dodatkowego modyfikatora za ten sam skrót. Przykładowo Ctrl+Alt+C jest oceniane oddzielnie od Ctrl+C. Znane kombinacje Windows z Meta są oceniane z uwzględnieniem platformy. Nietypowe mapowania systemowe, rozszerzenia i własne ustawienia przeglądarki pozostają poza automatycznym rozpoznaniem. Źródła: [skróty DevTools Edge](https://learn.microsoft.com/en-us/microsoft-edge/devtools/shortcuts/), [skróty Edge](https://support.microsoft.com/en-us/edge/keyboard-shortcuts-in-microsoft-edge), [skróty Windows](https://support.microsoft.com/en-us/windows/keyboard-shortcuts-in-windows-dcc61a57-8ff0-cffe-9796-cb9706c75eec).

## Inne dodatki: dostępny zakres wykrywania

W dostarczonym kliencie GlobalAddons ładuje skrypty, ale nie udostępnia uniwersalnego rejestru ich kombinacji. Natywne HotKeys oraz ustawienia przechowują przede wszystkim pojedyncze wartości key. Nie znaleziono ogólnego, potwierdzonego menedżera wszystkich zewnętrznych listenerów.

Dodatek czyta istniejące Engine.hotKeys.hotKeys i getSortedHotKeys. Jeśli inny dodatek jawnie umieści tam pełną kombinację, rozpoznawane są ciągi takie jak `Shift+C`, `Shift+KeyC` i `Ctrl+G`, niezależnie od kolejności modyfikatorów i z aliasami Control/Cmd/Option. Porównanie dotyczy pełnego zestawu modyfikatorów i kodu albo znormalizowanego key. Wpis jest tylko czytany; Teleporty nie zmieniają go i nie rejestrują fikcyjnego uniwersalnego API.

Test obcego wpisu jest kontrolowanym przypadkiem, potwierdzającym obsługę takiej jawnej struktury. Nie dowodzi, że konkretny nieznany dodatek faktycznie publikuje tam własne skróty. Respektowane są również wcześniejsze obsłużone zdarzenia i natywne Engine.catchChar. Test niepowiązanego Alt+Z potwierdza brak przejęcia cudzej kombinacji. Nie nadpisano EventTarget.prototype.addEventListener, nie enumerowano prywatnych konfiguracji i nie usuwano cudzych handlerów.

Nie da się standardowym API przeglądarki odczytać wszystkich listenerów innych skryptów. Oddzielne konteksty Tampermonkey oraz prywatne/zarejestrowane później handlery mogą uniemożliwić wykrycie zajętości przed naszym listenerem. Pełna zgodność z nieznanymi dodatkami **nie jest deklarowana**. Przechwycenie dotyczy wyłącznie własnego dokładnego skrótu w dozwolonym stanie.

## Czas, rozmiary i przeciąganie

Odczyt timelimit, ważność i gotowość przedmiotu nie zostały zmienione. cooldownText formatuje nakładkę: 15s, 59s, 1m, 2m dla 90 s, 30m, 60m, 90m, 125m i 180m. Nie ma godzin; niepełne minuty są zaokrąglane w górę. Cyfry są bez zawijania, z tabular-nums i dotychczasowym kontrastem. Tooltip natywnego przedmiotu pozostaje oryginalny.

Wszystkie okna korzystają ze wspólnego App.window i WindowManageSize:

| Okno | Kompaktowy | Standardowy | Powiększony |
| --- | --- | --- | --- |
| PANEL | obszar 140 px | 220 px | 310 px |
| CONFIG | obszar 260 px | 420 px | 560 px |
| BIND | szerokość 300 px | 340 px | 380 px |

PANEL ma stale siedem kolumn, a BIND wysokość auto zależną od zawartości, bez dodanego pustego obszaru. Natywny callback wywołuje fit i aktualizację AddScrollBar; ograniczenia uwzględniają ekran i zoomFactor. Pozycja jest korygowana tylko przy przekroczeniu granic. Rozmiar zapisuje natywny Storage pod nazwą okna świata/postaci. Zachowano istniejący zapisany indeks; domyślny indeks nowych okien to standardowy.

Nieinteraktywne header-label i tp-summary przepuszczają pointer do oryginalnego .draggable-window-element. Full tooltip następnej lokacji jest przypisany do uchwytu zwiniętego panelu, z escapowaniem tekstu. Przyciski pozostają interaktywne. Nie zastąpiono natywnego gestu przeciągania.

## Wspólny następny teleport i zapis profilu

Queue.find pozostaje jednym algorytmem dla próby ręcznej, automatu i prezentacji. Pomija pusty slot, kłódkę, brak lub zły id/hid, amount=0, odnowienie, wygaśnięcie i natywne wymagania. Przeszukuje od zapamiętanego next w zakresie start–60, z powrotem do start.

updateNext wykorzystuje ten sam wynik dla numeru, podświetlenia i nazwy lokacji. Jeśli go brak, pokazuje brak gotowych i nie zaznacza pustego slotu. Otwarcie panelu, usunięcie, zamiana, przeciągnięcie, kłódka i odnowienie zmieniają prezentację bez samoczynnego użycia ani przesuwania zapisu next. Zegar istniejący od wcześniejszych wersji odświeża koniec odnowienia.

Po sukcesie next nadal otrzymuje pozycję po faktycznie użytym slocie; nie jest to obietnica gotowości tej pozycji. Wyszukanie może wskazać dalszy slot, bez zmiany next. Błąd nie przesuwa kursora. KC bez celu, STOP, interwał po gotowości mapy i powrót automatu w pauzie po odświeżeniu pozostają bez zmian.

## Wszystkie komunikaty dodatku

Żółte wiadomości używają `window.message(text, true)`. Informacje okna skrótu i stały status pozostają w swoich oknach. Teksty etykiet, nazw przycisków i ustawień nie są ostrzeżeniami.

| Tekst | Dokładny warunek |
| --- | --- |
| Brak teleportów w kolejce. | Próba z całkowicie pustym profilem albo przeszukanie, które usunęło wszystkie brakujące przypisania. |
| Brak gotowego teleportu. | Istnieje przypisanie, ale w sprawdzanym zakresie nie ma odblokowanego gotowego członka: cooldown, amount=0, ważność, wymagania, blokada slotu lub przypisania poza cyklem. Pojedyncze pominięcia nie wyświetlają wiadomości. |
| Postać nie może teraz użyć teleportu. | Gotowa próba przy Engine.dead/blokadzie dead; aktywny automat zauważył ten stan lub otrzymał HERO_DEAD.sec>0. Samo hp=0 i sec=0 nie wystarcza. |
| Dokończ obecną czynność i wznów teleporty. | Rzeczywista walka, dialog, handel, sklep, depozyt, poczta, aukcje, otwarte rzemiosło/jego sześć czynności lub blokada interfaceItems; również aktywny automat przy OPEN_BATTLE_WINDOW/NEW_ASK. |
| Gra czeka na Twoją reakcję. Wznów teleporty, gdy będzie można grać dalej. | Rzeczywisty wpis Engine.lock inny niż change_location/mapLoadedAndAllInit. Nie występuje od samych znanych blokad ładowania mapy. |
| Teleport nie został użyty. | Podjęta próba odrzucona: natywna kontrola tutorial/przedmiotu albo odpowiedź własnego żądania bez skorelowanego ITEM_USED (w tym alert). |
| Nie udało się potwierdzić teleportacji. Sprawdź grę przed kolejną próbą. | Wyjątek natywnego wywołania lub brak odpowiedzi przez 15 s. Nie występuje po zaakceptowanym, skorelowanym ITEM_USED z ustalonym celem. |
| Nie udało się zapisać ustawień. Sprawdź pamięć dodatku. | Wyjątek GM_setValue; timer jest kasowany i stan przechodzi do pauzy. |
| Ten teleport jest już przypisany do slotu. | Próba przypisania z torby fizycznego id już obecnego w innym slocie. Import po prostu pomija duplikat. |
| Dodano teleporty: N. Pominięto z powodu braku miejsca: M. | Dokładnie jedna końcowa wiadomość importu. N liczy nowe fizyczne egzemplarze, także dołączone do grup; M liczy nieprzypisane teleporty bez wolnego miejsca/zgodnej grupy. Już przypisane id nie zwiększają M. |
| Wpisz liczbę od 1 do 60. | Niecałkowity lub poza zakresem początek wpisany przez Ustaw w panelu. |
| Początek cyklu: 1–60. Interwał: dodatnia liczba całkowita. | Zapis konfiguracji z początkiem poza 1–60 lub interwałem niecałkowitym/poza 1–2147483. |
| Wybierz dwa różne skróty. | Zapis głównej konfiguracji zawiera dwa identyczne przypisania. |
| Ustawienia zapisane. | Prawidłowy zapis głównej konfiguracji. Zapis skrótu zamyka własne okno bez dodatkowej żółtej wiadomości. |
| Nieobsługiwana wersja zapisu. Twoje dane pozostają zachowane. | Pod aktualnym kluczem v2 jest niepusty zapis ze schema innym niż 2; bootstrap nie uruchamia dodatku. Nie dotyczy starszego klucza v1. |
| Teleporty nie mogą się uruchomić w tej wersji gry. Sprawdź aktualizację dodatku. | Inny wyjątek inicjalizacji; bootstrap sprząta zasoby i kończy pracę. |
| Teleporty nie mogły się uruchomić. Odśwież grę lub sprawdź aktualizację dodatku. | Minęło 60 s oczekiwania na start dodatku, klient ma allInit i dostępne message, ale wymagane interfejsy nadal nie są gotowe. To limit startu, nie ładowania mapy działającego automatu. |
| Naciśnij poprawną kombinację klawiszy. | W oknie skrótu nieprawidłowy code/modyfikatory, Unidentified lub sam kod modyfikatora. Samo naciśnięcie modyfikatora nie zmienia roboczej kombinacji. |
| Ten skrót jest już zajęty. | W oknie skrótu pełna kombinacja jest identyczna z drugim skrótem Teleportów, zajętym jawnym wpisem HotKeys albo rozpoznanym skrótem przeglądarki/systemu; również sam niemodyfikowany klawisz klienta lub jego zarezerwowana bezpośrednia akcja. Bezpieczny modyfikowany skrót nad bazową literą nie jest konfliktem. Ta sama kontrola przed użyciem odmawia wykonania bez żółtej wiadomości i bez resetu przypisania. |
| Nie można teraz sprawdzić skrótów Margonem. Poczekaj na załadowanie gry. | W oknie skrótu brak Engine.hotKeys; zapis kombinacji pozostaje niedostępny. |
| Czekam na odpowiedź gry… | Stały tekst panelu podczas niezakończonego żądania. |
| Brak odpowiedzi. Poczekaj lub odśwież grę przed kolejną próbą. | Stały tekst panelu po timeout, gdy blokada tego żądania pozostaje do odpowiedzi/odświeżenia. |
| Tryb: Ręczny / Tryb: Auto — Aktywny / Tryb: Auto — Pauza | Stały status odpowiadający off/active/paused. |
| Następna: NAZWA / Następna: wybór miejsca / Następna: brak gotowych | Nagłówek według następnego gotowego członka w cyklu z uwzględnieniem kłódek. Nazwa pochodzi z map,x,y,nazwa; brak nazwy w takim polu daje „nieznana lokacja”. |
| Następny slot: X · Początek: Y · Interwał: Z s | X pochodzi ze wspólnego Queue.find(), a nie z zapamiętanego next; przy braku kandydata X to „brak gotowych”. Y i Z pochodzą z profilu. |
| Przypisane teleporty: N / 60; Wybrany slot: X | Liczba zajętych pozycji i wybrany slot (lub —, jeśli żaden). |
| Zapisany skrót: KOMBINACJA; Naciśnij wybraną kombinację; Brak | Informacje okna skrótu: zapisane przypisanie, instrukcja i podgląd braku przypisania po Wyczyść. |
| Xs / Xm / ? | Nakładka odnowienia: dodatni pozostały czas timelimit, poniżej 60 s w sekundach, od 60 s w minutach zaokrąglonych w górę, bez godzin; ? dla nieprawidłowego końca odnowienia. Brak tekstu dla gotowego przedmiotu. |
| Zmiany zatwierdź przyciskiem Zapisz. Wyłączenie automatu zatrzymuje go od razu. | Stała informacja głównej konfiguracji. Skróty mają własne natychmiastowe zatwierdzenie w osobnym oknie. |

Zablokowane bezpośrednie użycie nie wysyła żądania ani wiadomości. Pomijanie pojedynczych pustych/odnawiających/zablokowanych slotów, normalna mapa i KC otwierające wybór nie powodują fałszywego ostrzeżenia. Komunikaty emitowane przez samą grę/serwer pozostają natywne i nie są generowane przez dodatek.


## Wyniki testów i brak regresji

- **46/46 testów Node**: 41 wcześniejszych przypadków, zaktualizowana semantyka kombinacji i pięć dodatkowych testów rejestru/systemu, czasu oraz wspólnego wyszukiwania.
- **49/49 scenariuszy Edge headless**: 44 wcześniejsze regresje oraz pięć rozbudowanych scenariuszy odpowiadających pięciu obszarom zadania.
- **5/5 odtworzonych błędów na 0.1.2**: osobny przebieg TP_PROBE z niezmienionymi plikami starego wydania. Te same pięć scenariuszy przechodzi na nowym core/CSS.

Testy klawiszy używają oryginalnych HotKeys, HotKeysData i InputParser, a nie zastąpionego parsera. Rzeczywisty keydown/keypress/keyup potwierdza osobne zachowanie C/K/G i Shift+C/K/G, Ctrl+C, Alt+C, Meta+F8 oraz bezpiecznych wielomodyfikatorowych kombinacji. Zweryfikowano brak podwójnej akcji, repeat, zwolnienie po przechwytywaniu, edycję tekstu, nieaktywną funkcję, CatchChar, blokadę gry, wcześniej obsłużony event, identyczne własne bindy, jawny obcy wpis, niepowiązany obcy skrót, późniejszy konflikt i zachowanie po odtworzeniu/zmianie profilu. Porównanie całego zapisanego profilu po odtworzeniu potwierdza zachowanie danych 0.1.2.

Każde okno sprawdzono przez kliknięcia oryginalnego przełącznika oraz getBoundingClientRect, nie tylko atrybut. Sprawdzono trzy różne wymiary, działające kółko i pojedynczy AddScrollBar, niezmienną pozycję, ponowne otwarcie, zapis **niedomyślnego** wariantu i niezależną postać oraz ekran 430×600 z zoomFactor=1.2.

Fizyczne ruchy myszy potwierdzają drag pustej belki i tytułu w stanie rozwiniętym/zwiniętym PANEL/CONFIG/BIND oraz długiej, skróconej nazwy lokacji w panelu. Zachowanie tooltipa, zamykania, zwijania, przezroczystości, konfiguracji i rozmiaru sprawdzono interakcyjnie.

Wybór zweryfikowano jednocześnie w Queue, DOM numeru, tp-next i nazwie celu: puste miejsce, usunięcie wskazanego, kłódka/odblokowanie, odnowienie i jego koniec, zamiana, brak gotowych, powrót do początku, start różny od 1, zniknięcie ostatniego członka i odtworzenie profilu. Samo renderowanie i otwieranie okna nie wysyła żądania ani nie zmienia kursora.

Pozostają oryginalne moduły Window, WindowManager, WindowManageOpacity, WindowManageSize, StorageFuncWindow, ItemsManager, PointerDragDrop, AddScrollBar, Api/ApiData oraz Crafting/CraftingWindow. Natywne sendUseRequest odczytywane jest ze źródła i wywołuje lokalny kontrolowany _g. Przedmioty, serwer, reszta Engine, widgety i część zależności są kontrolowanym środowiskiem testowym. **Nie jest to potwierdzenie teleportacji na rzeczywistym serwerze.**

Źródła gry i kopie 0.1.2 do odtwarzania są poza repozytorium. Obejrzano podglądy nowych okien z oryginalnym CSS i publicznymi grafikami /img/; nie logowano się do gry. Sprawdzono składnię obu JS i git diff --check.

## Uruchamianie

```powershell
node --test tests/core.test.cjs
$env:MARGO_SOURCE_DIR = 'E:\Kod margonem'
$env:TP_BROWSER_CHANNEL = 'msedge'
node tests/browser.cjs
```

Playwright musi być dostępny w Node. Opcjonalnie TP_PROBE=1 uruchamia tylko pięć scenariuszy nowych obszarów. TP_CORE_FILE i TP_CSS_FILE wskazują inne lokalne pliki (np. kopie 0.1.2 uzyskane przez git show) do odtworzenia błędów. Bez tych zmiennych test używa bieżących plików projektu. Po przebiegu starego wydania należy usunąć te zmienne przed sprawdzaniem aktualizacji.

## Publikacja i test w grze

Publikacja odbywa się w dwóch commitach: najpierw core/CSS/testy/dokumentacja, potem loader 0.1.3 przypięty do opublikowanego SHA nowych zasobów. UpdateURL i downloadURL pozostają na main. Loader i każdy jego @require/@resource są weryfikowane przez publiczny HTTP i porównanie zawartości z lokalnym commitem Git. Nie pozostają odwołania do zasobów 0.1.2. SHA i bezpośredni link instalacji są przekazywane w końcowej odpowiedzi.

Nie instalowano dodatku na prawdziwej postaci. Do potwierdzenia przez użytkownika:

1. Tampermonkey pokazuje 0.1.3 i pobiera cały nowy komplet. Dotychczasowe grupy, kłódki, kolory, skróty i początek cyklu są zachowane.
2. Przy C/K/G klienta ustawić Shift+C/K/G i sprawdzić osobno literę oraz kombinację. Sprawdzić chat/edycję, przytrzymanie i używane inne dodatki. Nie zakładać automatycznej detekcji prywatnych skrótów.
3. Sprawdzić nakładki 60m/90m/125m na rzeczywistych teleportach i brak użycia przed zakończeniem odnowienia.
4. Zmienić rozmiary trzech okien, przeciągnąć belki za tekst, zwinąć/rozwinąć i odtworzyć po logowaniu przy używanym zoomie.
5. Przejść cykl 1→2→4→6→1 z pustym 3 i zablokowanym 5. Usunąć wskazywany przedmiot, zakończyć odnowienie, zużyć grupę i porównać numer, podświetlenie oraz nazwę lokacji.
6. Potwierdzić na serwerze zaakceptowane/odrzucone użycie, KC, pauzę przy rzeczywistych blokadach, STOP, ładowanie mapy i świadome wznowienie po odświeżeniu.

Prywatne dodatki, remapowanie systemowe, realne formaty przedmiotów, mapy, opóźnienia serwera i instalacja Tampermonkey pozostają do oceny w działającym Margonem. Testy lokalne tego nie zastępują.
