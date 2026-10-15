# Teleporty 0.1.6 — stabilizacja techniczna

Autor: **Doiua**. Repozytorium: **Doiua97/teleport-queue**, gałąź **main**. Punkt odniesienia: `05aaf1dfd77b78c2965d00d188ee316844bc5e6f`, wersja 0.1.5. Wcześniejszy ogólny audyt pozostaje w [AUDIT.md](AUDIT.md); nie wykonywano kolejnej ogólnej refaktoryzacji.

## Zakres po korekcie użytkownika

Użytkownik potwierdził w rzeczywistym Margonem NI działanie wcześniejszej wersji: teleportację ręczną/automatyczną, kolejkę i KC bez przypisanej lokalizacji. Nie są to zgłoszenia usterek funkcjonalnych. Kolejności zdarzeń badane poniżej są lokalnymi próbami technicznymi, a nie dowodem wystąpienia problemu na jego koncie.

Zastosowano wyłącznie dwie uzasadnione poprawki: zachowanie oczekującej synchronizacji oraz ochronę cyklu życia wrapperów. Obsługa spóźnionych odpowiedzi, zasady przesuwania kolejki, automat, pauza, wznowienie i KC pozostały takie jak w 0.1.5. Nie dodano nowych komunikatów ani opcji. Opcjonalną optymalizację updateNext pominięto.

## Sprawdzone obszary i wynik

| Obszar | Ustalenie na niezmienionym 0.1.5 | Decyzja |
|---|---|---|
| Pominięty sync podczas ładowania/pakietu | Po zużyciu timeoutu deferSync metoda sync wracała bez śladu oczekującej pracy. Jeżeli również startGameThread trafiał na trwający pakiet, późniejszy tick nie ponawiał sync. W próbie ilość grupy pozostawała 10 zamiast 16, przy widocznym i ukrytym panelu. | Jedna flaga syncPending i ponowienie przez istniejący tick. |
| startGameThread przed odroczonym sync | Bezpośredni sync nie anulował już zaplanowanego timeoutu 0. W tej samej serii zmian sześć zajętych widoków synchronizowano 12 razy. | Udany sync usuwa zbędny oczekujący timeout: sześć aktualizacji. |
| Wrapper przechowywany przez drugi dodatek | Cleanup prawidłowo nie nadpisywał cudzego wrappera, ale zachowany w jego zamknięciu wrapper Teleportów nadal wywoływał starą kolejkę i ponownie rejestrował widget. | W nieaktualnej/zamkniętej instancji przejście bezpośrednio do oryginalnej metody. |
| Kontekst zmieniony w trakcie wywołania | Sama kontrola przed wywołaniem oryginału nie wystarcza, gdy oryginał kończy instancję. | Dodatkowa kontrola context w register/decorate widgetu przed wykonaniem skutków ubocznych. |
| Odpowiedź przed timeoutem | Sukces, odmowa, planowanie i potwierdzenie przez właściwe ITEM_USED działały zgodnie z istniejącą semantyką. | Bez zmian. |
| Odpowiedź po timeoutcie | Dotychczasowo zwalnia flight, pozostawiając wskaźnik i pauzę, bez kolejnego żądania i automatycznego wznowienia. | Bez zmian. Nie uznano tego zachowania za usterkę. |
| Natywna wymiana Item i id/hid | Ścieżka updateItem/deleteItem/newItemInLocation z kontrolowaną fabryką zachowywała prawidłowe przypisanie i odrzucała odmienne hid po zakończeniu aktualizacji. | Zachowano istniejące rozpoznawanie, bez nowej mechaniki kolejki. |
| KC bez celu | W dotychczasowych testach i według relacji użytkownika wybór należy do klienta, a samo otwarcie wyboru nie przesuwa kolejki. | Bez zmian. |

Są to dwa obszary poprawione technicznie, a nie cztery nowe funkcje. Wymiana przedmiotu, odpowiedzi i KC otrzymały testy regresyjne; nie projektowano dla nich nowej logiki. Ostateczny kod nie zawiera rozliczania późnego sukcesu ani nowego oznaczania zmian przypisań/interwału.

## Uzasadnienie na podstawie klienta

Źródła odczytano z dostarczonego `main.min.DdoKxU4n.js`. `Item.update` emituje afterUpdate, a `Item.beforeDelete` emituje delete. `ItemsManager.updateItem` przy zmianie loc/st usuwa i tworzy obiekt; pakiet jest obsługiwany przez addAndGetIdToFetchPackageController, decreaseFetchPackageController i newItemInLocation. Zwykła aktualizacja istniejącego Item i zakończenie pakietu nie gwarantują nowego callbacka fetch dla Teleportów.

`Engine.startGameThread` uruchamia wątek gry i zwalnia blokady klienta; sama ta metoda nie sprawdza kontrolera pakietów ItemsManager. Jest też wywoływana z gotowości mapy i końca inicjalizacji. Dlatego zachowanie oczekującej pracy jest właściwym zabezpieczeniem integracji niezależnych warunków gotowości. Test odtwarza ich kolejność lokalnie; nie twierdzimy, że użytkownik doświadczył takiej kolejności w grze.

`HeroEquipment.sendUseRequest` wykonuje callback odpowiedzi przed sprawdzeniem alert/checkTeleport i emisją ITEM_USED. Istniejąca korelacja response + id/hid oraz microtask pozostają nietknięte. Nie zastąpiono potwierdzenia samym callbackiem ani nowym systemem żądań.

## Zmiany w core

- `deferSync` ustawia syncPending, łączy wywołania w dotychczasowy timeout i nie planuje pracy dla nieaktualnej instancji.
- `sync` zachowuje istniejące warunki mapy/pakietu. Przy niegotowych danych zapamiętuje oczekiwanie bez czyszczenia przypisań i bez pełnej synchronizacji. Przy powodzeniu zeruje flagę i anuluje zbędny timeout.
- `tick` ponawia wyłącznie oczekującą synchronizację. Nie powstaje nowy stały timer. Zniszczona instancja nie uruchamia restartu.
- `destroy` usuwa timeout synchronizacji i czyści jego stan oczekiwania.
- `wrap` sprawdza życie i tożsamość instancji. Gdy są nieaktualne, nadal wywołuje oryginał z tym samym this/argumentami i zwraca jego wynik. Cudzy wrapper pozostaje na miejscu.
- `widget.register/decorate` ponownie sprawdzają kontekst także po powrocie z metody klienta.

Obsługiwane są wszystkie cztery dotychczasowe wrappery: onClear, startGameThread, WidgetManager.initDefaultWidgetSet i addWidgetButtons. Nie modyfikowano globalnych prototypów ani cudzych listenerów. Poza zmianami źródła opisanymi wyżej nie przebudowano App.

## Dowód zachowania semantyki

Porównanie fragmentów źródła z commitem odniesienia potwierdziło identyczność:

- Całej klasy Queue, w tym epoch, flight, attempt, timeout, release, STOP i planowania.
- App.use oraz App.accept — potwierdzenie, czas 15 s i zwolnienie późnej odpowiedzi.
- App.loaded, available i blocked — warunki używania przedmiotów i blokady automatu.
- changedSlots i konfiguracji setAuto/saveConfig — brak nowej reguły unieważniania lub przesuwania.
- Obsługi konfliktów, przechwytywania bindów i wejścia klawiatury.

Nie dodano retroaktywnego przesuwania po późnym sukcesie. Brak odpowiedzi nadal blokuje następne żądanie; późna odpowiedź zwalnia blokadę bez automatycznego wznowienia i przesunięcia. Ręczny tryb zachowuje swoje wcześniejsze zachowanie. KC bez celu zachowuje natywny wybór; nie dodano automatycznego wyboru, a samo otwarcie okna nie jest teleportacją.

Warunki walidacji schematu i klucz `margo-tp:v2:<world>:<characterId>` są niezmienione. Flaga oczekiwania jest tylko stanem instancji i nie trafia do profilu. Nie resetowano konfiguracji ani pól v2. CSS i grafika są identyczne bajtowo. Zachowano okna/rozmiary, 60 slotów, widget, scrollbar, grupowanie/import, Ctrl+LPM, skróty i AltGr. Model loadera pozostał bez zmian.

## Testy

| Etap | Node | Edge headless |
|---|---:|---:|
| Niezmienione 0.1.5 przed pracą | 52/52 | 60/60 |
| Końcowe 0.1.6 po korekcie zakresu | 52/52 | 71/71 |

Dodano 11 scenariuszy przeglądarkowych. Część jest tabelą kilku przypadków; 71 to liczba nazwanych scenariuszy, nie liczba kombinacji ich parametrów.

| Nowy scenariusz | Zakres |
|---|---|
| Zmiany podczas ładowania i pakietu | Kilka zmian ilości, suma grupy, brak pełnego sync przed gotowością, zachowane przypisania, jedno odświeżenie po gotowości; panel widoczny i ukryty. |
| Późne ITEM_USED | Pierwotna blokada, zwolnienie, brak przesunięcia/wznowienia/nowego żądania i brak podwójnego rozliczenia — jak w 0.1.5. |
| Wrapper drugiego dodatku po destroy | Cztery metody, zachowanie this/argumentów/wyników, oryginał i drugi dodatek działają; brak starego widgetu, zapisów, timerów i restartu. |
| Zmiana kontekstu w wrapperze | Inna postać oraz zamknięcie w środku metody klienta nie rejestrują widgetu starej instancji. |
| startGameThread i oczekujący timeout | Jedna aktualizacja widoku zamiast dwóch, brak zaległego timeoutu. |
| Natywne usunięcie/odtworzenie | Oryginalny updateItem/deleteItem i callbacki; zapis zachowany w przejściowej przerwie, to samo id/hid wraca, obce hid usuwane dopiero po gotowości. |
| Odpowiedź przed timeoutem / brak odpowiedzi | Dotychczasowy sukces, odmowa i utrzymanie blokady bez odpowiedzi. |
| Późna odmowa i nieskorelowane id/hid | Nie uznaje ich za sukces. |
| Późna odpowiedź po zmianie kontekstu | STOP, początek, postać, świat, destroy, przypisanie, usunięcie, zamiana i interwał nie zmieniają zapisu w odpowiedzi. |
| Zużycie zwoju po timeoutcie | Ostatni fizyczny zwój lub członek grupy; tożsamość żądania i dotychczasowy brak przesunięcia pozostają. |
| KC bez celu | Ręczny i auto, także po timeoutcie, nie przechodzą na następny slot przez samo potwierdzenie obsługi wyboru. |

Nowe scenariusze sprawdzono także na niezmienionym core 0.1.5. Siedem przechodzi zgodnie z dotychczasowym zachowaniem. Cztery wykazują braki techniczne: utracone odświeżenie, podwójną synchronizację i dwa warianty nieaktywnego wrappera/kontekstu. Nie traktowano przechodzących regresji jako powodu do zmian produkcji.

Wykonywane są oryginalne Window/WindowManager, ItemsManager, Item.on/unregisterCallback/trigger/beforeDelete, PointerDragDrop, AddScrollBar, API, InputParser/HotKeys i metoda sendUseRequest klienta. Konstruktor przedmiotu, fabryka jego odtworzenia, część zależności i odpowiedzi serwera są kontrolowane. Timeout 15 s sprawdza się przez wywołanie rzeczywiście zarejestrowanego callbacka timera, bez czekania 15 sekund. Nie są to opóźnienia zmierzone na serwerze.

Testy lokalne nie korzystają z zalogowanej postaci i nie wysyłają użycia przedmiotów do gry. Potwierdzenie funkcjonalne użytkownika dotyczy wcześniejszej działającej wersji; nie przypisujemy go automatycznie nowemu wydaniu.

## Pliki i publikacja

Zmieniono pięć plików: teleporty.core.js, teleporty.user.js, tests/browser.cjs, README.md i REPORT.md. AUDIT.md pozostaje historycznym audytem 0.1.5. Nie zmieniono testów jednostkowych, helpera testowego, CSS ani ikony. Brak nowych bibliotek i plików produkcyjnych.

```powershell
node --test tests/core.test.cjs
$env:MARGO_SOURCE_DIR = 'E:\Kod margonem'
$env:TP_BROWSER_CHANNEL = 'msedge'
node tests/browser.cjs
```

Playwright musi być dostępny dla Node, np. przez NODE_PATH. `TP_PROBE=stable` wykonuje 11 nowych scenariuszy, a `TP_CORE_FILE` wskazuje lokalną kopię core 0.1.5 do porównania. Pozostałe tryby audit/ctrl/metrics są zachowane. Do sprawdzenia podstawowego kodu produkcyjnego używany jest także nieinstrumentowany bieżący core.

Publikacja: najpierw commit core/testów/dokumentacji, następnie loader 0.1.6 przypięty do rzeczywistego SHA zasobów. Trzy adresy mają ten sam SHA i ?v=0.1.6; updateURL/downloadURL nadal wskazują main. Publiczne pliki będą porównane z bajtami Git i sprawdzone pod kątem HTTP 200. SHA zasobów i link zostaną uzupełnione po wysłaniu.

## Krótka próba w Margonem

1. Zaktualizować dodatek i odświeżyć NI; sprawdzić zachowany profil, przypisania i wygląd.
2. Sprawdzić odświeżanie ilości grupy po zmianie mapy, także przy ukrytym panelu.
3. Powtórzyć zwykłe ręczne/automatyczne użycie oraz KC bez celu — obsługa powinna pozostać dotychczasowa.
4. Sprawdzić używane inne dodatki i ponowne logowanie; nie ma potrzeby celowego wywoływania timeoutów na prawdziwych przedmiotach.
