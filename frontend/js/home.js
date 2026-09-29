(function () {
  "use strict";

  // ============================================================
  // ENVIRONMENTAL PREDICTION SYSTEM
  // HOME / OVERVIEW DASHBOARD
  // ============================================================

  const NODE_ID = "NODE-F01";

  const OFFLINE_AFTER_MS = 12000;

  const REFRESH_MS =
    window.APP_CONFIG?.DEMO_REFRESH_MS ||
    3000;

  const API_BASE_URL =
    window.APP_CONFIG?.API_BASE_URL ||
    "http://127.0.0.1:8000";


  // ============================================================
  // STATE
  // ============================================================

  let latestReading = null;

  let historyData = [];

  let dashboardSummary = null;

  let alertsData = [];

  let backendHealth = null;

  let loading = false;

  let selectedTrendMetric = "water_level";


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
      value === null ||
      value === undefined ||
      value === ""
        ? "--"
        : value;
  }


  function setHTML(id, value) {
    const element = getElement(id);

    if (!element) {
      return;
    }

    element.innerHTML = value;
  }


  // ============================================================
  // NUMBER HELPERS
  // ============================================================

  function numberOrNull(value) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
      return null;
    }

    return number;
  }


  function formatNumber(
    value,
    decimals = 1,
    suffix = ""
  ) {
    const number = numberOrNull(value);

    if (number === null) {
      return "--";
    }

    return (
      number.toFixed(decimals) +
      suffix
    );
  }


  // ============================================================
  // DATE / TIME
  // ============================================================

  function parseDate(value) {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return null;
    }

    return date;
  }


  function formatDateTime(value) {
    const date =
      parseDate(value);

    if (!date) {
      return "--";
    }

    return date.toLocaleString(
      undefined,
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }
    );
  }


  function formatTime(value) {
    const date =
      parseDate(value);

    if (!date) {
      return "--";
    }

    return date.toLocaleTimeString(
      undefined,
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }
    );
  }


  function createChartLabel(reading) {
    return formatTime(
      reading?.created_at
    );
  }


  // ============================================================
  // RISK HELPERS
  // ============================================================

  function normalizeRisk(value) {
    const risk =
      String(
        value || "UNKNOWN"
      )
        .trim()
        .toUpperCase();

    if (
      risk === "SAFE" ||
      risk === "MEDIUM" ||
      risk === "CRITICAL" ||
      risk === "OFFLINE"
    ) {
      return risk;
    }

    if (
      risk === "HIGH" ||
      risk === "DANGER" ||
      risk === "WARNING"
    ) {
      return "CRITICAL";
    }

    return "UNKNOWN";
  }


  function riskPriority(value) {
    const risk =
      normalizeRisk(value);

    const priorities = {
      UNKNOWN: -1,
      SAFE: 0,
      MEDIUM: 1,
      CRITICAL: 2,
      OFFLINE: 3
    };

    return (
      priorities[risk] ??
      -1
    );
  }


  function highestRisk(...risks) {
    const normalized =
      risks.map(
        normalizeRisk
      );

    if (
      normalized.length === 0
    ) {
      return "UNKNOWN";
    }

    return normalized.reduce(
      function (
        highest,
        current
      ) {
        return (
          riskPriority(current) >
          riskPriority(highest)
            ? current
            : highest
        );
      },
      "UNKNOWN"
    );
  }


  function setStatusElement(
    id,
    risk
  ) {
    const element =
      getElement(id);

    if (!element) {
      return;
    }

    const normalized =
      normalizeRisk(risk);

    element.textContent =
      normalized;

    element.className =
      "status-pill status-" +
      normalized.toLowerCase();
  }


  // ============================================================
  // SENSOR CLASSIFICATION
  // ============================================================

  function classifyWaterLevel(value) {
    const water =
      numberOrNull(value);

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
    const rain =
      numberOrNull(value);

    if (rain === null) {
      return "UNKNOWN";
    }

    if (rain > 2000) {
      return "SAFE";
    }

    if (rain > 1000) {
      return "MEDIUM";
    }

    return "CRITICAL";
  }


  function getRainCondition(value) {
    const rain =
      numberOrNull(value);

    if (rain === null) {
      return "Unavailable";
    }

    if (rain > 3000) {
      return "No Rain";
    }

    if (rain > 2000) {
      return "Low Rain";
    }

    if (rain > 1000) {
      return "Medium Rain";
    }

    return "High Rain";
  }


  function classifyTemperature(value) {
    const temperature =
      numberOrNull(value);

    if (
      temperature === null
    ) {
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
    const gas =
      numberOrNull(value);

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


  // ============================================================
  // ONLINE / OFFLINE
  // ============================================================

  function isReadingStale(
    reading
  ) {
    if (
      !reading ||
      !reading.created_at
    ) {
      return true;
    }

    const created =
      new Date(
        reading.created_at
      ).getTime();

    if (
      Number.isNaN(created)
    ) {
      return true;
    }

    return (
      Date.now() -
      created >
      OFFLINE_AFTER_MS
    );
  }


  function isNodeOnline(
    reading
  ) {
    if (!reading) {
      return false;
    }

    if (
      typeof reading.online
      === "boolean"
    ) {
      return (
        reading.online &&
        !isReadingStale(
          reading
        )
      );
    }

    return !isReadingStale(
      reading
    );
  }


  // ============================================================
  // DISPLAY HELPERS
  // ============================================================

  function setCardOffline(
    cardId,
    offline
  ) {
    const card =
      getElement(cardId);

    if (!card) {
      return;
    }

    card.classList.toggle(
      "offline-card",
      offline
    );
  }


  function setHealthStatus(
    id,
    status,
    text
  ) {
    const element =
      getElement(id);

    if (!element) {
      return;
    }

    const normalized =
      String(
        status || "offline"
      )
        .trim()
        .toLowerCase();

    element.className =
      "health-status " +
      normalized;

    element.textContent =
      text ||
      normalized.toUpperCase();
  }


  // ============================================================
  // OVERALL STATUS
  // ============================================================

  function renderOverallStatus() {
    const online =
      isNodeOnline(
        latestReading
      );

    let overallRisk =
      normalizeRisk(
        dashboardSummary
          ?.overall_risk ||
        latestReading
          ?.risk_level
      );

    if (!online) {
      overallRisk =
        "OFFLINE";
    }

    setStatusElement(
      "overallRiskLevel",
      overallRisk
    );

    let message =
      "Environmental monitoring data is available.";

    if (overallRisk === "SAFE") {
      message =
        "All currently evaluated sensor conditions are within the configured safe range.";
    }

    if (overallRisk === "MEDIUM") {
      message =
        "One or more environmental indicators have entered the medium-risk range.";
    }

    if (
      overallRisk ===
      "CRITICAL"
    ) {
      message =
        "Critical environmental conditions detected. Review the hazard dashboards and Alert Center immediately.";
    }

    if (
      overallRisk ===
      "OFFLINE"
    ) {
      message =
        "No fresh sensor packet has been received from NODE-F01.";
    }

    setText(
      "overallRiskMessage",
      message
    );

    setText(
      "lastPacketTime",
      latestReading
        ? formatDateTime(
            latestReading
              .created_at
          )
        : "--"
    );

    setText(
      "activeNodeName",
      NODE_ID
    );

    setText(
      "networkMode",
      online
        ? "Live Monitoring"
        : "Offline"
    );

    const banner =
      getElement(
        "systemStatusBanner"
      );

    if (banner) {
      banner.dataset.risk =
        overallRisk.toLowerCase();
    }
  }


  // ============================================================
  // HEADER
  // ============================================================

  function renderHeaderStatus() {
    const online =
      isNodeOnline(
        latestReading
      );

    setText(
      "connectionStatus",
      online
        ? "Live"
        : "Offline"
    );

    setText(
      "headerLastPacket",
      latestReading
        ? formatTime(
            latestReading
              .created_at
          )
        : "--"
    );

    const liveDot =
      getElement(
        "liveDot"
      );

    if (liveDot) {
      liveDot.style.background =
        online
          ? "var(--safe)"
          : "var(--offline)";
    }

    const headerStatus =
      getElement(
        "headerSystemStatus"
      );

    if (headerStatus) {
      headerStatus.style.display =
        "none";
    }
  }


  // ============================================================
  // COUNTERS
  // ============================================================

  function renderCounters() {
    const summary =
      dashboardSummary || {};

    const online =
      isNodeOnline(
        latestReading
      );

    setText(
      "totalNodes",
      summary.total_nodes ??
      (
        latestReading
          ? 1
          : 0
      )
    );

    setText(
      "onlineNodes",
      summary.online_nodes ??
      (
        online
          ? 1
          : 0
      )
    );

    setText(
      "safeNodes",
      online
        ? (
          summary.safe_nodes ??
          (
            normalizeRisk(
              latestReading
                ?.risk_level
            ) === "SAFE"
              ? 1
              : 0
          )
        )
        : 0
    );

    setText(
      "mediumNodes",
      online
        ? (
          summary.medium_nodes ??
          (
            normalizeRisk(
              latestReading
                ?.risk_level
            ) === "MEDIUM"
              ? 1
              : 0
          )
        )
        : 0
    );

    setText(
      "criticalNodes",
      online
        ? (
          summary.critical_nodes ??
          (
            normalizeRisk(
              latestReading
                ?.risk_level
            ) ===
            "CRITICAL"
              ? 1
              : 0
          )
        )
        : 0
    );

    setText(
      "alertsToday",
      summary.alerts_today ??
      0
    );
  }


  // ============================================================
  // FLOOD CARD
  // ============================================================

  function renderFloodCard() {
    const online =
      isNodeOnline(
        latestReading
      );

    setCardOffline(
      "floodOverviewCard",
      !online
    );

    if (!online) {
      setStatusElement(
        "floodStatus",
        "OFFLINE"
      );

      setText(
        "floodWaterLevel",
        "--"
      );

      setText(
        "floodRainfall",
        "--"
      );

      setText(
        "floodTemperature",
        "--"
      );

      setText(
        "floodHumidity",
        "--"
      );

      setText(
        "floodNodeState",
        "NODE-F01 offline"
      );

      return;
    }

    const floodRisk =
      normalizeRisk(
        latestReading
          ?.flood_risk ||
        highestRisk(
          classifyWaterLevel(
            latestReading
              ?.water_level
          ),
          classifyRain(
            latestReading
              ?.rainfall
          )
        )
      );

    setStatusElement(
      "floodStatus",
      floodRisk
    );

    setText(
      "floodWaterLevel",
      formatNumber(
        latestReading
          ?.water_level,
        1,
        " cm"
      )
    );

    setText(
      "floodRainfall",
      numberOrNull(
        latestReading
          ?.rainfall
      ) === null
        ? "--"
        : Math.round(
            latestReading
              .rainfall
          ) +
          " ADC"
    );

    setText(
      "floodTemperature",
      formatNumber(
        latestReading
          ?.temperature,
        1,
        " °C"
      )
    );

    setText(
      "floodHumidity",
      formatNumber(
        latestReading
          ?.humidity,
        1,
        " %"
      )
    );

    setText(
      "floodNodeState",
      "NODE-F01 online"
    );
  }


  // ============================================================
  // FIRE CARD
  // ============================================================

  function renderFireCard() {
    const online =
      isNodeOnline(
        latestReading
      );

    setCardOffline(
      "fireOverviewCard",
      !online
    );

    if (!online) {
      setStatusElement(
        "fireStatus",
        "OFFLINE"
      );

      setText(
        "fireTemperature",
        "--"
      );

      setText(
        "fireHumidity",
        "--"
      );

      setText(
        "fireSmoke",
        "--"
      );

      setText(
        "fireGas",
        "--"
      );

      setText(
        "fireNodeState",
        "NODE-F01 offline"
      );

      return;
    }

    const fireRisk =
      normalizeRisk(
        latestReading
          ?.fire_risk ||
        highestRisk(
          classifyTemperature(
            latestReading
              ?.temperature
          ),
          classifyGas(
            latestReading
              ?.gas
          ),
          classifyGas(
            latestReading
              ?.smoke
          )
        )
      );

    setStatusElement(
      "fireStatus",
      fireRisk
    );

    setText(
      "fireTemperature",
      formatNumber(
        latestReading
          ?.temperature,
        1,
        " °C"
      )
    );

    setText(
      "fireHumidity",
      formatNumber(
        latestReading
          ?.humidity,
        1,
        " %"
      )
    );

    setText(
      "fireSmoke",
      formatNumber(
        latestReading
          ?.smoke,
        0,
        " ppm"
      )
    );

    setText(
      "fireGas",
      formatNumber(
        latestReading
          ?.gas,
        0,
        " ppm"
      )
    );

    setText(
      "fireNodeState",
      "NODE-F01 online"
    );
  }


  // ============================================================
  // AIR CARD
  // ============================================================

  function renderAirCard() {
    const online =
      isNodeOnline(
        latestReading
      );

    setCardOffline(
      "airOverviewCard",
      !online
    );

    if (!online) {
      setStatusElement(
        "airStatus",
        "OFFLINE"
      );

      setText(
        "airPm25",
        "--"
      );

      setText(
        "airGas",
        "--"
      );

      setText(
        "airTemperature",
        "--"
      );

      setText(
        "airHumidity",
        "--"
      );

      setText(
        "airNodeState",
        "NODE-F01 offline"
      );

      return;
    }

    const airRisk =
      normalizeRisk(
        latestReading
          ?.air_risk ||
        classifyGas(
          latestReading
            ?.gas
        )
      );

    setStatusElement(
      "airStatus",
      airRisk
    );

    setText(
      "airPm25",
      latestReading
        ?.pm25 === null ||
      latestReading
        ?.pm25 === undefined
        ? "--"
        : formatNumber(
            latestReading
              .pm25,
            0,
            " µg/m³"
          )
    );

    setText(
      "airGas",
      formatNumber(
        latestReading
          ?.gas,
        0,
        " ppm"
      )
    );

    setText(
      "airTemperature",
      formatNumber(
        latestReading
          ?.temperature,
        1,
        " °C"
      )
    );

    setText(
      "airHumidity",
      formatNumber(
        latestReading
          ?.humidity,
        1,
        " %"
      )
    );

    setText(
      "airNodeState",
      "NODE-F01 online"
    );
  }


  // ============================================================
  // TREND METRIC
  // ============================================================

  const TREND_METRICS = {
    water_level: {
      name: "Water Level",
      suffix: " cm",
      decimals: 1
    },

    rainfall: {
      name: "Rain ADC",
      suffix: " ADC",
      decimals: 0
    },

    temperature: {
      name: "Temperature",
      suffix: " °C",
      decimals: 1
    },

    humidity: {
      name: "Humidity",
      suffix: " %",
      decimals: 1
    },

    gas: {
      name: "Gas",
      suffix: " ppm",
      decimals: 0
    },

    smoke: {
      name: "Smoke",
      suffix: " ppm",
      decimals: 0
    },

    pm25: {
      name: "PM2.5",
      suffix: " µg/m³",
      decimals: 0
    }
  };


  // ============================================================
  // GRAPH
  // ============================================================

  function renderTrendChart() {
    const canvas =
      getElement(
        "homeTrendChart"
      );

    if (
      !canvas ||
      !window.SimpleCharts
    ) {
      return;
    }

    if (
      !historyData ||
      historyData.length === 0
    ) {
      window.SimpleCharts.drawLine(
        canvas,
        {
          name: "No Data",
          values: []
        },
        null,
        []
      );

      return;
    }

    const metric =
      TREND_METRICS[
        selectedTrendMetric
      ] ||
      TREND_METRICS
        .water_level;

    const labels =
      historyData.map(
        createChartLabel
      );

    const values =
      historyData.map(
        function (reading) {
          return numberOrNull(
            reading[
              selectedTrendMetric
            ]
          );
        }
      );

    window.SimpleCharts.drawLine(
      canvas,
      {
        name: metric.name,
        values: values
      },
      null,
      labels
    );

    setText(
      "trendNodeLabel",
      NODE_ID
    );

    setText(
      "trendUpdatedAt",
      latestReading
        ? formatDateTime(
            latestReading
              .created_at
          )
        : "--"
    );
  }


  function setupTrendSelector() {
    const select =
      getElement(
        "trendMetric"
      );

    if (!select) {
      return;
    }

    selectedTrendMetric =
      select.value ||
      "water_level";

    select.addEventListener(
      "change",
      function () {
        selectedTrendMetric =
          select.value;

        renderTrendChart();
      }
    );
  }


  // ============================================================
  // ALERT CENTER
  // ============================================================

  function renderAlerts() {
    const container =
      getElement(
        "recentAlerts"
      );

    if (!container) {
      return;
    }

    setText(
      "alertCountBadge",
      alertsData.length
    );

    if (
      alertsData.length === 0
    ) {
      container.innerHTML = `
        <div class="alert safe">
          <div>
            <b>No recorded alerts</b>
            <p>
              No MEDIUM or CRITICAL events
              are currently available.
            </p>
          </div>
        </div>
      `;

      return;
    }

    container.innerHTML =
      alertsData
        .slice(0, 6)
        .map(
          function (alert) {
            const severity =
              normalizeRisk(
                alert.severity
              );

            const hazard =
              String(
                alert.hazard_type ||
                "environment"
              )
                .trim()
                .toUpperCase();

            const message =
              alert.message ||
              "Environmental alert detected.";

            const timestamp =
              formatDateTime(
                alert.created_at
              );

            return `
              <div
                class="alert ${severity.toLowerCase()}"
              >
                <div>
                  <b>
                    ${hazard} · ${severity}
                  </b>

                  <p>
                    ${message}
                  </p>

                  <small>
                    Recorded:
                    ${timestamp}
                  </small>
                </div>
              </div>
            `;
          }
        )
        .join("");
  }


  // ============================================================
  // NODE / MAP
  // ============================================================

  function renderNodePanel() {
    const online =
      isNodeOnline(
        latestReading
      );

    setStatusElement(
      "nodeOnlineStatus",
      online
        ? "SAFE"
        : "OFFLINE"
    );

    const statusElement =
      getElement(
        "nodeOnlineStatus"
      );

    if (statusElement) {
      statusElement.textContent =
        online
          ? "ONLINE"
          : "OFFLINE";
    }

    setText(
      "nodeGatewayStatus",
      online
        ? "Connected"
        : "No recent packet"
    );

    setText(
      "nodeLastReading",
      latestReading
        ? formatDateTime(
            latestReading
              .created_at
          )
        : "--"
    );

    setText(
      "latestPacketNumber",
      latestReading
        ?.id ?? "--"
    );

    setStatusElement(
      "nodeRiskLevel",
      online
        ? latestReading
            ?.risk_level
        : "OFFLINE"
    );

    const mapNode =
      getElement(
        "homeMapNode"
      );

    if (mapNode) {
      mapNode.className =
        "map-node";

      if (!online) {
        mapNode.classList.add(
          "offline"
        );
      } else {
        const risk =
          normalizeRisk(
            latestReading
              ?.risk_level
          )
            .toLowerCase();

        mapNode.classList.add(
          risk
        );
      }

      mapNode.dataset.label =
        NODE_ID;
    }
  }


  // ============================================================
  // SYSTEM HEALTH
  // ============================================================

  function renderSystemHealth() {
    const online =
      isNodeOnline(
        latestReading
      );

    setHealthStatus(
      "healthNode",
      online
        ? "online"
        : "offline",
      online
        ? "ONLINE"
        : "OFFLINE"
    );

    setHealthStatus(
      "healthLora",
      online
        ? "connected"
        : "offline",
      online
        ? "CONNECTED"
        : "NO PACKET"
    );

    setHealthStatus(
      "healthGateway",
      online
        ? "connected"
        : "offline",
      online
        ? "CONNECTED"
        : "OFFLINE"
    );

    const apiConnected =
      backendHealth &&
      (
        backendHealth.backend ===
        "connected"
      );

    setHealthStatus(
      "healthApi",
      apiConnected
        ? "connected"
        : "offline",
      apiConnected
        ? "CONNECTED"
        : "OFFLINE"
    );

    const databaseConnected =
      backendHealth &&
      (
        backendHealth.database ===
        "connected"
      );

    setHealthStatus(
      "healthDatabase",
      databaseConnected
        ? "connected"
        : "offline",
      databaseConnected
        ? "CONNECTED"
        : "OFFLINE"
    );
  }


  // ============================================================
  // SENSOR HEALTH
  // ============================================================

  function sensorValueAvailable(
    value
  ) {
    return (
      value !== null &&
      value !== undefined &&
      Number.isFinite(
        Number(value)
      )
    );
  }


  function renderSensorHealth() {
    const online =
      isNodeOnline(
        latestReading
      );

    function render(
      id,
      available
    ) {
      setHealthStatus(
        id,
        (
          online &&
          available
        )
          ? "online"
          : "offline",
        (
          online &&
          available
        )
          ? "OK"
          : "UNAVAILABLE"
      );
    }

    render(
      "sensorWaterStatus",
      sensorValueAvailable(
        latestReading
          ?.water_level
      )
    );

    render(
      "sensorDhtStatus",
      sensorValueAvailable(
        latestReading
          ?.temperature
      ) &&
      sensorValueAvailable(
        latestReading
          ?.humidity
      )
    );

    render(
      "sensorRainStatus",
      sensorValueAvailable(
        latestReading
          ?.rainfall
      )
    );

    render(
      "sensorGasStatus",
      sensorValueAvailable(
        latestReading
          ?.gas
      )
    );

    setHealthStatus(
      "sensorLoraStatus",
      online
        ? "connected"
        : "offline",
      online
        ? "OK"
        : "OFFLINE"
    );

    setHealthStatus(
      "sensorGatewayStatus",
      online
        ? "connected"
        : "offline",
      online
        ? "OK"
        : "OFFLINE"
    );
  }


  // ============================================================
  // RISK EXPLANATION
  // ============================================================

  function renderRiskExplanation() {
    const online =
      isNodeOnline(
        latestReading
      );

    if (!online) {
      setText(
        "riskExplanation",
        "Risk evaluation is unavailable because no fresh sensor packet has been received."
      );

      setText(
        "riskWaterValue",
        "--"
      );

      setText(
        "riskWaterReason",
        "No fresh reading"
      );

      setText(
        "riskRainValue",
        "--"
      );

      setText(
        "riskRainReason",
        "No fresh reading"
      );

      setText(
        "riskTemperatureValue",
        "--"
      );

      setText(
        "riskTemperatureReason",
        "No fresh reading"
      );

      setText(
        "riskGasValue",
        "--"
      );

      setText(
        "riskGasReason",
        "No fresh reading"
      );

      return;
    }

    const waterRisk =
      classifyWaterLevel(
        latestReading
          ?.water_level
      );

    const rainRisk =
      classifyRain(
        latestReading
          ?.rainfall
      );

    const temperatureRisk =
      classifyTemperature(
        latestReading
          ?.temperature
      );

    const gasRisk =
      classifyGas(
        latestReading
          ?.gas
      );

    setText(
      "riskWaterValue",
      formatNumber(
        latestReading
          ?.water_level,
        1,
        " cm"
      )
    );

    setText(
      "riskWaterReason",
      waterRisk === "SAFE"
        ? "≤ 90 cm"
        : waterRisk === "MEDIUM"
          ? "> 90 to 110 cm"
          : waterRisk === "CRITICAL"
            ? "> 110 cm"
            : "Unavailable"
    );

    setText(
      "riskRainValue",
      numberOrNull(
        latestReading
          ?.rainfall
      ) === null
        ? "--"
        : Math.round(
            latestReading
              .rainfall
          ) +
          " ADC"
    );

    setText(
      "riskRainReason",
      getRainCondition(
        latestReading
          ?.rainfall
      )
    );

    setText(
      "riskTemperatureValue",
      formatNumber(
        latestReading
          ?.temperature,
        1,
        " °C"
      )
    );

    setText(
      "riskTemperatureReason",
      temperatureRisk === "SAFE"
        ? "< 25 °C"
        : temperatureRisk === "MEDIUM"
          ? "25 to 30 °C"
          : temperatureRisk === "CRITICAL"
            ? "> 30 °C"
            : "Unavailable"
    );

    setText(
      "riskGasValue",
      formatNumber(
        latestReading
          ?.gas,
        0,
        " ppm"
      )
    );

    setText(
      "riskGasReason",
      gasRisk === "SAFE"
        ? "< 700 ppm"
        : gasRisk === "MEDIUM"
          ? "700 to 1200 ppm"
          : gasRisk === "CRITICAL"
            ? "> 1200 ppm"
            : "Unavailable"
    );

    const overall =
      highestRisk(
        waterRisk,
        rainRisk,
        temperatureRisk,
        gasRisk
      );

    let explanation =
      "All configured environmental indicators are currently within the safe range.";

    if (
      overall ===
      "MEDIUM"
    ) {
      explanation =
        "At least one sensor has entered the medium-risk range. Continued monitoring is recommended.";
    }

    if (
      overall ===
      "CRITICAL"
    ) {
      explanation =
        "At least one monitored parameter is in the critical range. Review the corresponding hazard dashboard and Alert Center.";
    }

    setText(
      "riskExplanation",
      explanation
    );
  }


  // ============================================================
  // LAST UPDATED
  // ============================================================

  function renderLastUpdated() {
    setText(
      "lastUpdated",
      latestReading
        ? formatDateTime(
            latestReading
              .created_at
          )
        : "--"
    );
  }


  // ============================================================
  // COMPLETE RENDER
  // ============================================================

  function renderDashboard() {
    renderHeaderStatus();

    renderOverallStatus();

    renderCounters();

    renderFloodCard();

    renderFireCard();

    renderAirCard();

    renderTrendChart();

    renderAlerts();

    renderNodePanel();

    renderSystemHealth();

    renderSensorHealth();

    renderRiskExplanation();

    renderLastUpdated();
  }


  // ============================================================
  // NORMALIZE HISTORY
  // ============================================================

  function normalizeHistory(
    response
  ) {
    if (
      Array.isArray(response)
    ) {
      return response;
    }

    if (
      Array.isArray(
        response?.readings
      )
    ) {
      return response.readings;
    }

    return [];
  }


  // ============================================================
  // FETCH BACKEND HEALTH
  // ============================================================

  async function getBackendHealth() {
    try {
      const response =
        await fetch(
          `${API_BASE_URL}/api/health`
        );

      if (!response.ok) {
        throw new Error(
          `Health check failed: ${response.status}`
        );
      }

      backendHealth =
        await response.json();
    }
    catch (error) {
      console.error(
        "Backend health error:",
        error
      );

      backendHealth = {
        status: "degraded",
        backend: "disconnected",
        database: "disconnected"
      };
    }
  }


  // ============================================================
  // LOAD LATEST READING
  // ============================================================

  async function loadLatestReading() {
    latestReading =
      await window.getLatestReading(
        NODE_ID
      );
  }


  // ============================================================
  // LOAD HISTORY
  // ============================================================

  async function loadHistory() {
    const response =
      await window.getNodeHistory(
        NODE_ID,
        20
      );

    const readings =
      normalizeHistory(
        response
      );

    historyData =
      [...readings].sort(
        function (a, b) {
          const timeA =
            new Date(
              a.created_at || 0
            ).getTime();

          const timeB =
            new Date(
              b.created_at || 0
            ).getTime();

          return (
            timeA -
            timeB
          );
        }
      );
  }


  // ============================================================
  // LOAD SUMMARY
  // ============================================================

  async function loadSummary() {
    dashboardSummary =
      await window.getDashboardSummary();
  }


  // ============================================================
  // LOAD ALERTS
  // ============================================================

  async function loadAlerts() {
    const response =
      await window.getAlerts(
        20
      );

    alertsData =
      Array.isArray(response)
        ? response
        : Array.isArray(
            response?.alerts
          )
          ? response.alerts
          : [];
  }


  // ============================================================
  // LOAD ALL HOME DATA
  // ============================================================

  async function loadHomeData() {
    if (loading) {
      return;
    }

    loading = true;

    try {
      const results =
        await Promise.allSettled([
          loadLatestReading(),
          loadHistory(),
          loadSummary(),
          loadAlerts(),
          getBackendHealth()
        ]);

      results.forEach(
        function (result) {
          if (
            result.status ===
            "rejected"
          ) {
            console.error(
              "Home dashboard request failed:",
              result.reason
            );
          }
        }
      );

      renderDashboard();
    }
    finally {
      loading = false;
    }
  }


  // ============================================================
  // WINDOW RESIZE
  // ============================================================

  let resizeTimer = null;

  window.addEventListener(
    "resize",
    function () {
      clearTimeout(
        resizeTimer
      );

      resizeTimer =
        setTimeout(
          renderTrendChart,
          150
        );
    }
  );


  // ============================================================
  // PAGE START
  // ============================================================

  document.addEventListener(
    "DOMContentLoaded",
    function () {
      console.log(
        "Overview dashboard loaded"
      );

      setupTrendSelector();

      loadHomeData();

      setInterval(
        loadHomeData,
        REFRESH_MS
      );
    }
  );

})();