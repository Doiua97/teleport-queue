# Raport — Teleporty 0.1.0

Data: 14 października 2026. Autor dodatku: Doiua.

Projekt lokalny: `E:\dodatki\margonem-teleporty`.

Repozytorium: https://github.com/Doiua97/teleport-queue, gałąź `main`.

## Zakres implementacji

Gotowe są wszystkie cztery pliki produkcyjne wymagane w zadaniu: loader, core, CSS oraz przezroczysta ikona PNG 32 × 32 px. Nie ma frameworka, bundlera, backendu ani przykładowych przedmiotów w kodzie produkcyjnym. Dane testowe występują wyłącznie w `tests/`.

Dodatek implementuje:

- Widget `tp_queue` w natywnych belkach, zapis położenia przez `Engine.serverStorage`, oczekiwanie na wolne miejsce i respektowanie usunięcia w edytorze.
- Dwa natywne transparentne okna z oddzielnymi nazwami `TP_PANEL_<world>_<id>` i `TP_CONFIG_<world>_<id>`, pozycją, widocznością, zwijaniem, przezroczystością i wariantem rozmiaru obsługiwanym przez klienta.
- 60 numerowanych slotów w siedmiu kolumnach, ikony 32 px, komórki 34 px, odstępy 3 px, przewijany obszar 220 px i szerokość panelu 306 px.
- Widoki przedmiotów tworzone przez `ItemsManager`, natywny Canvas, jakość, ilość, tooltip i własną nakładkę pozostałego odnowienia. Ukryty panel nie odświeża nakładek.
- Przydzielanie z torby, blokadę zastępowania, zamianę i przenoszenie skrótów, usunięcie przez PPM lub przeciągnięcie na zewnątrz, podwójne kliknięcie i opcję ręcznego użycia w menu.
- Rozpoznawanie po `cl=32` i obecności `teleport` albo `custom_teleport`, identyfikację przez `id` i `hid`, bez zamienników po nazwie lub `tpl`.
- Odnowienie wyłącznie z drugiego pola `timelimit`; `expires` jest sprawdzane natywnym `checkExpires()` jako termin ważności, a nie odnowienie. `ttl`, `timelimit_upgmax` i `timelimit_upgs` nie wyznaczają odnowienia.
- Synchronizację po `afterUpdate`, `delete` i pobraniu przedmiotów, odroczoną do końca bieżącej aktualizacji. Zmiana obiektu przy przenoszeniu między torbami zachowuje tożsamość przypisania.
- Cykl od wybranego początku do 60, najwyżej jedną próbę użycia przedmiotu na przebieg, pomijanie niedostępnych slotów oraz zmianę wskaźnika dopiero po potwierdzeniu.
- Tryby `off`, `active`, `paused`, natychmiastową próbę po starcie i wznowieniu, odstęp liczony po zakończeniu próby, STOP i blokadę ręcznego użycia podczas automatu.
- Pauzę podczas walki, śmierci, dialogu, handlu, innych czynności i blokad klienta. Własna zmiana mapy może zakończyć ładowanie bez zatrzymywania automatu; inne blokady nadal mają pierwszeństwo.
- Natywną obsługę KC bez celu, zachowanie znalezionego slotu oraz pauzę automatu bez wybierania miejsca za gracza.
- Skróty oparte na `KeyboardEvent.code` i modyfikatorach, ignorowanie przytrzymania, pól tekstowych i przechwytywania skrótu, wykrywanie konfliktu pomiędzy skrótami dodatku.
- Konfigurację zapisywaną przez przycisk Zapisz, kolory, przywracanie ustawień domyślnych bez kasowania slotów.
- Lokalne profile przez `GM_getValue` / `GM_setValue`, zachowanie wskaźnika po odświeżeniu i wznowienie wcześniejszego automatu wyłącznie z pauzy.
- Kontrolowane timeouty, timery i usuwanie callbacków, widoków oraz adapterów podczas zamknięcia kontekstu lub zmiany postaci.

## Analiza dostarczonego klienta

Odczytano potrzebne fragmenty `main.min.DdoKxU4n.js` oraz `style.KGLtTzyt.css` z `E:\Kod margonem`. Mimo nazwy główny plik zawiera czytelne moduły z oznaczeniami źródeł. Przeanalizowano okna i zarządzanie nimi, WidgetManager, szablony, StorageFuncWindow, ItemsManager, Item, ItemStats, ItemReuseTime, HeroEquipment, InterfaceItems, ItemsMovedManager, PointerDragDrop, API, hotkeye i blokady.

Istotne rzeczywiste sygnatury i różnice względem ogólnych nazw z zadania:

| Mechanizm | Ustalenie |
| --- | --- |
| `addKeyToDefaultWidgetSet` | Przyjmuje `(key, index, pos, txt, type, clb)`. Samo zarejestrowanie nie umieszcza przycisku na belce. |
| `getFirstEmptyWidgetSlot` | Zwraca `{slot, container}` lub `false`. |
| Układ widgetów | `serverStorage` przechowuje `[index, pos]`; `false` oznacza świadome usunięcie. Zapis dodatku wysyła tylko własny wpis. |
| `initDefaultWidgetSet` | Odtwarza słownik. Minimalny adapter przywraca wyłącznie definicję dodatku. Adapter `addWidgetButtons` nakłada ikonę i sprawdza oczekujące pierwsze umieszczenie. |
| `WindowManager.add` | Wymaga wcześniejszej rejestracji `windowsData.name[name]`; okno należy następnie dołączyć do warstwy. |
| `manageOpacity` | Przyjmuje poziom liczbowy, np. `3`; CSS dodatku reaguje na natywne `data-opacity-lvl`. |
| `manageCollapse` | Przyjmuje `{defaultVal, callbackFn}`. Sam klient zmienia klasę, a zawartość dodatku reaguje na nią w CSS. |
| `manageSize` | Przyjmuje `sizeArray`, opcje i callback. Pierwszy rozmiar trzeba zastosować przez `updateSizeWindow()`. |
| `createViewIcon` | Zwraca tablicę danych widoku; element jQuery znajduje się pod `[0]`. Klon zawiera skopiowane handlery, więc usuwane są akcje ekwipunku. |
| `deleteViewIconIfExist` | Usuwa wszystkie widoki danego `id` we wskazanej grupie. Przy zamianie najpierw usuwa się oba stare widoki, potem tworzy nowe. |
| `Item` | Ma `on` oraz `unregisterCallback`; nie zakładano istnienia `off` na obiekcie przedmiotu. |
| `updadeViewAfterUpdateItem` | Nazwa zawiera literówkę w samym kliencie. Metoda dokłada element cooldownu, więc przed jej użyciem porządkowane są nakładki widoku. |
| Dynamiczny tooltip | Klient dodaje timer przy `mouseover`. W widoku dodatku usunięto te sklonowane handlery; używany jest natywny `setTip`, z odświeżaniem aktualnie wskazywanej ikony przez kontrolowany zegar dodatku. |
| `PointerDragDrop` | Przekazuje upuszczenie do wszystkich przecinających się stref. Źródło przeciągania wewnętrznego jest komórką dodatku, bez klasy `.item`. Dla upuszczenia z torby nad panelem przechwycenie `pointerup` anuluje natywne przeciąganie przed obsługą mapy i zapisuje sam skrót. |
| `Engine.battle` | Jest stałą instancją nawet poza walką. Sprawdzane jest `isBattleShow()`, a nie sama obecność obiektu. |
| Blokady mapy | `change_location` jest pomijana tylko podczas potwierdzonej własnej teleportacji. CAPTCHA, dialog i pozostałe blokady nadal zatrzymują automat. |

Żaden przesłany plik gry ani plik pod `sources/` nie został zmodyfikowany. Kopie wybranych fragmentów do analizy znajdują się poza projektem, w `E:\dodatki\tp-analysis`, i nie są publikowane. Nie skopiowano implementacji klienta do plików produkcyjnych.

## Potwierdzanie użycia i ograniczenia API

Callback `sendUseRequest(item, callback)` nie przekazuje odpowiedzi i uruchamia się przed sprawdzeniem `alert`. Dlatego nie potwierdza sukcesu.

Dodatek wiąże własny callback z konkretnym oczekującym przedmiotem. W synchronicznej dalszej obsłudze tej odpowiedzi obserwuje `Engine.interface.checkTeleport` oraz `API.ITEM_USED`. Sukces wymaga jednocześnie:

1. Obsługi odpowiedzi własnego żądania.
2. `ITEM_USED` dla tego samego `id` i `hid`.
3. Przekazania przez natywny klient `t=reload` do `checkTeleport`.
4. Braku wyboru celu KC.
5. Nadal aktualnej postaci, świata i operacji; STOP lub zmiana początku unieważniają późne przesunięcie.

Adapter `checkTeleport` zachowuje oryginalną funkcję i jej argumenty. Nie zastępuje odpowiedzi, nie wywołuje `_g` i nie wysyła dodatkowych żądań. Przywracany jest przy zakończeniu pracy dodatku.

`ITEM_USED` bez sygnału teleportacji jest wynikiem niejednoznacznym: wskaźnik pozostaje, automat przechodzi w pauzę i wyświetla wiadomość. Brak `ITEM_USED` po callbacku jest odrzuceniem. Po 15 sekundach bez odpowiedzi próba kończy się ostrzeżeniem, ale blokada trwającego żądania pozostaje aż do późnej odpowiedzi lub odświeżenia. Nie jest wykonywane automatyczne ponowienie. Ładowanie mapy trwające ponad 60 sekund także powoduje pauzę.

Odpowiedź `t=reload` wraz z `ITEM_USED` oznacza zaakceptowane użycie teleportu według tego klienta. Nie deklaruje potwierdzenia końcowego pojawienia się postaci na mapie. Jeżeli któryś rzeczywisty typ teleportu korzysta z innej ścieżki odpowiedzi, dodatek zatrzyma się bez przesunięcia zamiast zgadywać sukces. Należy zbadać taki przypadek w grze przed rozszerzeniem warunku.

Przedmioty wymagające potwierdzenia `binds` są kierowane do użycia z torby: natywne okno potwierdzenia może wysłać własne żądanie poza kontrolą kolejki. Dodatek nie otwiera tej ścieżki w automacie. Po przypisaniu przedmiotu w torbie może on uczestniczyć w kolejce.

Interwał przyjmuje całkowite wartości od 1 do 2 147 483 sekund. Górna granica wynika z zakresu `setTimeout`; większa wartość mogłaby zostać zamieniona przez przeglądarkę na niemal natychmiastowe wywołanie.

## Wyniki lokalne

- **27/27 testów Node:** rozpoznanie typów i KC, cooldowny, ilość/ważność/blokada, cykle, uszkodzone profile, osobny klucz świata i postaci, skróty, pojedyncze żądanie, sukces/błąd/niejednoznaczność/timeout, pauza KC, czasowanie, STOP, późna odpowiedź, zmiana postaci i początku, brak gotowych przedmiotów, brak zamienników, pauza oraz destroy. Osobny kontekst `vm` sprawdza loader bez globalnego `Engine` i przekazanie `unsafeWindow` oraz zasobów.
- **18/18 scenariuszy przeglądarkowych:** Microsoft Edge w trybie headless. Użyto oryginalnych modułów Window, WindowManager, WindowManageOpacity, WindowManageSize, StorageFuncWindow, ItemsManager, PointerDragDrop i API, odczytywanych przy uruchomieniu testu. WidgetManager, obiekty przedmiotów, pozostałe stany Engine i odpowiedzi serwera były kontrolowanymi atrapami.
- Przeglądarka potwierdziła: dwa okna, 60 slotów i szerokość; przydziały/duplikaty/blokadę/zamianę/widoki; ilość i odtworzenie obiektu; wyniki użycia; KC; STOP; klawisze; własną zmianę mapy i blokadę walki; ukrycie panelu i konfigurację; przezroczystość/zwijanie/pozycję/PPM; odbudowę i usunięcie widgetu; oba kierunki przeciągania bez wywołania strefy mapy; mniejszy ekran i zoom; zapis konfiguracji; pełne belki; cleanup i powrót profilu; oczekiwanie loadera i jednokrotny start.
- Sprawdzono składnię obu plików JavaScript. Ikona ma rzeczywiste 32 × 32 px, format PNG i kanał alfa. Wizualnie obejrzano panel ze stylem dostarczonego klienta; zasoby graficzne samej gry były w lokalnym teście zablokowane.
- Nie zainstalowano userscriptu w Tampermonkey i nie wysłano żądań na rzeczywistym koncie gry.

## Dokładne sprawdzenia pozostające w działającym Margonem

Poniższe punkty nie są oznaczone jako zaliczone w grze. Część logiki ma pokrycie lokalne, ale nadal wymaga oceny na prawdziwym kliencie i serwerze.

1. Instalacja w Tampermonkey: pobranie core/CSS/PNG z opublikowanych adresów, dostęp do `unsafeWindow`, jednokrotne uruchomienie w kliencie osadzonym w ramce oraz kompatybilność przeglądarki.
2. Pierwsze umieszczenie widgetu przez rzeczywisty WidgetManager i serverStorage: wolne miejsce, całkowicie pełne belki, późniejsze zwolnienie miejsca, przenoszenie w edytorze, odświeżenie, usunięcie, odbudowa i reset definicji, zmiana rozdzielczości oraz ewentualny błąd zapisu serwera.
3. Oba okna: wygląd z załadowanymi grafikami gry, przesuwanie, każda przezroczystość, zwijanie z informacją o następnym slocie, rozmiar, widoczność i odtworzenie po ponownym logowaniu dla dwóch różnych postaci/światów.
4. Przypisywanie wszystkich rodzajów rzeczywistych teleportów: zwykły kamień, Kamień Smoka, eventowy kamień, KC z celem i bez celu, zwój, Zwój Smoka i przedmiot z `amount`. Sprawdzić faktyczne wartości `id`, `hid`, `cl` i właściwości, bez rozpoznawania po nazwie.
5. Przeciąganie z torby: pusty i zajęty slot, blokada zastępowania, próba duplikatu, panel nad mapą i nad innymi strefami. Sprawdzić, że nie pojawia się pytanie o upuszczenie przedmiotu.
6. Przeciąganie w panelu: zamiana zajętych slotów, przeniesienie do pustego, przeciągnięcie poza panel oraz anulowanie gestu. Sprawdzić zachowanie fizycznego przedmiotu i brak reakcji GroundItems, także przy dotyku.
7. Natywne ikony, jakość, tooltip i liczniki: aktualizacja ilości, zakończenie cooldownu, częste wejście/wyjście kursora, usunięcie widoku oraz brak pozostałych handlerów i timerów.
8. Synchronizacja: przenoszenie między torbami, rekonstrukcja obiektu przez ItemsManager, rzeczywiste zniknięcie ostatniej sztuki i inny przedmiot o tym samym `tpl`/nazwie. Nie może zostać automatycznie podmieniony.
9. Każdy typ teleportu z przypisanym celem: potwierdzić, że odpowiedź przekazuje `t=reload` do `checkTeleport` i emituje `ITEM_USED` dla użytego przedmiotu. Sprawdzić przesunięcie wyłącznie po zaakceptowanym użyciu oraz przy teleportacji do tej samej mapy.
10. KC bez celu: otwarcie natywnego wyboru, anulowanie, ustawienie miejsca, brak przesunięcia po samym ustawieniu, zachowanie znalezionego slotu i ponowne ręczne wznowienie.
11. Odrzucenia serwera: niedozwolona mapa, poziom, aktywne odnowienie, wygasły lub zużyty przedmiot. Wskaźnik musi pozostać; automat ma się wstrzymać po odrzuceniu podjętej próby.
12. Opóźniona i utracona odpowiedź, rozłączenie oraz STOP podczas żądania: nie może być dwóch równoległych żądań ani przesunięcia po STOP. Przy niejednoznacznym wyniku nie ma automatycznego ponowienia.
13. Automat: natychmiastowy start i wznowienie, minimalny interwał 1 s, domyślne 120 s, brak nadrabiania prób po uśpieniu karty, dalsza praca przy ukrytym panelu i brak pauzy przy prawidłowej własnej zmianie mapy.
14. Pauzy: rozpoczęcie walki, śmierć, dialog NPC, handel, sklep, depozyt, poczta, aukcje, rzemiosło, pytanie klienta, CAPTCHA, utrata połączenia i pozostałe blokady. Wznowienie wyłącznie przez gracza.
15. Skróty w prawdziwym czacie i polach NI: F9/F10, Ctrl/Alt/Shift z literą, przytrzymanie, utrata fokusu, przechwytywanie nowego skrótu i ewentualny konflikt ze skrótem przypisanym w samej grze. Dodatek wykrywa konflikt między własnymi dwoma skrótami; nie przerabia natywnego edytora gry ani skrótów przeglądarki.
16. Zapis: A → B → A, dwa światy, odświeżenie przy aktywnym automacie, zachowanie wskaźnika i powrót w pauzie, zmiana postaci podczas żądania oraz aktualizacja wersji dodatku bez resetu profilu.
17. Mały ekran, różne `zoomFactor`, przewijanie dotykiem, przyciski menu mobilnego i gesty Pointer Events. Pełna kompatybilność mobilnego Tampermonkey nie została zweryfikowana.

Adresy GitHub są już kompletne. Nie trzeba uzupełniać `OWNER`, `REPO`, autora ani ścieżek zasobów. Publikację do tego repozytorium użytkownik zezwolił wykonać w wiadomości, co zastępuje zakaz samodzielnej publikacji z załączonego opisu zadania.
