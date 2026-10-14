# Raport — Teleporty 0.1.2

Data: 15 października 2026. Autor: Doiua. Projekt: `E:\dodatki\margonem-teleporty`. Repozytorium: [Doiua97/teleport-queue](https://github.com/Doiua97/teleport-queue), gałąź `main`.

## Zmienione pliki i przyczyny napraw

| Plik | Zmiana |
| --- | --- |
| `teleporty.core.js` | Potwierdzenie użycia, oczekiwanie na mapę, śmierć, schema 2, grupy, import, blokady, nagłówek, rozmiary, osobne okno skrótów i konflikty. |
| `teleporty.css` | Kłódka, stopka w jednym wierszu, trzy wysokości, jasny nagłówek z wielokropkiem, wygląd okna skrótu. |
| `teleporty.user.js` | `@version`, `@require` i wszystkie `@resource`: 0.1.2. |
| `tests/core.test.cjs` | Nowy model danych, grupowanie, blokady, czasowanie mapy i normalizacja skrótów. |
| `tests/browser.cjs` | Zachowane regresje 0.1.1, testy nowych funkcji i dodatkowe oryginalne ścieżki klienta. |
| `README.md`, `REPORT.md` | Instrukcja obsługi, nowy zapis, wyniki, komunikaty oraz zakres weryfikacji. |

`assets/widget.png` zachowano: własna ikona 32 × 32 px z kanałem alfa. Nie zmieniono plików klienta, materiałów `sources/`, innych profili ani backendu.

| Błąd | Przyczyna | Naprawa |
| --- | --- | --- |
| Ostrzeżenie po poprawnym użyciu | Wymagano jednocześnie ITEM_USED i t=reload. Klient emituje ITEM_USED po sprawdzeniu braku alert także bez t. | Skorelowany ITEM_USED jest podstawowym potwierdzeniem. checkTeleport służy wyłącznie obserwacji odpowiedzi, bez warunku sukcesu. |
| Pauza przy ładowaniu | Ogólna blokada obejmowała mapLoadedAndAllInit i change_location; dodatkowo obowiązywał limit 60 s ładowania. | Oba znane wpisy ładowania są bramką gotowości. Pozostałe blokady zachowują pauzę. Usunięto limit długości normalnego ładowania. |
| Fałszywa śmierć | hp<=0 oraz każde HERO_DEAD uruchamiały blokadę. | Sprawdzane są Engine.dead, blokada dead i HERO_DEAD.sec>0. sec=0 nie pauzuje i nie wznawia. |
| Niepotrzebne ograniczenie binds | Ogólna statystyka przedmiotu była traktowana jako specjalne ograniczenie kolejki. | Usunięto warunek i komunikat; pozostaje natywna metoda użycia i walidacja klienta/serwera. |
| Niejasny status ręczny | Status zawierał dodatkowe „Wyłączony”. | Trzy teksty trybu zgodne ze specyfikacją. |
| Rozmiary bez widocznej różnicy | Warianty miały praktycznie jednakowe wymiary. | Native WindowManageSize przełącza trzy indeksy; atrybut size-opt wyznacza wysokość przewijania 140/220/310 px oraz zmienia wysokość całego okna. |
| Konflikty klawiszy | Sprawdzano tylko drugi skrót dodatku, bez sposobu obsługi key przez klienta. | Kontrola HotKeys i bezpośrednich akcji InputParser przy zapisie i przed wykonaniem. |

## Potwierdzanie i oczekiwanie na mapę

`sendUseRequest(item, callback)` uruchamia callback przed sprawdzeniem alert, więc sam callback nie oznacza sukcesu. Dodatek otwiera dla niego krótki zakres obserwacji i czeka do mikrozadania. W dalszej synchronicznej obsłudze klient sprawdza alert, opcjonalnie wywołuje checkTeleport, a potem emituje ITEM_USED.

Sukces wymaga ITEM_USED dla tych samych fizycznych **id i hid**, wewnątrz odpowiedzi własnego oczekującego żądania. Obce ITEM_USED nie potwierdza operacji. Brak alert wynika z natywnej ścieżki przed tym zdarzeniem. `t=reload` nie jest wymagane. KC bez celu zachowuje wynik „wybór”, wskaźnik i pauzę; sam wybór celu nie przesuwa kolejki.

Po potwierdzeniu zapisuje się ostatni slot i następny w cyklu. STOP, zmiana początku, zmiana postaci lub zniszczenie aplikacji unieważniają późne przesunięcie. Odrzucenie nie próbuje innego członka grupy. Brak ITEM_USED po obsłużonej odpowiedzi oznacza odrzucenie. Wyjątek natywnego wywołania jest niejednoznaczny. Po 15 s bez odpowiedzi pojawia się ostrzeżenie, ale blokada trwającego żądania pozostaje do późnej odpowiedzi lub odświeżenia; nie ma automatycznego ponowienia.

Oryginalne `Engine.onClear`, `Engine.startGameThread` i `interface.checkTeleport` są wywoływane z tym samym odbiorcą i argumentami, a ich wyniki zwracane. Obserwatory są usuwane przy sprzątaniu.

Gotowość wymaga allInit, braku reload, braku obu blokad ładowania, pustej listy blokad mapy oraz jej drawable/unlock. onClear kasuje wcześniejszy timer kolejki i rozpoczyna oczekiwanie. Po startGameThread mikrozadanie oraz istniejący zegar 1 s sprawdzają gotowość. Usunięcie change_location następujące po startGameThread jest uwzględnione. Dopiero po zakończeniu odpowiedzi i gotowości mapy powstaje jeden timer z **pełnym interwałem**. Nie są nadrabiane pominięte próby. Odświeżenie całej strony nadal przywraca pauzę. Rzeczywista śmierć/walka/pytanie/blokada pauzuje także podczas oczekiwania.

## Struktura danych i grupowanie

Nowy klucz: `margo-tp:v2:<world>:<characterId>`, `schema: 2`. Wersja 0.1.1 pod kluczem v1 nie jest odczytywana, migrowana ani kasowana. Istniejące nazwy panelu, konfiguracji i widgetu zachowano. Nowe okno skrótu ma osobną nazwę TP_BIND dla świata i postaci.

```js
{
    schema: 2,
    slots: [
        { items: [{ id: "101", hid: "a" }, { id: "102", hid: "b" }] },
        null // razem 60 pozycji
    ],
    locked: [false, true /* razem 60 wartości */],
    config: { start: 1, auto: false, interval: 120 /* pozostałe opcje */ },
    next: 1, last: null, state: "off", widgetPlaced: true
}
```

Pozycja przechowuje grupę referencji, bez sztucznego identyfikatora przekazywanego grze. load normalizuje dane i usuwa duplikaty fizycznego id w całym profilu. Przy użyciu każdy członek musi istnieć zarówno w Engine.items, jak i rzeczywistym getHItems, z właściwym id/hid. Wybierany jest jeden gotowy członek, z dodatnim amount jeśli jest zużywalny. Natywna ikona i tooltip przedstawiają reprezentatywny rzeczywisty przedmiot. Ilość jest sumą aktualnych amount; nie jest dopisywana do statystyk rzeczywistych przedmiotów.

Import łączy tylko przedmioty z amount i tpl oraz zgodnym cl i kompletem parsowanych statystyk. Pomija w porównaniu jedynie amount; w timelimit porównuje okres odnowienia, ponieważ koniec aktualnego odnowienia jest stanem indywidualnym. Pełne teleport/custom_teleport, cele i wszystkie pozostałe ograniczenia są porównywane. Jest to zachowawcze: dodatkowa różnica statystyk może pozostawić dwa oddzielne sloty zamiast połączyć niezgodne przedmioty. Przedmioty bez amount nie są łączone. Różne cele KC z tym samym tpl pozostają osobno.

Import odczytuje getHItems, zachowuje zajęte pozycje i pomija już przypisane fizyczne id. Nowych zgodnych członków dopisuje do pierwszej zgodnej istniejącej grupy; dwóch istniejących ręcznych pozycji nie scala. Wolne miejsca szuka od start do 60, potem od 1 do start−1. Grupa przenosi się jako jednostka. Przeciągnięcie z torby nadal zastępuje pojedynczym przypisaniem zgodnie z replaceLock. Przy pełnych 60 pozycjach dołączenie zgodnego członka pozostaje możliwe; pozostałe przedmioty są liczone jako pominięte.

Synchronizacja usuwa brakujące referencje po zakończeniu aktualizacji klienta; ostatnia usuwa slot. Podczas ładowania nie czyści przypisań. Kolejka również weryfikuje referencje bez zamiany po nazwie/tpl. Kłódka jest niezależnym polem pozycji, nie porusza się z grupą i nie wpływa na zarządzanie przypisaniem. Użycie z zablokowanej pozycji jest sprawdzane w samej kolejce.

## Okna i klawiatura

Wykorzystano Engine.windowManager, transparentne Window, WindowManageSize, WindowManageOpacity, StorageFuncWindow, natywne szablony button/input/ni-input-text/checkbox-custom/c-color-picker, ItemsManager, canvas ikon, setTip, PointerDragDrop i AddScrollBar. Wszystkie nowe style ograniczono do elementów tp-. Po zmianie rozmiaru aktualizowany jest natywny scrollbar; zapis wybranego indeksu pozostaje w standardowym Storage klienta dla nazwy okna postaci. Ograniczenia ekranu uwzględniają zoomFactor. Widget nadal zapisuje pozycję przez natywny serverStorage.

Skrót zapisuje code i modyfikatory oraz zaobserwowane key. Dla domyślnych kombinacji bez key działa mapowanie standardowych kodów. Przy rzeczywistym wykonaniu najważniejsze jest aktualne KeyboardEvent.key, dzięki czemu zmiana układu klawiatury nie ignoruje nowego konfliktu.

HotKeys.hotKeys, getSortedHotKeys i getKeyByClbName są czytane, bez modyfikacji natywnych skrótów. InputParser używa key zamienionego na wielkie litery. Ruch, strzałki, Enter, Escape, Tab oraz 1–9 są obsługiwane bezpośrednio; Ctrl nie zwalnia z kontroli tych akcji. Ogólne checkKey pomijane jest wyłącznie przy Ctrl; Shift, Alt i Meta nie pomijają tego sprawdzenia. Shift+1 wytwarzające „!” jest oceniane według rzeczywistego znaku, zamiast zawsze traktować je jako „1”.

Istnieje najwyżej jedno okno przechwytywania. Listeners keydown/keypress/keyup rejestrowane są raz na aplikację, w fazie capture, przed natywną obsługą dokumentu. Wszystkie te zdarzenia, również repeat i same modyfikatory, są zatrzymywane podczas przechwytywania. Zwolnienia klawiszy połkniętych przed Escape/zapisem pozostają zatrzymane. Modyfikator nie kończy przechwytywania. Escape/Anuluj/krzyżyk nie zapisuje. Wyczyść jest robocze; Zapisz waliduje i zapisuje bezpośrednio profil, aktualizuje draft i etykietę głównego formularza, a potem zamyka okno.

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
| Ten skrót jest już używany przez teleporty. | W oknie skrótu robocza kombinacja jest identyczna z drugim zapisanym skrótem dodatku. |
| Ten skrót jest już używany przez Margonem. | W oknie skrótu kombinacja koliduje z bezpośrednią akcją lub aktualnym HotKeys. Zapis jest odrzucany. Opcjonalny dopisek to „Ruch postaci.” albo dostępna ludzka nazwa widgetu. Kontrola przed użyciem nie dodaje żółtej wiadomości i pozostawia klawisz grze. |
| Nie można teraz sprawdzić skrótów Margonem. Poczekaj na załadowanie gry. | W oknie skrótu brak Engine.hotKeys; zapis kombinacji pozostaje niedostępny. |
| Czekam na odpowiedź gry… | Stały tekst panelu podczas niezakończonego żądania. |
| Brak odpowiedzi. Poczekaj lub odśwież grę przed kolejną próbą. | Stały tekst panelu po timeout, gdy blokada tego żądania pozostaje do odpowiedzi/odświeżenia. |
| Tryb: Ręczny / Tryb: Auto — Aktywny / Tryb: Auto — Pauza | Stały status odpowiadający off/active/paused. |
| Następna: NAZWA / Następna: wybór miejsca / Następna: brak gotowych | Nagłówek według następnego gotowego członka w cyklu z uwzględnieniem kłódek. Nazwa pochodzi z map,x,y,nazwa; brak nazwy w takim polu daje „nieznana lokacja”. |
| Następny slot: X · Początek: Y · Interwał: Z s | Stała informacja kolejki według aktualnych wartości profilu. |
| Przypisane teleporty: N / 60; Wybrany slot: X | Liczba zajętych pozycji i wybrany slot (lub —, jeśli żaden). |
| Zapisany skrót: KOMBINACJA; Naciśnij wybraną kombinację; Brak | Informacje okna skrótu: zapisane przypisanie, instrukcja i podgląd braku przypisania po Wyczyść. |
| Xs / Xm / Xh / ? | Nakładka odnowienia: dodatni pozostały czas timelimit, zaokrąglony w górę do sekund/minut/godzin; ? dla nieprawidłowego końca odnowienia. Brak tekstu dla gotowego przedmiotu. |
| Zmiany zatwierdź przyciskiem Zapisz. Wyłączenie automatu zatrzymuje go od razu. | Stała informacja głównej konfiguracji. Skróty mają własne natychmiastowe zatwierdzenie w osobnym oknie. |

Zablokowane bezpośrednie użycie nie wysyła żądania ani wiadomości. Pomijanie pojedynczych pustych/odnawiających/zablokowanych slotów, normalna mapa i KC otwierające wybór nie powodują fałszywego ostrzeżenia. Komunikaty emitowane przez samą grę/serwer pozostają natywne i nie są generowane przez dodatek.

## Wyniki lokalne i granice testów

- **41/41 testów Node**: profile schema 2, duplikaty, osobne klucze, cooldown/ważność/amount, cykl suffix, pojedyncze użycie, potwierdzenie/błąd/timeout, STOP i późne odpowiedzi, zmiana postaci/początku, grupy, blokady, mapy i pełny interwał, cele, normalizacja i konflikty, loader sandbox oraz metadane.
- **44/44 scenariusze Edge headless**: zachowane 29 regresji, dodatkowe 15 scenariuszy obejmujące wymagane nowe zachowania.
- Test odczytuje oryginalne Window, WindowManager, WindowManageSize, WindowManageOpacity, StorageFuncWindow, ItemsManager, PointerDragDrop, AddScrollBar, Api/ApiData, Crafting/CraftingWindow oraz HotKeys/HotKeysData, HeroDirectionData i InputParser z dostarczonego źródła. Oryginalna metoda HeroEquipment.sendUseRequest jest wyodrębniana przy uruchomieniu i korzysta z lokalnego kontrolowanego _g.
- Mapę, pozostałe części Engine, przedmioty, widgety i odpowiedzi serwera kontroluje fixture. ItemCraft, Tabs oraz części tutorialu są atrapami. Kod InputParser i HotKeys działa naprawdę: w przechwytywaniu ruch i akcja Q nie zachodzą, a po późniejszym przypisaniu natywnego Y działa akcja gry i brak żądania dodatku.
- Trzy wysokości obszaru **220/310/140 px** i trzy różne wysokości całego panelu sprawdzono przez rzeczywiste kliknięcia natywnego przełącznika. Zachowanie indeksu po odtworzeniu profilu i jeden natywny scrollbar potwierdzono lokalnie.
- Obejrzano PNG panelu z kłódkami i stopką dla slotu 60, zwiniętego nagłówka oraz osobnego okna z konfliktem. Użyto oryginalnego CSS i publicznych grafik /img/ z klienta Nyras; nie logowano się i nie wykonywano żądań użycia. Podglądy zapisano poza repozytorium: `E:\dodatki\tp-analysis\panel-0.1.2-panel.png`, `panel-0.1.2-collapsed.png`, `panel-0.1.2-bind.png` oraz `panel-0.1.2-forms.png`.
- Sprawdzono składnię JavaScript i spójność wersjonowanych zasobów. Brak nowych bibliotek produkcyjnych i zbędnych timerów: pozostają istniejący zegar, timer próby, timeout odpowiedzi i odroczenie synchronizacji.

## Pokrycie 41 przypadków z zadania

„Lokalnie” oznacza test logiki/przeglądarki z wyżej opisanym kontrolowanym środowiskiem, nigdy potwierdzenie na rzeczywistym serwerze.

| Nr z zadania | Przypadek | Weryfikacja lokalna |
| --- | --- | --- |
| 1–3 | Pojedynczy teleport, aktualizacja cooldownu, ITEM_USED bez t=reload | Oryginalna metoda sendUseRequest i kontrolowane odpowiedzi; natywne widoki. |
| 4–5 | Mapa bez pauzy, aktywność po zmianie | onClear/startGameThread i stany mapy kontrolowane; pełny interwał dodatkowo sprawdzony zegarem Node. |
| 6 | Odświeżenie przywraca pauzę | Zniszczenie i ponowna inicjalizacja App z zapisanego profilu; nie instalacja Tampermonkey. |
| 7–9 | Śmierć, hp=0 bez śmierci, HERO_DEAD.sec=0 | Native API i kontrolowany stan śmierci; brak samoczynnego wznowienia. |
| 10 | Odrzucenie | Oryginalne sprawdzenie alert w sendUseRequest, kontrolowany _g. |
| 11–12 | Ctrl+LPM, pojedyncze odblokowanie | Fizyczne kliknięcia z Control na pustym slocie. |
| 13–14 | Pomijanie i brak bezpośredniego użycia | Kolejka Node, dblclick/PPM i manual(slot) w przeglądarce. |
| 15–18 | Zbiorowe odblokowanie, stała pozycja blokady, zapis i niezależność replaceLock | UI, profil i zmiana/zamiana przypisań; oba mechanizmy osobne. |
| 19–21 | Import wolnych, kolejność i duplikaty | Odczyt rzeczywistego słownika fixture hItems, powtórzony import i zachowanie ręcznych pozycji. |
| 22–23 | Grupowanie stosów, oddzielne cele KC | Dwa zgodne stosy, różne pełne custom_teleport przy tym samym tpl. |
| 24–26 | Suma ilości, zniknięcie jednego/ostatniego | 12→7, zmiany amount i indywidualne usunięcia id/hid. |
| 27 | Dwa oddzielne przedmioty w torbie | Snapshot id/hid/stat przed i po imporcie, dwa różne obiekty. |
| 28 | Pełne 60 bez nadpisania | 60 niezależnych przypisań, snapshot i jeden komunikat z pominiętymi. |
| 29–31 | Ręczny status, lokacja i jasny nagłówek | DOM, computedStyle, tooltip, wariant KC i brak gotowych; oględziny PNG. |
| 32–33 | Trzy rozmiary i natywne przewijanie | Oryginalny WindowManageSize/AddScrollBar, wymiary, zapis, fizyczne kółko/suwak. |
| 34–35 | Osobne okno i natychmiastowy zapis | Native Window, profil oraz późniejszy zapis innych opcji bez cofnięcia skrótu. |
| 36–37 | Anulowanie i czyszczenie | Escape, Anuluj, robocze Wyczyść, zatwierdzenie Zapisz. |
| 38–39 | Konflikt własny/natywny | F10, Shift+Q, ruch z Ctrl, oryginalne HotKeys i InputParser. |
| 40 | Późniejszy konflikt | Zmiana natywnego HotKeys w fixture; akcja gry wykonana, dodatek nie wysyła użycia. |
| 41 | Gra milczy podczas przechwytywania | Oryginalny InputParser, brak ruchu i akcji; capture keydown/keypress/keyup. |

## Pozostaje do sprawdzenia w działającym Margonem

Nie zainstalowano dodatku na rzeczywistej postaci. Poniższe zachowania **nie zostały potwierdzone na serwerze**:

1. Tampermonkey: sandbox, unsafeWindow, pobranie opublikowanych zasobów i jednokrotny start w ramce NI.
2. Wszystkie realne teleporty (kamienie, zwoje, KC/Smoka/eventowe), docelowe formaty teleport/custom_teleport i ITEM_USED po odpowiedzi bez alert. Szczególnie ten sam cel/mapa oraz brak t=reload.
3. Rzeczywisty pełny przebieg zmiany mapy: init, map.lock, reCallInitQueue, startGameThread, mapLoadedAndAllInit/change_location, długie ładowanie, karta w tle i brak fałszywych pauz.
4. Odrzucenia i utrata odpowiedzi na serwerze, rzeczywiste wymagania przedmiotu, cooldown, binds i natywne potwierdzenia, brak ponowienia przy niepewności.
5. Śmierć/odrodzenie z realnym HERO_DEAD.sec i innymi blokadami; rzeczywista walka, dialog, handel, rzemiosło, CAPTCHA i utrata połączenia.
6. Rzeczywiste odtworzenie przedmiotów między torbami, zużycie ostatniego członka grupy, pełna zgodność statystyk zwojów. Zachowawcze porównanie może pozostawić zgodne wizualnie przedmioty osobno, gdy różnią się dodatkowymi statystykami.
7. WidgetManager/serverStorage: pełne belki, edycja położenia, usunięcie widgetu, ponowne logowanie, błędy zapisu i niezależne postacie/światy.
8. Wygląd trzech okien na używanym zoomie i ekranie, natywne tooltips z pełną nazwą lokacji, przewijanie i dotyk; publiczne grafiki oraz kontrolowane scenariusze nie zastępują działającego NI.
9. Układy klawiatury i systemowe kombinacje Ctrl/Alt/Meta, rzeczywiste zmiany skrótów klienta po zapisie, przechwytywanie podczas aktywnych stanów gry.

Wersja lokalna 0.1.2 jest przygotowana do tych sprawdzeń. Lokalnych wyników nie należy przedstawiać jako potwierdzenia teleportacji na serwerze.
