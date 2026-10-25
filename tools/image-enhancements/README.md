# Lokale fotostudio

Een aparte ontwikkeltool voor receptfoto's. Wordt niet door Next.js geladen of meegebouwd en is alleen bereikbaar op de eigen computer.

```sh
pnpm images:dev
```

Open **http://localhost:4317**. Stop met Ctrl+C. Een andere poort kan met `IMAGE_STUDIO_PORT=4318 pnpm images:dev`.

De URL onthoudt de geopende foto, geselecteerde variant en kaartweergave. Herladen of een bladwijzer openen brengt je terug naar hetzelfde beeld. De knoppen Vorige en Volgende van de browser werken voor foto- en variantselectie. Als een foto of variant niet meer bestaat, opent de tool een beschikbare foto of de huidige siteversie.

## Gebruik

1. Kies links een originele foto. Eerdere `-artistic`-bewerkingen staan bij de varianten.
2. Kies **Fotocorrectie** voor lokale correcties aan helderheid, contrast, kleur en detail. Er worden geen objecten gegenereerd of verwijderd. Er wordt niet bijgesneden.
3. Kies **AI met Codex** voor eigen instructies. Bijvoorbeeld: “Maak het licht zachter. Behoud de rumfles, het etiket, de glazen en de achtergrond exact.” Vul belangrijke elementen ook in bij **Dit moet zeker blijven**.
4. Maak 1 tot 4 varianten. Standaard begint elke opdracht bij het origineel. Via **Begin met** kun je expliciet verdergaan met een eerdere variant.
5. Vergelijk het origineel met een variant, eventueel vergroot. Kies **Uitsnede op de site (4:3)** om te zien welke delen buiten het huidige kaartkader vallen. **Met aanwijseffect** toont ook de 10% zoom en donkere laag van het huidige kaartje. Wissel terug naar **Volledige foto** om alles te zien. Dit is een beelduitsnedevoorbeeld; het wijzigt geen foto of kaartinstellingen. Selecteren verandert de site nog niet.
6. **Deze foto gebruiken** vraagt om bevestiging, kopieert de variant naar de receptmap en past de eerste afbeeldingsverwijzing aan voor alle aanwezige talen. Andere afbeeldingen en receptinhoud blijven bewaard.
7. **Origineel gebruiken op site** herstelt de verwijzing naar de originele foto.

De tool verandert geen bestaande afbeeldingsbestanden. Controleer bij een recept met meerdere originele foto's welke foto je als eerste afbeelding wilt gebruiken.

## Codex

De tool roept je geïnstalleerde `codex exec` aan, met een afzonderlijke werkmap en de ingebouwde beeldbewerking. Er is geen losse API-sleutel nodig voor deze route. Meld je vooraf aan met `codex login`. De lokale installatie moet beeldgeneratie ondersteunen. Desgewenst kun je het pad naar het programma instellen via `IMAGE_STUDIO_CODEX`.

De interface, wachtrij en fotocorrecties draaien lokaal. Codex AI verwerkt foto's online en gebruikt je Codex-limiet. Elke AI-variant is een afzonderlijke opdracht. De tool valt niet automatisch terug op een betaalde API.

AI kan ondanks behoudsinstructies details veranderen. Vergelijk onder andere etiketten, ingrediënten en compositie voordat je een variant toepast. De opdracht blijft bij elke variant bewaard en is in de interface te bekijken.

De CLI draait met `workspace-write` in de werkmap van de opdracht, zonder `--yolo` of het uitschakelen van goedkeuringen. Opdrachten worden achter elkaar uitgevoerd en kunnen worden geannuleerd. Een generatie stopt na 15 minuten. Een mislukte opdracht verandert de foto op de site niet.

## Bestanden

- `tools/image-enhancements/`: broncode van de lokale tool.
- `.local/image-enhancements/jobs/<id>/`: conceptfoto's, inputkopieën, prompts en opdrachtgeschiedenis. Deze map staat in `.gitignore`.
- `content/recipes/<recept>/images/<origineel>-enhanced-<id>.jpg`: alleen varianten die je expliciet toepast.

Na een herstart worden onderbroken opdrachten als mislukt gemarkeerd; afgeronde varianten blijven beschikbaar. Instructies in het formulier worden per foto in de browser onthouden.

De HTTP-server luistert uitsluitend op `127.0.0.1`. Schrijfacties vereisen de sessietoken van de lokale interface. Externe origins en onverwachte Host-headers worden geweigerd. Bestandsnamen en paden worden gecontroleerd; de CLI wordt zonder shell aangeroepen.

## Tests

```sh
pnpm images:lint
pnpm images:test
```

De bestaande CI voert deze controles uit in de job **Image Editor** op pull requests naar `main` en pushes naar `main`. De job is onderdeel van **CI Success**, heeft maximaal 10 minuten en heeft geen Codex-aanmelding of API-sleutel nodig.

De tests gebruiken tijdelijke recepten en afbeeldingen, zonder AI-aanroepen. Ze controleren onder andere behoud van het origineel, variant-herkomst, toepassen en terugzetten in meerdere talen, mislukte opdrachten en lokale toegangscontrole.

Officiële documentatie: [Codex beeldgeneratie](https://learn.chatgpt.com/docs/image-generation?surface=cli), [niet-interactieve opdrachten](https://learn.chatgpt.com/docs/non-interactive-mode).
