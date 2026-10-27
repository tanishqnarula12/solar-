# SolarScope

SolarScope is a small, browser-based dashboard for exploring solar installation estimates across Indian states and union territories. Search for a location, compare two locations, and view national summary cards alongside an OpenStreetMap view.

## Features

- Search state and union territory estimates, including forgiving name matching.
- Compare installed capacity, estimated generation, panel count, avoided emissions, and households powered.
- Browse national totals calculated from the bundled dataset.
- View an OpenStreetMap map centered on India.
- Switch between light and dark themes.

## Run locally

This is a static site with no build step or package installation. Open `index.html` in a browser, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then visit [http://localhost:8000](http://localhost:8000).

## Data and estimates

The dashboard currently uses the default values embedded in `solar.js`; it does not fetch live installation data. The generation, panel, emissions, and household figures are estimates derived from those values using the default assumptions in the same file:

- 20% capacity factor
- 400 W per panel
- 750 kg CO₂ per MWh displaced
- 1,200 kWh annual electricity use per household

These assumptions are simplifications for demonstration. The results should not be treated as current official statistics or used for investment or policy decisions. The map uses OpenStreetMap tiles and requires an internet connection.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Dashboard sections and controls |
| `style.css` | Layout, themes, and responsive styling |
| `script.js` | Search, comparison, analytics, and theme interactions |
| `solar.js` | Bundled data, estimate calculations, and map helpers |
| `solar-bg.jpg` | Dashboard hero background |

## License

No license is currently included. Ask the repository owner before reusing this project.
