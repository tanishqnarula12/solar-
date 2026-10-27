// Ensure the backend (solar.js) is loaded
window.addEventListener("DOMContentLoaded", () => {
  const searchBtn = document.getElementById("searchBtn");
  const stateInput = document.getElementById("stateInput");
  const resultSection = document.getElementById("result");
  const stateCard = document.getElementById("stateCard");
  const analyticsContainer = document.getElementById("analyticsSummary");
  const mapContainer = document.getElementById("mapContainer");
  const compareStateA = document.getElementById("compareStateA");
  const compareStateB = document.getElementById("compareStateB");
  const compareBtn = document.getElementById("compareBtn");
  const compareResults = document.getElementById("compareResults");

  const stateNames = SolarStateAPI.listAllStates().map(({ state }) => state).sort((a, b) => a.localeCompare(b));
  stateNames.forEach((name) => {
    compareStateA.add(new Option(name, name));
    compareStateB.add(new Option(name, name));
  });
  compareStateA.value = "Delhi";
  compareStateB.value = "Gujarat";

  function addMetric(container, label, value) {
    const row = document.createElement("p");
    const name = document.createElement("span");
    const result = document.createElement("strong");
    name.textContent = label;
    result.textContent = value;
    row.append(name, result);
    container.append(row);
  }

  function addLocationCard(title, info) {
    const card = document.createElement("article");
    const heading = document.createElement("h3");
    heading.textContent = title;
    card.className = "compare-card card";
    card.append(heading);
    addMetric(card, "Installed capacity", `${info.installedCapacityMW.toLocaleString()} MW`);
    addMetric(card, "Estimated annual generation", `${info.estimatedAnnualGenerationGWh.toLocaleString()} GWh`);
    addMetric(card, "Estimated panels", info.estimatedPanelCount.toLocaleString());
    addMetric(card, "Estimated CO₂ avoided", `${info.estimatedCO2AvoidedTonnes.toLocaleString()} tonnes`);
    addMetric(card, "Estimated households powered", info.estimatedHouseholdsPowered.toLocaleString());
    compareResults.append(card);
  }

  compareBtn.addEventListener("click", () => {
    const comparison = SolarStateAPI.stateCompare(compareStateA.value, compareStateB.value);
    if (comparison.error) return;

    compareResults.replaceChildren();
    addLocationCard(comparison.A.state, comparison.A);
    addLocationCard(comparison.B.state, comparison.B);

    const difference = document.createElement("article");
    const heading = document.createElement("h3");
    heading.textContent = "Difference (first − second)";
    difference.className = "compare-card card difference-card";
    difference.append(heading);
    addMetric(difference, "Installed capacity", `${comparison.diff.installedCapacityMW.toLocaleString()} MW`);
    addMetric(difference, "Estimated annual generation", `${comparison.diff.annualGenerationGWh.toLocaleString()} GWh`);
    addMetric(difference, "Estimated panels", comparison.diff.panelCount.toLocaleString());
    compareResults.append(difference);
    compareResults.classList.remove("hidden");
  });

  
  searchBtn.addEventListener("click", () => {
    const stateName = stateInput.value.trim();
    if (!stateName) {
      alert("Please enter a state name!");
      return;
    }

    const info = SolarStateAPI.getSolarInfo(stateName);
    if (info.error) {
      stateCard.textContent = info.error;
      resultSection.classList.remove("hidden");
      return;
    }

   
    stateCard.innerHTML = `
      <h3>${info.state}</h3>
      <p><strong>Installed Capacity:</strong> ${info.installedCapacityMW.toLocaleString()} MW</p>
      <p><strong>Annual Generation:</strong> ${info.estimatedAnnualGenerationGWh.toLocaleString()} GWh</p>
      <p><strong>Estimated Panels:</strong> ${info.estimatedPanelCount.toLocaleString()}</p>
      <p><strong>CO₂ Avoided:</strong> ${info.estimatedCO2AvoidedTonnes.toLocaleString()} tonnes</p>
      <p><strong>Households Powered:</strong> ${info.estimatedHouseholdsPowered.toLocaleString()}</p>
    `;
    resultSection.classList.remove("hidden");
    stateCard.classList.add("fade-in");
  });

  stateInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") searchBtn.click();
  });

  
  function loadAnalytics() {
    const summary = SolarStateAPI.analyticsSummary();
    const totalCap = summary.totalInstalledCapacityMW.toLocaleString();
    const totalGen = summary.totalEstimatedAnnualGenerationGWh.toLocaleString();
    const totalPanels = summary.totalEstimatedPanelCount.toLocaleString();

    analyticsContainer.innerHTML = `
      <div class="card">
        <h3>Total Installed Capacity</h3>
        <p><strong>${totalCap}</strong> MW</p>
      </div>
      <div class="card">
        <h3>Total Annual Generation</h3>
        <p><strong>${totalGen}</strong> GWh</p>
      </div>
      <div class="card">
        <h3>Estimated Solar Panels</h3>
        <p><strong>${totalPanels}</strong></p>
      </div>
      <div class="card">
        <h3>Total States Covered</h3>
        <p><strong>${summary.totalStates}</strong></p>
      </div>
    `;
  }

  function loadMap() {
    const mapHTML = SolarStateAPI.generateIframeHTMLForMap({
      width: "100%",
      height: 450
    });
    mapContainer.innerHTML = mapHTML;
  }

  loadAnalytics();
  loadMap();
});

const themeSwitch = document.getElementById("themeSwitch");

if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  themeSwitch.checked = true;
}

themeSwitch.addEventListener("change", () => {
  if (themeSwitch.checked) {
    document.body.classList.add("dark");
    localStorage.setItem("theme", "dark");
  } else {
    document.body.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }
});
