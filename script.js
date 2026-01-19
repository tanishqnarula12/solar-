// Ensure the backend (solar.js) is loaded
window.addEventListener("DOMContentLoaded", () => {
  const searchBtn = document.getElementById("searchBtn");
  const stateInput = document.getElementById("stateInput");
  const resultSection = document.getElementById("result");
  const stateCard = document.getElementById("stateCard");
  const analyticsContainer = document.getElementById("analyticsSummary");
  const mapContainer = document.getElementById("mapContainer");

  
  searchBtn.addEventListener("click", () => {
    const stateName = stateInput.value.trim();
    if (!stateName) {
      alert("Please enter a state name!");
      return;
    }

    const info = SolarStateAPI.getSolarInfo(stateName);
    if (info.error) {
      stateCard.innerHTML = `<p style="color:red;">${info.error}</p>`;
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
