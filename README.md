# Teleporty do Margonem NI

Dodatek autorstwa **Doiua**, wersja **0.1.0**. Udostępnia panel 60 skrótów do teleportów z torby, kolejkę ręczną oraz uruchamiany przez gracza tryb czasowy.

[Plik do instalacji w Tampermonkey](https://raw.githubusercontent.com/Doiua97/teleport-queue/main/teleporty.user.js)

Implementacja przeszła testy lokalne. Weryfikacja w zalogowanym Margonem pozostaje do wykonania — szczegółowa lista znajduje się w [raporcie](REPORT.md). Podczas przygotowania dodatku nie wykonywano teleportacji na prawdziwych postaciach.

## Używanie

1. Zainstaluj wskazany plik w Tampermonkey i odśwież NI.
2. Kliknij przycisk **Teleporty** w belce gry. Przy pierwszym uruchomieniu dodatek szuka wolnego miejsca. Gdy belki są pełne, poczeka na zwolnienie miejsca.
3. Przeciągnij teleport z torby do slotu. Ten sam przedmiot możesz przypisać do jednego slotu. Przedmiot pozostaje w torbie.
4. Naciśnij **F9** albo **Użyj ręcznie**, aby wykonać jedną próbę. Kolejka pomija puste i niedostępne sloty.
5. Koło zębate otwiera konfigurację. Włącz tam tryb automatyczny, jeśli chcesz go używać. **F10** lub przycisk automatu rozpoczyna działanie, wstrzymuje je albo wznawia. Domyślny odstęp wynosi 120 sekund.
6. **STOP** zatrzymuje automat i wraca do ustawionego początku cyklu. Ukrycie panelu zachowuje działający automat.

Przeciąganie pomiędzy slotami zamienia skróty miejscami. Prawy przycisk myszy otwiera opcje **Użyj** i **Usuń**. Przeciągnięcie skrótu poza panel usuwa przypisanie. Te działania nie usuwają rzeczywistego przedmiotu z torby.

Cykl zaczynający się od 12 obejmuje sloty 12–60 i wraca do 12. Ustawienia są osobne dla każdego świata i postaci. Po odświeżeniu aktywny wcześniej automat czeka w pauzie na świadome wznowienie.

Gdy KC otwiera wybór miejsca, kolejka pozostaje na tym przedmiocie. Automat włącza pauzę. Wybierz miejsce w oknie gry, zamknij je i wznów działanie, gdy będziesz gotowy.

Jeśli gra nie potwierdzi teleportacji, dodatek zachowa wskaźnik i wyświetli wiadomość. Sprawdź grę przed następną próbą. Przy braku odpowiedzi przyciski użycia pozostaną zablokowane do otrzymania późnej odpowiedzi lub odświeżenia strony, aby nie wysłać dwóch żądań jednocześnie.

## Pliki

| Plik | Przeznaczenie |
| --- | --- |
| `teleporty.user.js` | Instalacja, pobieranie zasobów i dostęp do pamięci Tampermonkey. |
| `teleporty.core.js` | Okna i widget gry, sloty, kolejka, skróty oraz profile postaci. |
| `teleporty.css` | Style ograniczone do elementów dodatku. |
| `assets/widget.png` | Własna ikona kryształu, 32 × 32 px, z przezroczystym tłem. |
| `tests/core.test.cjs` | Testy kolejki, danych i loadera. |
| `tests/browser.cjs` | Testy w przeglądarce z modułami odczytywanymi z lokalnych plików klienta. |
| `REPORT.md` | Wyniki testów, analiza integracji i sprawdzenia wymagane w grze. |

## Testy i aktualizacje

Projekt nie wymaga bundlera ani zależności produkcyjnych. Testy logiki uruchamia się przez:

```powershell
node --test tests/core.test.cjs
```

Test przeglądarkowy wymaga dostępnego pakietu Playwright i przeglądarki Chromium lub Edge oraz oryginalnych plików klienta. Nie łączy się z serwerem gry. Pliki klienta nie są dołączone do repozytorium.

```powershell
$env:MARGO_SOURCE_DIR = 'E:\Kod margonem'
$env:TP_BROWSER_CHANNEL = 'msedge'
node tests/browser.cjs
```

Playwright musi być dostępny dla Node, np. przez `NODE_PATH` wskazujący posiadany katalog pakietów. Test korzysta również z dostarczonych obok głównego pliku `vendors.min.Dme5lfFa.js`, `rolldown-runtime.min.7_rZTKki.js` i `style.KGLtTzyt.css`. Kod gry jest czytany wyłącznie do lokalnego testu.

Przy aktualizacji zmień `@version` oraz `?v=` w adresach core, CSS i ikony. Zachowaj klucz profilu `margo-tp:v1:<world>:<characterId>` oraz dotychczasowe dane. Wszystkie adresy są już ustawione na `Doiua97/teleport-queue`, gałąź `main`; nie ma pól do uzupełnienia.
