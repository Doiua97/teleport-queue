# Teleporty — audyt 0.1.4 → 0.1.5

Punkt odniesienia: commit `346417edf70ab22f94724dd8a4ad9ff1e7b051ae`. Audyt obejmuje cały core, loader, CSS, testy i dokumentację. Przed zmianami: 50/50 testów Node i 54/54 scenariusze Edge. Źródła klienta pozostają poza repozytorium i są tylko odczytywane.

Kategorie: **K** — konieczny; **Z** — zbędny; **P** — powtórzenie; **U** — do uproszczenia; **B** — zachowany dla bezpieczeństwa lub zgodności. W kolumnie przeznaczenia podano także wywołującego i odbiorcę wyniku. Zagnieżdżone callbacki opisano przy metodach, które je tworzą; ich stan i cykl życia podano osobno poniżej.

## Funkcje, klasy i stałe core

| Element | Obecne przeznaczenie | Ustalenie | Proponowana zmiana |
|---|---|---|---|
| IIFE / `root` | Zamyka implementację; loader odbiera eksport. | B: izoluje stan od klienta i innych dodatków. | Zachować zamknięcie. |
| `SIZE` | 60 pozycji dla load, Queue, importu i DOM. | K: wspólny limit danych i widoku. | Bez zmian. |
| `VIEW` | Nazwa rejestracji ikon w ItemsManager. | B: animacje, usuwanie i ograniczenia klienta korzystają z rejestru. | Bez zmian. |
| `WIDGET` | Nazwa widgetu w oknie, belce i serverStorage. | B: część istniejącego zapisu gry. | Bez zmian. |
| `LOAD_LOCKS` | `loaded`/`blocked` odróżniają ładowanie od interakcji. | B: zapobiega użyciu w trakcie zmiany mapy. | Bez zmian. |
| `MODIFIERS` | `keyValid` i przechwytywanie pomijają samotne modyfikatory. | K. | Bez zmian. |
| `OCCUPIED`, `INVALID_KEY` | Komunikaty wspólnej walidacji klawiszy. | K: różne przyczyny błędu. | Bez zmian. |
| `WINDOW_SIZES` | `window` buduje natywny wybór trzech rozmiarów. | K: zaakceptowane wymiary okien. | Bez zmian. |
| `defaults` | Nowy profil oraz reset formularza; zwraca świeży obiekt. | K: nie współdzieli zmienianej konfiguracji. | Bez zmian. |
| `integer` | `load`, `setStart`, `saveConfig` sprawdzają zakresy. | K: wspólna walidacja. | Bez zmian. |
| `keyValid` | `load` i `conflict` walidują dane/AltGr. | B: chroni zapis i wykonanie. | Bez zmian. |
| `sameKey` | `load`, zapis i wykonanie porównują pełną kombinację. | B: litera nie jest równa literze z Ctrl. | Bez zmian. |
| `altGraphOf` | `keyOf`, walidacja i bind rozpoznają AltGraph. | B: ochrona wpisywania znaków. | Bez zmian. |
| `keyOf` | Bind tworzy deskryptor z code, key i flag. | K. | Bez zmian. |
| `keyText` | Formularz i podgląd wyświetlają kombinację. | K. | Bez zmian. |
| `profileKey` | Konstruktor i context identyfikują świat oraz postać. | B: izolacja zapisów v2. | Bez zmian. |
| `stats` | Pozostałe funkcje odczytują natywne parseStats. | K: klient ma własną obsługę statystyk. | Bez zmian. |
| `teleport` | Import, item, DnD, gotowość i grupowanie sprawdzają klasę/statystyki. | B: sama nazwa nie wystarcza. | Bez zmian. |
| `identity` | Grupy, DnD i operacja zapamiętują id/hid. | B: chroni przed zastąpieniem innym przedmiotem. | Bez zmian. |
| `matches` | item, Queue.find i accept porównują id/hid. | B: także potwierdzenie właściwego ITEM_USED. | Bez zmian. |
| `groupOf` | assign/import tworzą grupę jednego przedmiotu. | K: używana poza testami. | Bez zmian. |
| `quantity` | syncIcon sumuje sztuki w grupie. | K: natywny widok zna tylko pojedynczy stos. | Bez zmian. |
| `groupKey` | Import porównuje tpl i statystyki poza ilością/końcem cooldownu. | B: nie łączy różnych celów i ograniczeń. | Bez zmian. |
| `destination` | updateNext pokazuje lokację lub wybór KC. | K. | Bez zmian. |
| `nativeKey` | registeredKey, gameConflict i bind normalizują klawisz klienta. | B: HotKeys używa key, dodatek także code. | Bez zmian. |
| `registeredKey` | gameConflict sprawdza jawne pełne kombinacje obcych dodatków. | B: nie zmienia ich przypisań. | Bez zmian. |
| `systemKey` | gameConflict chroni kombinacje przeglądarki/systemu. | B: polityka 0.1.4, także ostrożnościowa blokada Ctrl+Shift+K. | Bez zmian. |
| `gameConflict` | conflict sprawdza HotKeys, ruch i kombinacje systemowe. | B: brak rejestru powoduje odmowę, a nie zgadywanie. | Bez zmian. |
| `cooldown` | readyItem i overlays obliczają pozostały czas. | B: nieprawidłowy koniec daje Infinity. | Bez zmian. |
| `cooldownText` | overlays pokazuje sekundy/minuty/znak zapytania. | K: inne niż natywne skracanie godzin. | Bez zmian. |
| `needsTarget` | destination, Queue.attempt i use rozpoznają wybór miejsca KC. | B: automat pauzuje na tym samym slocie. | Bez zmian. |
| `readyItem` | available sprawdza teleport, czas, ilość, wygaśnięcie i blokadę. | B: konieczne przed wysłaniem. | Bez zmian. |
| `advance` | Queue.find/attempt przechodzą po cyklu od start do 60. | K. | Bez zmian. |
| `load` | App tworzy zweryfikowaną kopię profilu, zachowuje v2. | B: aktywny zapis wraca w pauzie, obcy schemat nie jest nadpisywany. | Bez zmian. |
| `Queue` | Oddziela cykl i żądania od klienta/DOM; App tworzy adapter. | K: dwie klasy wystarczają. | Nie dodawać kolejnych klas. |
| `Queue.constructor` | Zachowuje profil, adapter, zegar i blokady. | K: zegar pozwala testować harmonogram. | Bez zmian. |
| `Queue.change` | Zapisuje i renderuje po zmianach stanu. | K: oba skutki wymagane. | Bez zmian. |
| `Queue.clear` | pause/stop/attempt/schedule/wait/destroy usuwają timer i waiting. | B: brak podwójnych prób. | Bez zmian. |
| `Queue.pause` | Zdarzenia, błędy, konfiguracja i toggle wstrzymują cykl. | K: nie resetuje next. | Bez zmian. |
| `Queue.stop` | Przycisk, konfiguracja i bind resetują cykl, unieważniają odpowiedź. | B: nie odblokowuje trwającego żądania. | Bez zmian. |
| `Queue.setStart` | Panel/formularz zmieniają początek i epoch. | B: późna odpowiedź nie przesuwa zmienionej kolejki. | Bez zmian. |
| `Queue.toggle` | Przycisk/bind rozpoczynają od razu albo pauzują. | K. | Bez zmian. |
| `Queue.manual` | Przycisk, PPM, podwójny klik i bind wybierają próbę. | B: pauza/auto/blokada pozycji chronią przed użyciem. | Bez zmian. |
| `Queue.find` | attempt i updateNext wybierają identyczny gotowy slot; czyszczenie tylko na żądanie. | B: podgląd nie zapisuje ani nie przesuwa next. | Bez zmian. |
| `Queue.attempt` | Wspólna ścieżka próby, wyniku, przesunięcia i planowania. | B: loaded/context/flight/epoch/id-hid/sukces są wymagane. | Nie skracać kosztem zabezpieczeń. |
| `Queue.schedule` | attempt/ready planują pełny odstęp od zakończenia/gotowości. | B: najwyżej jeden timeout, brak nadrabiania. | Bez zmian. |
| `Queue.wait` | onClear/tick usuwają timer podczas ładowania. | B: sam interwał nie dowodzi gotowości mapy. | Bez zmian. |
| `Queue.ready` | startGameThread/tick wznawiają planowanie po gotowości. | B. | Bez zmian. |
| `Queue.release` | Późna odpowiedź App.use zwalnia właściwy flight. | B: konieczne po timeout. | Bez zmian. |
| `Queue.destroy` | App.destroy unieważnia wynik i czyści timer/operację. | B. | Bez zmian. |
| `wrap` | init/widget opakowują metody klienta z bezpiecznym odtworzeniem. | B: nie nadpisuje późniejszego wrappera innego dodatku. | Usunąć tylko zbędne zastosowanie checkTeleport. |
| `ready` | boot sprawdza gotowość API, widoków, ekwipunku i DnD. | B: brak części klienta nie może uruchomić połowy dodatku. | Bez zmian. |
| `App` | Integruje klienta, okna, dane, widoki i wejście; używa Queue. | K: odpowiedzialności są duże, ale rozbicie na kolejne klasy zwiększyłoby przepływ stanu. | Lokalne uproszczenia, bez przebudowy architektury. |
| `App.constructor` | boot tworzy adapter Queue i stan integracji. | K. | Zachować adapter i zamknięte GM w env. |
| `App.context` | Większość mutacji, tick i callbacki weryfikują Engine/postać. | B: chroni po przełączeniu postaci. | Bez zmian. |
| `App.save` | Queue i zmiany ustawień zapisują klon; błąd wstrzymuje cykl. | B: nie usuwać obsługi błędu zapisu. | Bez zmian. |
| `App.message` | Kolejka i formularze używają natywnego komunikatu. | K: wspólny parametr klienta. | Bez zmian. |
| `App.event` | init rejestruje API i symetryczny unsubscribe. | B: callback musi być ten sam. | Bez zmian. |
| `App.listen` | bind rejestruje DOM i symetryczny removeEventListener. | B: opcje capture też zachowane. | Bez zmian. |
| `App.item` | members, assign/import/DnD wymagają własnego rzeczywistego przedmiotu. | B: getItemById bez HeroEquipment i hid byłby niewystarczający. | Bez zmian. |
| `App.members` | Kolejka, widoki, import rozwiązują zapisane referencje. | K. | Bez zmian. |
| `App.loaded` | sync, Queue, tick, bind, import sprawdzają mapę i locki. | B. | Bez zmian. |
| `App.available` | Queue i widok łączą readyItem z natywnymi ograniczeniami. | B: gotowość sprawdzana na bieżąco, nie zapamiętywana do wykonania. | Bez zmian. |
| `App.blocked` | Queue, tick i bind chronią walkę, czynności, śmierć i dialog. | B: Crafting istnieje również poza otwartym oknem. | Bez zmian. |
| `App.init` | Rejestruje widok, okna, widget, eventy, fetch, wrappery i timer. | U: checkTeleport zapisuje wyłącznie martwą flagę. | Usunąć ten wrapper; zachować resztę. |
| `App.use` | Wywołuje HeroEquipment, oczekuje odpowiedzi i potwierdzenia ITEM_USED. | U/B: reload nie jest czytane; done zawsze true po finish. | Usunąć reload i redundantny warunek przed release. |
| `App.accept` | ITEM_USED ustawia accepted tylko dla właściwego id/hid podczas odpowiedzi. | B: samo checkTeleport nie potwierdza użycia. | Bez zmian. |
| `App.deferSync` | Item/fetch łączą serię zmian w jeden timeout 0. | B: natywny fetch może trwać w trakcie usuwania/odtwarzania obiektu. | Zachować łączenie i możliwość anulowania. |
| `App.sync` | Pobiera teleporty, zakłada/usuwa Item callbacks, czyści refs i widoki. | U/P: dwa identyczne callbacki i podwójna pełna synchronizacja przez render. | Jeden callback dla dwóch zdarzeń; pełne odświeżenie raz, bez odtwarzania istniejącej ikony. |
| `App.assign` | DnD przypisuje slot po kontroli własności, zastąpienia i duplikatu. | B. | Bez zmian. |
| `App.importItems` | Przycisk uzupełnia miejsca i grupuje zgodne stosy. | B: zachowuje ręczny układ i blokady. | Bez zmian. |
| `App.toggleLock` | Ctrl+LPM zapisuje i renderuje blokadę pozycji. | K. | Bez zmian. |
| `App.unlockAll` | Przycisk usuwa wszystkie blokady i zapisuje. | K. | Bez zmian. |
| `App.drop` | Wspólne rozróżnienie slotu i przedmiotu dla natywnego oraz chronionego DnD. | B: obie ścieżki są używane. | Bez zmian. |
| `App.hitSlot` | pointerup sprawdza widoczny obszar przewijania i komórkę. | B: stopka nie może przyjąć ukrytego slotu. | Bez zmian. |
| `App.swap` | DnD zamienia grupy, pozostawia blokadę pozycji. | K. | Bez zmian. |
| `App.remove` | PPM/przeciągnięcie usuwa tylko przypisanie. | K. | Bez zmian. |
| `App.changedSlots` | assign/import/swap/remove czyszczą stare widoki przed utworzeniem nowych. | P: force po clearSlot nie ma wartości. | Nie wymuszać ponownego tworzenia; zachować dwie fazy przy zamianie. |
| `App.button` | build/formularze używają natywnego button i obsługi klawiatury. | K: template nie zawiera tej obsługi. | Bez zmian. |
| `App.number` | build/fillConfig używają dwóch natywnych szablonów input. | K: właściwe klasy, id, atrybuty. | Bez zmian. |
| `App.scrollBar` | build uruchamia AddScrollBar i rejestruje cleanup uchwytu. | B: natywne API nie daje kompletnego destroy dla całości. | Bez zmian. |
| `App.updateScroll` | Zmiany zawartości/rozmiaru wysyłają natywne update. | K: panel i formularz są niezależne. | Bez zmian. |
| `App.window` | build/openCapture tworzą trzy rodzaje okien w WindowManager. | K: już wspólny adapter natywnych okien. | Zachować sygnaturę i opcje. |
| `App.build` | Tworzy 60 slotów, kontrolki, panel i konfigurację. | B: drag helper canvas, blokady, PPM, numery i natywne belki mają różne role. | Nie przepisywać układu. |
| `App.clearSlot` | changedSlots/renderSlot usuwają natywną rejestrację i DOM. | K. | Jedno miejsce usuwania .tp-icon. |
| `App.renderSlot` | sync/changedSlots/overlays wybierają reprezentanta grupy i ikonę. | U/P: pełne syncIcon nawet dla niezmienionego widoku, dwukrotne usuwanie DOM. | Oddzielić refresh istniejącego przedmiotu od wyboru reprezentanta. |
| `App.syncIcon` | Natywne metadane, tooltip, ograniczenia i suma grupy. | K, ale zbędne co sekundę. | Wykonywać przy tworzeniu i synchronizacji przedmiotów; nie w zwykłym tick. |
| `App.overlays` | tick/render/visibilitychange aktualizują cooldowny i następny slot. | U: pełne ikony i niezmienione teksty zapisuje co sekundę. | Aktualizować tylko zmieniony tekst i klasę; dalej sprawdzać reprezentanta i gotowość. |
| `App.updateNext` | render/overlays/fit pokazują numer, cel i wyróżnienie tego samego q.find. | P: render woła bezpośrednio i przez overlays. | Jeden wybór na render, również przy ukrytym panelu. |
| `App.render` | Queue i akcje UI odświeżają stan, przyciski, zaznaczenia i kolory. | U: podwójny updateNext. | Wywołać przez overlays dla widocznego panelu, bezpośrednio dla ukrytego. |
| `App.fillConfig` | build/openConfig/reset tworzą roboczy formularz. | B: natywne szablony plus istniejący układ, osobne natychmiastowe auto/bindy. | Nie zamieniać na FormBuilder o innej semantyce/układzie. |
| `App.setAuto` | Checkbox i reset natychmiast zapisują auto/STOP. | B: nie czeka na główne Zapisz. | Bez zmian. |
| `App.saveConfig` | Główne Zapisz waliduje i zatwierdza pozostałe ustawienia. | B: zmiana start/interwał pauzuje. | Bez zmian. |
| `App.openConfig` | Koło zębate wypełnia i podnosi konfigurację. | K. | Bez zmian. |
| `App.conflict` | Zapis/podgląd/wykonanie stosują te same reguły. | B: cancelable, drugi bind i AltGr. | Bez zmian. |
| `App.openCapture` | Tworzy raz i otwiera natywne okno binda z kopią zapisu. | K: callbacki nie są dopisywane przy każdym otwarciu. | Bez zmian. |
| `App.previewCapture` | Otwieranie/keydown/Wyczyść pokazują roboczy klawisz i błąd. | K. | Bez zmian. |
| `App.saveCapture` | Zapisuje od razu bind i synchronizuje draft/formularz. | B: główne Zapisz nie może cofnąć nowego binda. | Bez zmian. |
| `App.closeCapture` | Anuluj/Escape/krzyżyk zamykają bez zapisu. | K. | Bez zmian. |
| `App.textInput` | Bind rozpoznaje czat, edytowalne pola i composedPath. | B: nie przejmować pisania. | Bez zmian. |
| `App.keyReady` | Bind sprawdza catchChar, mapę i blokady. | B. | Bez zmian. |
| `App.togglePanel` | Widget przełącza widoczność; otwarcie synchronizuje i dopasowuje. | K: ukrycie nie zatrzymuje automatu. | Bez zmian. |
| `App.bind` | DOM pointer/keyboard/blur/resize/visibility obsługują integrację. | B: przejęcie drop przed GroundItems i całego naciśnięcia przed InputParser. | Zachować kolejność capture, repeat, AltGr, keyup i Ctrl+LPM. |
| `App.widget` | Rejestruje/dekoruje/umieszcza widget i odtwarza po resecie klienta. | B: register/decorate/place mają oddzielne skutki; flaga chroni pętlę sendData. | Zachować wrappery i respektowanie ręcznego usunięcia. |
| `App.fit` | Zmiana rozmiaru/przeciąganie/otwarcie aktualizują granice, scrollbar i tip belki. | B: uruchamiana też w trakcie budowania. | Nie usuwać sprawdzenia summary. |
| `App.rebuild` | AFTER_INTERFACE_START ponownie wpina okna, synchronizuje i dopasowuje. | B: start interfejsu może wymienić warstwę. | Bez zmian. |
| `App.tick` | Jeden interwał sprawdza profil, blokady, mapę i liczniki. | B: nie zastępować wyłącznie zdarzeniami; część blokad/czas zmieniają się niezależnie. | Odchudzić overlays, zachować timer. |
| `App.destroy` | boot/restart/pagehide usuwa żądania, timery, widoki, callbacki, DnD i okna. | B: idempotentne. | Zachować pełne czyszczenie. |
| `boot` | Loader uruchamia jeden App po gotowości klienta. | B: retry/deadline, restart postaci, pagehide i marker są potrzebne. | Jedyny eksport produkcyjny. |
| `TeleportQueue` | Loader używa wyłącznie boot; pozostałe 20 eksportów odczytują tylko testy. | Z: publiczna ekspozycja tych 20 elementów; same funkcje nie są martwe. | Eksportować tylko boot; testy wstrzykują własny dostęp do zamknięcia. |

## Stan, callbacki, adaptery i timery

| Element | Obecne przeznaczenie | Ustalenie | Proponowana zmiana |
|---|---|---|---|
| Profil: schema/config/slots/locked/next/state/widgetPlaced | load i akcje zapisują; kolejka, UI, widget odczytują. | B: format v2, świat i postać pozostają stałe. | Bez migracji/resetu. |
| `p.last` | load odtwarza; sukces attempt zapisuje ostatni slot; produkcja nie odczytuje. | B: nie steruje zachowaniem, ale jest częścią dotychczasowego profilu i zapisów. | Zachować odczyt i zapis dla identycznych danych; nie wymyślać nowego zastosowania. |
| Queue: p/a/clock | Dane, adaptery App i kontrolowany zegar. | K. | Bez zmian. |
| Queue: timer/waiting | schedule/clear/wait/ready kontrolują jedną zaplanowaną próbę. | B: timeout usuwany w clear/destroy. | Bez zmian. |
| Queue: flight/epoch/alive | attempt/STOP/destroy/release bronią przed równoległością i późnym wynikiem. | B. | Bez zmian. |
| App: env/win/e/$/api/key/p/q | Dostęp do usług, stała tożsamość profilu i kolejka. | K/B: GM dostępne przez zamknięte env, nie przez publiczny dokument. | Bez zmian. |
| App: clean/windows | Rejestr cleanup i okien; destroy/fit/rebuild używają obu. | B: odwrócona kolejność odpinania. | Bez zmian. |
| App: views/items | Widoki per slot i unsubscribe per obiekt Item. | B: zastąpiony obiekt o tym samym id musi mieć nowe callbacki. | Zachować Map; nie dodawać globalnego rejestru. |
| App: held/swallowed/altGraph | Bind rozpoznaje repeat, własne keypress/keyup i AltGr. | B: czyszczone po keyup/blur/visibility/destroy. | Bez zmian. |
| App: capture/draft/fields | Roboczy bind i formularz, odrębne zatwierdzanie. | B: Anuluj nie zapisuje. | Bez zmian. |
| App: syncTimer | deferSync łączy fetch/Item events; destroy anuluje timeout. | B: jeden timeout 0. | Bez zmian. |
| App: operation | Trwałe żądanie także po lokalnym timeout. | B: późna odpowiedź może bezpiecznie zwolnić flight. | Bez zmian. |
| App: widgetSaving/dead | Ochrona zapisu widgetu przed rekurencją; idempotentne zamknięcie. | B. | Bez zmian. |
| App: selected/hover | Zaznaczenie slotu i odnawianie wyłącznie oglądanego tooltipu. | K: hover zerowany przy usuwaniu widoku. | Bez zmian. |
| App: panel/configWindow/bindWindow/status/detail/summary | Referencje do natywnych okien i ich tekstów. | K: używane przez render, fit, bind i otwieranie. | Bez zmian. |
| App: cells/grid/scroll/configScroll/configBody | DOM slotów i zawartości; hitSlot, DnD, scrollbar, formularz. | K: własna siatka 60 skrótów nie ma odpowiednika w kliencie. | Bez zmian. |
| App: manualButton/autoButton/stopButton/unlockButton/startInput/count/selection/pendingText | Kontrolki i ich stan w render/zdarzeniach. | K: stopButton służy do dołączenia gotowej kontrolki, wynik jest użyty. | Bez zmian. |
| App: bindFunction/bindSaved/bindPreview/bindError | Otwieranie, podgląd i zapis okna skrótu. | K. | Bez zmian. |
| Item callbacks: update/remove/off | Dwa identyczne deferSync i jeden unsubscribe. | P: dwa zamknięcia tam, gdzie wystarczy jedno. | Użyć tego samego callbacka dla afterUpdate/delete i symetrycznie odpiąć. |
| Adapter `interface.checkTeleport` i `op.reload` | Ustawia flagę w odpowiedzi na t=reload. | Z: pełne wyszukiwanie nie wykazało żadnego odczytu flagi; accept zależy od ITEM_USED. | Usunąć wrapper i flagę. Samo natywne checkTeleport nadal wywołuje klient. |
| Adaptery onClear/startGameThread | wait przed czyszczeniem; sync/ready w microtask po starcie. | B: zwracają oryginalny wynik, zachowują receiver/args. | Bez zmian. |
| Adaptery initDefaultWidgetSet/addWidgetButtons | Uzupełniają definicję, dekorują i umieszczają widget. | B: nie zastępują algorytmu klienta. | Bez zmian. |
| `wrap`: original/replacement/cleanup | Odtworzenie tylko jeśli wrapper nadal jest nasz. | B: cudza późniejsza zmiana zostaje. | Bez zmian. |
| Operacja: item/response/accepted/choice | id/hid, granica callbacka odpowiedzi, potwierdzenie, KC. | B: wszystkie są odczytywane w use/accept. | Bez zmian. |
| Operacja: done/result/finish/cancel/timer | Jedno rozwiązanie Promise, anulowanie i timeout 15 s. | B: done jest też używane przez tekst interfejsu. | Usunąć tylko zawsze prawdziwy warunek po finish; nie flagę done. |
| Timer App: tick 1000 ms | context, autopauza, gotowość i cooldowny. | B: czyszczony przez clean. | Zachować jeden. |
| Timer Queue: interval × 1000 ms | Jedna następna próba, bez setInterval automatu. | B: wszystkie drogi clear zachowane. | Bez zmian. |
| Timer operacji: 15000 ms | Odblokowuje oczekiwanie UI bez udawania sukcesu. | B: finish usuwa timer; flight czeka na odpowiedź. | Bez zmian. |
| Timer sync: 0 ms | Łączy serię zmian i czeka na koniec aktualizacji ekwipunku. | B: nie zastępować natychmiastowym sync w środku Item.delete. | Bez zmian. |
| Boot: app/timer/deadline/api/event/stopped/styled/marker/handle | Stan pojedynczego startu, retry 250 ms do 60 s, style raz i destroy. | B: marker publikuje tylko destroy, nigdy get/set GM. | Bez zmian. |
| Boot: detach/check/restart/stop | Odpięcie eventu, próby gotowości, zmiana postaci, ostateczne zamknięcie. | B: stop usuwa pagehide, timer i marker. | Bez zmian. |
| DOM pointerdown/move/up/cancel | incoming/source/pointer/x/y/moved rozpoznają drop z torby przed mapą. | B: natywne PointerDragDrop kieruje drop do wszystkich przecinających się stref. | Bez zmian. |
| DOM keydown/keypress/keyup | Pełna obsługa własnego naciśnięcia i okna przypisywania. | B: sam HotKeys nie koduje wszystkich modyfikatorów i nie powstrzymuje ruchu. | Bez zmian. |
| DOM blur/resize/visibilitychange | Reset trzymanych klawiszy, dopasowanie, odświeżenie po powrocie. | B: listen usuwa wszystkie rejestracje. | Bez zmian. |
| API ITEM_USED/AFTER_INTERFACE_START/HERO_DEAD/OPEN_BATTLE_WINDOW/NEW_ASK | Potwierdzenie, odbudowa, pauza po śmierci/interakcji. | B: HERO_DEAD z sec=0 nie jest śmiercią. | Bez zmian. |
| ItemsManager.fetch/removeCallback | Nowe teleporty i zmiany lokacji, także nowe obiekty Item. | B: batch-update API nie ma symetrycznego remove; fetch ma klucz k. | Zachować fetch i Item events. |
| Callbacki jQuery slotów/przycisków/formularza/okna | Każdy tworzony z własnym DOM; native remove/jQuery empty sprząta handlers. | K/B: bindWindow tworzone tylko raz, fillConfig usuwa poprzednią zawartość. | Bez zmian. |
| Widget: register/decorate/place/set/path/store/slot | Definicja, wygląd, zapis pierwszego wolnego miejsca i kontrola profilu. | B: wyniki metod i serverStorage są używane; brak miejsca nie zastępuje cudzego widgetu. | Bez zmian. |
| Nowy cache widoku: cooldown/available | Tylko ostatnio narysowany tekst i klasa, nie dane do użycia teleportu. | U: bez nowych timerów ani rejestrów; czas i dostępność nadal obliczane. | Nie zapisywać do profilu; usuwać razem z views. |

## Mechanizmy klienta i DOM

| Element | Obecne przeznaczenie | Ustalenie | Proponowana zmiana |
|---|---|---|---|
| WindowManager.add/remove, Window.addToAlertLayer | Natywne okna, pozycja, rozmiar, opacity, collapse, widget. | K: już wykorzystane; samodzielne okna dublowałyby klienta. | Zachować. |
| WidgetManager | Definicja, wolne miejsce i odbudowa belki. | K: wykorzystane natywne metody. | Zachować dwa wąskie wrappery. |
| ItemsManager.createViewIcon/deleteViewIconIfExist/getViews | Klon canvas, data, rejestr animacji i zbiorcze ograniczenia. | B: zwraca tablicę viewData, nie sam element; delete usuwa wszystkie widoki id w danej nazwie. | Zachować nazwaną rejestrację, dwufazowe czyszczenie swap i oryginalne API. |
| Item.updadeViewAfterUpdateItem | Metadane, setTip, cooldown DOM, ilość i enhancement. | U: nie powinno być wywoływane z zegara bez zmiany przedmiotu. | Wywoływać w syncIcon po zdarzeniu/utworzeniu. |
| Item.afterUpdate/delete | Natywne update emituje afterUpdate po statystykach; zmiana loc/st może usunąć i odtworzyć Item. | B: wspiera odświeżanie bez skanowania DOM co sekundę. | Zachować subskrypcję per obiekt i deferSync. |
| HeroEquipment.sendUseRequest | Obsługuje klientowe użycie, callback, checkTeleport i ITEM_USED. | B: wynik HTTP nie jest samodzielnym sukcesem; tutorial/blessing mają osobne zabezpieczenia. | Nie kopiować ani omijać natywnej metody. |
| PointerDragDrop | Natywny drag komórki i drop przedmiotów. | B: dodatkowa ochrona zapobiega GroundItems pod oknem. | Zachować, nie wracać do HTML5 DnD. |
| AddScrollBar | Natywny track, kółko i uchwyt. | K: update po zawartości/fit jest wymagane. | Bez zmian. |
| HotKeys + InputParser | Rejestr i parser klawiatury klienta. | B: Ctrl wyłącza część HotKeys, ale nie ruch w keyDown. | Zostawić wspólne conflict i capture całego własnego naciśnięcia. |
| Templates.get, Checkbox, FormBuilder | Wykorzystywane istniejące szablony przycisku, input, checkbox i koloru. | B: FormBuilder.createField dodaje własne komponenty/wrappers i nie daje identycznego cyklu natychmiastowego auto/binda. | Nie zastępować krótkich helperów większą adaptacją. |
| Item.setTip i dynamiczne tooltipy | Tooltip ikony i odnowienie oglądanego przedmiotu. | B: klon dziedziczy zdarzenia; usuwamy mouseover/mouseleave natywnego interwału, używamy jednego tick App dla hover. | Zachować setTip przy wejściu i co sekundę tylko dla hover. |
| DisableItemsManager.start/endSpecificItemKindDisable | Natywnie pobiera wszystkie zarejestrowane widoki i nakłada/usuwa klasy. | K: nie wymaga pełnego syncIcon co sekundę. | Zachować rejestrację i inicjalne manageItemDisableInHeroEQ. |
| Style i canvas jakości | CSS klienta, klasy sklonowanego Item i rysowanie przez ItemsManager. | B: nie są generowane przez licznik Teleportów. | CSS i ikona bez zmian. |
| DOM `.tp-icon` | clearSlot i renderSlot usuwały ten sam element dwukrotnie. | P. | Usunąć drugie wyszukiwanie/usunięcie w renderSlot. |
| DOM `.tp-cooldown` i `.tp-unavailable` | overlays zapisywało identyczną wartość w każdym tick. | U: niezmieniona wartość nie wymaga mutacji. | Porównywać ostatni wyświetlony tekst/boolean. |
| DOM `.tp-next`, nagłówek, detail | Jeden wybór q.find jest wspólny dla wszystkich trzech. | P: render odświeżał całość dwa razy. | Jeden updateNext na render; osobno potrzebne po fit/cooldown. |

## Loader: obecny model i wariant dynamiczny

Pozostaje obecny model. Porównanie nie jest zgodą na zmianę loadera. Nie dodajemy publicznego mostu do GM, inject przez document, dziennego cache-bustingu ani drugiego magazynu danych.

| Element | Obecne przeznaczenie | Ustalenie | Proponowana zmiana |
|---|---|---|---|
| A: @require | Tampermonkey pobiera i wykonuje core przed loaderem. | K: brak własnej obsługi load/error/kolejności. | Zachować. |
| A: @resource + GM_getResourceText/URL + GM_addStyle | Zasoby wydania dostępne przez menedżera skryptów. | K: CSS i obraz nie wymagają publicznego pobierania przez dokument przy każdym starcie. | Zachować, zmienić tylko wersję/SHA. |
| A: unsafeWindow i env.win | Dostęp do Engine/API/jQuery z właściwego dokumentu NI. | B: core nie zakłada, że sandbox ma własny globalny Engine. | Zachować. |
| A: GM_getValue/setValue | Prywatna pamięć skryptu, przekazana w zamkniętym env. | B: przeniesienie do localStorage zmieniłoby zapis/profil. | Zachować namespace, author i klucz v2. |
| B: script.src + link.href | Wykonanie core w kontekście strony, CSS przez przeglądarkę. | U: wymaga dodatkowej kolejności, obsługi błędów, gotowości i dostępu do pamięci GM. | Nie wdrażać. |
| B: CSP | Dokument decyduje o script-src/style-src, także dla obcych hostów. | B: zwykłe wstawienie tagu nie omija CSP. | Nie zakładać dostępności raw GitHub. |
| B: CORS/MIME/nosniff | Classic script, module, CSS i fetch mają różne reguły. | B: CORS nie jest uniwersalnym rozwiązaniem; zły MIME z nosniff blokuje script/style. | Zachować zasoby menedżera skryptów; zweryfikować nagłówki raw. |
| Ramki NI | Obecne @match, brak @noframes, boot sprawdza gotowość w danym win. | B: dynamiczny loader też potrzebowałby tych samych testów w każdej ramce; nie wolno zakładać top.Engine. | Bez zmian. |
| Aktualizacje | @updateURL/@downloadURL wskazują main, zasoby konkretny SHA. | B: spójność plików przy cache CDN. | Kolejna wersja i spójne przypięcie, bez codziennych parametrów. |
| Kontekst strony i uprawnienia | A może korzystać z Engine przez unsafeWindow; B ma Engine, ale nie dostaje prywatnego GM. | B: publiczne window/document z get/set GM byłoby niebezpieczne. | Nie publikować env ani funkcji GM; testy oddzielone od core. |

Źródła zewnętrzne sprawdzone podczas audytu: [Tampermonkey: require/resource](https://www.tampermonkey.net/documentation.php?q=externals), [sandbox/unsafeWindow](https://www.tampermonkey.net/documentation.php?q=sandbox), [pamięć skryptu](https://www.tampermonkey.net/documentation.php?q=GM_values), [ramki](https://www.tampermonkey.net/documentation.php?q=noframes), [CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP), [MIME i nosniff](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Content-Type-Options). Wniosek o mniejszej złożoności A wynika z naszego kodu: obecny loader przekazuje sześć usług; B wymagałby dodatkowego protokołu dostępu do prywatnej pamięci lub zmiany zapisu. Faktycznego instalowania Tampermonkey w zalogowanej grze nie wykonywano.

## CSS, loader i pozostałe pliki

| Element | Obecne przeznaczenie | Ustalenie | Proponowana zmiana |
|---|---|---|---|
| CSS .tp-window, .border-image, zmienne kolorów i limitów | Natywna ramka z własnym tłem, obramowaniem i granicami z fit. | K: selektory używane przez window/render/fit. | Bez zmian. |
| CSS body/status/detail/pending/controls/button | Czytelność, układ przycisków i stany ręczny/auto/pauza/oczekiwanie. | K: klasy nadawane w build/render. | Bez zmian. |
| CSS scroll/config-scroll/pane/grid i size-opt | Siedem kolumn, trzy rozmiary i natywne przewijanie. | B: zależą od struktury AddScrollBar i Window. | Bez zmian. |
| CSS slot/next/selected/unavailable/number/cooldown | Zaznaczenie, wybór kolejki, numer i czas, ukrycie natywnego cooldownu. | K: overlays i render nadal utrzymują wszystkie stany. | Zmienić częstotliwość mutacji, bez zmiany reguł. |
| CSS start-row/import-row/count/selection/input | Układ dolnych kontrolek i pola początku. | K: nie ma nieużytej starej wersji układu. | Bez zmian. |
| CSS summary/header-label/collapsed | Zwinięta belka, brak przechwytywania drag przez tekst, chowanie zawartości. | B: regresje 0.1.3 wykazały potrzebę tych reguł. | Bez zmian. |
| CSS section/field/checkbox/focus/bind-row/form-note/color | Formularze z natywnych szablonów i obsługa fokusu. | K: fillConfig/button nadają klasy. | Bez zmian. |
| CSS widget/icon/drag | Własna grafika widgetu i helper canvas. | K: widget i build podają zawartość. | Bez zmian. |
| CSS locked i pseudo-elementy | Kłódka oraz oznaczenie blokady pozycji. | K: toggleLock/render utrzymują stan. | Bez zmian. |
| CSS key-preview/key-error/bind-collapsed | Okno przechwytywania kombinacji i błędy. | K: openCapture/previewCapture. | Bez zmian. |
| Loader name/namespace/author | Tożsamość instalacji oraz prywatnego zapisu Tampermonkey. | B: nie zmieniać dla tego samego dodatku. | Zachować. |
| Loader match/run-at/grant | Dopasowane dokumenty NI, document-idle i dokładnie używane funkcje GM. | B: nie dokładać uprawnień i nie wyłączać ramek. | Bez zmian. |
| Loader version/require/resource | Jedna wersja i przypięcie trzech zasobów. | K: spójność cache i aktualizacji. | 0.1.5 i wspólny SHA zasobów, weryfikacja po publikacji. |
| Loader updateURL/downloadURL | Odkrywanie nowej wersji z main. | K: przypięcie instalacji do SHA nadal aktualizuje się przez te pola. | Zachować. |
| tests/core.test.cjs | Logika Queue, dane, rozpoznawanie i loader. | K: punkt odniesienia i regresje bez klienta/serwera. | Dwa dodatkowe testy i dostęp do internals przez helper testowy. |
| tests/browser.cjs | Oryginalne lokalne moduły klienta z kontrolowanym serwerem. | K: sprawdza integrację, której nie pokrywają atrapy DOM. | Sześć scenariuszy audytu, porównywalne liczniki, oryginalne Item events. |
| tests/core-source.cjs | Przygotowuje wyłącznie testową kopię źródła z dostępem do zamknięcia. | K: nie wymaga globalnego produkcyjnego API testowego. | Brak importu/referencji z loadera i produkcyjnego core. |
| README.md / REPORT.md | Instrukcja instalacji/użycia i wyniki techniczne. | U: opis audytu i ograniczeń wymaga aktualizacji. | 0.1.5, pomiary i testy; zachować instrukcję użytkownika i politykę Ctrl. |

CSS i ikona są zachowane bajtowo; nie usunięto reguły na podstawie samego braku jej nazwy w JS, ponieważ stany size-opt/collapsed i klasy klienta pochodzą z natywnych mechanizmów.

## Pomiary i weryfikacja

Pomiar bazowy dla 60 zajętych miejsc: dziesięć overlays wykonuje 600 syncIcon i 600 zapisów tekstu cooldown; render wywołuje updateNext dwa razy, sync wykonuje 120 syncIcon. Żaden niezmieniony widok nie był już wcześniej odtwarzany — usprawnienie dotyczy synchronizacji i mutacji, nie liczby createViewIcon.

Wszystkie proponowane zmiany w tabeli zostały wykonane; wiersze „bez zmian” świadomie pozostawiono. Po refaktoryzacji: **52/52 testy Node i 60/60 scenariuszy Edge**. Dziesięć odświeżeń niezmienionych 60 slotów daje teraz **0 syncIcon i 0 zapisów niezmienionego cooldownu**, przy zachowanych 600 kontrolach reprezentanta i 10 wyborach next. Render wykonuje updateNext raz, sync daje 60 pełnych synchronizacji zamiast 120, a zmiana jednego slotu jedną zamiast 61. Liczba tworzonych niezmienionych ikon pozostaje 0 przed i po.

Core: **1180 → 1179 linii**, **65 106 → 64 798 bajtów LF**, **242 → 240 funkcji/callbacków w składni**, metody klas **70 → 70**. Elementy TeleportQueue **21 → 1**; nazwa samego obiektu i marker instancji są zachowane. Wrappery klienta **5 → 4**. Brak sztucznego celu liczby linii; rzeczywista redukcja pracy jest ważniejsza od niewielkiej redukcji objętości. Metodologia, tabela operacji, wpływ cache na stan, testy i ograniczenia znajdują się w [REPORT.md](REPORT.md).

Dodatkowo sprawdzono nagłówki publicznych JS/CSS z raw GitHub: text/plain; charset=utf-8, nosniff, CORS *. Taki host nie daje poprawnego MIME dla prostego script.src/link.href, mimo poprawnego CORS. To dodatkowy powód zachowania zasobów Tampermonkey. Nie deklaruje się bezwarunkowej zgodności obecnego loadera z każdą polityką CSP/przeglądarką; zachowano istniejącą integrację bez dodatkowego mostu uprawnień.
