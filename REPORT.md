# Teleporty 0.1.5 — wynik audytu i refaktoryzacji

Autor: **Doiua**. Repozytorium: **Doiua97/teleport-queue**, gałąź **main**. Punkt odniesienia: opublikowane 0.1.4, commit `346417edf70ab22f94724dd8a4ad9ff1e7b051ae`. Poprawki Ctrl były już wdrożone, dlatego audyt otrzymuje numer 0.1.5.

Pełny przegląd wszystkich funkcji, metod, stałych, stanu, adapterów, timerów, callbacków, DOM, mechanizmów klienta i loadera znajduje się w [AUDIT.md](AUDIT.md). Tabela rozróżnia kod konieczny, zbędny, powtarzający operacje, możliwy do uproszczenia i zachowany dla bezpieczeństwa/zgodności. Przy metodach podano wywołujących i zastosowanie wyników.

## Usunięte i uproszczone elementy

| Element | Zmiana i uzasadnienie |
|---|---|
| `op.reload` | Usunięto inicjalizację i zapis. W całym projekcie brak odczytu. Sukces zależy od odpowiedzi i właściwego ITEM_USED. |
| Wrapper `Engine.interface.checkTeleport` | Usunięto wraz z flagą. Natywna metoda nadal jest wywoływana przez HeroEquipment.sendUseRequest. |
| Callback `remove` w App.sync | Był identyczny z update. Jeden callback deferSync przypina się i symetrycznie odpina od afterUpdate/delete. |
| `if (op.done)` po op.finish | Warunek zawsze prawdziwy. Samo done, ochrona wewnątrz finish i późnej odpowiedzi pozostają. |
| Drugie usunięcie .tp-icon w renderSlot | Wcześniejsze clearSlot usuwa DOM i natywną rejestrację. |
| Parametr force w renderSlot | changedSlots już czyścił widok. Nowe znaczenie refresh pozwala aktualizować istniejący przedmiot po zdarzeniu bez wymiany węzła. |
| App.overlays / syncIcon | Zegar sprawdza czas, gotowość i reprezentanta, aktualizując tylko zmieniony tekst/klasę. Pełne syncIcon wykonuje się przy tworzeniu lub synchronizacji przedmiotów. |
| App.render / updateNext | Jeden wybór kolejki na render, również przy ukrytym panelu. Tick nadal reaguje na upływ cooldownu. |
| TeleportQueue | Z 21 eksportów zostaje boot. Pozostałe funkcje są potrzebne wewnętrznie; tests/core-source.cjs udostępnia je tylko w źródle wykonywanym przez testy. W produkcyjnym core brak przełącznika testowego. |

Nie usunięto całych nazwanych funkcji, ponieważ żadna nie okazała się martwa w produkcji. Usunięto martwy stan, zbędny callback adaptera, duplikat callbacka i nadmiarowe operacje. Ograniczenie eksportów nie oznacza usunięcia funkcjonalności.

## Zachowane elementy

**p.last** nie steruje funkcją produkcyjną. Jest jednak częścią danych v2: load odtwarza wartość, a potwierdzony sukces ją aktualizuje. Zachowano oba działania dla identycznego formatu i wartości profilu. Nowy test sprawdza odtworzenie starej wartości, brak zmiany po odmowie i aktualizację po sukcesie.

Pozostawiono weryfikację postaci i id/hid przedmiotu, gotowości mapy, tutorialu/blessing, czynności, KC, sukcesu, pojedynczego żądania i późnych odpowiedzi. response, accepted, choice, done, epoch, flight i timeout 15 s mają rzeczywiste zastosowanie. Odpowiedź lub t=reload nie zastępuje właściwego ITEM_USED.

Pozostają cztery rodzaje timerów: tick 1 s, harmonogram, operacja 15 s i łączący zmiany timeout 0. Same eventy nie pokrywają upływu czasu i wszystkich blokad. Zachowano wrappery onClear/startGameThread i dwa wrappery WidgetManager. wrap nie nadpisuje późniejszej zmiany metody przez inny dodatek podczas sprzątania.

Natywne okna, widget, ikony/animacje, tooltipy, użycie przedmiotu, DnD, scrollbar i szablony są już wykorzystywane. FormBuilder wprowadza inne wrappers/komponenty i wymagałby dodatkowej adaptacji układu oraz odrębnego zatwierdzania auto/bindów. Nie wprowadzono nowych klas ani biblioteki produkcyjnej.

Item.update emituje afterUpdate po aktualizacji danych; zmiana loc/st może wymienić obiekt. Dlatego callbacki nadal są związane z obiektem, a sync odroczony. DisableItemsManager nakłada/usuwa ograniczenia dla wszystkich zarejestrowanych widoków. Pozostaje inicjalne sprawdzenie w syncIcon. Tooltip oglądanej ikony nadal jest odświeżany co sekundę przez istniejący tick.

## Wielkość kodu i operacje

| Miara core | 0.1.4 | 0.1.5 |
|---|---:|---:|
| Linie bez końcowej pustej linii | 1180 | 1179 |
| Bajty UTF-8 przy LF, jak w Git | 65 106 | 64 798 |
| Funkcje w składni, łącznie z callbackami/metodami | 242 | 240 |
| Metody dwóch klas, wliczone wyżej | 70 | 70 |
| Elementy obiektu TeleportQueue | 21 | 1 |
| Nazwy obiektu eksportu / markera instancji | 1 / 1 | 1 / 1 |
| Wrappery metod klienta w App | 5 | 4 |

Funkcje policzono parserem Acorn jako FunctionDeclaration, FunctionExpression i ArrowFunctionExpression, a metody jako MethodDefinition. To nie liczba wystąpień słowa function ani wywołań. Core skrócono o 308 bajtów, około 0,47%. Jawne porównanie cache zajmuje linie, ale usuwa wielokrotnie wykonywaną pracę. Nie stosowano minifikacji ani upychania instrukcji.

Pomiar dotyczy **60 zajętych slotów**, po pierwszym odświeżeniu, bez zmiany przedmiotów, aktywnego automatu i hover. Dziesięć wywołań overlays odpowiada dziesięciu odświeżeniom zegara; nie jest czekaniem dziesięciu sekund. Liczniki opakowują App/ItemsManager i zapis tekstu .tp-cooldown bez zmiany ich wykonania.

| Operacja | 0.1.4 | 0.1.5 |
|---|---:|---:|
| syncIcon w 10 niezmienionych odświeżeniach | 600 | 0 |
| Zapisy identycznego tekstu cooldownu w tych odświeżeniach | 600 | 0 |
| Kontrole renderSlot w tych odświeżeniach | 600 | 600 |
| Utworzone widoki w tych odświeżeniach | 0 | 0 |
| updateNext w jednym widocznym render | 2 | 1 |
| syncIcon w jednym sync | 120 | 60 |
| syncIcon po changedSlots jednego miejsca | 61 | 1 |
| Utworzone/usunięte widoki po changedSlots jednego miejsca | 1 / 1 | 1 / 1 |
| Zapisy tekstu cooldownu po changedSlots jednego miejsca | 60 | 1 |

Już 0.1.4 nie odtwarzała niezmienionych ikon. Redukcja dotyczy pełnej synchronizacji, klonowania ilości/metadanych i mutacji DOM. Kontrole reprezentanta pozostają, bo koniec cooldownu może zmienić gotowy przedmiot w grupie. Przy rzeczywistej zmianie ekwipunku sync może odświeżyć wszystkie zajęte widoki raz; nie dodano osobnego rejestru brudnych przedmiotów.

Na obserwowany Item powstaje o jedno zamknięcie mniej. Usunięto jeden wrapper, callback adaptera i jego rejestrację cleanup. Cache dodaje najwyżej dwie wartości na widok: tekst i boolean, do 120 wartości przy 60 ikonach. Nie trafiają do profilu i są usuwane z Map. Nie mierzono sterty ani czasu CPU; liczniki nie oznaczają procentowego spadku całej pamięci/procesora.

## Testy

| Etap | Node | Edge headless |
|---|---:|---:|
| Niezmienione 0.1.4 przed refaktoryzacją | 50/50 | 54/54 |
| 0.1.5 z nowymi testami | 52/52 | 60/60 |

Zachowano wcześniejsze regresje: cykl i wybór, auto/pauza/STOP, sukces/odmowa/timeout/późne odpowiedzi, mapy, śmierć/blokady, KC, grupy/import, duplikaty, DnD bez upuszczania na mapę, Ctrl+LPM, konfiguracja/profile, okna/rozmiary, scrollbar, widget, konflikty, 45 kombinacji Ctrl, repeat/keyup, pisanie i AltGr.

Dwa nowe testy Node sprawdzają nieinstrumentowany eksport produkcyjnego pliku i zgodność last. Rozszerzono istniejące testy loadera o brak usług GM w oknie gry i wspólny SHA zasobów.

Sześć nowych scenariuszy Edge sprawdza:

1. Brak pełnego syncIcon i zapisów niezmienionego cooldownu z zegara; jeden next i pomiar 60 slotów.
2. Oryginalne Item.updadeViewAfterUpdateItem, ilość grupy, klasy jakości/low-value, tooltip/metadane, aktualizację przy ukrytym panelu bez wymiany ikony, następnie zmianę reprezentanta po cooldownie bez pozostawienia starego widoku.
3. Dziesięć Item events połączonych w jeden sync, brak duplikacji callbacków, odpięcie wymienionego obiektu, brak mnożenia widoków po dwudziestu zamianach.
4. Niezmienioną tożsamość checkTeleport, sukces z ITEM_USED bez reload i brak przesunięcia po odmowie.
5. Usunięcie dziesięciu listenerów App, pięciu callbacków API i wszystkich czterech rodzajów timerów; brak zmiany zapisu po późnej odpowiedzi po destroy.
6. Uruchomienie rzeczywistego nieinstrumentowanego core z jednym eksportem boot; jeden start, 60 slotów, handle tylko destroy oraz usunięcie markera/okien.

Oryginalne Item.on/unregisterCallback/trigger są wykonywane także w pozostałych scenariuszach. Metoda aktualizacji widoku jest wycinana z lokalnego klienta, bez kopiowania do produkcji; jej zależności statystyk/formatowania/enhancement i obiekty Item są kontrolowane. Pozostają oryginalne Window/WindowManager, ItemsManager, PointerDragDrop, AddScrollBar, API, InputParser/HotKeys i metoda sendUseRequest. WidgetManager i serwer są kontrolowane. To nie pełny zalogowany klient.

Porównanie operacji wykonano tym samym scenariuszem na niezmienionym core 0.1.4 i nowym core. Testy nie wysyłają użycia przedmiotów do Margonem. Źródła w E:\Kod margonem są wyłącznie odczytywane i nie są publikowane.

## Ocena loadera

**Zachowano wariant A**: @require, @resource, GM_getResourceText/URL, GM_addStyle i unsafeWindow. Core dostaje okno NI i prywatny zapis przez zamknięte env. Nie udostępnia się GM w window/document. Nie zmieniono namespace, autora ani klucza postaci.

Wariant B ze script.src/link.href nie usuwa oczekiwania na klienta ani obsługi ramek. Kontekst strony daje Engine, lecz nie prywatną pamięć GM. Zachowanie zapisu wymaga dodatkowego ograniczonego protokołu, gotowości i błędów; publiczny obiekt z GM jest niedopuszczalny, a localStorage zmieniłby model danych.

Publiczne odpowiedzi raw GitHub dla JS/CSS 0.1.4 zwróciły HTTP 200, **Content-Type: text/plain; charset=utf-8**, **X-Content-Type-Options: nosniff**, **Access-Control-Allow-Origin: \***. To nie są odpowiednie typy do bezpośrednich script/style przy nosniff. CORS * nie naprawia MIME ani CSP. B wymagałby innego serwowania lub dodatkowego pobierania/wstrzykiwania. [MIME/nosniff](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Content-Type-Options), [CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP).

A deleguje pobieranie zasobów Tampermonkey. Nie deklaruje się odporności na każdą politykę/konfigurację; dostęp między kontekstami, zwłaszcza w Firefox, wymaga osobnego sprawdzenia. Brak @noframes jest zachowany; dopasowane ramki mają własne okno i kontrolę gotowości, bez założenia top.Engine. Pełne porównanie dziewięciu aspektów i źródła Tampermonkey: [AUDIT.md](AUDIT.md). Nie wdrożono B ani dziennego cache-bustingu.

## Dane i skróty

Schemat nadal wynosi **2**, klucz `margo-tp:v2:<world>:<characterId>`. Brak migracji/usuwania/resetu. Zachowane: sloty, grupy, blokady, kolejność, kolory, bindy, widgetPlaced i last. Aktywny zapis nadal wraca w pauzie. CSS i assets/widget.png są identyczne z 0.1.4. Nie zmieniono układu okien, widgetu ani mechaniki teleportacji.

Polityka Ctrl pozostaje z 0.1.4:

| Kombinacja | Dopuszczone litery A–Z |
|---|---|
| Ctrl + litera | A B C D E F G H I J K L M O P Q R S U V X Y Z — 23. |
| Ctrl + Shift + litera | A B C D E F G H I J L M O P Q R S U V X Y Z — 22. |

Ctrl+N/T/W i Ctrl+Shift+N/T/W chronią nowe/przywracane/zamykane karty i okna. Ctrl+Shift+K pozostaje ostrożnościowo zablokowane przez duplikowanie karty w Edge, bez twierdzenia o niemożliwości przejęcia wszędzie. Zachowano m.in. Ctrl+Tab/Shift+Tab, Ctrl+PageUp/PageDown i warianty Shift, Ctrl+F4/F5, Ctrl+Shift+Delete, Ctrl+Alt+Delete oraz pozostałe ograniczenia klawiszy/Alt/Meta. [Edge](https://support.microsoft.com/en-us/edge/keyboard-shortcuts-in-microsoft-edge), [Windows](https://support.microsoft.com/en-us/windows/keyboard-shortcuts-in-windows-dcc61a57-8ff0-cffe-9796-cb9706c75eec).

Dozwolony skrót wymaga anulowalnego zdarzenia, fokusu na grze, braku blokad i konfliktu. Własny drugi bind, jawny wpis obcego dodatku lub chroniony skrót pokazuje **Ten skrót jest już zajęty.** Prywatnych listenerów wszystkich dodatków nie można odczytać. AltGr pozostaje do pisania; samo ctrlKey+altKey nie oznacza AltGraph. Testy AltGr używają KeyboardEvent z modifierAltGraph i insertText, nie fizycznych klawiszy systemowych. Nie deklaruje się dostępności wszystkich Ctrl.

## Uruchamianie i publikacja

```powershell
node --test tests/core.test.cjs
$env:MARGO_SOURCE_DIR = 'E:\Kod margonem'
$env:TP_BROWSER_CHANNEL = 'msedge'
node tests/browser.cjs
```

Playwright musi być dostępny dla Node, np. przez NODE_PATH. TP_PROBE=audit wykonuje nowe sześć scenariuszy; TP_PROBE=metrics wypisuje liczniki; TP_METRICS_FILE opcjonalnie zapisuje JSON. TP_CORE_FILE pozwala porównać lokalny starszy core tym samym pomiarem. TP_PROBE=ctrl i TP_PROBE=1 izolują wcześniejsze regresje. Nieinstrumentowany scenariusz produkcyjnego API zawsze sprawdza bieżący plik projektu.

Najpierw publikowane są core/testy/dokumentacja, następnie loader 0.1.5 przypięty do SHA zasobów. Trzy adresy mają ten sam SHA i ?v=0.1.5. UpdateURL/downloadURL pozostają na main. Po publikacji weryfikowane są HTTP 200 i SHA-256 względem Git, bez różnic CRLF kopii roboczej. SHA i bezpośredni link zostaną uzupełnione po wysłaniu.

Nie instalowano dodatku na prawdziwej postaci. Po aktualizacji pozostaje próba w NI: zachowany profil, ilości po użyciu zwoju, koniec cooldownu, ukryty panel, tooltip, Ctrl/AltGr i rzeczywiste zmiany mapy. Lokalne testy potwierdzają objęte nimi ścieżki, nie odpowiedź zalogowanego serwera ani każdą konfigurację rozszerzeń.
