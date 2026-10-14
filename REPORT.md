# Raport — Teleporty 0.1.4

Data: 15 października 2026. Autor: **Doiua**. Projekt: `E:\dodatki\margonem-teleporty`. Repozytorium: [Doiua97/teleport-queue](https://github.com/Doiua97/teleport-queue), gałąź `main`.

## Zakres i przyczyna

Wersja 0.1.4 zmienia tylko system klawiatury 0.1.3, testy, dokumentację i wersjonowanie loadera. **Bez zmian pozostają** używanie teleportów, Queue, automat i jego czasowanie, okna, rozmiary, widget, przeciąganie, cooldowny, import, grupy i mechanizm Ctrl+LPM. Plik CSS i ikona nie zostały zmodyfikowane. Schemat nadal ma numer 2, klucz `margo-tp:v2:<world>:<characterId>`; nie ma resetu ani migracji.

Poprzednia lista systemKey mieszała skróty mające domyślną funkcję w przeglądarce ze skrótami przejmowanymi przez przeglądarkę **przed stroną**. Blokowało to m.in. Ctrl+D/F/G/K/L/P/R/S, mimo że zdarzenia tych kombinacji mogą zostać dostarczone stronie do obsługi. Zajęcie samego K przez Margonem także nie oznacza zajęcia Ctrl+K.

Sprawdzono źródło Chromium: BrowserView.PreHandleKeyboardEvent rozróżnia zarezerwowane polecenia i zwykłe skróty przekazywane rendererowi; BrowserCommandController.IsReservedCommandOrKey zachowuje pierwszeństwo m.in. nowej/zamykanej karty i okna oraz przywracania/przełączania kart. Nie użyto Keyboard Lock, pełnego ekranu, rozszerzenia ani przejmowania klawiszy systemowych. Źródła: [BrowserView](https://github.com/chromium/chromium/blob/main/chrome/browser/ui/views/frame/browser_view.cc), [BrowserCommandController](https://github.com/chromium/chromium/blob/main/chrome/browser/ui/browser_command_controller.cc).

To analiza publicznego Chromium, nie dowód zachowania każdej wersji Edge/Firefox i ustawień systemowych. Automatyczne testy w Edge headless potwierdzają obsługę dostarczonych zdarzeń i natywny parser gry. Nie są testem wszystkich fizycznych akceleratorów przeglądarki z rzeczywistej klawiatury.

## Zmienione pliki

| Plik | Zmiana |
| --- | --- |
| `teleporty.core.js` | Węższa blokada Ctrl, osobne AltGraph, wspólna walidacja i ochrona nieanulowalnego zdarzenia. |
| `teleporty.user.js` | Wersja 0.1.4 i nowy commit zasobów; update/download nadal z main. |
| `tests/core.test.cjs` | Macierz A–Z, AltGraph/identyfikacja, rejestr i cancelable. |
| `tests/browser.cjs` | Pięć nowych scenariuszy Ctrl, 45 kombinacji, automat/przyciski, AltGr, zapis i powrót profilu; wcześniejsze syntetyczne zdarzenia poprawione na cancelable:true, jak zwykłe zdarzenia klawiatury. |
| `README.md`, `REPORT.md` | Dostępność klawiszy, przyczyny, wyniki i ograniczenia. |

## Które kombinacje Ctrl są dopuszczone

Poniższa tabela opisuje walidację liter A–Z dla zwykłej strony gry w docelowym środowisku Windows/Chromium/Edge. Dotyczy zdarzeń możliwych do anulowania i fokusu na grze. Jawny konflikt z drugim bindem, innym dodatkiem, wcześniejsze obsłużenie eventu albo nieaktywny stan funkcji może dodatkowo uniemożliwić użycie.

| Kombinacja | Dopuszczone litery |
| --- | --- |
| Ctrl + litera | **A B C D E F G H I J K L M O P Q R S U V X Y Z** — 23 kombinacje. |
| Ctrl + Shift + litera | **A B C D E F G H I J L M O P Q R S U V X Y Z** — 22 kombinacje. |

W szczególności działają Ctrl+B i Ctrl+K oraz Ctrl+Shift+B. Ctrl+Shift+C/I/J nie są już odrzucane na podstawie samego istnienia skrótu narzędzi przeglądarki; mogą zostać obsłużone, jeśli przeglądarka dostarcza anulowalne zdarzenie stronie. Ten sam warunek dotyczy Ctrl+F, Ctrl+L, Ctrl+R i pozostałych skrótów domyślnych przeglądarki.

Test przechodzi zapis i pojedyncze użycie wszystkich **45** dopuszczonych kombinacji, a nie tylko sprawdzenie własnej funkcji walidacji. Nie oznacza to, że wszystkie Ctrl+A–Z są dostępne lub że zadziałają przy fokusie na pasku adresu, w menu/systemie albo przy innym rozszerzeniu.

## Które pozostają zablokowane i dlaczego

| Kombinacje literowe | Powód |
| --- | --- |
| Ctrl+N, Ctrl+Shift+N | Nowe zwykłe/prywatne okno; pozostawione pierwszeństwo przeglądarki. |
| Ctrl+T, Ctrl+Shift+T | Nowa/przywracana karta; zarezerwowane polecenia Chromium. |
| Ctrl+W, Ctrl+Shift+W | Zamknięcie karty/okna; dodatek nie próbuje ich przejmować. |
| Ctrl+Shift+K | Zachowana **ostrożnościowa** blokada: Edge przypisuje temu duplikowanie karty. Nie potwierdzono niezawodnego przejmowania tego akceleratora w zwykłym oknie Edge. Nie deklarujemy, że jest technicznie niemożliwe w każdej przeglądarce; Ctrl+K jest odblokowane niezależnie. |

Poza literami nadal chronione są m.in. Ctrl+Tab, Ctrl+Shift+Tab, Ctrl+PageUp/PageDown i ich warianty Shift, Ctrl+F4, Ctrl+F5, Ctrl+Shift+Delete oraz systemowe Ctrl+Alt+Delete. Pozostawiono dotychczasowe ograniczenia Enter/Escape/Tab, strzałek, cyfr 1–9, klawiszy funkcyjnych i kombinacji Alt/Meta. F4 i PageUp/PageDown w zestawach Ctrl są jawnie ujęte jako zamykanie/przełączanie kart.

Wykryty rzeczywisty konflikt, chroniona kombinacja lub zdarzenie z cancelable:false korzysta z niezmienionego komunikatu **Ten skrót jest już zajęty.** AltGr nie jest konfliktem zajętości — to kombinacja przeznaczona do pisania i w naszym oknie dostaje komunikat nieprawidłowej kombinacji.

Źródła opisu funkcji przeglądarki/systemu: [skróty Edge](https://support.microsoft.com/en-us/edge/keyboard-shortcuts-in-microsoft-edge), [skróty Windows](https://support.microsoft.com/en-us/windows/keyboard-shortcuts-in-windows-dcc61a57-8ff0-cffe-9796-cb9706c75eec). Sam wpis na liście skrótów nie był używany jako dowód, że dany klawisz zawsze wyprzedza DOM; właśnie to rozróżnienie poprawia 0.1.4.

## Walidacja i wykonanie

- systemKey porównuje **pełny zestaw modyfikatorów i code**. Doprecyzowano wyłącznie zestawy Ctrl/Ctrl+Shift; pozostała polityka pozostaje z 0.1.3.
- registeredKey nadal czyta jawne wpisy Engine.hotKeys.hotKeys i getSortedHotKeys, np. Ctrl+K lub Control+KeyB. Nie utożsamia ich z K/B ani innym zestawem modyfikatorów. AltGraph nie jest porównywany jako Ctrl+Alt.
- gameConflict rozróżnia chronione polecenie, pełną zajętą kombinację, bazowy niemodyfikowany klawisz gry i niezależny modyfikowany skrót. Używa KeyboardEvent.key do normalizacji, code do identyfikacji fizycznego klawisza oraz wszystkich flag modyfikatorów.
- App.conflict jest wspólne przy zapisie i wykonaniu. Odmawia działania przy nieanulowalnym zdarzeniu; nie resetuje zapisanego binda po późniejszym konflikcie.
- App.bind przejmuje wyłącznie dokładnie przypisaną i dozwoloną kombinację. Zatrzymuje keydown, keypress, repeat i końcowe keyup danego naciśnięcia, żeby nie uruchomić natywnego ruchu/hotkeya ani drugiej funkcji Teleportów. Stan zwalnia się po keyup, blur i zmianie widoczności.
- Ręczny i automatyczny bind korzystają z tej samej identyfikacji. Ctrl+B i Ctrl+Shift+B mogą należeć do różnych funkcji. Włączenie automatu, pauza, wznowienie i STOP zachowują swoje wcześniejsze znaczenie.
- Pisanie w input/textarea/MAGIC_INPUT/contenteditable, Engine.catchChar, blokady gry i wcześniejsze defaultPrevented mają pierwszeństwo. Nie przejmujemy wszystkich Ctrl w całym dokumencie ani bazowej litery niezależnie od modyfikatorów.

Przeanalizowano ponownie oryginalny InputParser: Ctrl wyłącza ogólne HotKeys.checkKey w keyPressProcedure, lecz **nie** wyłącza ruchu rozpoznawanego w keyDown. Dlatego poza walidacją nadal konieczne jest zatrzymanie całego obsługiwanego naciśnięcia. Oryginalne HotKeys i InputParser są wykonywane w testach. Nie zmodyfikowano ich kodu, przypisań gry ani konfiguracji innych dodatków.

Detekcja obcych dodatków pozostaje ograniczona do jawnych wpisów i wcześniej obsłużonego zdarzenia. Nie ma uniwersalnego rejestru listenerów Tampermonkey. Nie nadpisano EventTarget.prototype.addEventListener i nie usuwano cudzych handlerów.

## AltGr i okno przypisywania

AltGraph rozpoznawany jest przez getModifierState('AltGraph') i wartość key='AltGraph'. Stan zgłoszony podczas naciśnięcia prawego Alt jest pamiętany do jego keyup. Chroni to także sytuację, gdy przeglądarka zgłosi AltGraph na modyfikatorze, ale pominie go na kolejnej literze. Samo ctrlKey=true i altKey=true **nie** jest podstawą uznania kombinacji za AltGr.

keyOf dodaje tymczasowe altGraph:true tylko przy takim sygnale. sameKey nie utożsamia tej wartości z Ctrl+Alt. Zwykłe klucze v2 bez tej właściwości pozostają zgodne; brak flagi i false oznaczają to samo. Nie zmieniono schematu zapisu i nie dopisuje się tej flagi do poprawnego zapisanego binda.

Poza własnym oknem przechwytywania AltGr nie jest konsumowany przez Teleporty i nie wywołuje ręcznego ani automatycznego użycia. W polu edycji zdarzenia pozostają dostępne do wpisania znaków. Faktyczne Ctrl+Alt, jeżeli przeglądarka nie zgłasza AltGraph, nadal może być własnym skrótem.

W oknie „Ustaw skrót klawiszowy” AltGr również nie uruchamia gry ani dodatku. Podgląd pokazuje np. **AltGr + A**, a zapis takiej kombinacji jest odrzucany tekstem **Naciśnij poprawną kombinację klawiszy.** Nie zapisuje się jej błędnie jako Ctrl+Alt+A. Zwykły Ctrl+B pokazuje **Ctrl + B**. Poprawny zapis działa natychmiast i aktualizuje główny formularz. Anuluj zachowuje stary bind; Wyczyść pozostaje robocze do Zapisz.

Niektóre przeglądarki, np. Firefox na Windows, mogą zgłaszać AltGraph również dla fizycznego Ctrl+Alt. W takiej sytuacji pierwszeństwo ma ochrona pisania — ta kombinacja nie uruchomi Teleportów. Nie próbujemy zgadywać na podstawie samych dwóch flag, czy użytkownik zamierzał wpisać znak. Źródło: [getModifierState i AltGraph](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/getModifierState).

## Wyniki

**50/50 testów Node** i **54/54 scenariusze Edge headless**. Zachowano poprzednie regresje i dodano cztery testy logiki oraz pięć scenariuszy przeglądarkowych:

| Nowy scenariusz | Co potwierdza |
| --- | --- |
| Dostępne Ctrl+A–Z i Ctrl+Shift+A–Z | Rzeczywisty zapis i pojedyncze użycie 45 dopuszczonych kombinacji, brak akcji natywnej i ruchu, zwolnienie stanu, samo K osobno oraz odmowa Ctrl+W. |
| Ctrl+B i Ctrl+Shift+B | Osobne ręczne użycie i automat; ręczny przycisk, przycisk auto, start/pauza/wznowienie/STOP, konflikt własny, brak repeat. |
| Ctrl w edycji i na czacie | Input/textarea/MAGIC_INPUT/contenteditable, Ctrl+LPM bez teleportacji i odmowa działania przy cancelable:false. |
| AltGr oraz Ctrl+Alt | Standardowe zdarzenia KeyboardEvent z modifierAltGraph, zapamiętanie AltGraph z prawego Alt, brak przejęcia klawiszy pisania, brak gry podczas przechwytywania, odrzucenie zapisu AltGr i działanie właściwego Ctrl+Alt+A po zwolnieniu. |
| Zapis i ponowne logowanie | Natychmiastowe obowiązywanie binda, późniejszy zapis głównej konfiguracji, Anuluj, robocze i zatwierdzone Wyczyść, zachowanie całego profilu oraz działanie ręcznego i automatycznego Ctrl po odtworzeniu App. |

Zdarzenia w scenariuszach Ctrl generuje Playwright na oryginalnych InputParser i HotKeys, z prawdziwymi Window i kontrolowanymi odpowiedziami gry. AltGraph jest sprawdzany standardowym konstruktorem KeyboardEvent z modifierAltGraph:true, a nie atrapą getModifierState. Wpisanie ąęłóśźżćń przez insertText dodatkowo sprawdza zachowanie pola; **nie jest to automatyzacja fizycznego AltGr na systemowej klawiaturze**.

Nowe scenariusze uruchomiono także na niezmienionym core 0.1.3 z commita `f9d6a50e8ad16d146c381c2c2d94b4ef960c2152`. Cztery z pięciu bloków wykazały wady: odrzucanie dostępnych Ctrl, działanie przy zdarzeniu nieanulowalnym, pomylenie AltGr z Ctrl+Alt i niemożność ustawienia Ctrl+K do późniejszego odtworzenia. Scenariusz Ctrl+B/Ctrl+Shift+B przechodził już wcześniej i jest regresją. Kod wyjścia 1 w przebiegu starego wydania był oczekiwany.

Pozostałe 49 scenariuszy obejmują użycie/odrzucenie, mapy, śmierć, KC, Ctrl+LPM, grupy, import, okna/rozmiary, przeciąganie, widget i sprzątanie. Nadal są to testy lokalne z kontrolowanym Engine, obiektami przedmiotów, widgetami i serwerem; nie potwierdzają teleportacji na rzeczywistym koncie. Pliki gry pozostają wyłącznie odczytywane poza repozytorium.

## Uruchamianie i publikacja

```powershell
node --test tests/core.test.cjs
$env:MARGO_SOURCE_DIR = 'E:\Kod margonem'
$env:TP_BROWSER_CHANNEL = 'msedge'
node tests/browser.cjs
```

Playwright musi być dostępny w Node. `TP_PROBE=ctrl` uruchamia tylko nowe scenariusze 0.1.4. `TP_PROBE=1` pozostawia osobne pięć scenariuszy 0.1.3. `TP_CORE_FILE` i `TP_CSS_FILE` pozwalają sprawdzić inne lokalne wersje do odtwarzania błędów. Bez tych zmiennych czytane są aktualne pliki projektu.

Wydanie jest publikowane w main w dwóch etapach: najpierw core, testy i dokumentacja, następnie loader 0.1.4 przypięty do opublikowanego commita zasobów. Loader i każdy @require/@resource są weryfikowane przez HTTP i porównanie SHA-256 z lokalnym commitem Git. Ikona i CSS zachowują zawartość, ale otrzymują spójne adresy wydania 0.1.4. UpdateURL i downloadURL nadal wskazują aktualny loader na main. Bezpośredni link i SHA publikacji są podawane w odpowiedzi końcowej.

## Do sprawdzenia w zalogowanym Margonem

Nie instalowano dodatku na rzeczywistej postaci i nie zmieniano prawdziwych przedmiotów.

1. Zaktualizować Tampermonkey, odświeżyć NI i potwierdzić wersję 0.1.4 oraz zachowanie poprzednich ustawień v2.
2. Ustawić Ctrl+B dla ręcznego użycia, Ctrl+Shift+B dla automatu, potem Ctrl+K. Sprawdzić fizyczną klawiaturę i brak jednoczesnego otwierania funkcji klienta/przeglądarki.
3. Zweryfikować używane kombinacje w konkretnej przeglądarce, z normalnym fokusem na grze. Szczególnie Ctrl+K/L/R i Ctrl+Shift+C mogą zależeć od wydania, rozszerzeń, polityk i remapowania. Jeśli klawisz nie jest dostarczany stronie albo menu/system wymaga pierwszeństwa, wybrać inną kombinację — test headless nie daje gwarancji dla takiego środowiska.
4. Wpisać polskie znaki przez rzeczywisty AltGr na czacie i w formularzu, także mając przypisane Ctrl+Alt+A. Nie powinno być użycia teleportu. W oknie przypisywania AltGr nie powinien zmienić go w zapisany Ctrl+Alt.
5. Potwierdzić Ctrl+LPM, przytrzymanie, Anuluj/Wyczyść, ponowne logowanie oraz używane pozostałe dodatki. Prywatne bindy obcych dodatków nadal nie są w pełni wykrywalne.

Nie deklarujemy dostępności wszystkich skrótów Ctrl ani pełnej zgodności z dowolnym systemem lub nieznanymi dodatkami.
