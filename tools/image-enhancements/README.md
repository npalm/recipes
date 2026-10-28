# Lokale fotostudio

Een aparte ontwikkeltool voor receptfoto's. Wordt niet door Next.js geladen of meegebouwd en is alleen bereikbaar op de eigen computer.

```sh
pnpm images:dev
```

Open **http://localhost:4317**. Stop met Ctrl+C. Een andere poort kan met `IMAGE_STUDIO_PORT=4318 pnpm images:dev`.

De URL onthoudt de geopende foto, geselecteerde variant en kaartweergave. Herladen of een bladwijzer openen brengt je terug naar hetzelfde beeld. De knoppen Vorige en Volgende van de browser werken voor foto- en variantselectie. Als een foto of variant niet meer bestaat, opent de tool een beschikbare foto of de huidige siteversie.

## Gebruik

Foto's, galerijselectie en volgorde zijn gedeeld door alle talen. De editor toont de Nederlandse galerij (of de eerste beschikbare taal als Nederlands ontbreekt) en schrijft wijzigingen naar alle taalbestanden. Eventuele afwijkende afbeeldingslijsten worden daarbij gelijkgetrokken; de recepttekst blijft per taal behouden.

1. Kies links een originele foto. Eerdere `-artistic`-bewerkingen staan bij de varianten.
2. Kies **Fotocorrectie** voor lokale correcties aan helderheid, contrast, kleur en detail. Er worden geen objecten gegenereerd of verwijderd. Er wordt niet bijgesneden.
3. Kies **AI met Codex** voor eigen instructies. Bijvoorbeeld: “Maak het licht zachter. Behoud de rumfles, het etiket, de glazen en de achtergrond exact.” Vul belangrijke elementen ook in bij **Dit moet zeker blijven**.
4. Maak 1 tot 4 varianten. Standaard begint elke opdracht bij het origineel. Via **Begin met** kun je expliciet verdergaan met een eerdere variant.
5. Vergelijk het origineel met een variant, eventueel vergroot. **Receptkaart** en **Receptpagina (grote foto)** tonen de opgeslagen uitsnede van de geselecteerde variant. Zonder uitsnede blijft de volledige foto zichtbaar. Selecteren verandert de site nog niet.
6. **Als receptfoto gebruiken** vraagt om bevestiging en past de eerste afbeeldingsverwijzing aan voor alle aanwezige talen. Staat de foto al in de galerij, dan wordt hij naar voren verplaatst. Anders vervangt hij de huidige hoofdfoto. Andere afbeeldingen en receptinhoud blijven bewaard.
7. **Toevoegen aan galerij** kopieert de gekozen variant naar de receptmap en voegt deze achteraan toe in alle talen, zonder de hoofdfoto te wijzigen. Een foto kan maar één keer in de lijst staan.
8. Bij **Foto’s op de receptpagina** kun je foto's verplaatsen, een hoofdfoto kiezen of foto's uit de galerij halen. Verwijderen verandert alleen de verwijzing en laat het bestand staan. Er blijft minstens één foto in de galerij. De eerste foto wordt ook op het receptkaartje gebruikt.
9. **Origineel gebruiken op site** herstelt de verwijzing naar de originele foto.

De tool verandert geen bestaande afbeeldingsbestanden. Controleer bij een recept met meerdere originele foto's welke foto je als eerste afbeelding wilt gebruiken.

## Codex

De tool roept je geïnstalleerde `codex exec` aan, met een afzonderlijke werkmap en de ingebouwde beeldbewerking. Er is geen losse API-sleutel nodig voor deze route. Meld je vooraf aan met `codex login`. De lokale installatie moet beeldgeneratie ondersteunen. Desgewenst kun je het pad naar het programma instellen via `IMAGE_STUDIO_CODEX`.

De interface, wachtrij en fotocorrecties draaien lokaal. Codex AI verwerkt foto's online en gebruikt je Codex-limiet. Elke AI-variant is een afzonderlijke opdracht. De tool valt niet automatisch terug op een betaalde API.

AI kan ondanks behoudsinstructies details veranderen. Vergelijk onder andere etiketten, ingrediënten en compositie voordat je een variant toepast. De opdracht blijft bij elke variant bewaard en is in de interface te bekijken.

De CLI draait met `workspace-write` in de werkmap van de opdracht, zonder `--yolo` of het uitschakelen van goedkeuringen. Opdrachten worden achter elkaar uitgevoerd en kunnen worden geannuleerd. Een generatie stopt na 15 minuten. Een mislukte opdracht verandert de foto op de site niet.

## Bestanden

- `tools/image-enhancements/`: broncode van de lokale tool.
- `.local/image-enhancements/jobs/<id>/`: conceptfoto's, inputkopieën, prompts en opdrachtgeschiedenis. Deze map staat in `.gitignore`.
- `content/recipes/<recept>/images/<origineel>-enhanced-<id>.jpg`: varianten die je toepast, aan de galerij of carousel toevoegt of waarvoor je een uitsnede opslaat.

Na een herstart worden onderbroken opdrachten als mislukt gemarkeerd; afgeronde varianten blijven beschikbaar. Instructies in het formulier worden per foto in de browser onthouden.

De HTTP-server luistert uitsluitend op `127.0.0.1`. Schrijfacties vereisen de sessietoken van de lokale interface. Externe origins en onverwachte Host-headers worden geweigerd. Bestandsnamen en paden worden gecontroleerd; de CLI wordt zonder shell aangeroepen.

## Tests

```sh
pnpm images:lint
pnpm images:test
```

De bestaande CI voert deze controles uit in de job **Image Editor** op pull requests naar `main` en pushes naar `main`. De job is onderdeel van **CI Success**, heeft maximaal 10 minuten en heeft geen Codex-aanmelding of API-sleutel nodig.

De tests gebruiken tijdelijke recepten en afbeeldingen, zonder echte AI-aanroepen. Ze controleren behoud van het origineel, variant-herkomst, toepassen en terugzetten in meerdere talen, galerij en carousel, geselecteerde varianten bij uitsnijden, vrij slepen en vaste presets, verwijderen naar de prullenbak, terugrollen bij fouten en lokale toegangscontrole. Browserinteracties worden met JSDOM in de CI getest; aanvullende controles met Chrome worden lokaal uitgevoerd.

Officiële documentatie: [Codex beeldgeneratie](https://learn.chatgpt.com/docs/image-generation?surface=cli), [niet-interactieve opdrachten](https://learn.chatgpt.com/docs/non-interactive-mode).

### Homepagecarousel

Selecteer een origineel of variant en klik **Uitlichten op homepage**. Onder
**Homepagecarousel** kun je maximaal vijf foto's ordenen of verwijderen. De
selectie geldt voor alle talen; de site gebruikt de bijbehorende recepttitel en
link. Alleen gepubliceerde recepten kunnen worden uitgelicht. Ververs de homepage
na wijzigingen. De carousel wisselt via pijlen, stippen of de pijltoetsen.

De selectie staat in `content/home-highlights.json`. Een gekozen lokale variant
wordt eerst naar de receptmap gekopieerd, zodat die ook zonder lokale jobhistorie
beschikbaar blijft. Receptgalerijen en hun hoofdfoto veranderen hierdoor niet.
Verwijderen uit de carousel verwijdert geen afbeeldingsbestanden. Bij een lege
selectie toont de homepage de oorspronkelijke introductiebanner.

Gebruik **Carouseluitsnede** bij een foto in **Homepagecarousel** om alleen de desktopbanner
te verschuiven. Sleep het selectiekader op de volledige foto en pas de grootte aan met de hoek
rechtsonder of de knoppen Groter/Kleiner kader. De pijltoetsen verplaatsen het kader
en +/− verandert de grootte. **Uitsnede opslaan** bewaart dit in dezelfde carouselselectie;
de mobiele weergave, receptgalerij en originele afbeelding blijven behouden.
**Herstel oorspronkelijke weergave** verwijdert de desktopinstelling.
Het voorbeeld gebruikt de verhoudingen van een brede desktop; de exacte uitsnede
hangt af van de schermbreedte. De carousel begint bij het laden op een willekeurig
gerecht en wisselt daarna alleen via de bediening.


### Uitsnede op receptkaartjes

Open een recept en klik **Kaartuitsnede**. Het kader toont de geselecteerde variant. Je kunt alvast een uitsnede opslaan
voor een variant die nog niet op de site staat. Kies daarna **Als receptfoto
gebruiken** om die variant en zijn opgeslagen uitsnede op de site toe te passen.
Nieuwe kaartuitsneden beginnen met **Vrij**: sleep de rechtergreep voor de
breedte en de onderste greep voor de hoogte. Met de hoek pas je beide aan.
Kies een preset (bijvoorbeeld 4:3, 1:1 of 2:3) om die verhouding vast te zetten;
met **Vrij** ontgrendel je hem weer. De vrije verhouding blijft na herladen bewaard. Onder de volledige foto staat een voorbeeld van het resultaat.

De keuze geldt voor dit kaartje op desktop én mobiel, in alle talen. Hij staat
in `content/card-image-crops.json` en hoort bij de specifieke afbeeldingsnaam:
een andere hoofdfoto gebruikt dus weer de volledige foto. De carousel,
receptgalerij en originele bestanden veranderen niet. **Herstel oorspronkelijke
weergave** toont de volledige compositie en oorspronkelijke verhouding weer.
Zonder opgeslagen uitsnede blijft de bestaande kaartindeling behouden.

**Receptpagina (grote foto)** is een weergavevoorbeeld. De aparte knoppen
**Receptuitsnede**, **Kaartuitsnede** en **Carouseluitsnede** bepalen waar een
uitsnede wordt gebruikt.

### Grote foto op de receptpagina

Klik onder **Foto’s op de receptpagina** op **Receptuitsnede — grote foto**.
Dit werkt op dezelfde manier als Kaartuitsnede, met een vrije selectie en vaste
presets. Het geldt alleen voor de eerste foto bovenaan de receptpagina, op
desktop en mobiel. Andere galerijfoto’s en de volledige weergave blijven intact.

De instelling staat per afbeeldingsnaam in `content/recipe-image-crops.json`.
De kaartjes en homepagecarousel hebben hun eigen instellingen. De weergave
**Receptpagina (grote foto)** toont het resultaat in de editor. Herstellen
verwijdert alleen de receptuitsnede.

### Vanuit de lokale site openen

Met `next dev` verschijnt **Bewerk foto** op receptkaartjes, de grote receptfoto
(en de gekozen galerijfoto) en de homepagecarousel zodra de lokale editor draait.
De link opent een nieuw tabblad met het juiste origineel en de getoonde variant.
Kaartjes openen de kaartweergave; receptfoto’s openen de receptweergave.

De site controleert de beschikbaarheid ongeveer elke tien seconden. Zonder
editor blijven de knoppen verborgen. De koppeling is uitsluitend beschikbaar
in development op localhost/127.0.0.1, nooit in de productieversie.
Een afwijkende editorpoort kan via `IMAGE_STUDIO_PORT` worden ingesteld in de
omgeving van zowel de site als de editor.


### Varianten verwijderen

Onder elke gegenereerde variant staat **Verwijderen**. Na bevestiging verdwijnen
de variant en de bijbehorende opdracht uit de editor. Originalen zijn hiervan
uitgesloten. Varianten die nog in een receptgalerij (in welke taal dan ook), in de
homepagecarousel of als basis voor een lopende bewerking gebruikt worden, kunnen
pas worden verwijderd nadat die verwijzing of bewerking is afgehandeld.

De bestanden worden verplaatst naar `.local/image-enhancements/trash/<id>`.
Het manifest daar vermeldt de oorspronkelijke locaties; de oorspronkelijke
foto en andere varianten blijven behouden. De prullenbak staat buiten Git.
