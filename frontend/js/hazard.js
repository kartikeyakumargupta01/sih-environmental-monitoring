(function () {
  "use strict";

  // ============================================================
  // PAGE IDENTIFICATION
  // ============================================================

  const page =
    document.body.dataset.hazard;

  const NODE_ID = "NODE-F01";

  const REFRESH_MS =
    window.APP_CONFIG?.DEMO_REFRESH_MS || 5000;

  const OFFLINE_AFTER_MS = 15000;

  // ============================================================
  // RAIN SENSOR ADC THRESHOLDS
  // ============================================================

  // < 1500        -> CRITICAL
  // 1500 to 3500  -> MEDIUM
  // > 3500        -> SAFE

  const RAIN_MEDIUM_MIN = 1500;
  const RAIN_SAFE_MIN = 3500;

  // ============================================================
  // PAGE CONFIGURATION
  // ============================================================

  const configs = {
    flood: {
      nodeId: NODE_ID,
      zone: "Flood Monitoring Zone",
      title: "Flood Prediction & Monitoring",
      subtitle: "Rain and ultrasonic water-level monitoring",
      summaryId: "floodRiskSummary",
      nodeStatusId: "floodNodeStatus",
      statusBannerId: "floodStatusBanner",

      metrics: [
        {
          label: "Water Level",
          key: "water_level",
          format(value) {
            return formatNumber(value, 1, " cm");
          }
        },
        {
          label: "Rain Sensor",
          key: "rainfall",
          format(value) {
            return formatNumber(value, 0, " ADC");
          }
        },
        {
          label: "Temperature",
          key: "temperature",
          format(value) {
            return formatNumber(value, 1, " °C");
          }
        },
        {
          label: "Humidity",
          key: "humidity",
          format(value) {
            return formatNumber(value, 1, " %");
          }
        }
      ],

      chartSeries(history) {
        return [
          {
            name: "Water Level",
            values: history.map(
              (reading) => numberOrNull(reading.water_level)
            )
          },
          {
            name: "Rain ADC",
            values: history.map(
              (reading) => numberOrNull(reading.rainfall)
            )
          }
        ];
      }
    },

    fire: {
      nodeId: NODE_ID,
      zone: "Forest Monitoring Zone",
      title: "Forest Fire Monitoring",
      subtitle: "Temperature, humidity, smoke and gas monitoring",
      summaryId: "fireRiskSummary",
      nodeStatusId: "fireNodeStatus",
      statusBannerId: "fireStatusBanner",

      metrics: [
        {
          label: "Temperature",
          key: "temperature",
          format(value) {
            return formatNumber(value, 1, " °C");
          }
        },
        {
          label: "Humidity",
          key: "humidity",
          format(value) {
            return formatNumber(value, 1, " %");
          }
        },
        {
          label: "Smoke",
          key: "smoke",
          format(value) {
            return formatNumber(value, 0, " ppm");
          }
        },
        {
          label: "Gas",
          key: "gas",
          format(value) {
            return formatNumber(value, 0, " ppm");
          }
        }
      ],

      chartSeries(history) {
        return [
          {
            name: "Temperature",
            values: history.map(
              (reading) => numberOrNull(reading.temperature)
            )
          },
          {
            name: "Gas",
            values: history.map(
              (reading) => numberOrNull(reading.gas)
            )
          }
        ];
      }
    },

    air: {
      nodeId: NODE_ID,
      zone: "Air Quality Monitoring Zone",
      title: "Air Pollution Monitoring",
      subtitle: "Gas and environmental monitoring",
      summaryId: "airRiskSummary",
      nodeStatusId: "airNodeStatus",
      statusBannerId: "airStatusBanner",

      metrics: [
        {
          label: "PM2.5",
          key: "pm25",
          format(value) {
            if (value === null || value === undefined) {
              return "Unavailable";
            }
            return formatNumber(value, 0, " µg/m³");
          }
        },
        {
          label: "Gas",
          key: "gas",
          format(value) {
            return formatNumber(value, 0, " ppm");
          }
        },
        {
          label: "Temperature",
          key: "temperature",
          format(value) {
            return formatNumber(value, 1, " °C");
          }
        },
        {
          label: "Humidity",
          key: "humidity",
          format(value) {
            return formatNumber(value, 1, " %");
          }
        }
      ],

      chartSeries(history) {
        return [
          {
            name: "Gas",
            values: history.map(
              (reading) => numberOrNull(reading.gas)
            )
          },
          {
            name: "Temperature",
            values: history.map(
              (reading) => numberOrNull(reading.temperature)
            )
          }
        ];
      }
    }
  };

  const config = configs[page];

  if (!config) {
    console.error("Invalid hazard page:", page);
    return;
  }

  // ============================================================
  // STATE
  // ============================================================

  let latestReading = null;
  let historyData = [];
  let loading = false;

  // ============================================================
  // DOM HELPERS
  // ============================================================

  function getElement(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const element = getElement(id);

    if (!element) {
      return;
    }

    element.textContent =
      value === null || value === undefined || value === ""
        ? "--"
        : value;
  }

  function setStatus(id, value) {
    const element = getElement(id);

    if (!element) {
      return;
    }

    const risk = normalizeRisk(value);

    element.textContent = risk;
    element.className =
      "status-pill status-" + risk.toLowerCase();
  }

  // ============================================================
  // VALUE HELPERS
  // ============================================================

  function numberOrNull(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : null;
  }

  function formatNumber(value, decimals = 1, suffix = "") {
    const number = numberOrNull(value);

    if (number === null) {
      return "--";
    }

    return number.toFixed(decimals) + suffix;
  }

  // ============================================================
  // DATE HELPERS
  // ============================================================

  function parseBackendDate(value) {
    if (!value) {
      return null;
    }

    let text = String(value);

    const hasTimezone =
      /Z$|[+-]\d{2}:\d{2}$/.test(text);

    if (!hasTimezone) {
      text += "Z";
    }

    const date = new Date(text);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  }

  function formatDateTime(value) {
    const date = parseBackendDate(value);

    if (!date) {
      return "--";
    }

    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    }).format(date);
  }

  function createChartLabel(reading) {
    const date = parseBackendDate(reading?.created_at);

    if (!date) {
      return "";
    }

    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    }).format(date);
  }

  // ============================================================
  // RISK HELPERS
  // ============================================================

  function normalizeRisk(value) {
    const risk = String(value || "UNKNOWN").trim().toUpperCase();

    if (["SAFE", "MEDIUM", "CRITICAL", "UNKNOWN", "OFFLINE"].includes(risk)) {
      return risk;
    }

    if (risk === "LOW" || risk === "NORMAL") {
      return "SAFE";
    }

    if (risk === "HIGH" || risk === "DANGER") {
      return "CRITICAL";
    }

    return "UNKNOWN";
  }

  function riskPriority(value) {
    const risk = normalizeRisk(value);

    const mapping = {
      UNKNOWN: -1,
      OFFLINE: -1,
      SAFE: 0,
      MEDIUM: 1,
      CRITICAL: 2
    };

    return mapping[risk] ?? -1;
  }

  function maxRisk(levels) {
    let highest = "SAFE";

    levels.forEach((level) => {
      if (riskPriority(level) > riskPriority(highest)) {
        highest = level;
      }
    });

    return highest;
  }

  // ============================================================
  // SENSOR CLASSIFIERS
  // ============================================================

  function classifyWater(value) {
    const water = numberOrNull(value);

    if (water === null) {
      return "UNKNOWN";
    }

    if (water <= 90) {
      return "SAFE";
    }

    if (water <= 110) {
      return "MEDIUM";
    }

    return "CRITICAL";
  }

  function classifyRain(value) {
    const rain = numberOrNull(value);

    if (rain === null) {
      return "UNKNOWN";
    }

    if (rain > RAIN_SAFE_MIN) {
      return "SAFE";
    }

    if (rain >= RAIN_MEDIUM_MIN) {
      return "MEDIUM";
    }

    return "CRITICAL";
  }

  function rainCondition(value) {
    const rain = numberOrNull(value);

    if (rain === null) {
      return "Unavailable";
    }

    if (rain > RAIN_SAFE_MIN) {
      return "SAFE";
    }

    if (rain >= RAIN_MEDIUM_MIN) {
      return "MEDIUM";
    }

    return "CRITICAL";
  }

  function classifyTemperature(value) {
    const temperature = numberOrNull(value);

    if (temperature === null) {
      return "UNKNOWN";
    }

    if (temperature < 25) {
      return "SAFE";
    }

    if (temperature <= 30) {
      return "MEDIUM";
    }

    return "CRITICAL";
  }

  function classifyGas(value) {
    const gas = numberOrNull(value);

    if (gas === null) {
      return "UNKNOWN";
    }

    if (gas < 700) {
      return "SAFE";
    }

    if (gas <= 1200) {
      return "MEDIUM";
    }

    return "CRITICAL";
  }

  function classifyPm25(value) {
    const pm25 = numberOrNull(value);

    if (pm25 === null) {
      return "UNKNOWN";
    }

    if (pm25 <= 60) {
      return "SAFE";
    }

    if (pm25 <= 120) {
      return "MEDIUM";
    }

    return "CRITICAL";
  }

  // ============================================================
  // RISK CALCULATION BY PAGE
  // ============================================================

  function calculateFloodRisk() {
    return maxRisk([
      classifyWater(latestReading?.water_level),
      classifyRain(latestReading?.rainfall)
    ]);
  }

  function calculateFireRisk() {
    return maxRisk([
      classifyTemperature(latestReading?.temperature),
      classifyGas(latestReading?.smoke),
      classifyGas(latestReading?.gas)
    ]);
  }

  function calculateAirRisk() {
    return maxRisk([
      classifyGas(latestReading?.gas),
      classifyPm25(latestReading?.pm25),
      classifyTemperature(latestReading?.temperature)
    ]);
  }

  function getCurrentPageRisk() {
    if (!latestReading) {
      return "UNKNOWN";
    }

    if (page === "flood") {
      return calculateFloodRisk();
    }

    if (page === "fire") {
      return calculateFireRisk();
    }

    if (page === "air") {
      return calculateAirRisk();
    }

    return normalizeRisk(latestReading.risk_level);
  }

  // ============================================================
  // ONLINE / OFFLINE
  // ============================================================

  function isReadingStale(reading) {
    if (!reading || !reading.created_at) {
      return true;
    }

    const readingTime = parseBackendDate(reading.created_at);

    if (!readingTime) {
      return true;
    }

    return Date.now() - readingTime.getTime() > OFFLINE_AFTER_MS;
  }

  function isHardwareOnline() {
    return latestReading && !isReadingStale(latestReading);
  }

  // ============================================================
  // RENDER HEADER
  // ============================================================

  function renderHeader() {
    setText("pageTitle", config.title);
    setText("pageSubtitle", config.subtitle);
    setText("nodeId", config.nodeId);
    setText("zone", config.zone);
  }

  // ============================================================
  // RENDER MAIN STATUS
  // ============================================================

  function renderMainRisk() {
    setStatus("riskLevel", getCurrentPageRisk());
  }

  function renderConnectionStatus() {
    setText(
      "updatedAt",
      latestReading ? formatDateTime(latestReading.created_at) : "--"
    );

    if (config.nodeStatusId) {
      setText(
        config.nodeStatusId,
        isHardwareOnline() ? "ONLINE" : "OFFLINE"
      );
    }
  }

  // ============================================================
  // RENDER METRICS
  // ============================================================

  function renderEmptyMetrics() {
    const container = getElement("metrics");

    if (!container) {
      return;
    }

    container.innerHTML = config.metrics
      .map(
        (metric) => `
          <div class="metric">
            <span>${metric.label}</span>
            <b>--</b>
          </div>
        `
      )
      .join("");
  }

  function renderMetrics() {
    const container = getElement("metrics");

    if (!container) {
      return;
    }

    if (!latestReading) {
      renderEmptyMetrics();
      return;
    }

    container.innerHTML = config.metrics
      .map((metric) => {
        return `
          <div class="metric">
            <span>${metric.label}</span>
            <b>${metric.format(latestReading[metric.key])}</b>
          </div>
        `;
      })
      .join("");
  }

  // ============================================================
  // RENDER CHART
  // ============================================================

  function renderChart() {
    const canvas = getElement("trendChart");

    if (!canvas || !window.SimpleCharts) {
      return;
    }

    if (historyData.length === 0) {
      return;
    }

    const series = config.chartSeries(historyData);
    const labels = historyData.map(createChartLabel);

    window.SimpleCharts.drawLine(
      canvas,
      series[0],
      series[1] || null,
      labels
    );
  }

  // ============================================================
  // RENDER SUMMARY / BANNER
  // ============================================================

  function renderSummary() {
    const risk = getCurrentPageRisk();

    let message = "Monitoring data available.";

    if (risk === "SAFE") {
      message = "Current readings are in the safe range.";
    } else if (risk === "MEDIUM") {
      message = "Current readings indicate a medium-risk condition.";
    } else if (risk === "CRITICAL") {
      message = "Critical condition detected. Immediate attention is required.";
    }

    if (!isHardwareOnline()) {
      message += " Showing the latest stored reading.";
    }

    setText(config.summaryId, message);

    const banner = getElement(config.statusBannerId);
    if (banner) {
      banner.dataset.risk = risk.toLowerCase();
    }
  }

  // ============================================================
  // FLOOD-SPECIFIC DETAILS
  // ============================================================

  function renderFloodDetails() {
    if (page !== "flood") {
      return;
    }

    if (!latestReading) {
      setStatus("waterThresholdStatus", "UNKNOWN");
      setText("rainConditionStatus", "Unavailable");
      setText("mlFloodStatus", "Unavailable");
      setStatus("finalFloodRisk", "UNKNOWN");
      return;
    }

    const waterStatus = classifyWater(latestReading.water_level);
    const rainStatus = classifyRain(latestReading.rainfall);
    const finalRisk = maxRisk([waterStatus, rainStatus]);

    setStatus("waterThresholdStatus", waterStatus);
    setText("rainConditionStatus", rainCondition(latestReading.rainfall));
    setText("mlFloodStatus", "Unavailable");
    setStatus("finalFloodRisk", finalRisk);
  }

  // ============================================================
  // FIRE-SPECIFIC DETAILS
  // ============================================================

  function renderFireDetails() {
    if (page !== "fire") {
      return;
    }

    if (!latestReading) {
      setStatus("fireTemperatureStatus", "UNKNOWN");
      setText("fireHumidityStatus", "Unavailable");
      setStatus("fireSmokeStatus", "UNKNOWN");
      setStatus("fireGasStatus", "UNKNOWN");
      return;
    }

    setStatus(
      "fireTemperatureStatus",
      classifyTemperature(latestReading.temperature)
    );

    setText(
      "fireHumidityStatus",
      latestReading.humidity === null || latestReading.humidity === undefined
        ? "Unavailable"
        : formatNumber(latestReading.humidity, 1, " %")
    );

    setStatus(
      "fireSmokeStatus",
      classifyGas(latestReading.smoke)
    );

    setStatus(
      "fireGasStatus",
      classifyGas(latestReading.gas)
    );
  }

  // ============================================================
  // AIR-SPECIFIC DETAILS
  // ============================================================

  function renderAirDetails() {
    if (page !== "air") {
      return;
    }

    if (!latestReading) {
      setText("airPm25Status", "Unavailable");
      setStatus("airGasStatus", "UNKNOWN");
      setText("airTemperatureStatus", "Unavailable");
      setText("airHumidityStatus", "Unavailable");
      return;
    }

    setText(
      "airPm25Status",
      latestReading.pm25 === null || latestReading.pm25 === undefined
        ? "Unavailable"
        : classifyPm25(latestReading.pm25)
    );

    setStatus(
      "airGasStatus",
      classifyGas(latestReading.gas)
    );

    setText(
      "airTemperatureStatus",
      classifyTemperature(latestReading.temperature)
    );

    setText(
      "airHumidityStatus",
      latestReading.humidity === null || latestReading.humidity === undefined
        ? "Unavailable"
        : formatNumber(latestReading.humidity, 1, " %")
    );
  }

  // ============================================================
  // CRITICAL POPUP
  // ============================================================

  function showCriticalPopupIfNeeded() {
    const risk = getCurrentPageRisk();

    if (!isHardwareOnline()) {
      return;
    }

    const storageKey = `popup-risk-${page}`;
    const oldRisk = sessionStorage.getItem(storageKey);

    if (risk === "CRITICAL" && oldRisk !== "CRITICAL") {
      alert(
        `CRITICAL ALERT\n\n` +
          `Page: ${config.title}\n` +
          `Node: ${NODE_ID}\n` +
          `Time: ${formatDateTime(latestReading.created_at)}`
      );
    }

    sessionStorage.setItem(storageKey, risk);
  }

  // ============================================================
  // RENDER ALL
  // ============================================================

  function renderAll() {
    renderHeader();
    renderMainRisk();
    renderConnectionStatus();
    renderMetrics();
    renderChart();
    renderSummary();
    renderFloodDetails();
    renderFireDetails();
    renderAirDetails();
    showCriticalPopupIfNeeded();
  }

  // ============================================================
  // HISTORY NORMALIZATION
  // ============================================================

  function normalizeHistory(data) {
    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.readings)) {
      return data.readings;
    }

    if (Array.isArray(data?.data)) {
      return data.data;
    }

    return [];
  }

  // ============================================================
  // LOAD DATA
  // ============================================================

  async function loadLiveData() {
    if (loading) {
      return;
    }

    loading = true;

    try {
      const latest = await window.getLatestReading(config.nodeId);
      const history = await window.getNodeHistory(config.nodeId, 20);

      latestReading = latest;

      historyData = normalizeHistory(history).sort((a, b) => {
        const timeA = parseBackendDate(a.created_at)?.getTime() || 0;
        const timeB = parseBackendDate(b.created_at)?.getTime() || 0;
        return timeA - timeB;
      });

      console.log("Latest reading:", latestReading);
      console.log("History data:", historyData);

      renderAll();
    } catch (error) {
      console.error("Hazard page load failed:", error);
    } finally {
      loading = false;
    }
  }

  // ============================================================
  // REFRESH BUTTON
  // ============================================================

  function setupRefreshButton() {
    const button = getElement("simulateBtn");

    if (!button) {
      return;
    }

    button.textContent = "Refresh Live Data";

    button.addEventListener("click", function () {
      loadLiveData();
    });
  }

  // ============================================================
  // RESIZE
  // ============================================================

  let resizeTimer = null;

  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(function () {
      renderChart();
    }, 150);
  });

  // ============================================================
  // START
  // ============================================================

  document.addEventListener("DOMContentLoaded", function () {
    renderHeader();
    renderEmptyMetrics();
    setupRefreshButton();
    loadLiveData();

    setInterval(function () {
      loadLiveData();
    }, REFRESH_MS);
  });
})();